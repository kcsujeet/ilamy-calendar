import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, setSettings } from './support/harness'
import {
	CalendarPage,
	MonthGrid,
	ResourceAxis,
	TimeGrid,
} from './support/pages'

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

	test('the overflow indicator opens a dialog listing every event of the day', async ({
		page,
	}) => {
		// Only cells that draw events mount the dialog; this proves the cells
		// that can show the indicator still have one behind it.
		await gotoScenario(page, {
			scenario: 'many-events',
			view: 'month',
			settings: { dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)

		await month.overflowIndicators.click()

		const dialog = page.getByRole('dialog')
		await expect(dialog).toContainText('March 12, 2025')
		await expect(dialog.getByText(/^Event \d$/)).toHaveCount(7)
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

// The header has two clusters: navigation (previous/next, Today, the date
// picker) and actions (view, Export, New). It stacks them on narrow screens and
// lays them in one row once the row fits (#298). Each case is checked across
// the full width range, because the failures were all at one breakpoint or
// another: the navigation cut off at both edges on a phone, and wrapped beside
// a one-line action cluster where a row switched on before it fit.
test.describe('header layout across widths', () => {
	const HEADER_WIDTHS = [
		300, 320, 360, 414, 480, 512, 544, 576, 608, 640, 672, 720, 768, 832, 896,
		1024, 1280,
	]

	interface HeaderLayout {
		isRow: boolean
		/** How far any control reaches past the header's own box. */
		clippedBy: number
		/** In a row: how far the navigation reaches into the actions. */
		overlapBy: number
		navigationLines: number
		actionLines: number
	}

	const readHeaderLayout = (page: Page): Promise<HeaderLayout> =>
		page.getByTestId('calendar-header').evaluate(async (header) => {
			// Mid-animation transforms would move the boxes being measured.
			const animations = header.getAnimations({ subtree: true })
			await Promise.all(animations.map((animation) => animation.finished))
			const row = header.firstElementChild as HTMLElement
			const [navigation, actions] = [...row.children] as HTMLElement[]
			const headerBox = header.getBoundingClientRect()
			const visibleBoxes = (cluster: HTMLElement) =>
				[...cluster.children]
					.filter((child) => (child as HTMLElement).offsetParent !== null)
					.map((child) => child.getBoundingClientRect())
			// Lines, not elements: children whose tops are within a few pixels of
			// each other sit on the same line.
			const countLines = (cluster: HTMLElement) => {
				const tops = visibleBoxes(cluster)
					.map((box) => box.top)
					.sort((a, b) => a - b)
				let lines = 0
				let lineTop = Number.NEGATIVE_INFINITY
				for (const top of tops) {
					if (top - lineTop > 12) {
						lines += 1
						lineTop = top
					}
				}
				return lines
			}
			const navigationBoxes = visibleBoxes(navigation)
			const actionBoxes = visibleBoxes(actions)
			const allBoxes = [...navigationBoxes, ...actionBoxes]
			const leftmost = Math.min(...allBoxes.map((box) => box.left))
			const rightmost = Math.max(...allBoxes.map((box) => box.right))
			const isRow = getComputedStyle(row).flexDirection === 'row'
			const navigationRight = Math.max(...navigationBoxes.map((b) => b.right))
			const actionsLeft = Math.min(...actionBoxes.map((b) => b.left))
			return {
				isRow,
				clippedBy: Math.max(
					0,
					Math.round(headerBox.left - leftmost),
					Math.round(rightmost - headerBox.right)
				),
				overlapBy: isRow
					? Math.max(0, Math.round(navigationRight - actionsLeft))
					: 0,
				navigationLines: countLines(navigation),
				actionLines: countLines(actions),
			}
		})

	for (const locale of ['en', 'de']) {
		for (const view of ['day', 'week', 'month', 'year'] as const) {
			test(`fits at every width: ${view}, ${locale}`, async ({ page }) => {
				await gotoScenario(page, {
					scenario: 'basic',
					view,
					settings: { locale },
				})

				for (const width of HEADER_WIDTHS) {
					await page.setViewportSize({ width, height: 600 })
					const layout = await readHeaderLayout(page)

					// A row only when each cluster fits on one line beside the other;
					// stacked, the navigation may wrap on a narrow phone.
					const expectedLayout = layout.isRow
						? { clippedBy: 0, overlapBy: 0, navigationLines: 1, actionLines: 1 }
						: {
								clippedBy: 0,
								overlapBy: 0,
								navigationLines: layout.navigationLines,
								actionLines: 1,
							}
					expect(
						{
							clippedBy: layout.clippedBy,
							overlapBy: layout.overlapBy,
							navigationLines: layout.navigationLines,
							actionLines: layout.actionLines,
						},
						`${width}px (${layout.isRow ? 'row' : 'stacked'})`
					).toEqual(expectedLayout)
				}
			})
		}
	}

	test('lays out as a single row on a desktop and stacks on a phone', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'vertical',
		})

		await page.setViewportSize({ width: 1280, height: 600 })
		expect((await readHeaderLayout(page)).isRow).toBe(true)

		await page.setViewportSize({ width: 360, height: 600 })
		expect((await readHeaderLayout(page)).isRow).toBe(false)
	})
})

// The recurrence plugin caches each series' expansion across navigations
// (rrule walks from DTSTART on every query, so a series that began years ago
// was re-walked per column). What it draws must not depend on the cache.
test.describe('recurring events', () => {
	/** The occurrences the time grid draws: each bar's id and where it sits. */
	const readOccurrenceBars = async (page: Page) => {
		// Navigation slides the grid in; measure once it has stopped moving.
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)
		return page
			.locator('[data-testid^="vertical-event-"]')
			.evaluateAll((bars) =>
				bars.map((bar) => {
					const box = bar.getBoundingClientRect()
					const testId = bar.getAttribute('data-testid')
					const left = Math.round(box.left)
					const top = Math.round(box.top)
					return `${testId}@${left},${top}`
				})
			)
	}

	test("a series that began years ago shows this week's occurrences", async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
		})
		const grid = new TimeGrid(page)

		// The week of 9 March 2025: Monday the 10th and Wednesday the 12th.
		await expect(grid.event('Long-running class')).toHaveCount(2)
		await expect(grid.event('Daily stand-up')).toHaveCount(7)
	})

	test('navigating away and back draws the same occurrences', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
		})
		const grid = new TimeGrid(page)
		await expect(grid.event('Daily stand-up')).toHaveCount(7)
		const barsBefore = await readOccurrenceBars(page)

		await grid.next()
		await grid.next()
		await grid.previous()
		await grid.previous()

		await expect(grid.event('Daily stand-up')).toHaveCount(7)
		expect(await readOccurrenceBars(page)).toEqual(barsBefore)
	})

	// #315: "delete this and following" ended the series but left occurrences
	// moved after the cut on the grid. "Edit this and following" removes them.
	test('deleting "this and following" takes later moved occurrences with it', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring-moved',
			view: 'week',
			plugins: ['recurrence'],
		})
		const grid = new TimeGrid(page)
		await expect(grid.event('Stand-up')).toHaveCount(5)
		await expect(grid.event('Rescheduled check-in')).toHaveCount(1)

		// Monday and Tuesday come first; the third bar is Wednesday 12 March.
		await page
			.locator('[data-testid^="vertical-event-moved-series"]')
			.nth(2)
			.click()
		await page.getByRole('button', { name: 'Delete' }).click()
		await page.getByText('This and following events').click()

		await expect(grid.event('Stand-up')).toHaveCount(2)
		await expect(grid.event('Rescheduled check-in')).toHaveCount(0)
	})

	// #309: one user action is reported once through onEventsChange, with every
	// row it touched, as FullCalendar fires one eventChange per action. "Edit all"
	// updates the series and deletes the moved occurrence it replaces.
	test('editing "all events" reports one change with every row it touched', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring-moved',
			view: 'week',
			plugins: ['recurrence'],
		})
		const grid = new TimeGrid(page)
		await expect(grid.event('Stand-up')).toHaveCount(5)

		// The third bar is Wednesday 12 March.
		await page
			.locator('[data-testid^="vertical-event-moved-series"]')
			.nth(2)
			.click()
		await page.locator('input[name="title"]').fill('Team sync')
		await page.getByRole('button', { name: 'Update' }).click()
		await page.getByText('All events', { exact: true }).click()

		await expect(grid.event('Team sync')).toHaveCount(6)
		expect(await grid.eventChanges()).toEqual([
			{
				action: 'update',
				scope: 'all',
				event: expect.stringMatching(/^moved-series_/),
				added: [],
				updated: ['moved-series'],
				deleted: ['moved-friday'],
			},
		])
	})

	// #307: occurrences after a daylight-saving change kept the series start's
	// UTC offset and were drawn an hour late. RFC 5545 §3.8.5.3: instances
	// start "at the same local time regardless of time zone changes", so every
	// occurrence, the change day's included (#311), shares the 09:00 one-off's row.
	test('a 09:00 series stays at 09:00 across the spring change', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'recurring-dst',
			view: 'week',
			plugins: ['recurrence'],
			timezone: 'America/New_York',
		})
		const grid = new TimeGrid(page)
		await expect(grid.event('Morning check-in')).toHaveCount(7)
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)

		/** The distinct tops of the bars whose test id starts with `prefix`. */
		const readTops = async (prefix: string) => {
			const tops = await page
				.locator(`[data-testid^="vertical-event-${prefix}"]`)
				.evaluateAll((bars) =>
					bars.map((bar) => Math.round(bar.getBoundingClientRect().top))
				)
			return [...new Set(tops)]
		}

		const nineOClockTops = await readTops('dst-reference')
		expect(nineOClockTops).toHaveLength(1)
		expect(await readTops('dst-series')).toEqual(nineOClockTops)

		// The week before is EST, and the series is still on the same row.
		await grid.previous()
		await expect(grid.event('Morning check-in')).toHaveCount(3)
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)
		expect(await readTops('dst-series')).toEqual(nineOClockTops)
	})
})

