import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	type ScenarioOptions,
} from './support/harness'
import { CalendarPage, TimeGrid } from './support/pages'

/**
 * "This and following" and "All events" on a stored series, through the real
 * form and the real drag. The rows are seeded (`seed.ts`), so each case states
 * the stored rows it starts from: a series base, its overrides, its exdates.
 *
 * What a scope stores is read back from the published rows (`event-state`), not
 * inferred from the bars, because the bugs here were in what was stored: a rule
 * with COUNT and UNTIL together, a moved row left behind, a series that ended
 * before it started.
 */

const DAILY = 3
const WEEKLY = 2

const TALL = { width: 1280, height: 2400 }

const SCOPE = {
	this: 'This event',
	following: 'This and following events',
	all: 'All events',
} as const

const seedRow = (
	id: string,
	title: string,
	start: string,
	end: string,
	extra: Record<string, unknown> = {}
) => ({ id, title, start, end, ...extra })

// Stand-up: daily, 7 occurrences, Sun 9 .. Sat 15 March 2025 at 09:00Z.
const occ = (day: number) =>
	`2025-03-${String(day).padStart(2, '0')}T09:00:00.000Z`

const standup = (extra: Record<string, unknown> = {}) =>
	seedRow('S', 'Stand-up', occ(9), '2025-03-09T09:30:00.000Z', {
		uid: 'S',
		rrule: { freq: DAILY, count: 7, dtstart: occ(9) },
		...extra,
	})

// The 13th, moved to Saturday 15 at 14:00 (another day, later).
const movedToSaturday = () =>
	seedRow(
		'S_mod',
		'Moved',
		'2025-03-15T14:00:00.000Z',
		'2025-03-15T14:30:00.000Z',
		{
			uid: 'S',
			recurrenceId: occ(13),
		}
	)

const open = async (
	page: Page,
	seed: Array<Record<string, unknown>>,
	options: Partial<ScenarioOptions> & { view: ScenarioOptions['view'] } = {
		view: 'week',
	}
) => {
	await gotoScenario(page, {
		scenario: 'seed',
		plugins: ['recurrence'],
		...options,
		settings: {
			seed: JSON.stringify(seed),
			dayMaxEvents: 10,
			scrollTime: '00:00',
			slot: 30,
			...options.settings,
		},
	})
	await settle(page)
}

// Headers animate in over 500ms; a click or a measure before that reads a frame mid-fade.
const settle = (page: Page) =>
	page.evaluate(() =>
		Promise.all(
			document
				.getAnimations()
				.map((animation) => animation.finished.catch(() => undefined))
		)
	)

const rows = (page: Page) => new CalendarPage(page).eventState()
const changes = (page: Page) => new CalendarPage(page).eventChanges()

const bar = (page: Page, title: string) =>
	page.locator('[data-testid^="vertical-event-"]').filter({ hasText: title })

const openForm = async (page: Page, title: string, index: number) => {
	await settle(page)
	await bar(page, title).nth(index).click()
	await expect(page.getByRole('dialog')).toBeVisible()
}

const chooseScope = (page: Page, scope: keyof typeof SCOPE) =>
	page.getByText(SCOPE[scope], { exact: true }).click()

const pickTime = async (
	page: Page,
	name: 'start-time' | 'end-time',
	time: string
) => {
	await page.getByTestId(`time-picker-${name}`).click()
	await page.getByPlaceholder('Search time...').fill(time)
	await page.getByRole('button', { name: time, exact: true }).click()
	await expect(page.getByPlaceholder('Search time...')).toHaveCount(0)
}

const renameTo = async (page: Page, title: string) => {
	await page.locator('input[name="title"]').fill(title)
	await page.getByRole('button', { name: 'Update' }).click()
}

