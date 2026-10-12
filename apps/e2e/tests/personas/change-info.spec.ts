import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, type ScenarioOptions } from '../support/harness'
import { type CalendarPage, MonthGrid, TimeGrid } from '../support/pages'

const settle = (page: Page) =>
	page.evaluate(() =>
		Promise.all(document.getAnimations().map((a) => a.finished))
	)

const pressAndMove = async (
	page: Page,
	from: Locator,
	to: Locator,
	release = true
) => {
	const source = await from.boundingBox()
	const target = await to.boundingBox()
	if (!source || !target) {
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
	if (release) {
		await page.mouse.up()
	}
}

/** Every bar on screen: test id plus rounded rect. */
const snapshotBars = async (page: Page) => {
	await settle(page)
	return page
		.locator(
			'[data-testid^="vertical-event-"], [data-testid^="horizontal-event-"], [data-testid^="all-day-event-"]'
		)
		.evaluateAll((bars) => {
			let scrollTop = 0
			let scrollLeft = 0
			for (const el of document.querySelectorAll('*')) {
				scrollTop += el.scrollTop
				scrollLeft += el.scrollLeft
			}
			return bars
				.map((bar) => {
					const box = bar.getBoundingClientRect()
					const left = Math.round(box.left + scrollLeft)
					const top = Math.round(box.top + scrollTop)
					return `${bar.getAttribute('data-testid')}@${left},${top},${Math.round(box.width)}x${Math.round(box.height)}`
				})
				.sort()
		})
}

const open = (page: Page, options: ScenarioOptions) =>
	gotoScenario(page, options)

const changeCount = async (grid: CalendarPage) =>
	(await grid.eventChanges()).length

const REVERT = { revertChanges: 'true' }

// ---------------------------------------------------------------------------
// Persona 1: integrator whose server rejects every save
// ---------------------------------------------------------------------------
test.describe('persona 1: integrator, server rejects saves', () => {
	const timeViews = [
		{ view: 'week', orientation: undefined },
		{ view: 'day', orientation: undefined },
	] as const

	for (const { view } of timeViews) {
		test(`${view} view: revert restores geometry, second drag still reports delta`, async ({
			page,
		}) => {
			await open(page, {
				scenario: 'basic',
				view,
				settings: { slot: 30, scrollTime: '09:00', ...REVERT },
			})
			const grid = new TimeGrid(page)
			const before = await snapshotBars(page)
			const rowsBefore = await grid.eventState()

			// 09:30 -> 11:00 same day (+90 min)
			await pressAndMove(
				page,
				grid.event('Morning stand-up').first(),
				grid.slotAt('2025-03-12T11:00')
			)
			await expect.poll(() => changeCount(grid)).toBe(1)
			await expect.poll(() => snapshotBars(page)).toEqual(before)
			expect(await grid.eventState()).toEqual(rowsBefore)
			expect((await grid.eventChanges())[0].delta).toEqual({
				days: 0,
				milliseconds: 5_400_000,
			})

			// Second drag: the same gesture again; must report the same delta
			await pressAndMove(
				page,
				grid.event('Morning stand-up').first(),
				grid.slotAt('2025-03-12T11:00')
			)
			await expect.poll(() => changeCount(grid)).toBe(2)
			const second = (await grid.eventChanges())[1]
			expect(second.delta).toEqual({ days: 0, milliseconds: 5_400_000 })
			expect(second.updated).toEqual(['basic-1'])
			await expect.poll(() => snapshotBars(page)).toEqual(before)
		})
	}

	for (const orientation of ['vertical', 'horizontal'] as const) {
		for (const view of ['day', 'week', 'month'] as const) {
			test(`resources ${view}/${orientation}: bar restored after drag onto another resource`, async ({
				page,
			}) => {
				await open(page, {
					scenario: 'resources',
					view,
					orientation,
					settings: { scrollTime: '08:00', ...REVERT },
				})
				const grid = new MonthGrid(page)
				const before = await snapshotBars(page)
				const rowsBefore = await grid.eventState()
				const barSel =
					orientation === 'vertical'
						? '[data-testid="vertical-event-res-1"]'
						: '[data-testid="horizontal-event-res-1"]'
				const bar = page.locator(barSel).first()
				await expect(bar).toBeVisible()
				const isMonthVertical = view === 'month' && orientation === 'vertical'
				let targetSel =
					'[data-resource-id="r2"][data-start^="2025-03-12T10:00"]'
				if (view === 'month') {
					targetSel = isMonthVertical
						? '[data-testid="vertical-cell-2025-03-12-00-00-resource-r2"]'
						: '[data-resource-id="r2"][data-start="2025-03-11T00:00:00.000Z"]'
				}
				const target = page.locator(targetSel).first()
				await expect(target, `target ${targetSel}`).toBeAttached()
				await bar.scrollIntoViewIfNeeded()
				await target.scrollIntoViewIfNeeded()
				await pressAndMove(page, bar, target)
				await expect.poll(() => changeCount(grid)).toBe(1)
				const [change] = await grid.eventChanges()
				expect(change.updated).toEqual(['res-1'])
				await expect.poll(() => snapshotBars(page)).toEqual(before)
				expect(await grid.eventState()).toEqual(rowsBefore)

				// second drag works again
				await pressAndMove(page, page.locator(barSel).first(), target)
				await expect.poll(() => changeCount(grid)).toBe(2)
				const second = (await grid.eventChanges())[1]
				expect(second.delta).toEqual(change.delta)
				await expect.poll(() => snapshotBars(page)).toEqual(before)
			})
		}
	}

	test('month: multi-day event spanning a week boundary reverts and re-drags', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'spanning-event',
			view: 'month',
			settings: REVERT,
		})
		const month = new MonthGrid(page)
		const before = await snapshotBars(page)
		expect(before.length).toBeGreaterThan(1)
		// Drag the first segment (Mar 5) to Mar 6.
		await pressAndMove(
			page,
			page.locator('[data-testid^="horizontal-event-spanning-1"]').first(),
			month.cellOn('2025-03-08')
		)
		await expect.poll(() => changeCount(month)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
		// drag the SECOND segment (row 2) one cell right
		const second = page
			.locator('[data-testid^="horizontal-event-spanning-1"]')
			.nth(1)
		await pressAndMove(page, second, month.cellOn('2025-03-13'))
		await expect.poll(() => changeCount(month)).toBe(2)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})

	test('month: timed multi-day event reverts', async ({ page }) => {
		await open(page, {
			scenario: 'timed-multi-day',
			view: 'month',
			settings: REVERT,
		})
		const month = new MonthGrid(page)
		const before = await snapshotBars(page)
		await pressAndMove(
			page,
			page.locator('[data-testid^="horizontal-event-timed-span-1"]').first(),
			month.cellOn('2025-03-19')
		)
		await expect.poll(() => changeCount(month)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})

	test('week: all-day -> timed reverts', async ({ page }) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { scrollTime: '09:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		const rowsBefore = await grid.eventState()
		await pressAndMove(
			page,
			grid.allDayRow.getByText('Public holiday').first(),
			grid.slotAt('2025-03-12T11:00')
		)
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
		expect(await grid.eventState()).toEqual(rowsBefore)
	})

	test('week: timed -> all-day reverts', async ({ page }) => {
		// Tall, so the drag has nothing to auto-scroll and really reaches the row.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '00:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		const rowsBefore = await grid.eventState()
		await pressAndMove(
			page,
			grid.event('Morning stand-up').first(),
			grid.allDayRow
				.locator('[data-all-day="true"][data-start^="2025-03-13"]')
				.first()
		)
		await expect.poll(() => changeCount(grid)).toBe(1)
		// Measured from the day start, so only an all-day drop gives {1, 0}.
		expect((await grid.eventChanges())[0].delta).toEqual({
			days: 1,
			milliseconds: 0,
		})
		await expect.poll(() => snapshotBars(page)).toEqual(before)
		expect(await grid.eventState()).toEqual(rowsBefore)
		expect((await grid.eventNamed('Morning stand-up')).allDay).toBe(false)
	})

	test('form edit then revert; delete then revert', async ({ page }) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		await grid.event('Morning stand-up').first().click()
		await page.locator('input[name="title"]').fill('Renamed')
		await page.getByRole('button', { name: 'Update' }).click()
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect(grid.event('Morning stand-up').first()).toBeVisible()
		await expect(grid.event('Renamed')).toHaveCount(0)
		expect((await grid.eventChanges())[0].delta).toEqual({
			days: 0,
			milliseconds: 0,
		})
		expect(await snapshotBars(page)).toEqual(before)

		await grid.event('Morning stand-up').first().click()
		await page.getByRole('button', { name: 'Delete' }).click()
		await expect.poll(() => changeCount(grid)).toBe(2)
		const del = (await grid.eventChanges())[1]
		expect(del.action).toBe('delete')
		expect(del.delta).toBeNull()
		await expect(grid.event('Morning stand-up').first()).toBeVisible()
		expect(await snapshotBars(page)).toEqual(before)
	})

	test('form edit that changes time and date reverts', async ({ page }) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '09:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		await grid.event('Design review').first().click()
		await page.getByTestId('time-picker-start-time').click()
		await page.getByPlaceholder('Search time...').fill('4:00 PM')
		await page.getByRole('button', { name: '4:00 PM', exact: true }).click()
		await page.getByRole('button', { name: 'Update' }).click()
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})
})

