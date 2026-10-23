import { expect, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	settleAnimations,
} from './support/harness'
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
	await releasePointer(page)
}

/** The fill an event gets when it declares no colour of its own. */
const FALLBACK_FILL = 'oklch(0.623 0.214 259.815)'

/** A cell's own background, as the browser resolves it. */
const getCellFill = (cell: import('@playwright/test').Locator) =>
	cell.evaluate((el) => getComputedStyle(el).backgroundColor)

/** The colour the snapped mirror is painting, as the browser resolves it. */
const getMirrorColour = (mirror: import('@playwright/test').Locator) =>
	mirror.evaluate((el) => getComputedStyle(el).backgroundColor)

// A cell tints under the pointer to invite a click (#299). During a drag that
// tint was a second colour beside the drop tint, meaning nothing; the cell
// under a drag keeps its resting fill and only the drop tint shows.
test.describe('cell hover tint', () => {
	test('a month cell takes the hover tint when nothing is dragged', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)
		const hovered = month.cellOn('2025-03-06')
		const neighbour = month.cellOn('2025-03-07')

		await hovered.hover()

		const [hoveredFill, restingFill] = await Promise.all([
			getCellFill(hovered),
			getCellFill(neighbour),
		])
		expect(hoveredFill).not.toBe(restingFill)
	})

	test('a time slot takes the hover tint when nothing is dragged', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const hovered = grid.slotAt('2025-03-12T11:00')
		const neighbour = grid.slotAt('2025-03-12T12:00')

		await hovered.hover()

		const [hoveredFill, restingFill] = await Promise.all([
			getCellFill(hovered),
			getCellFill(neighbour),
		])
		expect(hoveredFill).not.toBe(restingFill)
	})

	test('the month cell under a drag keeps its resting fill', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)
		const target = month.cellOn('2025-03-06')
		const neighbour = month.cellOn('2025-03-07')

		await pressAndMoveTo(
			page,
			month.event('Earlier in the month').first(),
			target
		)

		// The drop tint is the cell's overlay child, so the cell's own fill is
		// what the hover tint would change.
		await expect(target).toHaveAttribute('data-drop-target', 'true')
		const [targetFill, restingFill] = await Promise.all([
			getCellFill(target),
			getCellFill(neighbour),
		])
		expect(targetFill).toBe(restingFill)
		await releasePointer(page)
	})

	test('the time slot under a drag keeps its resting fill', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'day',
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const target = grid.slotAt('2025-03-12T13:00')
		const neighbour = grid.slotAt('2025-03-12T15:00')

		await pressAndMoveTo(page, grid.event('Morning stand-up').first(), target)

		await expect(target).toHaveAttribute('data-drop-target', 'true')
		const [targetFill, restingFill] = await Promise.all([
			getCellFill(target),
			getCellFill(neighbour),
		])
		expect(targetFill).toBe(restingFill)
		await releasePointer(page)
	})
})

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

	test('keeps an all-day event all-day when it moves in the month grid', async ({
		page,
	}) => {
		// A drop changes an event's kind only between an all-day area and a timed
		// one (FullCalendar's EventDragging.ts:450, v6.1.21), and a month cell is
		// neither. Its `allDay: false` used to be read as "timed", so an all-day
		// event dropped there came back timed (#322).
		await gotoScenario(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Public holiday'),
			month.cellOn('2025-03-19')
		)

		await expect
			.poll(async () => (await month.eventNamed('Public holiday')).start)
			.toBe('2025-03-19T00:00:00.000Z')
		const after = await month.eventNamed('Public holiday')
		expect(after).toMatchObject({
			end: '2025-03-20T00:00:00.000Z',
			allDay: true,
		})
	})

	test('keeps a timed event timed, at its clock, when it moves in the month grid', async ({
		page,
	}) => {
		// The other half: a timed event stays timed, and like FullCalendar and
		// Google Calendar the drop keeps its clock and changes only the date.
		await gotoScenario(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)
		const before = await month.eventNamed('Earlier in the month')
		const clockBefore = before.start.slice(10)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		await expect
			.poll(async () => (await month.eventNamed('Earlier in the month')).start)
			.toBe(`2025-03-06${clockBefore}`)
		const after = await month.eventNamed('Earlier in the month')
		expect(after.allDay).toBe(false)
	})

	test('drops on the day of the month navigated to', async ({ page }) => {
		// Month cells survive navigation (#300): these were mounted on February
		// dates, so the drop data they publish must follow them into March.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			date: '2025-02-12T09:00:00.000Z',
		})
		const month = new MonthGrid(page)
		await month.next()

		const bar = month.event('Earlier in the month').first()
		await expect(bar).toBeVisible()

		await dragTo(page, bar, month.cellOn('2025-03-06'))

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

	test('drops on the slot of the week navigated to', async ({ page }) => {
		// Cells survive navigation (#300), so the drop data they publish must
		// follow the new week rather than the one they were mounted on.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			date: '2025-03-05T09:00:00.000Z',
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await grid.next()

		const bar = grid.event('Morning stand-up').first()
		await expect(bar).toBeVisible()

		await dragTo(page, bar, grid.slotAt('2025-03-12T13:00'))

		await expect
			.poll(async () => (await grid.eventNamed('Morning stand-up')).start)
			.toMatch(/^2025-03-12T13:00/)
	})

	test('moves an event by the slot it lands on when the calendar has its own timezone', async ({
		page,
	}) => {
		// The browser runs in UTC and the calendar in Vancouver (UTC-7 on 12
		// March 2025), the way any app sets `timezone` to something other than
		// its visitor's zone. The slot under the pointer is a Vancouver hour, so
		// a drop reading wall-clock time in the browser's zone would land seven
		// hours out. Nothing else drags with the two zones apart.
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			timezone: 'America/Vancouver',
			settings: { scrollTime: '02:00' },
		})
		const grid = new TimeGrid(page)

		const bar = grid.event('Morning stand-up').first()
		await expect(bar).toBeVisible()

		// 09:30Z is 02:30 in Vancouver. The 05:00 slot there is 12:00Z.
		await dragTo(page, bar, grid.slotAt('2025-03-12T12:00'))

		await expect
			.poll(async () => (await grid.eventNamed('Morning stand-up')).start)
			.toMatch(/^2025-03-12T12:00/)
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
		await releasePointer(page)
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
		await releasePointer(page)
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
		await releasePointer(page)
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
		await releasePointer(page)

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
		await releasePointer(page)

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
		await releasePointer(page)

		// Exactly one day later at both ends: translated, not re-anchored.
		await expect
			.poll(async () => (await grid.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
		const after = await grid.eventNamed('Field survey')
		expect(after.end).toMatch(/^2025-03-14T17:00/)
	})

	test('moves an all-day event a day down the vertical resource month (#322)', async ({
		page,
	}) => {
		// Drawn there since #322. Its cells are whole days, so the drop keeps the
		// event all-day and moves it by whole days, as on the horizontal month;
		// FullCalendar moves an event BY a delta (https://fullcalendar.io/docs/eventDrop).
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'vertical',
		})
		const grid = new MonthGrid(page)
		const before = await grid.eventNamed('Site survey')
		expect(before).toMatchObject({
			start: '2025-03-03T00:00:00.000Z',
			end: '2025-03-13T00:00:00.000Z',
			allDay: true,
		})

		// Grabbed on its first day, dropped on the next day of the same room.
		const firstDay = page.locator(
			'[data-resource-id="r1"][data-start="2025-03-03T00:00:00.000Z"]'
		)
		const nextDay = page.locator(
			'[data-resource-id="r1"][data-start="2025-03-04T00:00:00.000Z"]'
		)
		await dragTo(page, firstDay, nextDay)

		await expect
			.poll(async () => (await grid.eventNamed('Site survey')).start)
			.toBe('2025-03-04T00:00:00.000Z')
		const after = await grid.eventNamed('Site survey')
		expect(after).toMatchObject({
			end: '2025-03-14T00:00:00.000Z',
			allDay: true,
			resourceId: 'r1',
		})
	})

	test("an all-day event's mirror on the vertical resource month shows no time (#322)", async ({
		page,
	}) => {
		// "Events that are all-day will never display time text anyhow"
		// (https://fullcalendar.io/docs/displayEventTime). Before #322 no all-day
		// event reached this grid, and its mirror printed "12:00am – 12:00am".
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'vertical',
		})
		const grid = new MonthGrid(page)

		await pressAndMoveTo(
			page,
			page.locator(
				'[data-resource-id="r1"][data-start="2025-03-03T00:00:00.000Z"]'
			),
			page.locator(
				'[data-resource-id="r1"][data-start="2025-03-04T00:00:00.000Z"]'
			)
		)

		await expect(grid.dragMirror).toHaveText('Site survey')
		await releasePointer(page)
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
		await releasePointer(page)

		// It moved: the nights under the event never had a say.
		await expect
			.poll(async () => (await grid.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-11T09:00/)
	})

	test('draws no mirror and no tint over a cell that refuses the drop', async ({
		page,
	}) => {
		// The contract moved with 3.3.2: this used to assert the mirror stayed
		// over a refused cell. FullCalendar nulls the mutation for an invalid
		// placement (interaction-plugin/interactions/EventDragging.ts:193-198,
		// v7.1.1), so a refused placement shows only the not-allowed cursor.
		// Both refusal paths (a disabled cell, `eventAllow`) behave the same.
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

		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.toBe('not-allowed')
		await expect(month.dragMirror).toHaveCount(0)
		await expect(month.dropTargets).toHaveCount(0)
		await releasePointer(page)
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
		await releasePointer(page)
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

// `editable`, `eventStartEditable` and `eventAllow` (roadmap 3.3.2): who may
// move, and where a move may land.
test.describe('edit permissions', () => {
	const MOVED_FROM = /^2025-03-04/

	test('editable=false moves nothing and reports no change', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { editable: 'false' },
		})
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		const event = await month.eventNamed('Earlier in the month')
		expect(event.start).toMatch(MOVED_FROM)
		expect(await month.eventChanges()).toEqual([])
	})

	test('eventStartEditable=true lets events move under editable=false', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { editable: 'false', eventStartEditable: 'true' },
		})
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		const event = await month.eventNamed('Earlier in the month')
		expect(event.start).toMatch(/^2025-03-06/)
	})

	test('an event with editable=false stays put while its neighbour drags', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Locked event').first(),
			month.cellOn('2025-03-06')
		)
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-07')
		)

		const locked = await month.eventNamed('Locked event')
		const free = await month.eventNamed('Free event')
		expect(locked.start).toMatch(MOVED_FROM)
		expect(free.start).toMatch(/^2025-03-07/)
	})

	test('eventAllow refuses a weekend: not-allowed cursor, nothing moves or is reported', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)

		await pressAndMoveTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-08')
		)
		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.toBe('not-allowed')
		await expect(month.dragMirror).toHaveCount(0)
		await expect(month.dropTargets).toHaveCount(0)
		await releasePointer(page)

		const event = await month.eventNamed('Earlier in the month')
		expect(event.start).toMatch(MOVED_FROM)
		expect(await month.eventChanges()).toEqual([])
	})

	test('a locked bar is a plain clickable button: no drag attributes, a normal click opens it', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		// `bar` is the positioned wrapper; the element dnd-kit decorates is the
		// one inside it that wears the cursor class.
		const barOf = (eventId: string) =>
			month.bar(eventId).locator('[class*="cursor-"]').first()
		const lockedBar = barOf('locked-1')
		const freeBar = barOf('free-1')

		const dragAttributesOn = (bar: typeof lockedBar) =>
			bar.evaluate((element) => ({
				describedBy: element.hasAttribute('aria-describedby'),
				disabled: element.hasAttribute('aria-disabled'),
				role: element.hasAttribute('role'),
			}))
		// No drag attributes, but still a focusable `role=button`: the keyboard
		// opens it with Enter or Space (WCAG 2.1.1; accessibility.spec.ts). The
		// role used to be absent, which left the bar unreachable without a mouse.
		expect(await dragAttributesOn(lockedBar)).toEqual({
			describedBy: false,
			disabled: false,
			role: true,
		})
		expect(await dragAttributesOn(freeBar)).toMatchObject({
			describedBy: true,
			role: true,
		})

		await lockedBar.click()
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('mounts no drag-and-drop live region when nothing can move', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { editable: 'false' },
		})
		const month = new MonthGrid(page)

		await expect(month.event('Free event').first()).toBeVisible()
		await expect(page.locator('[id*="DndLiveRegion"]')).toHaveCount(0)
		await expect(
			page.locator('[aria-describedby*="DndDescribedBy"]')
		).toHaveCount(0)
	})

	test('eventAllow lets a weekday drop through', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		const event = await month.eventNamed('Earlier in the month')
		expect(event.start).toMatch(/^2025-03-06/)
	})
})