test.describe('edit this and following (week view, UTC)', () => {
	test('the old series ends with UNTIL only and the new one keeps the occurrences that were left', async ({
		page,
	}) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 3) // Wed 12, the 4th of 7
		await renameTo(page, 'New standup')
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const [base, next] = await rows(page)
		expect(base.rrule?.until).toBe('2025-03-11T23:59:59.999Z')
		expect(
			base.rrule?.count,
			'COUNT and UNTIL together (RFC 5545 3.3.10)'
		).toBeNull()
		expect(next.rrule?.dtstart).toBe(occ(12))
		expect(next.rrule?.count).toBe(4)
		await expect(bar(page, 'Stand-up')).toHaveCount(3)
		await expect(bar(page, 'New standup')).toHaveCount(4)
	})

	test('does not grow the series: a month still shows 7 occurrences after a time edit', async ({
		page,
	}) => {
		await open(page, [standup()], { view: 'month' })
		const monthBars = page
			.locator('[data-testid^="horizontal-event-"]')
			.filter({ hasText: 'Stand-up' })
		await expect(monthBars).toHaveCount(7)
		await monthBars.nth(3).click()
		await pickTime(page, 'start-time', '10:00 AM')
		await pickTime(page, 'end-time', '10:30 AM')
		await page.getByRole('button', { name: 'Update' }).click()
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)
		await expect(monthBars).toHaveCount(7)
	})

	test('from a moved occurrence removes the moved row and starts on the original day', async ({
		page,
	}) => {
		await open(page, [standup({ exdates: [occ(13)] }), movedToSaturday()])
		await openForm(page, 'Moved', 0)
		await renameTo(page, 'Fresh')
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const all = await rows(page)
		expect(all.map((row) => row.id)).toEqual(['S', 'S_following'])
		const [base, next] = all
		expect(base.rrule?.until).toBe('2025-03-12T23:59:59.999Z')
		expect(next.start).toBe('2025-03-13T14:00:00.000Z')
		expect(next.exdates).toEqual([])
		const [change] = await changes(page)
		expect(change).toMatchObject({
			scope: 'following',
			updated: ['S'],
			added: ['S_following'],
			deleted: ['S_mod'],
		})
		// Saturday's 14:00 shows the new series once, not the old moved row on top of it.
		await expect(bar(page, 'Fresh')).toHaveCount(3)
		await expect(bar(page, 'Moved')).toHaveCount(0)
	})

	test('on the first occurrence replaces the series instead of leaving one that ends before it starts', async ({
		page,
	}) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 0)
		await renameTo(page, 'Renamed')
		await chooseScope(page, 'following')
		await expect(bar(page, 'Renamed')).toHaveCount(7)

		const all = await rows(page)
		expect(all.map((row) => row.id)).toEqual(['S'])
		expect(all.at(0)?.rrule?.until).toBeNull()
		expect(all.at(0)?.rrule?.count).toBe(7)
		const [change] = await changes(page)
		expect(change).toMatchObject({
			scope: 'following',
			updated: ['S'],
			added: [],
			deleted: [],
		})
		await expect(bar(page, 'Stand-up')).toHaveCount(0)
	})

	test('with Repeat unticked ends the old series and leaves one plain event', async ({
		page,
	}) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 3)
		await page.getByTestId('toggle-recurrence').click()
		await page.getByRole('button', { name: 'Update' }).click()
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const [base, single] = await rows(page)
		expect(base.rrule?.until).toBe('2025-03-11T23:59:59.999Z')
		expect(single.rrule).toBeNull()
		expect(single.uid).toBeNull()
		await expect(bar(page, 'Stand-up')).toHaveCount(4) // 9, 10, 11 and the single one on 12
	})
})

test.describe('delete this and following (week view, UTC)', () => {
	test('ends the series with UNTIL only and drops the exdates and moved rows after the cut', async ({
		page,
	}) => {
		await open(page, [
			standup({ exdates: [occ(14), occ(13)] }),
			movedToSaturday(),
		])
		await openForm(page, 'Stand-up', 3) // Wed 12
		await page.getByRole('button', { name: 'Delete' }).click()
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(1)

		const [base] = await rows(page)
		expect(base.rrule?.until).toBe('2025-03-11T23:59:59.999Z')
		expect(
			base.rrule?.count,
			'COUNT and UNTIL together (RFC 5545 3.3.10)'
		).toBeNull()
		expect(base.exdates).toEqual([])
		const [change] = await changes(page)
		expect(change).toMatchObject({
			scope: 'following',
			updated: ['S'],
			deleted: ['S_mod'],
		})
		await expect(bar(page, 'Stand-up')).toHaveCount(3)
		await expect(bar(page, 'Moved')).toHaveCount(0)
	})

	test('from a moved occurrence removes the moved row, and cuts where it came from', async ({
		page,
	}) => {
		await open(page, [standup({ exdates: [occ(13)] }), movedToSaturday()])
		await openForm(page, 'Moved', 0)
		await page.getByRole('button', { name: 'Delete' }).click()
		await chooseScope(page, 'following')
		await expect.poll(async () => (await changes(page)).length).toBe(1)

		const all = await rows(page)
		expect(all.map((row) => row.id)).toEqual(['S'])
		expect(all.at(0)?.rrule?.until).toBe('2025-03-12T23:59:59.999Z')
		await expect(bar(page, 'Moved')).toHaveCount(0)
		await expect(bar(page, 'Stand-up')).toHaveCount(4)
	})

	test('on the first occurrence removes the series and reports it deleted', async ({
		page,
	}) => {
		await open(page, [standup({ exdates: [occ(11)] }), movedToSaturday()])
		await openForm(page, 'Stand-up', 0)
		await page.getByRole('button', { name: 'Delete' }).click()
		await chooseScope(page, 'following')
		await expect.poll(async () => (await changes(page)).length).toBe(1)

		expect(await rows(page)).toEqual([])
		const [change] = await changes(page)
		expect(change).toMatchObject({
			scope: 'following',
			updated: [],
			deleted: ['S', 'S_mod'],
		})
	})
})

