import { expect, type Locator, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid } from './support/pages'

/*
 * The month row of Sunday 9 to Saturday 15 March 2025 in New York, the week
 * the clocks went forward. The row's columns are made with `.add(n, 'day')`, so
 * the later ones carry the first day's UTC offset and read midnight while
 * sitting an hour off it. A column is not its own day's start: trusting it put
 * an all-day bar one column too far left and one column too wide.
 * The clock is pinned to Wednesday 12 March, in this very week.
 */

const EDGE_TOLERANCE_PX = 4

const boxOf = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('the element needs a layout to be measured')
	}
	return box
}

test.describe('month view, New York, the week the clocks change', () => {
	for (const [barId, date] of [
		['wed-all-day', '2025-03-12'],
		['sat-all-day', '2025-03-15'],
	] as const) {
		test(`the ${date} all-day bar occupies exactly that day's cell`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'all-day-in-clock-change-week',
				view: 'month',
				timezone: 'America/New_York',
			})
			const month = new MonthGrid(page)
			await expect(month.bar(barId)).toHaveCount(1)
			await page.evaluate(() =>
				Promise.all(
					document.getAnimations().map((animation) => animation.finished)
				)
			)

			const bar = await boxOf(month.bar(barId))
			const cell = await boxOf(month.cellOn(date))

			expect(Math.abs(bar.x - cell.x)).toBeLessThan(EDGE_TOLERANCE_PX)
			expect(Math.abs(bar.width - cell.width)).toBeLessThan(EDGE_TOLERANCE_PX)
		})
	}
})
