import { expect, type Page, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid, TimeGrid } from './support/pages'

/*
 * Settings that show or hide a part of the grid: the all-day row, the now
 * line, and week numbers. Each default reproduces what the calendar drew before
 * the setting existed, so the "unset" cases pin that nothing moved.
 *
 * The clock is pinned to Wednesday 12 March 2025 09:00 UTC, so the week of
 * 9 March is on screen and the now line sits on the 9 AM row.
 */
test.describe('allDaySlot', () => {
	test('is on by default: the all-day row holds the all-day events', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'all-day-events', view: 'week' })
		const grid = new TimeGrid(page)

		await expect(grid.allDayRow).toHaveCount(1)
		await expect(grid.allDayRow.getByText('Public holiday')).toBeVisible()
	})

	test('false removes the row and shows no all-day event in the time grid', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { allDaySlot: 'false' },
		})
		const grid = new TimeGrid(page)

		await expect(grid.allDayRow).toHaveCount(0)
		await expect(page.getByText('Public holiday')).toHaveCount(0)
		await expect(page.getByText('Off-site')).toHaveCount(0)
	})

	test('false removes the row in a vertical resource week too', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { allDaySlot: 'false' },
		})

		await expect(new TimeGrid(page).allDayRow).toHaveCount(0)
	})
})

test.describe('nowIndicator', () => {
	test('is on by default', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })

		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	test('false removes the now line', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { nowIndicator: 'false' },
		})

		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
	})
})

test.describe('weekNumbers', () => {
	test('week view shows the week number by default', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'week' })

		await expect(page.getByTestId('week-number')).toHaveText('11')
	})

	test('false hides it in week view', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { weekNumbers: 'false' },
		})

		await expect(page.getByTestId('week-number')).toHaveCount(0)
		await expect(
			page.getByTestId('week-view-header').getByText('Week', { exact: true })
		).toHaveCount(0)
	})

	test('month view shows none by default', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })

		await expect(new MonthGrid(page).weekNumbers).toHaveCount(0)
	})

	test('true shows one number per month row, from the first day of the row', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekNumbers: 'true' },
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

	test('weekNumberCalculation=ISO counts ISO weeks (rows start on Sunday, so each shows the ISO week of that Sunday)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { weekNumbers: 'true', weekNumberCalculation: 'ISO' },
		})

		await expect(new MonthGrid(page).weekNumbers).toHaveText([
			'8',
			'9',
			'10',
			'11',
			'12',
			'13',
		])
	})
})

test.describe('scrollTime minutes', () => {
	// FullCalendar scrolls to the exact minute: a fraction of the way through
	// the hour (TimeGridLayout.tsx:285-296 at v7.1.1). 08:30 therefore lands
	// halfway down the 8 AM row, not on its top edge.
	const TOLERANCE_PX = 1

	const measureScroll = (
		page: Page,
		scrollTestId: string,
		axis: 'vertical' | 'horizontal',
		hour = '08'
	) =>
		page.evaluate(
			({ scrollTestId, axis, hour }) => {
				const viewport = document.querySelector(
					`[data-testid="${scrollTestId}"] [data-radix-scroll-area-viewport]`
				)
				const first = viewport?.querySelector('[data-hour]')
				const eight = viewport?.querySelector(`[data-hour="${hour}"]`)
				if (!viewport || !first || !eight) {
					throw new Error('missing hour rows')
				}
				const firstRect = first.getBoundingClientRect()
				const eightRect = eight.getBoundingClientRect()
				const isVertical = axis === 'vertical'
				const distance = isVertical
					? eightRect.top - firstRect.top
					: eightRect.left - firstRect.left
				const extent = isVertical ? eightRect.height : eightRect.width
				return {
					scrolled: isVertical ? viewport.scrollTop : viewport.scrollLeft,
					rowStart: distance,
					rowMiddle: distance + extent / 2,
				}
			},
			{ scrollTestId, axis, hour }
		)

	test('week time grid lands halfway into the 8 AM row', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '08:30', height: '500px' },
		})

		const { scrolled, rowStart, rowMiddle } = await measureScroll(
			page,
			'vertical-grid-scroll',
			'vertical'
		)

		expect(scrolled).toBeGreaterThan(rowStart + TOLERANCE_PX)
		expect(Math.abs(scrolled - rowMiddle)).toBeLessThanOrEqual(TOLERANCE_PX)
	})

	test('resource day timeline lands halfway into the 8 AM column', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { scrollTime: '08:30', height: '500px' },
		})

		const { scrolled, rowStart, rowMiddle } = await measureScroll(
			page,
			'horizontal-grid-scroll',
			'horizontal'
		)

		expect(scrolled).toBeGreaterThan(rowStart + TOLERANCE_PX)
		expect(Math.abs(scrolled - rowMiddle)).toBeLessThanOrEqual(TOLERANCE_PX)
	})

	test('scrollToNow lands halfway into the 2 PM row at 14:30', async ({
		page,
	}) => {
		// The clock is pinned at 09:00 UTC, which is 14:30 in Kolkata.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			timezone: 'Asia/Kolkata',
			settings: { scrollToNow: 'true', height: '500px' },
		})

		const { scrolled, rowStart, rowMiddle } = await measureScroll(
			page,
			'vertical-grid-scroll',
			'vertical',
			'14'
		)

		expect(scrolled).toBeGreaterThan(rowStart + TOLERANCE_PX)
		expect(Math.abs(scrolled - rowMiddle)).toBeLessThanOrEqual(TOLERANCE_PX)
	})
})

test.describe('weekNumbers in the daily resource week', () => {
	test('shows the week number once, in the resource header', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { granularity: 'daily' },
		})

		await expect(page.getByTestId('week-number')).toHaveText('11')
	})

	test('false hides the number and the Week label', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { granularity: 'daily', weekNumbers: 'false' },
		})

		await expect(page.getByTestId('week-number')).toHaveCount(0)
		await expect(
			page
				.getByTestId('vertical-grid-header')
				.getByText('Week', { exact: true })
		).toHaveCount(0)
	})
})