test.describe('unticking Repeat with "All events" (week view, UTC)', () => {
	test('turns the series into one plain event and reports the dropped rows', async ({
		page,
	}) => {
		await open(page, [standup({ exdates: [occ(11)] }), movedToSaturday()])
		await openForm(page, 'Stand-up', 3)
		await page.getByTestId('toggle-recurrence').click()
		await page.getByRole('button', { name: 'Update' }).click()
		await chooseScope(page, 'all')
		await expect.poll(async () => (await changes(page)).length).toBe(1)

		const all = await rows(page)
		expect(all.map((row) => row.id)).toEqual(['S'])
		expect(all.at(0)?.rrule).toBeNull()
		expect(all.at(0)?.exdates).toBeNull()
		expect(all.at(0)?.uid).toBeNull()
		const [change] = await changes(page)
		expect(change).toMatchObject({
			scope: 'all',
			updated: ['S'],
			added: [],
			deleted: ['S_mod'],
		})
		await expect(bar(page, 'Stand-up')).toHaveCount(1)
	})

	test('an edit that never touched Repeat keeps the series', async ({
		page,
	}) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 3)
		await renameTo(page, 'Renamed')
		await chooseScope(page, 'all')
		await expect(bar(page, 'Renamed')).toHaveCount(7)
		expect((await rows(page)).at(0)?.rrule?.count).toBe(7)
	})
})

test.describe('a deleted occurrence and a time-of-day change (week view, UTC)', () => {
	// Fri 14 is deleted with "this", then Wed 12 moves from 09:00 to 10:00.
	const deleteFriday = async (page: Page) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 5)
		await page.getByRole('button', { name: 'Delete' }).click()
		await chooseScope(page, 'this')
		await expect(bar(page, 'Stand-up')).toHaveCount(6)
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await settle(page)
	}

	const moveWednesdayToTen = async (page: Page, scope: 'following' | 'all') => {
		await openForm(page, 'Stand-up', 3)
		await pickTime(page, 'start-time', '10:00 AM')
		await pickTime(page, 'end-time', '10:30 AM')
		await page.getByRole('button', { name: 'Update' }).click()
		await chooseScope(page, scope)
	}

	test('"this and following" keeps the deleted day deleted: its exdate moves to the new time', async ({
		page,
	}) => {
		await deleteFriday(page)
		await moveWednesdayToTen(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const [, next] = await rows(page)
		expect(next.exdates).toEqual(['2025-03-14T10:00:00.000Z'])
		await expect(bar(page, 'Stand-up')).toHaveCount(6) // 9, 10, 11 at 09:00 and 12, 13, 15 at 10:00
	})

	test('"this and following" by a drag keeps the deleted day deleted', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await deleteFriday(page)
		await pressAndMove(
			page,
			bar(page, 'Stand-up').nth(3),
			new TimeGrid(page).slotAt('2025-03-12T10:00')
		)
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const [, next] = await rows(page)
		expect(next.exdates).toEqual(['2025-03-14T10:00:00.000Z'])
		await expect(bar(page, 'Stand-up')).toHaveCount(6)
	})

	// "All events" resets the series' exceptions by design (docs/recurrence.mdx:
	// occurrences moved or deleted one by one return to it), so the day returns
	// with a time change or without one. These pin that, they are not a bug.
	test('"all events" with a time change brings the deleted day back, as it does without one', async ({
		page,
	}) => {
		await deleteFriday(page)
		await moveWednesdayToTen(page, 'all')
		await expect(bar(page, 'Stand-up')).toHaveCount(7)
		expect((await rows(page)).at(0)?.exdates).toBeNull()
	})

	test('"all events" by a drag brings the deleted day back', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await deleteFriday(page)
		await pressAndMove(
			page,
			bar(page, 'Stand-up').nth(3),
			new TimeGrid(page).slotAt('2025-03-12T10:00')
		)
		await chooseScope(page, 'all')
		await expect(bar(page, 'Stand-up')).toHaveCount(7)
		expect((await rows(page)).at(0)?.exdates).toBeNull()
	})
})