/*
 * #311. Rows and columns are labelled by clock hour, so a 09:00 booking and the
 * now-line at 09:00 sit at hour 9 on any day, as FullCalendar places them
 * (`computeDateTop`, timegrid, v6.1.21). By elapsed time, the 23-hour spring
 * change day put them at hour 8 and the 25-hour autumn one at hour 10.
 */
test.describe('a day the clocks change', () => {
	const DAYS = [
		{
			name: 'the spring change day',
			nineAM: '2025-03-09T13:00:00.000Z',
			event: 'spring',
		},
		{
			name: 'an ordinary day',
			nineAM: '2025-03-12T13:00:00.000Z',
			event: 'ordinary',
		},
		{
			name: 'the autumn change day',
			nineAM: '2025-11-02T14:00:00.000Z',
			event: 'autumn',
		},
	] as const

	/** Where `selector` sits within its positioned parent, in hours of a 24-hour axis. */
	const readHour = async (
		page: Page,
		selector: string,
		axis: 'vertical' | 'horizontal'
	) => {
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)
		return page
			.locator(selector)
			.first()
			.evaluate((element, axisName) => {
				const parent = (element as HTMLElement).offsetParent
				const parentBox = parent?.getBoundingClientRect()
				const box = element.getBoundingClientRect()
				if (!parentBox) {
					return Number.NaN
				}
				const isVertical = axisName === 'vertical'
				const offset = isVertical
					? box.top - parentBox.top
					: box.left - parentBox.left
				const length = isVertical ? parentBox.height : parentBox.width
				return (offset / length) * 24
			}, axis)
	}

	for (const day of DAYS) {
		for (const orientation of ['vertical', 'horizontal'] as const) {
			test(`a 09:00 booking sits at 9 AM on ${day.name}, ${orientation}`, async ({
				page,
			}) => {
				await gotoScenario(page, {
					scenario: 'dst-days',
					view: 'day',
					orientation,
					timezone: 'America/New_York',
					date: day.nineAM,
				})
				const bar = `[data-testid="${orientation}-event-${day.event}"]`
				expect(await readHour(page, bar, orientation)).toBeCloseTo(9, 1)
			})

			test(`the now-line at 09:00 sits at 9 AM on ${day.name}, ${orientation}`, async ({
				page,
			}) => {
				await gotoScenario(page, {
					scenario: 'dst-days',
					view: 'day',
					orientation,
					timezone: 'America/New_York',
					date: day.nineAM,
					now: day.nineAM,
				})
				// The line is centred on its position, so read its middle.
				const line = '[data-testid="current-time-indicator"]'
				const hour = await readHour(page, line, orientation)
				const lineBox = await page.locator(line).first().boundingBox()
				const parentLength = await page
					.locator(line)
					.first()
					.evaluate((element, axisName) => {
						const parent = (element as HTMLElement).offsetParent
						const box = parent?.getBoundingClientRect()
						return axisName === 'vertical' ? box?.height : box?.width
					}, orientation)
				const lineThickness =
					orientation === 'vertical' ? lineBox?.height : lineBox?.width
				const halfLineInHours =
					((lineThickness ?? 0) / 2 / (parentLength ?? 1)) * 24
				expect(hour + halfLineInHours).toBeCloseTo(9, 1)
			})
		}
	}
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

	test('moving a week keeps the time grid cells mounted (#300)', async ({
		page,
	}) => {
		// Each cell is a dnd-kit droppable, and dnd-kit copies its whole registry
		// on every register and unregister. Remounting ~2000 cells per click made
		// a 15-minute resource week take seconds to navigate.
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { slot: 15 },
		})
		const grid = new TimeGrid(page)
		const firstCell = page.locator('[data-testid^="vertical-cell-"]').first()
		await firstCell.evaluate((cell) => {
			cell.setAttribute('data-probe', 'before-navigation')
		})

		await grid.next()

		await expect(firstCell).toHaveAttribute('data-start', /^2025-03-16/)
		await expect(firstCell).toHaveAttribute('data-probe', 'before-navigation')
	})

	// The same cost on the date-row grid and the all-day rows, which key their
	// cells in a separate component. 31 January, so every "next" also crosses
	// into February: the date-row grid once remounted on each new month too.
	for (const surface of [
		{ name: 'month', view: 'month' },
		{ name: 'week all-day row', view: 'week' },
		{
			name: 'resource week, horizontal',
			view: 'week',
			orientation: 'horizontal',
		},
		{
			name: 'resource day, horizontal',
			view: 'day',
			orientation: 'horizontal',
		},
		{
			name: 'resource month, horizontal',
			view: 'month',
			orientation: 'horizontal',
		},
		{
			name: 'resource week all-day rows',
			view: 'week',
			orientation: 'vertical',
		},
	] as const) {
		test(`navigating keeps every cell mounted: ${surface.name} (#300)`, async ({
			page,
		}) => {
			const isResourceSurface = 'orientation' in surface
			await gotoScenario(page, {
				scenario: isResourceSurface ? 'resources' : 'basic',
				view: surface.view,
				orientation: isResourceSurface ? surface.orientation : undefined,
				date: '2025-01-31T09:00:00.000Z',
			})
			const calendar = new CalendarPage(page)
			const titleBefore = await calendar.title.textContent()
			const cells = page.locator('.droppable-cell')
			const firstStartBefore = await cells.first().getAttribute('data-start')
			await cells.evaluateAll((all) => {
				for (const cell of all) {
					cell.setAttribute('data-probe', 'before-navigation')
				}
			})

			await calendar.next()

			// A cell without the probe is one React mounted fresh. February can
			// draw fewer cells than January, never one that was not kept.
			await expect(calendar.title).not.toHaveText(titleBefore ?? '')
			await expect(cells.first()).not.toHaveAttribute(
				'data-start',
				firstStartBefore ?? ''
			)
			await expect(
				page.locator('.droppable-cell:not([data-probe])')
			).toHaveCount(0)
		})
	}
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