// Change info on onEventsChange: how far the start moved (`delta`) and a
// `revert()` that undoes the action, as FullCalendar's `eventDrop` info does
// (https://fullcalendar.io/docs/eventDrop).
test.describe('change info', () => {
	/** A bar's box once the header animations are over, so it is the resting one. */
	const measureAtRest = async (
		page: import('@playwright/test').Page,
		bar: import('@playwright/test').Locator
	) => {
		await expect(bar).toBeVisible()
		// A cancelled animation rejects `finished` with an AbortError (MDN,
		// Animation.cancel()); it is at rest all the same.
		await page.evaluate(() =>
			Promise.all(
				document
					.getAnimations()
					.map((animation) => animation.finished.catch(() => undefined))
			)
		)
		return bar.boundingBox()
	}

	test('a drop reports how far the start moved', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		// 09:30 on Wednesday to 10:00 on Thursday: a day right, half an hour down.
		await dragTo(
			page,
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-13T10:00')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const [change] = await grid.eventChanges()
		expect(change.delta).toEqual({ days: 1, milliseconds: 1_800_000 })
	})

	test('revert puts a dropped event back in the week view', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00', revertChanges: 'true' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('basic-1')
		const boxBefore = await measureAtRest(page, bar)
		const rowsBefore = await grid.eventState()

		await dragTo(
			page,
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-13T10:00')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		await expect.poll(() => bar.boundingBox()).toEqual(boxBefore)
		expect(await grid.eventState()).toEqual(rowsBefore)
	})

	test('revert puts a dropped event back in the month view', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { revertChanges: 'true' },
		})
		const month = new MonthGrid(page)
		const bar = month.bar('basic-3')
		const boxBefore = await measureAtRest(page, bar)

		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)

		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await expect.poll(() => bar.boundingBox()).toEqual(boxBefore)
	})

	test('revert puts a dropped event back in its resource row', async ({
		page,
	}) => {
		// Dropped on another resource's row, one day back (towards the visible
		// side, so the drag does not auto-scroll the grid), so revert has to
		// restore the resource as well as the time.
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'month',
			orientation: 'horizontal',
			settings: { revertChanges: 'true' },
		})
		const grid = new MonthGrid(page)
		const bar = grid.bar('res-1')
		const boxBefore = await measureAtRest(page, bar)

		await dragTo(
			page,
			bar,
			page.locator(
				'[data-resource-id="r2"][data-start="2025-03-11T00:00:00.000Z"]'
			)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const [change] = await grid.eventChanges()
		expect(change.updated).toEqual(['res-1'])
		await expect.poll(() => bar.boundingBox()).toEqual(boxBefore)
	})
	test('a drop on the all-day row measures a timed event from its day start', async ({
		page,
	}) => {
		// FullCalendar measures from the start of the event's day when a drag
		// turns a timed event all-day (EventDragging.ts:454, v7.1.1): a 09:30
		// event dropped on the next day's all-day row moved one day.
		// Tall, so the drag has nothing to auto-scroll and the pointer stays over
		// the all-day row.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)

		await dragTo(
			page,
			grid.event('Morning stand-up').first(),
			grid.allDayRow
				.locator('[data-all-day="true"][data-start^="2025-03-13"]')
				.first()
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const [change] = await grid.eventChanges()
		expect((await grid.eventNamed('Morning stand-up')).allDay).toBe(true)
		expect(change.delta).toEqual({ days: 1, milliseconds: 0 })
	})

	test('a drop that leaves the event where it was fires no callback', async ({
		page,
	}) => {
		// FullCalendar fires no eventChange for it (`_noEventDrop`,
		// EventDragging.ts:374, v7.1.1).
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const rowsBefore = await grid.eventState()
		const box = await grid.event('Morning stand-up').first().boundingBox()
		if (!box) {
			throw new Error('the bar needs a layout to be grabbed')
		}
		const centreX = box.x + box.width / 2
		const centreY = box.y + box.height / 2

		// Pressed, moved far enough to start the drag, and released where it began.
		await page.mouse.move(centreX, centreY)
		await page.mouse.down()
		await page.mouse.move(centreX + 12, centreY)
		await page.mouse.move(centreX, centreY)
		await releasePointer(page)
		await page.waitForTimeout(300)

		expect(await grid.eventChanges()).toEqual([])
		expect(await grid.eventState()).toEqual(rowsBefore)
	})

	test('a drop in the skipped spring hour reports the stored clock time', async ({
		page,
	}) => {
		// New York skips 02:00 on 9 March 2025, and the grid still draws two rows
		// there. The contract moved with the 3.3.4 `getDayHours` fix: hour rows now
		// carry their correct UTC offset, so a drop stores the instant of the cell
		// it landed on (`data-start`), and `delta` is the wall-clock difference to
		// the original. It used to pin 06:30Z, which only held because the row
		// carried a stale -05:00 offset. The duplicate 3 AM and missing 2 AM rows
		// remain a separate task.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await gotoScenario(page, {
			scenario: 'recurring-dst',
			view: 'week',
			plugins: ['recurrence'],
			timezone: 'America/New_York',
			date: '2025-03-12T13:00:00.000Z',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const skippedHourCell = page
			.locator(
				'[data-testid^="vertical-cell-"][data-start="2025-03-09T07:30:00.000Z"]'
			)
			.first()
		await expect(skippedHourCell).toBeAttached()
		const cellStart = await skippedHourCell.getAttribute('data-start')
		const originalStart = (await grid.eventNamed('One-off at nine')).start

		await dragTo(page, grid.bars('dst-reference').first(), skippedHourCell)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('One-off at nine')
		expect(row.start).toBe(cellStart)
		const [change] = await grid.eventChanges()
		const wallClockMs = (iso: string) => {
			const parts = new Intl.DateTimeFormat('en-US', {
				timeZone: 'America/New_York',
				hourCycle: 'h23',
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
				hour: 'numeric',
				minute: 'numeric',
				second: 'numeric',
			}).formatToParts(new Date(iso))
			const part = (type: string) =>
				Number(parts.find((p) => p.type === type)?.value)
			return Date.UTC(
				part('year'),
				part('month') - 1,
				part('day'),
				part('hour'),
				part('minute'),
				part('second')
			)
		}
		const totalMs = wallClockMs(row.start) - wallClockMs(originalStart)
		const msPerDay = 24 * 60 * 60 * 1000
		const days = Math.trunc(totalMs / msPerDay)
		expect(change.delta).toEqual({
			days,
			milliseconds: totalMs - days * msPerDay,
		})
	})
})

