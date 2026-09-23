import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, setSettings } from './support/harness'
import { CalendarPage, MonthGrid, TimeGrid } from './support/pages'

/**
 * Axis 2: what each fixture is actually for. The matrix proves every surface
 * reaches the screen; these prove it draws the right thing once it is there.
 */

test.describe('month grid', () => {
	test('shows six weeks around the pinned month', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)

		// March 2025 on a Sunday start opens on 23 February and ends 5 April.
		await expect(month.cells).toHaveCount(42)
		await expect(month.cellOn('2025-02-23')).toHaveCount(1)
		await expect(month.cellOn('2025-04-05')).toHaveCount(1)
	})

	test('navigating a month keeps the weekday row and moves the days', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)

		await expect(month.title).toHaveText(/Mar 2025/)
		await month.next()

		await expect(month.title).toHaveText(/Apr 2025/)
		await expect(month.cellOn('2025-04-01')).toHaveCount(1)
		// April is not March: the pinned today falls out of view entirely.
		await expect(month.todayMarker).toHaveCount(0)
	})

	test('collapses events past dayMaxEvents into an overflow indicator', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'many-events',
			view: 'month',
			settings: { dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)

		// Seven events, two shown, so five are behind the indicator.
		await expect(month.overflowIndicators).toHaveCount(1)
		await expect(month.overflowIndicators).toHaveText('+5 more')
	})

	test('draws an event longer than a row as one bar per row', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'spanning-event', view: 'month' })
		const month = new MonthGrid(page)

		// 5 to 19 March crosses three of the grid's week rows.
		await expect(month.event('Conference fortnight')).toHaveCount(3)
	})
})

test.describe('time grids', () => {
	test('a week shows seven day columns', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })

		await expect(new TimeGrid(page).dayColumns).toHaveCount(7)
	})

	test('hiddenDays removes those columns', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { hiddenDays: 'saturday,sunday' },
		})

		await expect(new TimeGrid(page).dayColumns).toHaveCount(5)
	})

	test('an overnight event is cut into one bar per day column', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'overnight-event', view: 'week' })

		// 22:00 Wednesday to 02:00 Thursday: Wednesday holds the real start,
		// Thursday the real end, so the event appears twice.
		await expect(new TimeGrid(page).event('Night shift')).toHaveCount(2)
	})

	test('all-day events sit in the all-day row, not the time grid', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'all-day-events', view: 'week' })
		const grid = new TimeGrid(page)

		await expect(grid.allDayRow).toBeVisible()
		await expect(
			grid.allDayRow.getByText('Public holiday', { exact: false })
		).toBeVisible()
	})

	test('a shorter slot duration splits the grid more finely', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { slot: 15 },
		})

		// A 15 minute event is the shortest thing the grid draws; it must still
		// reach the screen rather than collapsing to nothing.
		await expect(new TimeGrid(page).event('Quarter hour')).toBeVisible()
	})

	test('overlapping events all stay reachable', async ({ page }) => {
		await gotoScenario(page, { scenario: 'overlapping-events', view: 'day' })
		const grid = new TimeGrid(page)

		// Four events sharing an hour: the layout may cascade or split, but none
		// of them may be dropped.
		for (const title of ['First', 'Second', 'Third', 'Fourth']) {
			await expect(grid.event(title).first()).toBeVisible()
		}
	})
})

test.describe('navigation', () => {
	test('today returns to the pinned day from anywhere', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const calendar = new CalendarPage(page)

		await calendar.next()
		await calendar.next()
		await expect(calendar.todayMarker).toHaveCount(0)

		await calendar.today()

		await expect(calendar.title).toHaveText(/Mar 2025/)
		await expect(calendar.todayMarker).toHaveText('12')
	})

	test('previous and next are inverses', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		const calendar = new CalendarPage(page)
		const before = await calendar.title.textContent()

		await calendar.next()
		await calendar.previous()

		await expect(calendar.title).toHaveText(before ?? '')
	})
})