/*
 * A resource id is `string | number`, so 0 is as real as any other. A truthy
 * `if (resourceId)` read it as "no resource" and skipped the filter, so the
 * row for resource 0 held every resource's events.
 */
test.describe('a resource with id 0', () => {
	const cases = (['horizontal', 'vertical'] as const).flatMap((orientation) =>
		(['day', 'week', 'month'] as const).map((view) => ({ orientation, view }))
	)

	for (const { orientation, view } of cases) {
		test(`draws each event once in a ${orientation} ${view}`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'numeric-resource-ids',
				view,
				orientation,
			})
			await new CalendarPage(page).expectRendered()

			// One event per resource: drawn twice means resource 0 drew both.
			const bars = (eventId: string) =>
				page.locator(`[data-testid="${orientation}-event-${eventId}"]`)
			await expect(bars('zero-1')).toHaveCount(1)
			await expect(bars('one-1')).toHaveCount(1)
		})
	}

	for (const orientation of ['horizontal', 'vertical'] as const) {
		test(`does not draw a second now dot in a ${orientation} day`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'numeric-resource-ids',
				view: 'day',
				orientation,
			})
			await new CalendarPage(page).expectRendered()

			// Every resource draws the now-line; only the first draws its dot.
			await expect(page.getByTestId('current-time-indicator')).toHaveCount(2)
			await expect(page.getByTestId('current-time-dot')).toHaveCount(1)
		})
	}

	test('its month cells hold only its own events', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'numeric-resource-ids',
			view: 'month',
			orientation: 'horizontal',
		})
		await new CalendarPage(page).expectRendered()

		// The cell's own signal is the placeholder it renders per event it
		// believes it holds, which carries the title as its test id.
		const zeroRow = page.getByTestId('horizontal-row-0')
		await expect(zeroRow.getByTestId('Room Zero booking')).toHaveCount(1)
		await expect(zeroRow.getByTestId('Room One booking')).toHaveCount(0)
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

