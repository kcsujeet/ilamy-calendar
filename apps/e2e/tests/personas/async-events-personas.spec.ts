import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer, setSettings } from '../support/harness'
import { CalendarPage, MonthGrid, TimeGrid } from '../support/pages'

/*
 * QA personas for 3.3.8 `events` as a function. Fetch ranges are read from the
 * harness's published fetch log; `isLoading` flips are recorded by a
 * MutationObserver installed before the app mounts, because the published
 * state only keeps the latest value.
 */

/** Every scenario and the view it opens on (rrule cannot load in the Playwright process). */
const ARRAY_SCENARIOS: Array<[string, 'day' | 'week' | 'month']> = [
	['basic', 'week'],
	['edit-permissions', 'month'],
	['colored', 'week'],
	['short-events', 'week'],
	['overlapping-events', 'week'],
	['overnight-event', 'week'],
	['spanning-event', 'month'],
	['cross-month-week', 'week'],
	['timed-multi-day', 'week'],
	['all-day-events', 'month'],
	['recurring', 'week'],
	['recurring-dst', 'week'],
	['dst-days', 'day'],
	['recurring-moved', 'week'],
	['many-events', 'month'],
	['resource-day-overflow', 'day'],
	['numeric-resource-ids', 'week'],
	['long-events', 'week'],
	['long-resource-events', 'week'],
	['resource-hours', 'week'],
	['visible-hours', 'week'],
	['resources', 'month'],
	['async-events', 'month'],
]

const SLOW = { fetch: 'delayed', fetchDelay: 300 }

const watchLoading = (page: Page) =>
	page.addInitScript(() => {
		const seen: boolean[] = []
		;(window as unknown as { __loading: boolean[] }).__loading = seen
		new MutationObserver(() => {
			const node = document.querySelector('[data-testid="fetch-state"]')
			if (!node?.textContent) {
				return
			}
			const { isLoading } = JSON.parse(node.textContent)
			if (seen.at(-1) !== isLoading) {
				seen.push(isLoading)
			}
		}).observe(document, {
			subtree: true,
			childList: true,
			characterData: true,
		})
	})

const loadingFlips = (page: Page) =>
	page.evaluate(() => (window as unknown as { __loading: boolean[] }).__loading)

const resetLoadingFlips = (page: Page) =>
	page.evaluate(() => {
		const seen = (window as unknown as { __loading: boolean[] }).__loading
		const last = seen.at(-1)
		seen.length = 0
		if (last !== undefined) {
			seen.push(last)
		}
	})

/** Records every moment `title` is present in the calendar's DOM. */
const watchTitle = (page: Page, title: string) =>
	page.evaluate((needle) => {
		const w = window as unknown as { __flash: Record<string, number> }
		w.__flash ??= {}
		w.__flash[needle] = 0
		new MutationObserver(() => {
			const root = document.querySelector('[data-testid="ilamy-calendar"]')
			if (root?.textContent?.includes(needle)) {
				w.__flash[needle] += 1
			}
		}).observe(document, {
			subtree: true,
			childList: true,
			characterData: true,
		})
	}, title)

const flashCount = (page: Page, title: string) =>
	page.evaluate(
		(needle) =>
			(window as unknown as { __flash: Record<string, number> }).__flash[
				needle
			],
		title
	)

const settled = async (grid: CalendarPage) => {
	await expect
		.poll(async () => {
			const log = await grid.fetchLog()
			const { isLoading } = await grid.fetchState()
			return !isLoading && log.every((entry) => entry.status !== 'pending')
		})
		.toBe(true)
}

/*
 * Every call the calendar made, minus the StrictMode double mount's abandoned
 * first call. An entry's status is truthful: a call that finished is never
 * flipped to `aborted` afterwards.
 */
const realFetches = async (grid: CalendarPage) => {
	const log = await grid.fetchLog()
	const [first, second] = log
	const isStrictModeEcho =
		first && second && first.start === second.start && first.end === second.end
	return isStrictModeEcho ? log.slice(1) : log
}

