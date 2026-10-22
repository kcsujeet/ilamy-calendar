import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid, TimeGrid } from './support/pages'

/*
 * `hiddenDays` and `weekends` in every date-based view. A hidden day has no
 * column or row, so the days on either side of it sit next to each other, and
 * a bar that crosses it covers only the days that are drawn.
 *
 * The clock is pinned to Wednesday 12 March 2025. March 2025 opens on a
 * Saturday, so its month grid runs Sunday 23 February to Saturday 5 April.
 */

const WIDTH_TOLERANCE_PX = 6

const widthOf = async (locator: Locator): Promise<number> => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('the element needs a layout to be measured')
	}
	return box.width
}

/** Expects a bar to be `columns` columns of `column` wide, give or take rounding. */
const expectBarSpans = async (
	bar: Locator,
	column: Locator,
	columns: number
): Promise<void> => {
	const barWidth = await widthOf(bar)
	const columnWidth = await widthOf(column)
	expect(Math.abs(barWidth - columns * columnWidth)).toBeLessThan(
		WIDTH_TOLERANCE_PX
	)
}

/** Cells of any grid (day grid, time grid, resource lane) that start on a date. */
const cellsStartingOn = (page: Page, date: string): Locator =>
	page.locator(`[data-start^="${date}"]`)

test.describe('month view', () => {
	test('weekends=false draws five columns per week', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)

		await expect(month.cells).toHaveCount(30)
		await expect(
			page.locator('[data-testid^="month-header-weekday-"]')
		).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])
		await expect(month.cellOn('2025-03-14')).toHaveCount(1)
		await expect(month.cellOn('2025-03-15')).toHaveCount(0)
		await expect(month.cellOn('2025-03-16')).toHaveCount(0)
	})

	test('hiding one weekday leaves six columns', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'wednesday' },
		})
		const month = new MonthGrid(page)

		await expect(month.cells).toHaveCount(36)
		await expect(month.cellOn('2025-03-12')).toHaveCount(0)
	})

	test('an event across the weekend is a bar in each week, one column wide', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)

		// Fri 14 - Mon 17: Friday in one row, Monday in the next.
		const bars = month.bar('trip-1')
		await expect(bars).toHaveCount(2)
		const fridayCell = month.cellOn('2025-03-14')
		await expectBarSpans(bars.nth(0), fridayCell, 1)
		await expectBarSpans(bars.nth(1), fridayCell, 1)
	})

	test('an event across a hidden weekday is one bar over the columns drawn', async ({
		page,
	}) => {
		// Wed 12 - Fri 14, Thursday hidden: Wednesday and Friday sit side by side.
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'thursday' },
		})
		const month = new MonthGrid(page)

		const bar = month.bar('mid-1')
		await expect(bar).toHaveCount(1)
		await expectBarSpans(bar, month.cellOn('2025-03-12'), 2)
	})

	test('an event that lies wholly on hidden days is not drawn', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})

		await expect(page.getByText('Standup').first()).toBeVisible()
		await expect(page.getByText('Saturday market')).toHaveCount(0)
	})

	test('a week is numbered from the first day it draws', async ({ page }) => {
		// ISO weeks start on Monday, so Sunday 9 March is in week 10 and Monday
		// 10 March in week 11. With Sunday hidden the row reads 11.
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: {
				weekends: 'false',
				weekNumbers: 'true',
				weekNumberCalculation: 'ISO',
			},
		})

		await expect(new MonthGrid(page).weekNumbers).toHaveText([
			'9',
			'10',
			'11',
			'12',
			'13',
			'14',
		])
	})

	test('without weekends or hiddenDays the month is drawn as before', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
		})
		const month = new MonthGrid(page)

		await expect(month.cells).toHaveCount(42)
		await expect(month.bar('trip-1')).toHaveCount(2)
	})
})

test.describe('week view', () => {
	test('the title names the days that are drawn', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { weekends: 'false' },
		})

		await expect(new TimeGrid(page).title).toHaveText('Mar 10 – 14')
		await expect(new TimeGrid(page).dayColumns).toHaveCount(5)
	})

	test('an all-day event across a hidden day is one bar over the days drawn', async ({
		page,
	}) => {
		// Wed 12 - Fri 14, Thursday hidden: the bar covers Wednesday and Friday.
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'week',
			settings: { hiddenDays: 'thursday' },
		})
		const grid = new TimeGrid(page)

		const bar = page.getByTestId('horizontal-event-mid-1')
		await expect(bar).toHaveCount(1)
		await expectBarSpans(bar, grid.dayColumns.first(), 2)
	})
})