test.describe('rendered hours change (#320)', () => {
	const PHONE_VIEWPORT = { width: 393, height: 852 }
	const CALENDAR_HEIGHT = '500px'
	const READER_SCROLL_PX = 100

	const readScroll = (viewport: Locator, axis: 'horizontal' | 'vertical') =>
		viewport.evaluate(
			(el, axis) => (axis === 'horizontal' ? el.scrollLeft : el.scrollTop),
			axis
		)

	// The scroll is applied in an effect after React commits; two animation
	// frames let any pending one land before a "nothing moved" read.
	const waitForEffects = (page: Page) =>
		page.evaluate(
			() =>
				new Promise<void>((resolve) =>
					requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
				)
		)

	const isAlignedOn = async (
		page: Page,
		scrollTestId: string,
		hour: string,
		axis: 'horizontal' | 'vertical'
	) => {
		const { scrolled, expected } = await scrollAlignment(
			page,
			scrollTestId,
			`[data-hour="${hour}"]`,
			'[data-hour="06"]',
			axis
		)
		return { moved: scrolled > 0, aligned: Math.abs(scrolled - expected) < 1 }
	}

	for (const axis of ['horizontal', 'vertical'] as const) {
		const scrollTestId = `${axis}-grid-scroll`

		for (const scrollToNow of [true, false]) {
			// Now is pinned at 09:00 and scrollTime is 07:00, so landing on now and
			// falling back to scrollTime end up on different hours.
			const landingHour = scrollToNow ? '09' : '07'

			test(`${axis} reapplies initial scrolling when the hours widen (scrollToNow=${scrollToNow})`, async ({
				page,
			}) => {
				await page.setViewportSize(PHONE_VIEWPORT)
				await gotoScenario(page, {
					scenario: 'resources',
					view: 'day',
					orientation: axis,
					settings: {
						scrollToNow: String(scrollToNow),
						scrollTime: '07:00',
						hideNonBusinessHours: 'true',
						businessHours: '12-17',
						height: CALENDAR_HEIGHT,
					},
				})
				const viewport = page.locator(scrollViewportSelector(scrollTestId))
				// Proves the hours change re-renders the mounted grid rather than
				// remounting it, which would scroll for an unrelated reason.
				await viewport.evaluate((el) => {
					el.setAttribute('data-mounted-probe', 'kept')
				})

				await setSettings(page, { businessHours: '6-17' })

				await expect(viewport).toHaveAttribute('data-mounted-probe', 'kept')
				await expect
					.poll(() => isAlignedOn(page, scrollTestId, landingHour, axis))
					.toEqual({ moved: true, aligned: true })
			})
		}

		test(`${axis} leaves a reader's scroll alone on a re-render and when a resource is added`, async ({
			page,
		}) => {
			await page.setViewportSize(PHONE_VIEWPORT)
			await gotoScenario(page, {
				scenario: 'resources',
				view: 'day',
				orientation: axis,
				settings: {
					scrollToNow: 'true',
					hideNonBusinessHours: 'true',
					businessHours: '6-17',
					height: CALENDAR_HEIGHT,
					resourceCount: 2,
				},
			})
			const viewport = page.locator(scrollViewportSelector(scrollTestId))
			await expect
				.poll(() => isAlignedOn(page, scrollTestId, '09', axis))
				.toEqual({ moved: true, aligned: true })
			await viewport.evaluate(
				(el, { axis, offset }) => {
					if (axis === 'horizontal') {
						el.scrollLeft = offset
						return
					}
					el.scrollTop = offset
				},
				{ axis, offset: READER_SCROLL_PX }
			)

			await setSettings(page, { timeFormat: '24-hour' })
			await expect(page.locator('[data-hour="13"]').first()).toContainText('13')
			await waitForEffects(page)
			expect(await readScroll(viewport, axis)).toBe(READER_SCROLL_PX)

			await setSettings(page, { resourceCount: 3 })
			await expect(new ResourceAxis(page).resource('Room C')).toBeVisible()
			await waitForEffects(page)
			expect(await readScroll(viewport, axis)).toBe(READER_SCROLL_PX)
		})
	}
})

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

	// A calendar taller than the window scrolls with the PAGE, not only inside
	// itself. A regular grid's header sits outside the calendar's scroller, so
	// `stickyViewHeader` pins it to the window; the title has to clear it there
	// too, or it slides under it (#290 follow-up, reported on the PR).
	const pageScrollCases = [
		{
			// The all-day row sticks with the header, so it is the lower edge.
			name: 'under a header stuck to the window',
			settings: {},
			edge: (page: Page) => page.getByTestId('vertical-grid-all-day'),
		},
		{
			name: 'above the window when the header scrolls away',
			settings: { stickyViewHeader: 'false' },
			edge: undefined,
		},
	] as const

	for (const c of pageScrollCases) {
		test(`a page-scrolled week keeps the title in view ${c.name}`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'long-events',
				view: 'week',
				settings: { ...c.settings, height: '1600px' },
			})
			const bar = page.getByTestId('vertical-event-long-1')
			const title = bar.getByText('Long shift', { exact: true })

			await expect
				.poll(async () => {
					await page.evaluate(() => window.scrollTo(0, 600))
					const [barBox, titleBox, edgeBox] = await Promise.all([
						bar.boundingBox(),
						title.boundingBox(),
						c.edge ? c.edge(page).boundingBox() : null,
					])
					if (!barBox || !titleBox) {
						return undefined
					}
					// The first pixel the reader can see: below the stuck header, or
					// the window's own top once nothing covers it.
					const edge = edgeBox ? edgeBox.y + edgeBox.height : 0
					return {
						barRunsUnderEdge: barBox.y < edge,
						titleStart: Math.round(titleBox.y - edge),
					}
				})
				.toEqual({ barRunsUnderEdge: true, titleStart: 2 })
		})
	}

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

