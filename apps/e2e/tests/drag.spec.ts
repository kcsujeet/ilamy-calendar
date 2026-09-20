import { expect, test } from '@playwright/test'
import { gotoScenario } from './support/harness'
import { MonthGrid, TimeGrid } from './support/pages'

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

/**
 * Presses and moves in steps so the sensor activates, WITHOUT releasing. Use it
 * to inspect what the calendar shows mid-drag; the caller owns the mouse-up.
 */
const pressAndMoveTo = async (
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
}

/** Presses, moves in steps so the sensor activates, and releases. */
const dragTo = async (
	page: import('@playwright/test').Page,
	from: import('@playwright/test').Locator,
	to: import('@playwright/test').Locator
): Promise<void> => {
	await pressAndMoveTo(page, from, to)
	await page.mouse.up()
}

/** The fill an event gets when it declares no colour of its own. */
const FALLBACK_FILL = 'oklch(0.623 0.214 259.815)'

/** The colour the snapped mirror is painting, as the browser resolves it. */
const mirrorColour = (mirror: import('@playwright/test').Locator) =>
	mirror.evaluate((el) => getComputedStyle(el).backgroundColor)

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

	test('moves an event to another hour in the day grid', async ({ page }) => {
		// The month grid alone cannot catch this: it drops onto day cells, which
		// take their date from the cell and their clock from the event. Only an
		// hour grid proves the drop reads the slot it was dropped on.
		// Pinned scroll, not luck: the grid is taller than the viewport, and an
		// element below the fold has a bounding box the mouse cannot reach.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		const bar = grid.event('Morning stand-up').first()
		await expect(bar).toBeVisible()

		// 09:30 to the 13:00 slot, straight down the same column.
		await dragTo(page, bar, grid.slotAt('2025-03-12T13:00'))

		await expect
			.poll(async () => (await grid.eventNamed('Morning stand-up')).start)
			.toMatch(/^2025-03-12T13:00/)
	})

	test("paints the mirror in the dragged event's own colour", async ({
		page,
	}) => {
		// An event may carry its fill in `backgroundColor` as a CSS value OR in
		// `color` as Tailwind classes, and the playground's own seed data uses the
		// second. A reader that checks only `backgroundColor` falls back to
		// `bg-blue-500` and paints every mirror the same blue.
		await gotoScenario(page, { scenario: 'colored', view: 'month' })
		const month = new MonthGrid(page)

		await pressAndMoveTo(
			page,
			month.event('CSS colour').first(),
			month.cellOn('2025-03-20')
		)

		// The fixture authors this event as `backgroundColor: '#f59e0b'`.
		await expect
			.poll(() => mirrorColour(month.dragMirror))
			.toBe('rgb(245, 158, 11)')
		await page.mouse.up()
	})

	test('paints the mirror for an event coloured by class', async ({ page }) => {
		await gotoScenario(page, { scenario: 'colored', view: 'month' })
		const month = new MonthGrid(page)

		await pressAndMoveTo(
			page,
			month.event('Tailwind classes').first(),
			month.cellOn('2025-03-20')
		)

		// Not the `bg-blue-500` fallback, which is what every event used to get.
		await expect
			.poll(() => mirrorColour(month.dragMirror))
			.not.toBe(FALLBACK_FILL)
		await page.mouse.up()
	})

	test("tints the drop target in FullCalendar's highlight colour", async ({
		page,
	}) => {
		// One fixed pale cyan, never the dragged event's own colour: v6 ships
		// `--fc-highlight-color:rgba(188,232,241,.3)`. Painting the event's hue
		// here makes the target indistinguishable from the mirror standing on it,
		// and floods every cell of a multi-day span.
		await gotoScenario(page, { scenario: 'colored', view: 'month' })
		const month = new MonthGrid(page)
		const cell = month.cellOn('2025-03-20')

		await pressAndMoveTo(page, month.event('CSS colour').first(), cell)

		await expect(cell).toHaveAttribute('data-drop-target', 'true')
		await expect
			.poll(() =>
				cell.evaluate((el) => {
					const tint = el.querySelector('[aria-hidden="true"]')
					return tint ? getComputedStyle(tint).backgroundColor : 'no tint'
				})
			)
			.toBe('rgba(188, 232, 241, 0.3)')
		await page.mouse.up()
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