// Resizing an event by dragging an edge (kcsujeet/ilamy-calendar#93). A handle
// is a pointer affordance on the end edge, and on the start edge with
// `eventResizableFromStart`; FullCalendar's equivalent is `eventResizableFromStart`
// (https://fullcalendar.io/docs/eventResizableFromStart).
test.describe('resize', () => {
	/**
	 * Opens a scenario and waits out the header animations. A handle is a few
	 * pixels wide, so a press aimed at a half-faded, still-moving bar lands on
	 * its body and moves the event instead.
	 */
	const openSettled = async (
		page: import('@playwright/test').Page,
		options: Parameters<typeof gotoScenario>[1]
	) => {
		await gotoScenario(page, options)
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)
	}

	const handleOf = (
		bar: import('@playwright/test').Locator,
		edge: 'start' | 'end'
	) => bar.locator(`[data-resize-handle="${edge}"]`)

	/** The cell of a lane (resource row or column) whose range opens at this instant. */
	const laneCell = (
		page: import('@playwright/test').Page,
		resourceId: string,
		startISO: string
	) =>
		page
			.locator(`[data-resource-id="${resourceId}"][data-start="${startISO}"]`)
			.first()

	test('the end handle drags a timed event longer in the week view', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		// 09:30-10:00 to 09:30-11:00: the pointer ends on the 10:30 slot.
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T10:30')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T11:00:00.000Z')
		const [change] = await grid.eventChanges()
		expect(change.endDelta).toEqual({ days: 0, milliseconds: 3_600_000 })
		expect(change.delta).toEqual({ days: 0, milliseconds: 0 })
	})

	test('the snapped preview shows the resized bar while the handle is held', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		await pressAndMoveTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T10:30')
		)

		await expect(grid.dragMirror).toHaveCount(1)
		await releasePointer(page)
	})

	test('the start handle needs eventResizableFromStart, then drags the start earlier', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		await expect(page.locator('[data-resize-handle="start"]')).toHaveCount(0)

		// Tall, so dragging up has nothing to auto-scroll.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				slot: 30,
				scrollTime: '00:00',
				eventResizableFromStart: 'true',
			},
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'start'),
			grid.slotAt('2025-03-12T08:30')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T08:30:00.000Z')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		const [change] = await grid.eventChanges()
		expect(change.delta).toEqual({ days: 0, milliseconds: -3_600_000 })
		expect(change.endDelta).toEqual({ days: 0, milliseconds: 0 })
	})

	test('shrinking an event past its start keeps it as it was and reports nothing', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '07:00' },
		})
		const grid = new TimeGrid(page)

		await pressAndMoveTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T08:00')
		)
		expect(await page.evaluate(() => document.body.style.cursor)).toBe('')
		await releasePointer(page)

		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
	})

	test('the end handle drags an all-day event two days longer in the month grid', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)

		// 'Public holiday' is the 12th; the pointer ends on the 14th.
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-14')
		)

		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Public holiday')
		expect(row.start).toBe('2025-03-12T00:00:00.000Z')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
		const [change] = await month.eventChanges()
		expect(change.endDelta).toEqual({ days: 2, milliseconds: 0 })
		expect(row.allDay).toBe(true)
	})

	test('the end handle resizes onto the next week row of the month grid', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)

		await dragTo(
			page,
			handleOf(month.bar('allday-2'), 'end'),
			month.cellOn('2025-03-18')
		)

		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Off-site')
		expect(row.start).toBe('2025-03-13T00:00:00.000Z')
		expect(row.end).toBe('2025-03-19T00:00:00.000Z')
	})

	test('the end handle resizes a booking along the horizontal resource day, in its own lane', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-1')

		// Released over ANOTHER resource's 11:00 hour: the end follows the time,
		// the booking stays with Room A.
		await dragTo(
			page,
			handleOf(bar, 'end'),
			laneCell(page, 'r2', '2025-03-12T11:00:00.000Z')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.resourceId).toBe('r1')
		expect(row.start).toBe('2025-03-12T09:00:00.000Z')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('the end handle resizes a booking in the vertical resource week, in its own column', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('res-2')

		// Room B 10:00-11:00; released over ANOTHER column's 11:30 slot.
		await dragTo(
			page,
			handleOf(bar, 'end'),
			laneCell(page, 'r3', '2025-03-12T11:30:00.000Z')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room B booking')
		expect(row.resourceId).toBe('r2')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('eventDurationEditable=false shows no handle and still moves the event', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				slot: 30,
				scrollTime: '09:00',
				eventDurationEditable: 'false',
			},
		})
		const grid = new TimeGrid(page)
		await expect(grid.bars('basic-1')).toBeVisible()
		await expect(page.locator('[data-resize-handle]')).toHaveCount(0)

		await dragTo(
			page,
			grid.event('Morning stand-up').first(),
			grid.slotAt('2025-03-13T10:00')
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
	})

	test('an event with durationEditable=false has no handle while its neighbour does', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)

		await expect(month.bar('fixed-length-1')).toBeVisible()
		await expect(handleOf(month.bar('fixed-length-1'), 'end')).toHaveCount(0)
		await expect(handleOf(month.bar('stretchy-1'), 'end')).toHaveCount(1)
	})

	test('a single-day timed event in the month grid has no handle', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'basic', view: 'month' })
		const month = new MonthGrid(page)

		await expect(month.event('Earlier in the month').first()).toBeVisible()
		await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
	})

	test('eventAllow refuses a resize onto a weekend: not-allowed cursor, nothing changes', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { eventAllow: 'no-weekend-end' },
		})
		const month = new MonthGrid(page)

		// 'Off-site' ends before the 15th; the pointer goes to Saturday the 15th.
		await pressAndMoveTo(
			page,
			handleOf(month.bar('allday-2'), 'end'),
			month.cellOn('2025-03-15')
		)
		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.toBe('not-allowed')
		await expect(month.dragMirror).toHaveCount(0)
		await releasePointer(page)

		const row = await month.eventNamed('Off-site')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
		expect(await month.eventChanges()).toEqual([])
	})

	test('resizing one occurrence of a series asks which events, and "this event" changes only it', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
			settings: { slot: 30, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const occurrence = page
			.locator('[data-testid^="vertical-event-standup"]')
			.nth(3)

		// 09:00-09:15 on Wednesday the 12th, to 09:00-10:00.
		await dragTo(
			page,
			handleOf(occurrence, 'end'),
			grid.slotAt('2025-03-12T09:30')
		)
		await page.getByText('This event', { exact: true }).click()

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const [change] = await grid.eventChanges()
		expect(change.scope).toBe('this')
		expect(change.endDelta).toEqual({ days: 0, milliseconds: 2_700_000 })
		const longer = (await grid.eventState()).filter(
			(row) => row.end === '2025-03-12T10:00:00.000Z'
		)
		expect(longer).toHaveLength(1)
	})

	test('an all-day bar resizes along the all-day row and ignores the time grid below it', async ({
		page,
	}) => {
		// Tall, so the pointer has nothing to auto-scroll while it crosses both.
		await page.setViewportSize({ width: 1280, height: 1800 })
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const handle = handleOf(
			grid.allDayRow.getByTestId('horizontal-event-allday-1'),
			'end'
		)

		// A resize stays in the component it started in (FullCalendar,
		// interaction.ts:44-48, v7.1.1): over a time slot nothing changes.
		await dragTo(page, handle, grid.slotAt('2025-03-14T10:00'))
		expect(await grid.eventChanges()).toEqual([])

		await dragTo(
			page,
			handle,
			grid.allDayRow
				.locator('[data-all-day="true"][data-start^="2025-03-14"]')
				.first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Public holiday')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
		expect(row.allDay).toBe(true)
	})

	test('a vertical bar draws exactly over its slot span', async ({ page }) => {
		// The bar's AnimatedSection used to sit on the text baseline, 4-7px below
		// its positioned wrapper, so everything anchored to the visible bar
		// (the end handle above all) overhung the next slot.
		await openSettled(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slot: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const wrapperBox = await grid.bars('short-1').first().boundingBox()
		const visibleBox = await grid
			.bars('short-1')
			.first()
			.locator('[class*="cursor-"]')
			.first()
			.boundingBox()
		const slotBox = await grid.slotAt('2025-03-12T09:00').boundingBox()
		if (!wrapperBox || !visibleBox || !slotBox) {
			throw new Error('the bar and its slot need a layout')
		}

		expect(visibleBox.y).toBeCloseTo(wrapperBox.y, 0)
		expect(visibleBox.height).toBeCloseTo(wrapperBox.height, 0)
		expect(visibleBox.y).toBeCloseTo(slotBox.y, 0)
	})

	test("a resize is judged on the event's own resource: closed there, refused, though the lane under the pointer is open", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 1800 })
		await openSettled(page, {
			scenario: 'resource-hours',
			view: 'week',
			orientation: 'vertical',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)

		// Room A closes at 17:00. The pointer goes to Room B's 18:00 slot, which
		// is open, but the event stays in Room A.
		await pressAndMoveTo(
			page,
			handleOf(grid.bars('hours-1'), 'end'),
			laneCell(page, 'r2', '2025-03-12T18:00:00.000Z')
		)
		await expect
			.poll(() => page.evaluate(() => document.body.style.cursor))
			.toBe('not-allowed')
		await releasePointer(page)

		expect((await grid.eventNamed('Room A hold')).end).toBe(
			'2025-03-12T11:00:00.000Z'
		)
		expect(await grid.eventChanges()).toEqual([])
	})

	test("a resize is allowed where the event's own resource is open, though the lane under the pointer is closed", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 1800 })
		await openSettled(page, {
			scenario: 'resource-hours',
			view: 'week',
			orientation: 'vertical',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)

		// Room B is open all day; the pointer is over Room A's closed 18:00 slot.
		await dragTo(
			page,
			handleOf(grid.bars('hours-2'), 'end'),
			laneCell(page, 'r1', '2025-03-12T18:00:00.000Z')
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room B hold')
		expect(row.resourceId).toBe('r2')
		expect(row.end).toBe('2025-03-12T18:30:00.000Z')
	})

	test('a click on the handle strip opens the event, and a resize does not', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const handle = handleOf(grid.bars('basic-1'), 'end')

		await handle.click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByRole('dialog')).toHaveCount(0)

		await dragTo(page, handle, grid.slotAt('2025-03-12T10:30'))
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('a click on the bar body still opens the event', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await expect(handleOf(grid.bars('basic-1'), 'end')).toHaveCount(1)

		await grid.event('Morning stand-up').first().click()

		await expect(page.getByRole('dialog')).toBeVisible()
	})
})