test.describe('the current hour', () => {
	// The hour label holding now is marked in every time axis, the resource
	// timeline's header row and the time grids' gutter alike: one label,
	// `aria-current="time"` ("the current time within a set of times",
	// https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-current).
	const grids = [
		{ name: 'week time grid', view: 'week', scenario: 'basic', settings: {} },
		{ name: 'day time grid', view: 'day', scenario: 'basic', settings: {} },
		{
			name: 'vertical resource week',
			view: 'week',
			scenario: 'resources',
			orientation: 'vertical',
			settings: { granularity: 'hourly' },
		},
		{
			name: 'vertical resource day',
			view: 'day',
			scenario: 'resources',
			orientation: 'vertical',
			settings: {},
		},
		{
			name: 'resource day timeline',
			view: 'day',
			scenario: 'resources',
			orientation: 'horizontal',
			settings: {},
		},
	] as const

	for (const grid of grids) {
		test(`the ${grid.name} marks the hour holding now`, async ({ page }) => {
			await gotoScenario(page, {
				scenario: grid.scenario,
				view: grid.view,
				orientation: 'orientation' in grid ? grid.orientation : undefined,
				settings: grid.settings,
			})

			// The pinned instant is 09:00 on a Wednesday, in UTC.
			const currentHour = page.locator('[aria-current="time"]')
			await expect(currentHour).toHaveCount(1)
			await expect(currentHour).toHaveText('9 AM')
		})
	}

	test('a week that does not hold today marks no hour', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })
		await new CalendarPage(page).next()

		await expect(page.locator('[aria-current="time"]')).toHaveCount(0)
	})
})

