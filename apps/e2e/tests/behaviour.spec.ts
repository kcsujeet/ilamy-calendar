import { expect, type Locator, type Page, test } from '@playwright/test'
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

/** The Radix scroll viewport inside the grid scroll area with `testId`. */
const scrollViewportSelector = (testId: string): string =>
	`[data-testid="${testId}"] [data-radix-scroll-area-viewport]`

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
		({ selector, hour, axis }) => {
			const viewport = document.querySelector(selector)
			const row = viewport?.querySelector(`[data-hour="${hour}"]`)
			if (!viewport || !row) {
				throw new Error(`no row for hour ${hour} in ${selector}`)
			}
			const viewportRect = viewport.getBoundingClientRect()
			const rowRect = row.getBoundingClientRect()
			return axis === 'vertical'
				? rowRect.top - viewportRect.top
				: rowRect.left - viewportRect.left
		},
		{ selector: scrollViewportSelector(scrollTestId), hour, axis }
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

/**
 * Where the viewport is scrolled to, next to where it would be if `target` sat
 * exactly at the start of the scrollable time area. `origin` is the first
 * element of that area, which sits right after any sticky resource column or
 * header; scrolling by the distance between the two lines the target up with
 * where the origin sat.
 */
const scrollAlignment = (
	page: Page,
	scrollTestId: string,
	target: string,
	origin: string,
	axis: 'vertical' | 'horizontal'
): Promise<{ scrolled: number; expected: number }> =>
	page.evaluate(
		({ selector, target, origin, axis }) => {
			const viewport = document.querySelector(selector)
			const targetEl = viewport?.querySelector(target)
			const originEl = viewport?.querySelector(origin)
			if (!viewport || !targetEl || !originEl) {
				throw new Error(`missing ${target} or ${origin} in ${selector}`)
			}
			const targetRect = targetEl.getBoundingClientRect()
			const originRect = originEl.getBoundingClientRect()
			// Both rects move with the scroll, so their distance is the scroll
			// offset that lines the target up with the origin's resting place.
			if (axis === 'vertical') {
				return {
					scrolled: viewport.scrollTop,
					expected: targetRect.top - originRect.top,
				}
			}
			return {
				scrolled: viewport.scrollLeft,
				expected: targetRect.left - originRect.left,
			}
		},
		{ selector: scrollViewportSelector(scrollTestId), target, origin, axis }
	)

const TIMED_CELL = '[data-start]:not([data-all-day="true"])'
const HOUR_ROW = '[data-hour]'

