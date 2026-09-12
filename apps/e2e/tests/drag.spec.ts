import { expect, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid } from './support/pages'

/**
 * Drag and drop, deliberately last and deliberately narrow.
 *
 * `@dnd-kit` responds to real pointer sequences rather than to a synthetic
 * `dragstart`, so these need explicit move steps: a press, several small moves
 * so the sensor passes its activation constraint, then a release. That makes
 * them the most timing-sensitive tests here.
 *
 * If they prove unstable they come out of the gate and stay an agent-driven
 * check. A flaky gate is worse than no gate: it trains everyone to re-run until
 * green, and then a real failure reads as noise too.
 */

/** Presses, moves in steps so the sensor activates, and releases. */
const dragTo = async (
	page: import('@playwright/test').Page,
	from: import('@playwright/test').Locator,
	to: import('@playwright/test').Locator
): Promise<void> => {
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
	// Several moves, not one: a single jump can skip the activation distance
	// and the sensor never starts a drag at all.
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			source.x + ((target.x - source.x) * step) / 8 + target.width / 2,
			source.y + ((target.y - source.y) * step) / 8 + target.height / 2
		)
	}
	await page.mouse.up()
}

test.describe('drag and drop', () => {
	test('moves an event to another day in the month grid', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)

		const bar = month.event('Earlier in the month').first()
		await expect(bar).toBeVisible()

		// 4 March to 6 March, two cells to the right in the same row.
		await dragTo(page, bar, month.cellOn('2025-03-06'))

		// Asserted through the state the calendar reports, not the DOM: month
		// bars are drawn in an overlay over the cells rather than inside them.
		await expect
			.poll(async () => (await month.eventNamed('Earlier in the month')).start)
			.toMatch(/^2025-03-06/)
	})

	test('leaves the event alone when drag and drop is disabled', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		// The counterpart that makes the test above mean something: the same
		// gesture, and the event has not moved.
		const event = await month.eventNamed('Earlier in the month')

		expect(event.start).toMatch(/^2025-03-04/)
	})
})