test.describe('hourly resource timeline day labels', () => {
	// Each day's label sticks in the middle of the timeline, so as midnight
	// crosses the middle the outgoing day's label is pushed against the end of
	// its day while the incoming one sits at the start of its own. Without
	// padding the two touched, reading as "WedThu" (reported on #292).
	test('two labels meeting at midnight keep apart', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { granularity: 'hourly', height: '500px' },
		})
		const viewport = page.locator(
			scrollViewportSelector('horizontal-grid-scroll')
		)
		const dayHeaders = page.getByTestId('resource-week-day-header')
		const wednesday = dayHeaders.getByText('Wed', { exact: true })
		const thursday = dayHeaders.getByText('Thu', { exact: true })

		await expect
			.poll(async () => {
				// Midnight 20px past the middle of the timeline, where the labels
				// stick: Wednesday's is pushed against the end of its day.
				await viewport.evaluate((el) => {
					const thursdayCell = [
						...el.querySelectorAll('[data-testid="resource-week-day-header"]'),
					].find((cell) => cell.textContent?.includes('Thu'))
					if (!thursdayCell) {
						return
					}
					const middle = el.getBoundingClientRect().left + el.clientWidth / 2
					const offset = thursdayCell.getBoundingClientRect().left - middle
					el.scrollLeft += offset - 20
				})
				const [wednesdayBox, thursdayBox] = await Promise.all([
					wednesday.boundingBox(),
					thursday.boundingBox(),
				])
				if (!wednesdayBox || !thursdayBox) {
					return undefined
				}
				return Math.round(thursdayBox.x - (wednesdayBox.x + wednesdayBox.width))
			})
			// Each label's 8px padding, plus the 1px day divider between them.
			.toBe(17)
	})
})