test.describe('persona 1 extras', () => {
	test('drop in place under revert: no row change, geometry same, next drag works', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		const bar = grid.event('Morning stand-up').first()
		const box = await bar.boundingBox()
		if (!box) throw new Error('no box')
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await page.mouse.down()
		await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2)
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
		await page.mouse.up()
		await page.waitForTimeout(400)
		expect(await snapshotBars(page)).toEqual(before)
		await pressAndMove(
			page,
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-13T10:00')
		)
		await expect
			.poll(async () => (await grid.eventChanges()).length)
			.toBeGreaterThan(0)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})

	test('delete then revert, then a drag of the restored event still works', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00', ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		await grid.event('Design review').first().click()
		await page.getByRole('button', { name: 'Delete' }).click()
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
		await pressAndMove(
			page,
			grid.event('Design review').first(),
			grid.slotAt('2025-03-13T16:00')
		)
		await expect.poll(() => changeCount(grid)).toBe(2)
		const last = (await grid.eventChanges()).at(-1)
		expect(last?.action).toBe('update')
		expect(last?.updated).toEqual(['basic-2'])
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})

	test('month: all-day event drag reverts', async ({ page }) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: REVERT,
		})
		const month = new MonthGrid(page)
		const before = await snapshotBars(page)
		await pressAndMove(
			page,
			page.locator('[data-testid^="horizontal-event-allday-2"]').first(),
			month.cellOn('2025-03-20')
		)
		await expect.poll(() => changeCount(month)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
		expect(await month.eventState()).toEqual(await month.eventState())
	})
})