const range = (entry: { start: string; end: string }) =>
	`${entry.start} > ${entry.end}`

const view = (page: Page, name: 'Day' | 'Week' | 'Month' | 'Year') =>
	page.getByRole('radio', { name, exact: true }).click()

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const dragTo = async (page: Page, from: Locator, to: Locator) => {
	const start = await centre(from)
	const end = await centre(to)
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * step) / 8,
			start.y + ((end.y - start.y) * step) / 8
		)
	}
	await releasePointer(page)
}

const MARCH = '2025-02-23T00:00:00.000Z > 2025-04-06T00:00:00.000Z'
const APRIL = '2025-03-30T00:00:00.000Z > 2025-05-11T00:00:00.000Z'

test.describe('persona 1: integrator with a slow API', () => {
	test('mixed-direction rapid navigation ends on the final range, with no flash of a range passed through', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await watchTitle(page, 'May kickoff')
		await watchTitle(page, 'June demo')

		// March -> Apr -> May -> Apr -> May -> Jun -> May -> Apr
		for (const step of [
			'next',
			'next',
			'previous',
			'next',
			'next',
			'previous',
			'previous',
		] as const) {
			await month[step]()
		}

		await expect(month.event('April review')).toBeVisible()
		await settled(month)
		await expect(month.event('May kickoff')).toHaveCount(0)
		await expect(month.event('June demo')).toHaveCount(0)
		await expect(month.event('Month turn')).toBeVisible()
		expect(await flashCount(page, 'May kickoff')).toBe(0)
		expect(await flashCount(page, 'June demo')).toBe(0)
		const last = (await realFetches(month)).at(-1)
		expect(range(last!)).toBe(APRIL)
		expect((await month.fetchState()).isLoading).toBe(false)
	})

	test('clicking Next faster than the API answers never shows the in-between months', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 50 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await watchTitle(page, 'April review')
		await watchTitle(page, 'May kickoff')
		// Held while clicking: with a timer, a slow runner lets April's answer
		// arrive between two clicks and it flashes, which is not the bug.
		const callsBefore = (await month.fetchLog()).length
		await setSettings(page, { fetch: 'held' })
		await month.next()
		await month.next()
		await month.next()
		await expect
			.poll(async () => (await month.fetchLog()).length - callsBefore)
			.toBe(3)
		await setSettings(page, { fetch: 'delayed' })
		await expect(month.event('June demo')).toBeVisible()
		await settled(month)
		expect(await flashCount(page, 'April review')).toBe(0)
		expect(await flashCount(page, 'May kickoff')).toBe(0)
	})

	test('a stale slow response cannot overwrite a fast newer one (responses out of order)', async ({
		page,
	}) => {
		// Delay is read per call, so make the FIRST navigation slow and the
		// second fast: the slow one resolves last and must be ignored.
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 50 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await setSettings(page, { fetchDelay: 1500 })
		await month.next() // April, slow
		await setSettings(page, { fetchDelay: 50 })
		await month.next() // May, fast
		await expect(month.event('May kickoff')).toBeVisible()
		await page.waitForTimeout(1800)
		await expect(month.event('May kickoff')).toBeVisible()
		await expect(month.event('April review')).toHaveCount(0)
		const log = await month.fetchLog()
		expect(log.at(-2)?.status).toBe('aborted')
		expect(log.at(-1)?.status).toBe('done')
	})

	test('fetch ranges match the visible grid in every view (end exclusive)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: SLOW,
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([MARCH])

		// Week and Day inside the fetched month: nothing new is asked.
		await view(page, 'Week')
		await view(page, 'Day')
		await page.waitForTimeout(500)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([MARCH])

		// Year contains the month: asks for the whole year, once.
		await view(page, 'Year')
		await expect.poll(async () => (await realFetches(grid)).length).toBe(2)
		await settled(grid)
		expect(range((await realFetches(grid)).at(-1)!)).toBe(
			'2025-01-01T00:00:00.000Z > 2026-01-01T00:00:00.000Z'
		)

		// Back to Month inside the fetched year: nothing new.
		await view(page, 'Month')
		await page.waitForTimeout(500)
		expect(await realFetches(grid)).toHaveLength(2)
	})

	test('week and day ranges outside the fetched month ask for exactly that week or day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'week',
			settings: SLOW,
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-03-09T00:00:00.000Z > 2025-03-16T00:00:00.000Z',
		])
		// The next week's range is not inside the last fetched one.
		await grid.next()
		await settled(grid)
		expect(range((await realFetches(grid)).at(-1)!)).toBe(
			'2025-03-16T00:00:00.000Z > 2025-03-23T00:00:00.000Z'
		)
		await view(page, 'Day')
		await settled(grid)
		// The week was entered on 19 March (Wednesday), inside the fetched week.
		expect(await realFetches(grid)).toHaveLength(2)
		await grid.next()
		await settled(grid)
		// 20 March is inside the fetched week 16-23 as well.
		expect(await realFetches(grid)).toHaveLength(2)
		for (let i = 0; i < 6; i += 1) {
			await grid.next()
		}
		await settled(grid)
		expect(range((await realFetches(grid)).at(-1)!)).toBe(
			'2025-03-26T00:00:00.000Z > 2025-03-27T00:00:00.000Z'
		)
	})

	test('Today after a long trip fetches the current month again', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await month.next()
		await month.next()
		await expect(month.event('May kickoff')).toBeVisible()
		await month.today()
		await expect(month.event('March lunch')).toBeVisible()
		await expect(month.event('May kickoff')).toHaveCount(0)
		await settled(month)
		expect(range((await realFetches(month)).at(-1)!)).toBe(MARCH)
	})

	test('switching view while the first fetch is in flight still ends settled and showing events', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 800 },
		})
		const month = new MonthGrid(page)
		await view(page, 'Week')
		await view(page, 'Day')
		await view(page, 'Month')
		await expect(month.event('March lunch')).toBeVisible({ timeout: 5000 })
		await settled(month)
		const log = await month.fetchLog()
		expect(log.filter((entry) => entry.status === 'pending')).toHaveLength(0)
		expect(range(log.at(-1)!)).toBe(MARCH)
	})

	test('resource views (both orientations) fetch the same ranges and keep events across rapid navigation', async ({
		page,
	}) => {
		test.slow() // several calendar loads in one test; the 30s default is too tight on a slow runner
		for (const orientation of ['vertical', 'horizontal'] as const) {
			await gotoScenario(page, {
				scenario: 'resources',
				view: 'week',
				orientation,
				settings: SLOW,
			})
			const grid = new CalendarPage(page)
			await settled(grid)
			await expect(grid.event('Room A booking')).toBeVisible()
			expect((await realFetches(grid)).map(range)).toEqual([
				'2025-03-09T00:00:00.000Z > 2025-03-16T00:00:00.000Z',
			])
			await grid.next()
			await grid.next()
			await grid.previous()
			await grid.previous()
			await settled(grid)
			// Back on the original week, which is inside neither fetched range
			// if the in-between ones were recorded wrongly.
			await expect(grid.event('Room A booking')).toBeVisible()
			expect(range((await realFetches(grid)).at(-1)!)).toBe(
				'2025-03-09T00:00:00.000Z > 2025-03-16T00:00:00.000Z'
			)
		}
	})

	test('lazyFetching={false} refetches on every navigation, even inside the fetched range', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { ...SLOW, lazyFetching: 'false' },
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		const before = (await realFetches(grid)).length

		// Week view of the same month sits inside the fetched grid.
		await view(page, 'Week')
		await expect
			.poll(async () => (await realFetches(grid)).length)
			.toBe(before + 1)
		await settled(grid)
	})
})