test.describe('an off-the-hour event on the hourly timeline', () => {
	// FullCalendar's timeline places an event at its exact times within a slot
	// (`computeMsSlotCoverage` in `TimelineCoords.ts`). Ours drew whole hours, so
	// a 10:27-12:27 event looked three hours long, and dragging it seemed to cut
	// an hour off when the mirror showed its real two.
	const openTimeline = (page: Page) =>
		gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'horizontal',
			settings: { scrollTime: '08:00', height: '600px' },
		})

	test('draws the bar from its exact start to its exact end', async ({
		page,
	}) => {
		await openTimeline(page)
		const bar = page.getByTestId('horizontal-event-long-res-3')

		// The bar's own geometry, as a percentage of its row: the drawn box is
		// inset a few pixels so neighbouring bars do not touch. A day row is 24
		// hours wide, so a percentage converts straight to minutes.
		await expect
			.poll(async () => {
				const [left, width] = await Promise.all([
					bar.getAttribute('data-left'),
					bar.getAttribute('data-width'),
				])
				const minutesPerPercent = (24 * 60) / 100
				const startMinutes = Number(left) * minutesPerPercent
				const endMinutes = (Number(left) + Number(width)) * minutesPerPercent
				return {
					start: Math.round(startMinutes),
					end: Math.round(endMinutes),
				}
			})
			.toEqual({ start: 10 * 60 + 27, end: 12 * 60 + 27 })
	})

	test('a very short event keeps a minimum width', async ({ page }) => {
		// FullCalendar keeps timeline events at least `eventMinWidth` wide. Ours
		// is eight spacing units: 32px at the harness's default theme, where the
		// five-minute event would otherwise be about 7px of an 80px hour.
		await openTimeline(page)
		const bar = page.getByTestId('horizontal-event-long-res-4')

		await expect
			.poll(async () => Math.round((await bar.boundingBox())?.width ?? 0))
			.toBe(32)
	})

	test('a drag keeps its length in the mirror and after the drop', async ({
		page,
	}) => {
		await openTimeline(page)
		const calendar = new CalendarPage(page)
		const bar = page.getByTestId('horizontal-event-long-res-3')
		await expect(bar).toBeVisible()
		const barBox = await bar.boundingBox()
		const hourBox = await page
			.getByTestId('resource-day-time-label-10')
			.boundingBox()
		if (!barBox || !hourBox) {
			throw new Error('the bar or the 10:00 header cell is not on screen')
		}

		// One hour later, along its own row, in steps so the sensor activates.
		const grabX = barBox.x + barBox.width / 2
		const grabY = barBox.y + barBox.height / 2
		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX + (hourBox.width * step) / 8, grabY)
		}

		const mirrorBox = await calendar.dragMirror.boundingBox()
		expect(Math.round(mirrorBox?.width ?? 0)).toBe(Math.round(barBox.width))

		await page.mouse.up()
		await expect
			.poll(async () => {
				const { start, end } = await calendar.eventNamed('Yoga class')
				return (Date.parse(end) - Date.parse(start)) / 60_000
			})
			.toBe(120)
	})
})