test.describe('hidden days', () => {
	test('an event moves across the hidden weekend to the next visible day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)

		// Thursday 13 to Monday 17: the cell beside Friday's is the next week's.
		await dragTo(
			page,
			month.event('Standup').first(),
			month.cellOn('2025-03-17')
		)

		await expect
			.poll(async () => (await month.eventNamed('Standup')).start)
			.toMatch(/^2025-03-17T10:00/)
	})

	test('a bar cut by the gap keeps the grab point under the pointer', async ({
		page,
	}) => {
		// "Weekend trip" starts on Friday 14, but its second bar starts on Monday
		// 17. Grabbing that bar on Monday and releasing on Tuesday moves the event
		// one day: Friday 14 becomes Saturday 15, a day with no cell, which is
		// fine for a start as long as the move is by the pointer's delta.
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { weekends: 'false' },
		})
		const month = new MonthGrid(page)

		await dragTo(page, month.bar('trip-1').nth(1), month.cellOn('2025-03-18'))

		await expect
			.poll(async () => (await month.eventNamed('Weekend trip')).start)
			.toMatch(/^2025-03-15T00:00/)
	})

	test('a bar over a hidden day is grabbed by the days it draws', async ({
		page,
	}) => {
		// "Mid-week trip" covers Wed 12, Thu 13 and Fri 14, with Thursday hidden:
		// the bar is two columns, Wednesday and Friday. Grabbing the second column
		// (Friday, two days into the event) and releasing on Monday 17 starts the
		// event two days before that, on Saturday 15. Reading the bar as three
		// equal columns would call the grab Thursday and start it on Sunday 16.
		await gotoScenario(page, {
			scenario: 'across-hidden-days',
			view: 'month',
			settings: { hiddenDays: 'thursday' },
		})
		const month = new MonthGrid(page)

		const bar = month.bar('mid-1')
		const box = await bar.boundingBox()
		if (!box) {
			throw new Error('the bar needs a layout to be grabbed')
		}
		const grabX = box.x + box.width * 0.6
		const grabY = box.y + box.height / 2
		const target = await month.cellOn('2025-03-17').boundingBox()
		if (!target) {
			throw new Error('the target cell needs a layout')
		}

		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				grabX + ((target.x + target.width / 2 - grabX) * step) / 8,
				grabY + ((target.y + target.height / 2 - grabY) * step) / 8
			)
		}
		await releasePointer(page)

		await expect
			.poll(async () => (await month.eventNamed('Mid-week trip')).start)
			.toMatch(/^2025-03-15T00:00/)
	})
})