test.describe('persona 2: integrator with a flaky API', () => {
	test('a failing initial fetch renders the calendar, reports once, loading flips true->false once', async ({
		page,
	}) => {
		await watchLoading(page)
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'failing', fetchDelay: 200 },
		})
		const month = new MonthGrid(page)
		await settled(month)
		await month.expectRendered()
		await expect(month.event('March lunch')).toHaveCount(0)
		const { errors } = await month.fetchState()
		// StrictMode double mount aborts the first call: one error only.
		expect(errors).toBe(1)
		expect((await loadingFlips(page)).filter(Boolean)).toHaveLength(1)
		expect((await loadingFlips(page)).at(-1)).toBe(false)
	})

	test('each navigation cycle flips loading exactly true then false, on success and on failure', async ({
		page,
	}) => {
		await watchLoading(page)
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await settled(month)
		await resetLoadingFlips(page)
		await month.next()
		await settled(month)
		expect(await loadingFlips(page)).toEqual([false, true, false])

		await setSettings(page, { fetch: 'failing' })
		await resetLoadingFlips(page)
		await month.next()
		await expect.poll(async () => (await month.fetchState()).errors).toBe(1)
		await settled(month)
		expect(await loadingFlips(page)).toEqual([false, true, false])
	})

	test('three rapid navigations against a failing API report one error and one loading cycle', async ({
		page,
	}) => {
		await watchLoading(page)
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await setSettings(page, { fetch: 'failing' })
		await resetLoadingFlips(page)
		await month.next()
		await month.next()
		await month.next()
		await settled(month)
		await page.waitForTimeout(500)
		expect((await month.fetchState()).errors).toBe(1)
		expect(await loadingFlips(page)).toEqual([false, true, false])
		// Events from before the failure are still on screen.
		await expect(month.event('June demo')).toHaveCount(0)
		await month.expectRendered()
	})

	test('failure keeps events; going back inside the old range does not refetch; going forward again retries; then recovers', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await expect(month.event('Month turn')).toBeVisible()
		await setSettings(page, { fetch: 'failing' })
		await month.next()
		await expect.poll(async () => (await month.fetchState()).errors).toBe(1)
		await expect(month.event('Month turn')).toBeVisible()
		const callsAfterFailure = (await month.fetchLog()).length

		// Still failing: next navigation retries (and fails again).
		await month.next()
		await expect.poll(async () => (await month.fetchState()).errors).toBe(2)
		expect((await month.fetchLog()).length).toBeGreaterThan(callsAfterFailure)

		await setSettings(page, { fetch: 'delayed' })
		await month.previous() // April: never recorded, so it is fetched
		await expect(month.event('April review')).toBeVisible()
		await month.next()
		await expect(month.event('May kickoff')).toBeVisible()
		expect((await month.fetchState()).isLoading).toBe(false)
	})

	test('after a failed fetch of the CURRENT range, re-navigating away and back retries it', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'failing', fetchDelay: 100 },
		})
		const month = new MonthGrid(page)
		await settled(month)
		await expect(month.event('March lunch')).toHaveCount(0)
		await setSettings(page, { fetch: 'delayed' })
		await month.next()
		await expect(month.event('April review')).toBeVisible()
		await month.previous()
		await expect(month.event('March lunch')).toBeVisible()
	})

	test('a failure after a superseded success does not paint the old range', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 50 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await setSettings(page, { fetchDelay: 800 })
		await month.next() // April slow, will succeed unless aborted
		await setSettings(page, { fetch: 'failing', fetchDelay: 100 })
		await month.next() // May fails fast
		await expect.poll(async () => (await month.fetchState()).errors).toBe(1)
		await page.waitForTimeout(1000)
		// April must not have landed, and its abort is not an error.
		await expect(month.event('April review')).toHaveCount(0)
		expect((await month.fetchState()).errors).toBe(1)
		expect((await month.fetchState()).isLoading).toBe(false)
	})
})