test.describe('an all-day event on a vertical day grid (#322)', () => {
	// A vertical grid whose rows are whole days (the resource month view, and
	// the resource week view at daily granularity) has no all-day row above it,
	// so its own rows are the only place an all-day event can be drawn, as
	// FullCalendar's day grid draws all-day and timed events alike (v6.1.21,
	// daygrid/src/DayTable.tsx has no all-day split). The horizontal resource
	// month is the control: it drew the event before the fix too.
	//
	// "Site survey" is all-day on Room A, 3 March to 13 March exclusive: its bar
	// starts where its first visible day's row starts and ends where the 13th's
	// row starts (the rows sit a 1px gap apart, which the bar runs across). The
	// week of the pinned date (9-15 March) shows its last four days.
	const cases = [
		{
			name: 'resource month, vertical',
			view: 'month',
			settings: {},
			firstDay: '2025-03-03',
		},
		{
			name: 'resource week at daily granularity, vertical',
			view: 'week',
			settings: { granularity: 'daily' },
			firstDay: '2025-03-09',
		},
	] as const

	test('the horizontal resource month draws it (control)', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
		})
		await expect(new CalendarPage(page).event('Site survey')).toBeVisible()
	})

	for (const c of cases) {
		test(`${c.name} draws it across its days`, async ({ page }) => {
			await gotoScenario(page, {
				scenario: 'long-resource-events',
				view: c.view,
				orientation: 'vertical',
				settings: c.settings,
			})
			const calendar = new CalendarPage(page)
			await calendar.expectRendered()

			const roomACell = (day: string) =>
				page.locator(
					`[data-resource-id="r1"][data-start="${day}T00:00:00.000Z"]`
				)
			const [bar, firstCell, endCell] = await Promise.all([
				page.getByTestId('vertical-event-long-res-1').boundingBox(),
				roomACell(c.firstDay).boundingBox(),
				roomACell('2025-03-13').boundingBox(),
			])
			if (!bar || !firstCell || !endCell) {
				throw new Error(
					'"Site survey", its first day or its end day is not on screen'
				)
			}

			const barTop = Math.round(bar.y)
			const barBottom = Math.round(bar.y + bar.height)
			const firstDayTop = Math.round(firstCell.y)
			const endDayTop = Math.round(endCell.y)
			expect({ barTop, barBottom }).toEqual({
				barTop: firstDayTop,
				barBottom: endDayTop,
			})
		})
	}
})
