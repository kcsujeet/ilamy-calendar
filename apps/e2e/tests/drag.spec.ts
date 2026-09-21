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
const getMirrorColour = (mirror: import('@playwright/test').Locator) =>
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
			.poll(() => getMirrorColour(month.dragMirror))
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
			.poll(() => getMirrorColour(month.dragMirror))
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

	test('keeps the grab point under the pointer across day columns', async ({
		page,
	}) => {
		// The headline behaviour: the point you GRABBED lands under the pointer.
		// A month row draws this bar across whole, equal day columns while its
		// time runs 09:00 to 17:00, so reading the grab as a fraction of elapsed
		// TIME rather than of columns puts the drop a day out. Every other
		// multi-day fixture here is midnight-aligned, where the two agree.
		await gotoScenario(page, { scenario: 'timed-multi-day', view: 'month' })
		const month = new MonthGrid(page)

		// The positioned bar, not the text inside it: this measures columns.
		const bar = month.bar('timed-span-1')
		await expect(bar).toBeVisible()
		const before = await month.eventNamed('Field survey')
		expect(before.start).toMatch(/^2025-03-10T09:00/)

		// Grab inside the FIRST day column (Mar 10) rather than at the bar's
		// left edge, then release one column to the right.
		const box = await bar.boundingBox()
		if (!box) {
			throw new Error('the bar needs a layout to be grabbed')
		}
		const columnWidth = box.width / 4
		const grabX = box.x + columnWidth * 0.8
		const grabY = box.y + box.height / 2

		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX + (columnWidth * step) / 8, grabY)
		}
		await page.mouse.up()

		// Moved exactly one day, and the duration is untouched.
		await expect
			.poll(async () => (await month.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
		const after = await month.eventNamed('Field survey')
		expect(after.end).toMatch(/^2025-03-14T17:00/)
	})

	test('honours a grab taken several columns into the bar', async ({
		page,
	}) => {
		// The offset only shows itself when the grab is NOT at the bar's start.
		// dnd-kit has not measured the draggable at drag start, so reading its
		// rect there yields no offset at all and the event silently re-anchors
		// to its own start. Grab the THIRD column (Mar 12) and release one
		// column right: holding the grab point moves the event by exactly one
		// day, while losing it would jump the start to the release column.
		await gotoScenario(page, { scenario: 'timed-multi-day', view: 'month' })
		const month = new MonthGrid(page)

		const bar = month.bar('timed-span-1')
		await expect(bar).toBeVisible()

		const box = await bar.boundingBox()
		if (!box) {
			throw new Error('the bar needs a layout to be grabbed')
		}
		const columnWidth = box.width / 4
		const grabX = box.x + columnWidth * 2.5
		const grabY = box.y + box.height / 2

		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX + (columnWidth * step) / 8, grabY)
		}
		await page.mouse.up()

		// One day later, not jumped to the column released on.
		await expect
			.poll(async () => (await month.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
	})

	test('moves a multi-day event rigidly when grabbed by a middle column', async ({
		page,
	}) => {
		// The train rule, and FullCalendar's: an event moves BY a delta
		// (https://fullcalendar.io/docs/eventDrop), so pushing it from the middle
		// must not drag its start to your hand. A week view draws one bar per day
		// column, and dnd-kit measures such a bar as its LABEL (28px) rather than
		// the column (~1463px), which clamped the grab fraction to 1 and read
		// every grab as the segment's end. One column right with no vertical
		// movement then shifted the event by 13 hours instead of a day.
		await gotoScenario(page, {
			scenario: 'timed-multi-day',
			view: 'week',
			settings: { scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)

		const before = await grid.eventNamed('Field survey')
		expect(before.start).toMatch(/^2025-03-10T09:00/)

		// Mar 10 09:00 to Mar 13 17:00 draws four column bars; take the second.
		const middleColumn = grid.bars('timed-span-1').nth(1)
		await middleColumn.scrollIntoViewIfNeeded()
		const box = await middleColumn.boundingBox()
		if (!box) {
			throw new Error('the bar needs a layout to be grabbed')
		}

		const grabX = box.x + box.width / 2
		const grabY = 500
		const columnWidth = box.width
		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 10; step += 1) {
			await page.mouse.move(grabX + (columnWidth * step) / 10, grabY)
		}
		await page.mouse.up()

		// Exactly one day later at both ends: translated, not re-anchored.
		await expect
			.poll(async () => (await grid.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
		const after = await grid.eventNamed('Field survey')
		expect(after.end).toMatch(/^2025-03-14T17:00/)
	})

	test('drops an event whose body spans disabled cells', async ({ page }) => {
		// Disabled means disabled for the POINTER, not for the event. A cell you
		// cannot click or release on may still be covered by an event's body: a
		// span running 09:00 to 17:00 over four days crosses every night, and
		// every night is outside business hours. Only the cell under the pointer
		// decides whether the drop lands.
		await gotoScenario(page, {
			scenario: 'timed-multi-day',
			view: 'week',
			settings: { scrollTime: '08:00', businessHours: '9-17' },
		})
		const grid = new TimeGrid(page)

		// The nights this event covers are refused cells, and it starts anyway.
		const nightCell = grid.slotAt('2025-03-11T02:00')
		await expect(nightCell).toHaveAttribute('data-disabled', 'true')

		const businessSlot = grid.slotAt('2025-03-11T10:00')
		const slotBox = await businessSlot.boundingBox()
		const middleColumn = grid.bars('timed-span-1').nth(1)
		const barBox = await middleColumn.boundingBox()
		if (!slotBox || !barBox) {
			throw new Error('the grab and the target both need a layout')
		}

		// Grab at a business hour and release at one, one column to the right.
		const grabX = barBox.x + barBox.width / 2
		const grabY = slotBox.y + slotBox.height / 2
		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 10; step += 1) {
			await page.mouse.move(grabX + (barBox.width * step) / 10, grabY)
		}
		await page.mouse.up()

		// It moved: the nights under the event never had a say.
		await expect
			.poll(async () => (await grid.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
	})

	test('keeps the mirror over a cell that refuses the drop', async ({
		page,
	}) => {
		// FullCalendar keeps its mirror over an area its constraints forbid and
		// signals the refusal with the cursor. Blanking the preview instead
		// swapped the snapped mirror for a floating chip mid-drag.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { businessHours: '9-17' },
		})
		const month = new MonthGrid(page)

		// 2025-03-08 is a Saturday, so business hours leave it disabled.
		const closedDay = month.cellOn('2025-03-08')
		await expect(closedDay).toHaveAttribute('data-disabled', 'true')

		await pressAndMoveTo(
			page,
			month.event('Earlier in the month').first(),
			closedDay
		)

		await expect(month.dragMirror).toBeVisible()
		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.toBe('not-allowed')
		await page.mouse.up()
	})

	test('commits nothing when released on a cell that refuses drops', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { businessHours: '9-17' },
		})
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-08')
		)

		// Released on a closed Saturday: the event stays where it was.
		const event = await month.eventNamed('Earlier in the month')
		expect(event.start).toMatch(/^2025-03-04/)
		// And the cursor does not outlive the drag.
		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.not.toBe('not-allowed')
	})

	test('dims the source bar while its event is in flight', async ({ page }) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)

		const bar = month.event('Earlier in the month').first()
		await pressAndMoveTo(page, bar, month.cellOn('2025-03-06'))

		// The source stays visible and recedes; it must not vanish, or there is
		// nothing to say the event is being moved rather than deleted.
		await expect
			.poll(() =>
				bar.evaluate((el) => {
					const dimmed = el.closest('.opacity-50')
					return dimmed === null ? 'not dimmed' : 'dimmed'
				})
			)
			.toBe('dimmed')
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