test.describe('persona 3: scheduler editing while loading', () => {
	test('drag a month-turn event while the next month is loading: edit is reported once and survives the fetch', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 1500 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('Month turn')).toBeVisible({ timeout: 5000 })
		await settled(month)
		// Held, not timed: the drag below must happen while April is in flight.
		await setSettings(page, { fetch: 'held' })
		await month.next()
		expect((await month.fetchState()).isLoading).toBe(true)
		const bar = month.event('Month turn')
		await expect(bar).toBeVisible()
		await dragTo(page, bar, month.cellOn('2025-04-02'))
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await expect
			.poll(async () => (await month.eventNamed('Month turn')).start)
			.toMatch(/^2025-04-02/)
		expect((await month.fetchState()).isLoading).toBe(true)
		await setSettings(page, { fetch: 'delayed' })
		await settled(month)
		await expect(month.event('April review')).toBeVisible()
		await expect(month.event('Month turn')).toBeVisible()
		expect((await month.eventNamed('Month turn')).start).toMatch(/^2025-04-02/)
		expect(await month.eventChanges()).toHaveLength(1)
	})

	test('create an event through the form while a fetch is in flight', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 1500 },
		})
		const month = new MonthGrid(page)
		await settled(month)
		// Held, not timed: the form must be submitted while April is in flight.
		await setSettings(page, { fetch: 'held' })
		await month.next()
		expect((await month.fetchState()).isLoading).toBe(true)
		await page.getByRole('button', { name: 'New' }).click()
		await page.locator('input[name="title"]').fill('Made while loading')
		await page.getByRole('button', { name: 'Create' }).click()
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		expect((await month.fetchState()).isLoading).toBe(true)
		await setSettings(page, { fetch: 'delayed' })
		await settled(month)
		const titles = (await month.eventState()).map((row) => row.title)
		expect(titles).toContain('Made while loading')
		// The server (harness state) has it, so the replaced store has it too.
		await expect(month.event('April review')).toBeVisible()
		const stillThere = await month.eventChanges()
		expect(stillThere.map((change) => change.action)).toEqual(['add'])
	})

	test('resize a timed event while a fetch is in flight', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 2400 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { fetch: 'delayed', fetchDelay: 300, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await settled(grid)
		await expect(grid.bars('basic-1')).toBeVisible()
		await setSettings(page, { fetchDelay: 1500 })
		await grid.next()
		await grid.previous()
		// A fetch of this week is not needed (inside fetched range), so force one
		// in flight with a different week and come back quickly.
		expect(await realFetches(grid)).toBeTruthy()
		await grid.next()
		await grid.previous()
		await settled(grid)
		await setSettings(page, { fetchDelay: 1500 })
		await grid.today()
		await expect(grid.bars('basic-1')).toBeVisible()
		await dragTo(
			page,
			grid.bars('basic-1').locator('[data-resize-handle="end"]'),
			grid.slotAt('2025-03-12T11:00')
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const resized = await grid.eventNamed('Morning stand-up')
		await settled(grid)
		expect((await grid.eventNamed('Morning stand-up')).end).toBe(resized.end)
		expect(await grid.eventChanges()).toHaveLength(1)
	})

	test('revertChanges with a fetcher puts the dragged event back', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { ...SLOW, revertChanges: 'true' },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		const before = await month.eventNamed('March lunch')
		await dragTo(page, month.event('March lunch'), month.cellOn('2025-03-14'))
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		// The harness persisted nothing; the shown event must be back at the 12th.
		await expect(
			month.cellOn('2025-03-12').getByText('March lunch')
		).toHaveCount(0) // overlay-drawn; use the calendar's own bar geometry instead
		const bar = month.bar('async-1')
		const cell12 = await month.cellOn('2025-03-12').boundingBox()
		const barBox = await bar.boundingBox()
		expect(
			barBox && cell12 && Math.abs(barBox.x - cell12.x) < cell12.width
		).toBe(true)
		expect(await month.eventNamed('March lunch')).toEqual(before)
		await settled(month)
		// And it still is after the next fetch.
		await month.next()
		await month.previous()
		await expect(month.event('March lunch')).toBeVisible()
	})

	test('revertChanges while the next month is loading: the edit is rolled back and stays rolled back after the fetch lands', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { fetch: 'delayed', fetchDelay: 1200, revertChanges: 'true' },
		})
		const month = new MonthGrid(page)
		await expect(month.event('Month turn')).toBeVisible({ timeout: 5000 })
		await settled(month)
		await month.next()
		await dragTo(page, month.event('Month turn'), month.cellOn('2025-04-02'))
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await settled(month)
		await expect(month.event('April review')).toBeVisible()
		expect((await month.eventNamed('Month turn')).start).toBe(
			'2025-03-31T10:00:00.000Z'
		)
		const bar = await month.bar('async-turn').first().boundingBox()
		const cell = await month.cellOn('2025-03-31').boundingBox()
		expect(bar && cell && Math.abs(bar.x - cell.x) < cell.width).toBe(true)
	})

	test('changing the calendar timezone at runtime refetches in the new zone', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: SLOW,
		})
		const month = new MonthGrid(page)
		await settled(month)
		await setSettings(page, { tz: 'America/New_York' })
		await settled(month)
		expect(range((await realFetches(month)).at(-1)!)).toBe(
			'2025-02-23T05:00:00.000Z > 2025-04-06T04:00:00.000Z'
		)
	})

	test('recurring series from a fetcher expand like the array form (week view)', async ({
		page,
	}) => {
		const countIn = async (settings: Record<string, string | number>) => {
			await gotoScenario(page, {
				scenario: 'recurring-moved',
				view: 'week',
				plugins: ['recurrence'],
				settings,
			})
			const grid = new TimeGrid(page)
			await expect(grid.event('Stand-up').first()).toBeVisible()
			await page.waitForTimeout(400)
			return {
				standUps: await grid.event('Stand-up').count(),
				moved: await grid.event('Rescheduled check-in').count(),
			}
		}
		const fromArray = await countIn({})
		const fromFetcher = await countIn({ fetch: 'delayed', fetchDelay: 100 })
		expect(fromFetcher).toEqual(fromArray)
		expect(fromFetcher.standUps).toBe(5)
		expect(fromFetcher.moved).toBe(1)
	})

	test('recurring series from a fetcher keep expanding in the next week when the server returns the series row', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring-moved',
			view: 'month',
			plugins: ['recurrence'],
			settings: { fetch: 'delayed', fetchDelay: 100 },
		})
		const month = new MonthGrid(page)
		await settled(month)
		await expect(month.event('Stand-up').first()).toBeVisible()
		await month.next()
		await settled(month)
		await month.previous()
		await settled(month)
		await expect(month.event('Stand-up').first()).toBeVisible()
	})
})