test.describe('scrollToNow', () => {
	// The pinned now is Wednesday 12 March 2025, 09:00 UTC. Each grid scrolls to
	// the cell holding it: an hour row, an hour column, or a whole day. The
	// height keeps every target clear of the end of the grid, where the browser
	// would clamp the scroll. `expectedOffset` is that cell's distance from the
	// start of the time area at the pinned viewport: nine 61px hour rows or 81px
	// hour columns (eighty-one columns into the week), and eleven 81px day
	// columns or 61px day rows into the month.
	const cases = [
		{
			name: 'week time grid',
			expectedOffset: 549,
			scenario: 'basic',
			view: 'week',
			orientation: undefined,
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			target: '[data-hour="09"]',
			origin: HOUR_ROW,
			axis: 'vertical',
		},
		{
			name: 'resource day timeline',
			expectedOffset: 729,
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: {},
			scrollTestId: 'horizontal-grid-scroll',
			target: '[data-hour="09"]',
			origin: HOUR_ROW,
			axis: 'horizontal',
		},
		{
			name: 'hourly resource week timeline',
			expectedOffset: 6561,
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { granularity: 'hourly' },
			scrollTestId: 'horizontal-grid-scroll',
			target: '[data-start="2025-03-12T09:00:00.000Z"]',
			origin: TIMED_CELL,
			axis: 'horizontal',
		},
		{
			name: 'resource month timeline (#285)',
			expectedOffset: 891,
			scenario: 'resources',
			view: 'month',
			orientation: 'horizontal',
			settings: {},
			scrollTestId: 'horizontal-grid-scroll',
			target: '[data-start="2025-03-12T00:00:00.000Z"]',
			origin: TIMED_CELL,
			axis: 'horizontal',
		},
		{
			// The one grid whose all-day row sits inside the scroll area: its
			// all-day cells hold now too, and must not be taken for the target.
			name: 'vertical resource day',
			expectedOffset: 549,
			scenario: 'resources',
			view: 'day',
			orientation: 'vertical',
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			target: '[data-hour="09"]',
			origin: HOUR_ROW,
			axis: 'vertical',
		},
		{
			name: 'vertical resource month',
			expectedOffset: 671,
			scenario: 'resources',
			view: 'month',
			orientation: 'vertical',
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			target: '[data-start="2025-03-12T00:00:00.000Z"]',
			origin: TIMED_CELL,
			axis: 'vertical',
		},
	] as const

	for (const c of cases) {
		test(`the ${c.name} opens on now`, async ({ page }) => {
			await gotoScenario(page, {
				scenario: c.scenario,
				view: c.view,
				orientation: c.orientation,
				settings: { ...c.settings, scrollToNow: 'true', height: '500px' },
			})

			const { scrolled, expected } = await scrollAlignment(
				page,
				c.scrollTestId,
				c.target,
				c.origin,
				c.axis
			)
			// Within a pixel: a column 81px wide lands on fractional offsets. The
			// first pins the layout being measured; the second, the scroll.
			expect(expected).toBeCloseTo(c.expectedOffset, 0)
			expect(scrolled).toBeCloseTo(expected, 0)
		})
	}

	test('a week without now falls back to scrollTime', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollToNow: 'true', scrollTime: '06:00', height: '500px' },
		})
		await new CalendarPage(page).next()

		await expect
			.poll(async () => {
				const { scrolled, expected } = await scrollAlignment(
					page,
					'vertical-grid-scroll',
					'[data-hour="06"]',
					HOUR_ROW,
					'vertical'
				)
				return scrolled - expected
			})
			.toBe(0)
	})

	// The scenario sets scrollTime 08:00, which a day grid has no hour to aim at,
	// so the grid has to open on its first day rather than where today was.
	const monthsWithoutNow = [
		{ orientation: 'horizontal', scrollTestId: 'horizontal-grid-scroll' },
		{ orientation: 'vertical', scrollTestId: 'vertical-grid-scroll' },
	] as const

	for (const { orientation, scrollTestId } of monthsWithoutNow) {
		test(`a ${orientation} resource month without now opens on its first day`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'resources',
				view: 'month',
				orientation,
				settings: { scrollToNow: 'true', height: '500px' },
			})
			await new CalendarPage(page).next()

			const viewport = page.locator(scrollViewportSelector(scrollTestId))
			await expect
				.poll(() => viewport.evaluate((el) => el.scrollLeft + el.scrollTop))
				.toBe(0)
		})
	}

	test('turning it on for a mounted calendar scrolls straight away', async ({
		page,
	}) => {
		// The scenario's scrollTime has already scrolled this range to 08:00, so
		// the range alone no longer justifies a scroll; the setting has to.
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { height: '500px' },
		})

		await setSettings(page, { scrollToNow: 'true' })

		await expect
			.poll(async () => {
				const { scrolled, expected } = await scrollAlignment(
					page,
					'horizontal-grid-scroll',
					'[data-hour="09"]',
					HOUR_ROW,
					'horizontal'
				)
				return Math.round(scrolled - expected)
			})
			.toBe(0)
	})

	test('an ordinary re-render leaves the reader where they scrolled', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'horizontal',
			settings: { scrollToNow: 'true', height: '500px' },
		})
		const viewport = page.locator(
			scrollViewportSelector('horizontal-grid-scroll')
		)
		await viewport.evaluate((el) => {
			el.scrollLeft = 40
		})

		// A setting the scroll does not depend on: the calendar re-renders, the
		// range and now are unchanged, so nothing should move.
		await setSettings(page, { dayMaxEvents: 2 })
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()

		expect(await viewport.evaluate((el) => el.scrollLeft)).toBe(40)
	})
})