// Where a drop lands is decided by what it crosses. Across the all-day
// boundary the grab point is irrelevant and the length is reset to a default
// (FullCalendar, `EventDragging.ts:447-460` and `event-mutation.ts:131-134`,
// v7.1.1); across a clock change one delta moves both edges, so the event keeps
// its clock length (`event-mutation.ts:110-114`, `marker.ts:48-58`).
test.describe('a drop that crosses a boundary', () => {
	const TALL = { width: 1280, height: 2400 }

	const at = async (
		locator: import('@playwright/test').Locator,
		fractionX: number,
		fractionY: number
	) => {
		const box = await locator.boundingBox()
		if (!box) {
			throw new Error('needs a layout to be dragged')
		}
		return {
			x: box.x + box.width * fractionX,
			y: box.y + box.height * fractionY,
		}
	}

	/** Presses at `from`, moves to `to`, reports the mirror's text, releases. */
	const dragPoints = async (
		page: import('@playwright/test').Page,
		from: { x: number; y: number },
		to: { x: number; y: number }
	) => {
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let step = 1; step <= 10; step += 1) {
			await page.mouse.move(
				from.x + ((to.x - from.x) * step) / 10,
				from.y + ((to.y - from.y) * step) / 10
			)
		}
		const mirrorText = await new TimeGrid(page).dragMirror.allTextContents()
		await releasePointer(page)
		return mirrorText.join(' ')
	}

	for (const grabbedAt of [0.05, 0.5, 0.95]) {
		test(`an all-day event dropped on a time slot starts at the slot and lasts an hour, grabbed ${grabbedAt * 100}% along`, async ({
			page,
		}) => {
			await page.setViewportSize(TALL)
			await gotoScenario(page, {
				scenario: 'all-day-events',
				view: 'week',
				settings: { scrollTime: '00:00', slot: 30 },
			})
			const grid = new TimeGrid(page)
			await settleAnimations(page)
			const from = await at(
				page.locator('[data-testid="horizontal-event-allday-1"]').first(),
				grabbedAt,
				0.5
			)
			const to = await at(grid.slotAt('2025-03-14T11:00'), 0.5, 0.2)

			await dragPoints(page, from, to)

			const [moved] = (await grid.eventState()).filter(
				(event) => event.id === 'allday-1'
			)
			expect(moved).toMatchObject({
				start: '2025-03-14T11:00:00.000Z',
				end: '2025-03-14T12:00:00.000Z',
				allDay: false,
			})
		})
	}

	test('a timed event dropped on the all-day row ends at the next midnight', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { scrollTime: '00:00', slot: 30 },
		})
		const grid = new TimeGrid(page)
		await settleAnimations(page)
		const from = await at(grid.bars('basic-1').first(), 0.5, 0.2)
		const to = await at(grid.allDayRow, 0.7, 0.5)

		await dragPoints(page, from, to)

		const [moved] = (await grid.eventState()).filter(
			(event) => event.id === 'basic-1'
		)
		expect(moved).toMatchObject({
			start: '2025-03-13T00:00:00.000Z',
			end: '2025-03-14T00:00:00.000Z',
			allDay: true,
		})
	})

	test('a shift moved over the spring clock change keeps its clock length, in the preview and in the callback', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await gotoScenario(page, {
			scenario: 'clock-change-shift',
			view: 'week',
			timezone: 'America/New_York',
			date: '2025-03-05T12:00:00.000-05:00',
		})
		const grid = new TimeGrid(page)
		await settleAnimations(page)
		const from = await at(grid.bars('night-shift').first(), 0.5, 0.02)
		const to = await at(grid.slotAt('2025-03-09T01:00'), 0.5, 0.1)

		const mirrorText = await dragPoints(page, from, to)

		// The slot is 20:00 EST Saturday (01:00Z; the harness names slots by their
		// instant). Plus 12 clock hours the shift ends at 08:00 EDT Sunday, 12:00Z.
		// Twelve elapsed hours would end at 09:00 EDT, and the mirror's end kept
		// the start's EST offset, so it read an hour off the committed end.
		const [moved] = (await grid.eventState()).filter(
			(event) => event.id === 'night-shift'
		)
		expect(moved?.end).toBe('2025-03-09T12:00:00.000Z')
		expect(mirrorText).toContain('8:00pm – 8:00am')
		const [change] = await grid.eventChanges()
		expect(change?.endDelta).toEqual(change?.delta)
	})
})