// ---------------------------------------------------------------------------
// Persona 2: office scheduler, recurring series
// ---------------------------------------------------------------------------
test.describe('persona 2: recurring scopes then revert', () => {
	const SCOPES = [
		{ label: 'This event', scope: 'this' },
		{ label: 'This and following events', scope: 'following' },
		{ label: 'All events', scope: 'all' },
	] as const

	for (const { label, scope } of SCOPES) {
		test(`drag one occurrence, scope ${scope}, revert`, async ({ page }) => {
			await open(page, {
				scenario: 'recurring-moved',
				view: 'week',
				plugins: ['recurrence'],
				settings: { slot: 30, ...REVERT },
			})
			const grid = new TimeGrid(page)
			await expect(grid.event('Stand-up')).toHaveCount(5)
			const before = await snapshotBars(page)
			const bars = page.locator('[data-testid^="vertical-event-moved-series"]')
			await pressAndMove(page, bars.nth(2), grid.slotAt('2025-03-12T15:00'))
			await page.getByText(label, { exact: true }).click()
			await expect.poll(() => changeCount(grid)).toBe(1)
			const [change] = await grid.eventChanges()
			expect(change.scope).toBe(scope)
			expect(change.delta).toEqual({ days: 0, milliseconds: 21_600_000 })
			await expect(grid.event('Stand-up')).toHaveCount(5)
			await expect(grid.event('Rescheduled check-in')).toHaveCount(1)
			await expect.poll(() => snapshotBars(page)).toEqual(before)

			// and a second action still works after revert
			await pressAndMove(page, bars.nth(2), grid.slotAt('2025-03-12T10:00'))
			await page.getByText(label, { exact: true }).click()
			await expect.poll(() => changeCount(grid)).toBe(2)
			await expect.poll(() => snapshotBars(page)).toEqual(before)
		})

		test(`form edit title, scope ${scope}, revert`, async ({ page }) => {
			await open(page, {
				scenario: 'recurring-moved',
				view: 'week',
				plugins: ['recurrence'],
				settings: REVERT,
			})
			const grid = new TimeGrid(page)
			await expect(grid.event('Stand-up')).toHaveCount(5)
			const before = await snapshotBars(page)
			await page
				.locator('[data-testid^="vertical-event-moved-series"]')
				.nth(2)
				.click()
			await page.locator('input[name="title"]').fill('Team sync')
			await page.getByRole('button', { name: 'Update' }).click()
			await page.getByText(label, { exact: true }).click()
			await expect.poll(() => changeCount(grid)).toBe(1)
			await expect(grid.event('Team sync')).toHaveCount(0)
			await expect(grid.event('Stand-up')).toHaveCount(5)
			await expect(grid.event('Rescheduled check-in')).toHaveCount(1)
			await expect.poll(() => snapshotBars(page)).toEqual(before)
		})

		test(`delete, scope ${scope}, revert`, async ({ page }) => {
			await open(page, {
				scenario: 'recurring-moved',
				view: 'week',
				plugins: ['recurrence'],
				settings: REVERT,
			})
			const grid = new TimeGrid(page)
			await expect(grid.event('Stand-up')).toHaveCount(5)
			const before = await snapshotBars(page)
			await page
				.locator('[data-testid^="vertical-event-moved-series"]')
				.nth(2)
				.click()
			await page.getByRole('button', { name: 'Delete' }).click()
			await page.getByText(label, { exact: true }).click()
			await expect.poll(() => changeCount(grid)).toBe(1)
			await expect(grid.event('Stand-up')).toHaveCount(5)
			await expect(grid.event('Rescheduled check-in')).toHaveCount(1)
			await expect.poll(() => snapshotBars(page)).toEqual(before)
		})
	}

	test('drag the MOVED (modified) occurrence, revert', async ({ page }) => {
		await open(page, {
			scenario: 'recurring-moved',
			view: 'week',
			plugins: ['recurrence'],
			settings: { slot: 30, ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		await pressAndMove(
			page,
			page.locator('[data-testid^="vertical-event-moved-friday"]').first(),
			grid.slotAt('2025-03-14T13:00')
		)
		await page.getByText('This event', { exact: true }).click()
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})

	test('recurring scenario: drag a generated occurrence across days, scope this, revert', async ({
		page,
	}) => {
		await open(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
			settings: { slot: 30, ...REVERT },
		})
		const grid = new TimeGrid(page)
		const before = await snapshotBars(page)
		await pressAndMove(
			page,
			page.locator('[data-testid^="vertical-event-standup"]').nth(3),
			grid.slotAt('2025-03-12T10:00')
		)
		await page.getByText('This event', { exact: true }).click()
		await expect.poll(() => changeCount(grid)).toBe(1)
		await expect.poll(() => snapshotBars(page)).toEqual(before)
	})
})

// ---------------------------------------------------------------------------
// Persona 3: edge-case hunter. No revert. The oracle is the row the calendar
// reports after the drop: delta must equal (calendar-zone calendar days,
// wall-clock ms) between the old and the new start. FullCalendar: marker.ts diffDayAndTime.
// ---------------------------------------------------------------------------
const wall = (iso: string, timeZone: string) => {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
		})
			.formatToParts(new Date(iso))
			.map((p) => [p.type, Number(p.value)])
	)
	const dayMs = Date.UTC(parts.year, parts.month - 1, parts.day)
	const timeMs = ((parts.hour * 60 + parts.minute) * 60 + parts.second) * 1000
	return { dayMs, timeMs }
}
const expectedDelta = (before: string, after: string, tz: string) => {
	const a = wall(before, tz)
	const b = wall(after, tz)
	return {
		days: Math.round((b.dayMs - a.dayMs) / 864e5),
		milliseconds: b.timeMs - a.timeMs,
	}
}