/**
 * Where an event's title sits against the edge a reader can see, after the
 * grid is scrolled `scrollBy` pixels along `axis`. The edge is the far side of
 * the grid's own sticky column or header (`inset`), or the viewport itself when
 * nothing sticks there. Rounded: column widths land on fractional pixels.
 */
interface TitleGeometryQuery {
	scrollTestId: string
	barTestId: string
	title: string
	axis: 'horizontal' | 'vertical'
	scrollBy: number
	/** The grid's sticky column or header; absent, the viewport's own edge. */
	inset?: (page: Page) => Locator
}

const titleGeometry = async (page: Page, c: TitleGeometryQuery) => {
	const viewport = page.locator(scrollViewportSelector(c.scrollTestId))
	await viewport.evaluate(
		(el, { axis, scrollBy }) => {
			if (axis === 'horizontal') {
				el.scrollLeft = scrollBy
			} else {
				el.scrollTop = scrollBy
			}
		},
		{ axis: c.axis, scrollBy: c.scrollBy }
	)

	const bar = page.getByTestId(c.barTestId)
	const title = bar.getByText(c.title, { exact: true })
	const [barBox, titleBox, edgeBox] = await Promise.all([
		bar.boundingBox(),
		title.boundingBox(),
		(c.inset ? c.inset(page) : viewport).boundingBox(),
	])
	if (!barBox || !titleBox || !edgeBox) {
		throw new Error(`"${c.title}" or its edge is not on screen`)
	}

	const isHorizontal = c.axis === 'horizontal'
	const start = (box: typeof barBox) => (isHorizontal ? box.x : box.y)
	const size = (box: typeof barBox) => (isHorizontal ? box.width : box.height)
	// A sticky column or header hides everything up to its far side; with
	// none, the reader sees from the viewport's own leading edge.
	const edge = c.inset ? start(edgeBox) + size(edgeBox) : start(edgeBox)

	return {
		barStart: Math.round(start(barBox) - edge),
		titleStart: Math.round(start(titleBox) - edge),
		titleEnd: Math.round(start(titleBox) + size(titleBox) - edge),
		barEnd: Math.round(start(barBox) + size(barBox) - edge),
	}
}

const resourceLabel = (resourceId: string) => (page: Page) =>
	page.getByTestId(`horizontal-row-label-${resourceId}`)