test.describe('the week that spans two months', () => {
	test('keeps cells on both sides of the boundary interactive', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'cross-month-week',
			view: 'week',
			date: '2025-03-31T00:00:00.000Z',
		})

		// The regression from #259 / #260: in a week view no cell is month
		// padding, so nothing in this week may be disabled for being 'outside'.
		const disabled = page.locator('[data-disabled="true"]')

		await expect(disabled).toHaveCount(0)
	})

	/*
	 * The counterpart, which is what makes the assertion above mean anything: a
	 * count of zero only says something if that selector matches elsewhere. It
	 * also pins current month-view behaviour, where padding days are disabled.
	 * That deviates from FullCalendar and is filed as #269, closed as not
	 * planned — so when it changes, this test is the one that should fail and
	 * say so, rather than the change going unnoticed.
	 */
	test('month padding is disabled, unlike a week that merely crosses months', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })

		const disabled = page.locator('[data-disabled="true"]')

		await expect(disabled.first()).toBeAttached()
	})
})

/*
 * #280. An hour column and a day column are different units, but the cells were
 * bucketed by calendar day either way, so all 24 hour columns of a resource row
 * shared one entry and each was handed the whole day. Every cell then claimed to
 * be hiding events, including hours holding nothing.
 */
test.describe('resource day view overflow', () => {
	test('no hour cell claims hidden events when none are hidden', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resource-day-overflow',
			view: 'day',
			orientation: 'horizontal',
		})
		const calendar = new CalendarPage(page)
		await calendar.expectRendered()

		// Seven events in seven separate hours, four allowed per cell: nothing is
		// ever hidden, so no cell may say otherwise.
		await expect(calendar.root.getByText(/\+\d+ more/)).toHaveCount(0)
	})

	test('each hour cell holds only its own event', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'resource-day-overflow',
			view: 'day',
			orientation: 'horizontal',
		})

		// The cell's own signal is the height placeholder it renders per event it
		// believes it holds, which carries the title as its test id. Asserting the
		// bars instead would prove nothing: those come from the events layer,
		// which this bug never touched, and they render once either way.
		for (const index of [1, 4, 7]) {
			await expect(page.getByTestId(`Course ${index}`)).toHaveCount(1)
		}
	})
})

/**
 * How far the row for `hour` sits from the scroll viewport's leading edge, in
 * pixels along the grid's time axis. After a scroll to that hour it is the same
 * for every hour that is not clamped, which is what makes it comparable across
 * two different scrollTimes.
 */
const hourOffset = (
	page: Page,
	scrollTestId: string,
	hour: string,
	axis: 'vertical' | 'horizontal'
): Promise<number> =>
	page.evaluate(
		({ scrollTestId, hour, axis }) => {
			const viewport = document.querySelector(
				`[data-testid="${scrollTestId}"] [data-radix-scroll-area-viewport]`
			)
			const row = viewport?.querySelector(`[data-hour="${hour}"]`)
			if (!viewport || !row) {
				throw new Error(`no row for hour ${hour} in ${scrollTestId}`)
			}
			const viewportRect = viewport.getBoundingClientRect()
			const rowRect = row.getBoundingClientRect()
			return axis === 'vertical'
				? rowRect.top - viewportRect.top
				: rowRect.left - viewportRect.left
		},
		{ scrollTestId, hour, axis }
	)

test.describe('scrollTime', () => {
	// FullCalendar's scrollTime "determines how far forward the scroll pane is
	// initially scrolled", and it is reapplied whenever it changes, not only on
	// navigation. Both hours are early enough to stay clear of the end of the
	// day, where the browser clamps the scroll and the hours stop lining up (the
	// timeline has ~10 columns of room at this viewport; 12:00 would clamp).
	const cases = [
		{
			name: 'week time grid',
			scenario: 'basic',
			orientation: undefined,
			scrollTestId: 'vertical-grid-scroll',
			axis: 'vertical',
		},
		{
			name: 'resource day timeline',
			scenario: 'resources',
			orientation: 'horizontal',
			scrollTestId: 'horizontal-grid-scroll',
			axis: 'horizontal',
		},
	] as const

	for (const { name, scenario, orientation, scrollTestId, axis } of cases) {
		test(`changing it on a mounted ${name} scrolls to the new hour`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario,
				view: orientation ? 'day' : 'week',
				orientation,
				settings: { scrollTime: '06:00', height: '500px' },
			})
			const landing = await hourOffset(page, scrollTestId, '06', axis)

			await setSettings(page, { scrollTime: '09:00' })

			await expect
				.poll(() => hourOffset(page, scrollTestId, '09', axis))
				.toBe(landing)
		})
	}
})