/** Drags, then checks the published delta against the oracle; returns it. */
const dragAndCheck = async (
	page: Page,
	grid: CalendarPage,
	title: string,
	from: Locator,
	to: Locator,
	tz = 'UTC',
	scopeLabel?: string
) => {
	const before = (await grid.eventNamed(title)).start
	const n = (await grid.eventChanges()).length
	await pressAndMove(page, from, to)
	if (scopeLabel) {
		await page.getByText(scopeLabel, { exact: true }).click()
	}
	await expect.poll(async () => (await grid.eventChanges()).length).toBe(n + 1)
	const change = (await grid.eventChanges()).at(-1)
	const after = (await grid.eventNamed(title)).start
	expect(change?.delta).toEqual(expectedDelta(before, after, tz))
	return { change, before, after }
}

test.describe('persona 3: delta edge cases', () => {
	test('across midnight (Wed 14:00 -> Thu 00:30)', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const r = await dragAndCheck(
			page,
			grid,
			'Design review',
			grid.event('Design review').first(),
			grid.slotAt('2025-03-13T00:30')
		)
		expect(r.after).toMatch(/^2025-03-13T0/)
	})

	test('across midnight backwards (Wed 09:30 -> Tue 23:30)', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Morning stand-up',
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-11T23:30')
		)
	})

	test('overnight event: drag Thu segment', async ({ page }) => {
		await open(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Night shift',
			grid.bars('overnight-1').nth(1),
			grid.slotAt('2025-03-13T05:00')
		)
	})

	test('overnight event: drag first segment later', async ({ page }) => {
		await open(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: { slot: 30, scrollTime: '16:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Night shift',
			grid.bars('overnight-1').first(),
			grid.slotAt('2025-03-14T18:00')
		)
	})

	test('month: previous week', async ({ page }) => {
		await open(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)
		await dragAndCheck(
			page,
			month,
			'Morning stand-up',
			month.event('Morning stand-up').first(),
			month.cellOn('2025-03-05')
		)
	})

	test('month: spanning event, first segment', async ({ page }) => {
		await open(page, { scenario: 'spanning-event', view: 'month' })
		const month = new MonthGrid(page)
		await dragAndCheck(
			page,
			month,
			'Conference fortnight',
			page.locator('[data-testid^="horizontal-event-spanning-1"]').first(),
			month.cellOn('2025-03-08')
		)
	})

	test('month: spanning event, second-row segment pulled back across the week boundary', async ({
		page,
	}) => {
		await open(page, { scenario: 'spanning-event', view: 'month' })
		const month = new MonthGrid(page)
		await dragAndCheck(
			page,
			month,
			'Conference fortnight',
			page.locator('[data-testid^="horizontal-event-spanning-1"]').nth(1),
			month.cellOn('2025-03-04')
		)
	})

	test('month: timed multi-day event', async ({ page }) => {
		await open(page, { scenario: 'timed-multi-day', view: 'month' })
		const month = new MonthGrid(page)
		await dragAndCheck(
			page,
			month,
			'Field survey',
			page.locator('[data-testid^="horizontal-event-timed-span-1"]').first(),
			month.cellOn('2025-03-19')
		)
	})

	test('all-day -> timed', async ({ page }) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Public holiday',
			grid.allDayRow.getByText('Public holiday').first(),
			grid.slotAt('2025-03-13T11:00')
		)
	})

	test('timed -> all-day (drop on the all-day row) is measured from the day start', async ({
		page,
	}) => {
		// Tall, so the drag has nothing to auto-scroll and really reaches the row.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await pressAndMove(
			page,
			grid.event('Morning stand-up').first(),
			grid.allDayRow
				.locator('[data-all-day="true"][data-start^="2025-03-13"]')
				.first()
		)
		await expect.poll(() => changeCount(grid)).toBe(1)
		expect((await grid.eventNamed('Morning stand-up')).allDay).toBe(true)
		expect((await grid.eventChanges())[0].delta).toEqual({
			days: 1,
			milliseconds: 0,
		})
	})

	test('all-day -> all-day (other day)', async ({ page }) => {
		await open(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Off-site',
			grid.allDayRow.getByText('Off-site').first(),
			grid.allDayRow.locator('[data-start^="2025-03-11"]').first()
		)
	})

	test('slot=15 drags', async ({ page }) => {
		await open(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slot: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Quarter hour',
			grid.bars('short-1').first(),
			grid.slotAt('2025-03-12T09:15')
		)
		await dragAndCheck(
			page,
			grid,
			'Half hour',
			grid.bars('short-2').first(),
			grid.slotAt('2025-03-13T10:15')
		)
		await dragAndCheck(
			page,
			grid,
			'Off the slot boundary',
			grid.bars('short-3').first(),
			grid.slotAt('2025-03-11T10:15')
		)
	})

	test('slot=15 day view upward', async ({ page }) => {
		await open(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { slot: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const r = await dragAndCheck(
			page,
			grid,
			'Half hour',
			grid.bars('short-2').first(),
			grid.slotAt('2025-03-12T09:15')
		)
		expect(r.change?.delta?.days).toBe(0)
	})

	const NY = 'America/New_York'
	// Deterministic landing: a tall viewport (no auto-scroll) and the Sunday
	// cell data-start 06:30Z = 01:30 EST, the last half hour before the change.
	for (const attempt of [1, 2, 3, 4, 5, 6]) {
		test(`NY DST: one-off Wed 09:00 EDT -> change-day Sunday 01:30 EST (run ${attempt})`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 1800 })
			await open(page, {
				scenario: 'recurring-dst',
				view: 'week',
				plugins: ['recurrence'],
				timezone: NY,
				date: '2025-03-12T13:00:00.000Z',
				settings: { slot: 30, scrollTime: '00:00' },
			})
			const grid = new TimeGrid(page)
			const target = page
				.locator(
					'[data-testid^="vertical-cell-"][data-start="2025-03-09T06:30:00.000Z"]'
				)
				.first()
			await expect(target).toBeAttached()
			await dragAndCheck(
				page,
				grid,
				'One-off at nine',
				grid.bars('dst-reference').first(),
				target,
				NY
			)
		})
	}

	const dayView = (date: string, scrollTime = '00:00') => ({
		scenario: 'dst-days',
		view: 'day' as const,
		orientation: 'vertical' as const,
		timezone: NY,
		date,
		settings: { slot: 30, scrollTime },
	})
	const cellAt = (page: Page, utcIso: string) =>
		page.locator(`[data-resource-id="r1"][data-start="${utcIso}"]`)

	test('NY DST day view: spring change day 09:00 -> 12:00 EDT', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, dayView('2025-03-09T13:00:00.000Z'))
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Spring change',
			grid.bars('spring').first(),
			cellAt(page, '2025-03-09T16:00:00.000Z'),
			NY
		)
	})

	test('NY DST day view: spring change day 09:00 -> 01:00 EST (before the skipped hour)', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, dayView('2025-03-09T13:00:00.000Z'))
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Spring change',
			grid.bars('spring').first(),
			cellAt(page, '2025-03-09T06:00:00.000Z'),
			NY
		)
	})

	test('NY DST day view: autumn change day 09:00 -> 12:00 EST', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, dayView('2025-11-02T14:00:00.000Z'))
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Autumn change',
			grid.bars('autumn').first(),
			cellAt(page, '2025-11-02T17:00:00.000Z'),
			NY
		)
	})

	test('NY DST day view: autumn change day 09:00 -> 00:30 EDT (before the repeated hour)', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1800 })
		await open(page, dayView('2025-11-02T14:00:00.000Z'))
		const grid = new TimeGrid(page)
		await dragAndCheck(
			page,
			grid,
			'Autumn change',
			grid.bars('autumn').first(),
			cellAt(page, '2025-11-02T04:30:00.000Z'),
			NY
		)
	})

	// Crossing the 2025-03-09 change inside one week (firstDayOfWeek=thursday gives
	// Thu 6 .. Wed 12), in a zoned calendar.
	const crossing = (page: Page) =>
		open(page, {
			scenario: 'recurring-dst',
			view: 'week',
			plugins: ['recurrence'],
			timezone: NY,
			date: '2025-03-10T14:00:00.000Z',
			settings: { slot: 30, scrollTime: '00:00', firstDayOfWeek: 'thursday' },
		})
	for (const attempt of [1, 2, 3, 4]) {
		test(`NY DST: Wed 09:00 EDT -> Sat 10:30 EST reports wall-clock delta (run ${attempt})`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 1800 })
			await crossing(page)
			const grid = new TimeGrid(page)
			const target = page
				.locator(
					'[data-testid^="vertical-cell-"][data-start="2025-03-08T15:30:00.000Z"]'
				)
				.first()
			await expect(target).toBeAttached()
			await dragAndCheck(
				page,
				grid,
				'One-off at nine',
				grid.bars('dst-reference').first(),
				target,
				NY
			)
		})
		test(`NY DST: Sat 09:00 EST occurrence -> Wed 10:30 EDT reports wall-clock delta (run ${attempt})`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 1800 })
			await crossing(page)
			const grid = new TimeGrid(page)
			const target = page
				.locator(
					'[data-testid^="vertical-cell-"][data-start="2025-03-12T14:30:00.000Z"]'
				)
				.first()
			await expect(target).toBeAttached()
			// the series' Saturday occurrence is the 3rd bar (Thu, Fri, Sat)
			const sat = page
				.locator('[data-testid^="vertical-event-dst-series"]')
				.nth(2)
			const n = (await grid.eventChanges()).length
			await pressAndMove(page, sat, target)
			await page.getByText('This event', { exact: true }).click()
			await expect
				.poll(async () => (await grid.eventChanges()).length)
				.toBe(n + 1)
			const change = (await grid.eventChanges()).at(-1)
			// Saturday 09:00 EST to Wednesday 10:30 EDT: four days, an hour and a half.
			expect(change?.delta).toEqual({ days: 4, milliseconds: 5_400_000 })
		})
	}

	test('recurring "this" scope drag: delta matches', async ({ page }) => {
		await open(page, {
			scenario: 'recurring-moved',
			view: 'week',
			plugins: ['recurrence'],
			settings: { slot: 30, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const before = (await grid.eventChanges()).length
		await pressAndMove(
			page,
			page.locator('[data-testid^="vertical-event-moved-series"]').nth(2),
			grid.slotAt('2025-03-13T15:00')
		)
		await page.getByText('This event', { exact: true }).click()
		await expect
			.poll(async () => (await grid.eventChanges()).length)
			.toBe(before + 1)
	})
})