test.describe('day view', () => {
	const dayHeader = (page: Page) => page.getByTestId('day-view-header')

	test('next and previous step over the hidden weekend', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'day',
			date: '2025-03-14T09:00:00.000Z',
			settings: { weekends: 'false' },
		})
		await expect(dayHeader(page)).toContainText('Friday, March 14, 2025')

		await page.getByLabel('Next').click()
		await expect(dayHeader(page)).toContainText('Monday, March 17, 2025')

		await page.getByLabel('Previous').click()
		await expect(dayHeader(page)).toContainText('Friday, March 14, 2025')
	})

	test('opens on the next visible day when today is hidden', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'day',
			now: '2025-03-15T10:00:00.000Z',
			date: '2025-03-15T10:00:00.000Z',
			settings: { weekends: 'false' },
		})
		await expect(dayHeader(page)).toContainText('Monday, March 17, 2025')

		await page.getByRole('button', { name: 'Today', exact: true }).click()
		await expect(dayHeader(page)).toContainText('Monday, March 17, 2025')
	})

	test('steps a single day when nothing is hidden', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'day',
			date: '2025-03-14T09:00:00.000Z',
		})

		await page.getByLabel('Next').click()
		await expect(dayHeader(page)).toContainText('Saturday, March 15, 2025')
	})
})

test.describe('resource views', () => {
	const surfaces = [
		{ view: 'month', orientation: 'vertical' },
		{ view: 'month', orientation: 'horizontal' },
		{ view: 'week', orientation: 'vertical' },
		{ view: 'week', orientation: 'horizontal' },
		{ view: 'week', orientation: 'vertical', granularity: 'daily' },
		{ view: 'week', orientation: 'horizontal', granularity: 'daily' },
	] as const

	for (const surface of surfaces) {
		const granularity =
			'granularity' in surface ? surface.granularity : 'hourly'
		const isWeek = surface.view === 'week'
		const weekName = `week ${surface.orientation} ${granularity}`
		const monthName = `month ${surface.orientation}`
		const name = isWeek ? weekName : monthName
		test(`${name} draws no weekend`, async ({ page }) => {
			await gotoScenario(page, {
				scenario: 'resources',
				view: surface.view,
				orientation: surface.orientation,
				settings: { weekends: 'false', granularity },
			})

			await expect(cellsStartingOn(page, '2025-03-14').first()).toBeVisible()
			await expect(cellsStartingOn(page, '2025-03-15')).toHaveCount(0)
			await expect(cellsStartingOn(page, '2025-03-16')).toHaveCount(0)
		})
	}

	test('hourly horizontal week: a Thursday event sits in Thursday 14:00 with Wednesday hidden', async ({
		page,
	}) => {
		// Room A's booking is Thu 13 March 14:00-15:00. Wednesday has no hour
		// columns, so counting elapsed hours from Sunday would push it a day right.
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { hiddenDays: 'wednesday' },
		})

		const bar = page.getByTestId('horizontal-event-res-4')
		const column = cellsStartingOn(page, '2025-03-13T14:00').first()
		await expect(bar).toHaveCount(1)
		// Polled: the bar animates in, and a slow runner can measure it mid-way.
		const barOffsetFromColumn = async () => {
			const barBox = await bar.boundingBox()
			const columnBox = await column.boundingBox()
			if (!barBox || !columnBox) {
				return Number.POSITIVE_INFINITY
			}
			return Math.abs(barBox.x - columnBox.x)
		}
		await expect.poll(barOffsetFromColumn).toBeLessThan(WIDTH_TOLERANCE_PX)
	})

	test('hourly horizontal week: the now-line sits in the visible Thursday column', async ({
		page,
	}) => {
		const thursdayNow = '2025-03-13T10:30:00.000Z'
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			now: thursdayNow,
			date: thursdayNow,
			settings: { hiddenDays: 'wednesday' },
		})

		const line = page.getByTestId('current-time-indicator').first()
		const column = cellsStartingOn(page, '2025-03-13T10:00').first()
		const lineBox = await line.boundingBox()
		const columnBox = await column.boundingBox()
		if (!lineBox || !columnBox) {
			throw new Error('the line and its column need a layout')
		}
		const halfwayAcrossColumn = columnBox.x + columnBox.width / 2
		expect(Math.abs(lineBox.x - halfwayAcrossColumn)).toBeLessThan(
			WIDTH_TOLERANCE_PX
		)
	})
})