test.describe('persona 4: international', () => {
	const cases = [
		{
			timezone: 'America/New_York',
			month: '2025-02-23T05:00:00.000Z > 2025-04-06T04:00:00.000Z',
		},
		{
			timezone: 'Asia/Kolkata',
			month: '2025-02-22T18:30:00.000Z > 2025-04-05T18:30:00.000Z',
		},
	]
	for (const { timezone, month } of cases) {
		test(`${timezone}: month range is the calendar zone's day boundaries`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'async-events',
				view: 'month',
				timezone,
				settings: SLOW,
			})
			const grid = new MonthGrid(page)
			await settled(grid)
			expect((await realFetches(grid)).map(range)).toEqual([month])
			await expect(grid.event('March lunch')).toBeVisible()
		})
	}

	test('America/New_York: spring DST week is 167 hours, day is 23 hours', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'week',
			timezone: 'America/New_York',
			date: '2025-03-09T17:00:00.000Z',
			now: '2025-03-09T17:00:00.000Z',
			settings: SLOW,
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-03-09T05:00:00.000Z > 2025-03-16T04:00:00.000Z',
		])
		await view(page, 'Day')
		await settled(grid)
		// Sunday 9 March inside the fetched week: no new fetch.
		expect(await realFetches(grid)).toHaveLength(1)
	})

	test('America/New_York: autumn DST day is 25 hours, week is 169 hours', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'day',
			timezone: 'America/New_York',
			date: '2025-11-02T17:00:00.000Z',
			now: '2025-11-02T17:00:00.000Z',
			settings: SLOW,
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-11-02T04:00:00.000Z > 2025-11-03T05:00:00.000Z',
		])
		await view(page, 'Week')
		await settled(grid)
		expect(range((await realFetches(grid)).at(-1)!)).toBe(
			'2025-11-02T04:00:00.000Z > 2025-11-09T05:00:00.000Z'
		)
	})

	test('walking Day by Day across the spring change keeps ranges on local midnights', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'day',
			timezone: 'America/New_York',
			date: '2025-03-08T17:00:00.000Z',
			now: '2025-03-08T17:00:00.000Z',
			settings: { fetch: 'delayed', fetchDelay: 50 },
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		await grid.next()
		await settled(grid)
		await grid.next()
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-03-08T05:00:00.000Z > 2025-03-09T05:00:00.000Z',
			'2025-03-09T05:00:00.000Z > 2025-03-10T04:00:00.000Z',
			'2025-03-10T04:00:00.000Z > 2025-03-11T04:00:00.000Z',
		])
	})

	test('machine zone differs from calendar zone (Tokyo machine, New York calendar): same ranges', async ({
		browser,
	}) => {
		const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' })
		const page = await context.newPage()
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			timezone: 'America/New_York',
			settings: SLOW,
		})
		const grid = new MonthGrid(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-02-23T05:00:00.000Z > 2025-04-06T04:00:00.000Z',
		])
		await grid.next()
		await settled(grid)
		expect(range((await realFetches(grid)).at(-1)!)).toBe(
			'2025-03-30T04:00:00.000Z > 2025-05-11T04:00:00.000Z'
		)
		await context.close()
	})

	test('machine zone Los Angeles, calendar Kolkata, week view', async ({
		browser,
	}) => {
		const context = await browser.newContext({
			timezoneId: 'America/Los_Angeles',
		})
		const page = await context.newPage()
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'week',
			timezone: 'Asia/Kolkata',
			settings: SLOW,
		})
		const grid = new CalendarPage(page)
		await settled(grid)
		expect((await realFetches(grid)).map(range)).toEqual([
			'2025-03-08T18:30:00.000Z > 2025-03-15T18:30:00.000Z',
		])
		await context.close()
	})
})

test.describe('persona 5: upgrader with array events', () => {
	for (const [name, initialView] of ARRAY_SCENARIOS) {
		const plugins = ['recurring-dst', 'recurring-moved'].includes(name)
			? ['recurrence']
			: undefined
		test(`${name}: no fetch log, no loading calls, no errors`, async ({
			page,
		}) => {
			await watchLoading(page)
			await gotoScenario(page, {
				scenario: name,
				view: initialView,
				plugins,
			})
			const grid = new CalendarPage(page)
			await grid.expectRendered()
			await grid.next()
			await grid.previous()
			await page.waitForTimeout(150)
			expect(await grid.fetchLog()).toEqual([])
			expect(await grid.fetchState()).toEqual({ isLoading: false, errors: 0 })
			expect(await loadingFlips(page)).not.toContain(true)
		})
	}

	test('array events edited through the UI still behave: drag sticks, nothing fetched', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'async-events', view: 'month' })
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		await dragTo(page, month.event('March lunch'), month.cellOn('2025-03-14'))
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await month.next()
		await month.previous()
		expect((await month.eventNamed('March lunch')).start).toMatch(/^2025-03-14/)
		await expect(month.event('March lunch')).toBeVisible()
		expect(await month.fetchLog()).toEqual([])
	})
})