test.describe('sticky event titles (#290)', () => {
	// FullCalendar's default event content puts `fc-sticky` on the title
	// (core/src/common/StandardEvent.tsx), pinned with `left: 0` on horizontal
	// bars (h-event.css) and `top: 0` on time-grid bars (v-event.css). Ours
	// clears the grid's own sticky column or header rather than the raw edge,
	// because in a resource grid those sit inside the same scroller. The default
	// title then keeps the gap it has unscrolled (4px beside, 2px below the
	// edge); a custom renderer offsets by the bare properties, so sits flush.
	const cases = [
		{
			name: 'resource month timeline',
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
			settings: {},
			scrollTestId: 'horizontal-grid-scroll',
			barTestId: 'horizontal-event-long-res-1',
			title: 'Site survey',
			axis: 'horizontal',
			expectedTitleStart: 4,
			scrollBy: 400,
			inset: resourceLabel('r1'),
		},
		{
			name: 'resource day timeline',
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'horizontal',
			settings: {},
			scrollTestId: 'horizontal-grid-scroll',
			barTestId: 'horizontal-event-long-res-2',
			title: 'Long shift',
			axis: 'horizontal',
			expectedTitleStart: 4,
			scrollBy: 500,
			inset: resourceLabel('r2'),
		},
		{
			name: 'week time grid',
			scenario: 'long-events',
			view: 'week',
			orientation: undefined,
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-1',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 2,
			scrollBy: 600,
			inset: undefined,
		},
		{
			name: 'day time grid',
			scenario: 'long-events',
			view: 'day',
			orientation: undefined,
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-1',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 2,
			scrollBy: 600,
			inset: undefined,
		},
		{
			// The header, all-day row included, sticks inside this scroller.
			name: 'vertical resource week',
			scenario: 'long-resource-events',
			view: 'week',
			orientation: 'vertical',
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-res-2',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 2,
			scrollBy: 600,
			inset: (page: Page) => page.getByTestId('vertical-grid-all-day'),
		},
		{
			name: 'vertical resource day',
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'vertical',
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-res-2',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 2,
			scrollBy: 600,
			inset: (page: Page) => page.getByTestId('vertical-grid-all-day'),
		},
		{
			// Without a sticky header nothing covers the top of the scroller, so
			// the title has only the viewport's own edge to clear.
			name: 'vertical resource day without a sticky header',
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'vertical',
			settings: { stickyViewHeader: 'false' },
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-res-2',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 2,
			scrollBy: 600,
			inset: undefined,
		},
		{
			// The all-day row scrolls sideways under its own sticky "All day" cell.
			name: 'vertical resource week all-day row',
			scenario: 'long-resource-events',
			view: 'week',
			orientation: 'vertical',
			settings: {},
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'horizontal-event-long-res-1',
			title: 'Site survey',
			axis: 'horizontal',
			expectedTitleStart: 4,
			scrollBy: 200,
			inset: (page: Page) =>
				page
					.getByTestId('vertical-grid-all-day')
					.getByText('All day', { exact: true })
					.locator('..'),
		},
		{
			// A custom renderer owns its markup, so nothing of ours sticks in it.
			// It opts in by reading the published offsets, as the docs show.
			name: 'resource month timeline with a custom renderer',
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
			settings: { renderEventVariant: 'sticky-title' },
			scrollTestId: 'horizontal-grid-scroll',
			barTestId: 'horizontal-event-long-res-1',
			title: 'Site survey',
			axis: 'horizontal',
			expectedTitleStart: 0,
			scrollBy: 400,
			inset: resourceLabel('r1'),
		},
		{
			name: 'vertical resource day with a custom renderer',
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'vertical',
			settings: { renderEventVariant: 'sticky-title' },
			scrollTestId: 'vertical-grid-scroll',
			barTestId: 'vertical-event-long-res-2',
			title: 'Long shift',
			axis: 'vertical',
			expectedTitleStart: 0,
			scrollBy: 600,
			inset: (page: Page) => page.getByTestId('vertical-grid-all-day'),
		},
	] as const

	for (const c of cases) {
		test(`the ${c.name} keeps a scrolled event's title in view`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: c.scenario,
				view: c.view,
				orientation: c.orientation,
				settings: { ...c.settings, height: '500px' },
			})

			await expect
				.poll(async () => {
					const { barStart, titleStart } = await titleGeometry(page, c)
					return { barRunsUnderEdge: barStart < 0, titleStart }
				})
				.toEqual({ barRunsUnderEdge: true, titleStart: c.expectedTitleStart })
		})
	}

	test('a grid with only its time gutter publishes the gutter as its sticky column', async ({
		page,
	}) => {
		// A vertical resource month has no all-day row, so its date gutter is
		// the only thing sticking to the left. 200px wide is narrow enough for
		// its three resource columns to scroll sideways under it.
		await page.setViewportSize({ width: 200, height: 700 })
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'vertical',
			settings: { renderEventVariant: 'sticky-title', height: '500px' },
		})

		await expect
			.poll(async () => {
				const { barStart, titleStart } = await titleGeometry(page, {
					scrollTestId: 'vertical-grid-scroll',
					barTestId: 'vertical-event-long-res-2',
					title: 'Long shift',
					axis: 'horizontal',
					scrollBy: 93,
					inset: (page: Page) => page.getByTestId('vertical-col-date-col'),
				})
				return { barRunsUnderEdge: barStart < 0, titleStart }
			})
			.toEqual({ barRunsUnderEdge: true, titleStart: 0 })
	})

	test("a dragged event's mirror keeps its title in view", async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
			settings: { height: '500px' },
		})
		const viewport = page.locator(
			scrollViewportSelector('horizontal-grid-scroll')
		)
		await viewport.evaluate((el) => {
			el.scrollLeft = 600
		})
		const [barBox, labelBox] = await Promise.all([
			page.getByTestId('horizontal-event-long-res-1').boundingBox(),
			resourceLabel('r1')(page).boundingBox(),
		])
		if (!barBox || !labelBox) {
			throw new Error('"Site survey" or its resource label is not on screen')
		}

		// Grabbed in the middle of what is visible, then one day column to the
		// RIGHT, in steps so the drag sensor activates: the mirror still starts
		// under the resource column. Leftward would near the scroller's edge,
		// where the drag auto-scrolls the grid and pulls the mirror into view.
		const visibleStart = labelBox.x + labelBox.width
		const grabX = (visibleStart + barBox.x + barBox.width) / 2
		const grabY = barBox.y + barBox.height / 2
		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX + (81 * step) / 8, grabY)
		}

		const mirror = new CalendarPage(page).dragMirror
		await expect
			.poll(async () => {
				const [mirrorBox, titleBox, labelBox] = await Promise.all([
					mirror.boundingBox(),
					mirror.getByText('Site survey', { exact: true }).boundingBox(),
					resourceLabel('r1')(page).boundingBox(),
				])
				if (!mirrorBox || !titleBox || !labelBox) {
					return undefined
				}
				const edge = labelBox.x + labelBox.width
				return {
					mirrorRunsUnderEdge: mirrorBox.x < edge,
					titleStart: Math.round(titleBox.x - edge),
				}
			})
			.toEqual({ mirrorRunsUnderEdge: true, titleStart: 4 })
		await page.mouse.up()
	})

	test("a dragged time-grid event's mirror keeps its title in view", async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'long-events',
			view: 'week',
			settings: { height: '500px' },
		})
		const viewport = page.locator(
			scrollViewportSelector('vertical-grid-scroll')
		)
		await viewport.evaluate((el) => {
			el.scrollTop = 600
		})
		const [barBox, viewportBox] = await Promise.all([
			page.getByTestId('vertical-event-long-1').boundingBox(),
			viewport.boundingBox(),
		])
		if (!barBox || !viewportBox) {
			throw new Error('"Long shift" is not on screen')
		}

		// One hour down from the middle of what is visible, clear of the edges
		// where the drag would auto-scroll the grid.
		const grabX = barBox.x + barBox.width / 2
		const grabY = (viewportBox.y + barBox.y + barBox.height) / 2
		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX, grabY + (61 * step) / 8)
		}

		// The segment in the start's column: a time grid draws one mirror per
		// day column the drop would span.
		const mirror = page
			.getByTestId('vertical-events-day-col-2025-03-12')
			.getByTestId('event-drag-preview-vertical')
		await expect
			.poll(async () => {
				const [mirrorBox, titleBox, edgeBox] = await Promise.all([
					mirror.boundingBox(),
					mirror.getByText('Long shift', { exact: true }).boundingBox(),
					viewport.boundingBox(),
				])
				if (!mirrorBox || !titleBox || !edgeBox) {
					return undefined
				}
				return {
					mirrorRunsUnderEdge: mirrorBox.y < edgeBox.y,
					titleStart: Math.round(titleBox.y - edgeBox.y),
				}
			})
			.toEqual({ mirrorRunsUnderEdge: true, titleStart: 2 })
		await page.mouse.up()
	})

	test('a title never leaves its own bar', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
			settings: { height: '500px' },
		})

		// Scrolled until only the last few pixels of the bar are left in view:
		// the title is pushed against its bar's end rather than past it.
		await expect
			.poll(async () => {
				const { titleEnd, barEnd } = await titleGeometry(page, {
					scrollTestId: 'horizontal-grid-scroll',
					barTestId: 'horizontal-event-long-res-1',
					title: 'Site survey',
					axis: 'horizontal',
					// Leaves the last 30px of the bar beside the resource column.
					scrollBy: 942,
					inset: resourceLabel('r1'),
				})
				return { titleEnd, barEnd }
			})
			// 5px short of the bar's end: the content's padding and border.
			.toEqual({ titleEnd: 22, barEnd: 27 })
	})
})