test.describe('drag an occurrence with "All events" (week view, UTC)', () => {
	test('a drop on another day reports only the time of day that the series kept', async ({
		page,
	}) => {
		// Weekly on Wednesday from 5 March. "All events" keeps the series on its
		// day, so dragging the 12th to Thursday 10:00 stores the new time only.
		const weekly = seedRow(
			'W',
			'Weekly',
			'2025-03-05T09:00:00.000Z',
			'2025-03-05T09:30:00.000Z',
			{
				uid: 'W',
				rrule: {
					freq: WEEKLY,
					byweekday: [2],
					dtstart: '2025-03-05T09:00:00.000Z',
				},
			}
		)
		await page.setViewportSize(TALL)
		await open(page, [weekly])
		await pressAndMove(
			page,
			bar(page, 'Weekly').first(),
			new TimeGrid(page).slotAt('2025-03-13T10:00')
		)
		await chooseScope(page, 'all')
		await expect.poll(async () => (await changes(page)).length).toBe(1)

		const [change] = await changes(page)
		const [base] = await rows(page)
		expect(base.start).toBe('2025-03-05T10:00:00.000Z')
		expect(change.delta).toEqual({ days: 0, milliseconds: 3_600_000 })
		expect(change.endDelta).toEqual({ days: 0, milliseconds: 3_600_000 })
	})
})

test.describe('export of a cut series (week view, UTC)', () => {
	test('the RRULE has UNTIL and no COUNT', async ({ page }) => {
		await open(page, [standup()])
		await openForm(page, 'Stand-up', 3)
		await renameTo(page, 'Later')
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const downloadPromise = page.waitForEvent('download')
		await page.getByRole('button', { name: 'Export' }).click()
		const stream = await (await downloadPromise).createReadStream()
		const chunks: Buffer[] = []
		for await (const chunk of stream) {
			chunks.push(chunk as Buffer)
		}
		const lines = Buffer.concat(chunks)
			.toString('utf8')
			.replace(/\r?\n[ \t]/g, '')
			.split(/\r?\n/)
		const rules = lines.filter((line) => line.startsWith('RRULE:'))
		expect(rules).toEqual([
			'RRULE:FREQ=DAILY;UNTIL=20250311T235959Z',
			'RRULE:FREQ=DAILY;COUNT=4',
		])
	})
})

test.describe('this and following in America/New_York', () => {
	test.use({ timezoneId: 'America/New_York' })

	// 09:00 EST daily from Thu 6 March (14:00Z); from the 9th it is 09:00 EDT (13:00Z).
	const checkIn = seedRow(
		'N',
		'Check-in',
		'2025-03-06T14:00:00.000Z',
		'2025-03-06T14:30:00.000Z',
		{
			uid: 'N',
			rrule: { freq: DAILY, dtstart: '2025-03-06T14:00:00.000Z' },
		}
	)

	test('cuts at the end of the day before, in the calendar zone, and keeps 09:00 across the clock change', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await open(page, [checkIn], {
			view: 'week',
			timezone: 'America/New_York',
			date: '2025-03-12T16:00:00.000Z',
		})
		await openForm(page, 'Check-in', 3) // Wed 12
		await renameTo(page, 'Renamed')
		await chooseScope(page, 'following')
		await expect.poll(async () => (await rows(page)).length).toBe(2)

		const [base, next] = await rows(page)
		// The end of Tue 11 March in New York (EDT, UTC-4).
		expect(base.rrule?.until).toBe('2025-03-12T03:59:59.999Z')
		expect(next.start).toBe('2025-03-12T13:00:00.000Z')
		await expect(bar(page, 'Check-in')).toHaveCount(3)
		await expect(bar(page, 'Renamed')).toHaveCount(4)
	})
})

/** Presses, moves in steps so dnd-kit's sensor activates, and releases once the drag has caught up. */
const pressAndMove = async (page: Page, from: Locator, to: Locator) => {
	const source = await from.boundingBox()
	const target = await to.boundingBox()
	if (!(source && target)) {
		throw new Error('drag needs both elements laid out')
	}
	await page.mouse.move(
		source.x + source.width / 2,
		source.y + source.height / 2
	)
	await page.mouse.down()
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
			source.y + ((target.y - source.y) * step) / 8 + target.height / 2
		)
	}
	await releasePointer(page)
}
