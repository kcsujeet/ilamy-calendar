import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario } from '../support/harness'
import { MonthGrid, TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.3 (event resize): a mobile user on touch, an
 * international user across DST, and an edge-case hunter. Real pointer / CDP
 * touch input only.
 */

type Opts = Parameters<typeof gotoScenario>[1]

/** Opens a scenario and waits out the 500ms header animations before anything is measured or pressed. */
const openSettled = async (page: Page, options: Opts) => {
	await gotoScenario(page, options)
	await page.evaluate(() =>
		Promise.all(document.getAnimations().map((a) => a.finished))
	)
	// scrollTime scrolls the grid after the first paint; let it land.
	await page.waitForTimeout(700)
}

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const handleOf = (bar: Locator, edge: 'start' | 'end') =>
	bar.locator(`[data-resize-handle="${edge}"]`)

const pressAndMoveTo = async (page: Page, from: Locator, to: Locator) => {
	const start = await centre(from)
	const end = await centre(to)
	await page.mouse.move(start.x, start.y)
	await page.mouse.down()
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			start.x + ((end.x - start.x) * step) / 8,
			start.y + ((end.y - start.y) * step) / 8
		)
	}
}

const dragTo = async (page: Page, from: Locator, to: Locator) => {
	await pressAndMoveTo(page, from, to)
	await page.mouse.up()
}

const bodyCursor = (page: Page) =>
	page.evaluate(() => document.body.style.cursor)

const touchPoint = (point: { x: number; y: number }) => ({
	x: Math.round(point.x * 10) / 10,
	y: Math.round(point.y * 10) / 10,
})

/** A finger: down, hold, walk to the target in steps, optionally lift. */
const touchDrag = async (
	page: Page,
	from: { x: number; y: number },
	to: { x: number; y: number },
	{ holdMs = 250, release = true } = {}
) => {
	const cdp = await page.context().newCDPSession(page)
	await cdp.send('Input.dispatchTouchEvent', {
		type: 'touchStart',
		touchPoints: [touchPoint(from)],
	})
	await page.waitForTimeout(holdMs)
	for (let i = 1; i <= 10; i += 1) {
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchMove',
			touchPoints: [
				touchPoint({
					x: from.x + ((to.x - from.x) * i) / 10,
					y: from.y + ((to.y - from.y) * i) / 10,
				}),
			],
		})
		await page.waitForTimeout(20)
	}
	if (release) {
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchEnd',
			touchPoints: [],
		})
	}
	return cdp
}

const attr = (locator: Locator, name: string) =>
	locator.first().getAttribute(name)

/* ------------------------------------------------------------------ */

test.describe('persona 1: mobile user (375x812, touch)', () => {
	test.use({ hasTouch: true, viewport: { width: 375, height: 812 } })

	// Decision (3.3.3 fix round): no resize on touch-only devices until event
	// selection exists (roadmap 4.1.3). FullCalendar resizes on touch only an
	// already-selected event (EventResizing.ts:86-88, v7.1.1), and a 6px handle
	// swallowed taps and long-presses ~10px away. `@media (hover: none)` hides it.
	test('a touch device has no resize handle at all', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await expect(grid.bars('basic-1')).toBeVisible()
		await expect(page.locator('[data-resize-handle]:visible')).toHaveCount(0)
	})

	for (const view of ['day', 'week'] as const) {
		test(`${view}: a long-press near the bottom edge moves the event and never resizes it`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view,
				settings: { slot: 30, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const barBox = await grid.bars('basic-1').boundingBox()
			if (!barBox) {
				throw new Error('the bar needs a layout')
			}
			const nearBottom = {
				x: barBox.x + barBox.width / 2,
				y: barBox.y + barBox.height - 4,
			}
			const target = await centre(grid.slotAt('2025-03-12T11:30').first())

			await touchDrag(page, nearBottom, target)

			await expect
				.poll(async () => (await grid.eventNamed('Morning stand-up')).start)
				.not.toBe('2025-03-12T09:30:00.000Z')
			const row = await grid.eventNamed('Morning stand-up')
			// Still half an hour long: it moved, it did not grow.
			expect(Date.parse(row.end) - Date.parse(row.start)).toBe(1_800_000)
		})
	}

	test('a long-press within 12px of the bottom edge never resizes', async ({
		page,
	}) => {
		for (const offsetAboveBottom of [0, 6, 12]) {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: { slot: 30, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const barBox = await grid.bars('basic-1').boundingBox()
			if (!barBox) {
				throw new Error('the bar needs a layout')
			}
			const from = {
				x: barBox.x + barBox.width / 2,
				y: barBox.y + barBox.height - 1 - offsetAboveBottom,
			}
			const target = await centre(grid.slotAt('2025-03-12T11:30').first())
			await touchDrag(page, from, target)
			await page.waitForTimeout(300)
			const row = await grid.eventNamed('Morning stand-up')
			expect(Date.parse(row.end) - Date.parse(row.start)).toBe(1_800_000)
		}
	})

	test('a long-press near the bottom edge that barely moves does not grow the event', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const barBox = await grid.bars('basic-1').boundingBox()
		if (!barBox) {
			throw new Error('the bar needs a layout')
		}
		const from = {
			x: barBox.x + barBox.width / 2,
			y: barBox.y + barBox.height - 4,
		}
		await touchDrag(page, from, { x: from.x, y: from.y + 4 })
		await page.waitForTimeout(300)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
	})

	test('a scroll gesture over a bar never resizes or moves it', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const barBox = await grid.bars('basic-1').boundingBox()
		if (!barBox) {
			throw new Error('the bar needs a layout')
		}
		const bottomPoint = {
			x: barBox.x + barBox.width / 2,
			y: barBox.y + barBox.height - 4,
		}
		const bodyPoint = await centre(grid.bars('basic-1'))
		for (const from of [bottomPoint, bodyPoint]) {
			const cdp = await page.context().newCDPSession(page)
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchStart',
				touchPoints: [touchPoint(from)],
			})
			// A swipe: far beyond the 5px tolerance within the first ~20ms.
			for (let i = 1; i <= 10; i += 1) {
				await cdp.send('Input.dispatchTouchEvent', {
					type: 'touchMove',
					touchPoints: [touchPoint({ x: from.x, y: from.y - i * 12 })],
				})
				await page.waitForTimeout(8)
			}
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchEnd',
				touchPoints: [],
			})
			await page.waitForTimeout(400)
		}
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
		await expect(page.getByRole('dialog')).toHaveCount(0)
		await expect(grid.dragMirror).toHaveCount(0)
	})

	test('a tap on the bar body opens the event', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const point = await centre(grid.bars('basic-1'))
		await page.touchscreen.tap(point.x, point.y)
		await expect(page.getByRole('dialog')).toBeVisible()
		expect(await grid.eventChanges()).toEqual([])
	})

	test('a tap in the lower half of a 30-minute bar still opens the event', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const visible = grid.bars('basic-1').locator('> *').first()
		const box = await visible.boundingBox()
		if (!box) throw new Error('not laid out')
		// 55% of the way down: below the middle, above the 6px handle (which starts at 80%).
		await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height * 0.55)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('a long-press at the middle of a 30-minute bar moves the event, it does not resize it', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const visible = grid.bars('basic-1').locator('> *').first()
		const from = await centre(visible)
		const target = await centre(grid.slotAt('2025-03-12T11:00').first())
		await touchDrag(page, from, target)
		await page.waitForTimeout(500)
		const row = await grid.eventNamed('Morning stand-up')
		console.log(`LONG-PRESS MIDDLE: ${row.start} -> ${row.end}`)
		// A move keeps the 30-minute length; a resize would keep the start at 09:30.
		expect(Date.parse(row.end) - Date.parse(row.start)).toBe(30 * 60_000)
		expect(row.start).not.toBe('2025-03-12T09:30:00.000Z')
	})

	test('a 15-minute bar is tappable at its centre without hitting a handle', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { eventResizableFromStart: 'true' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('short-1')
		const barBox = await bar.boundingBox()
		const startBox = await handleOf(bar, 'start').boundingBox()
		const endBox = await handleOf(bar, 'end').boundingBox()
		console.log(
			`HANDLE 15min bar: bar ${barBox?.width}x${barBox?.height}, start ${startBox?.width}x${startBox?.height}, end ${endBox?.width}x${endBox?.height}`
		)
		const point = await centre(bar.locator('> *').first())
		await page.touchscreen.tap(point.x, point.y)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('a 15-minute bar can still be long-pressed at its centre and moved', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { eventResizableFromStart: 'true', scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const from = await centre(grid.bars('short-1').locator('> *').first())
		const target = await centre(grid.slotAt('2025-03-12T11:00').first())
		await touchDrag(page, from, target)
		await expect
			.poll(async () => (await grid.eventNamed('Quarter hour')).start)
			.toBe('2025-03-12T11:00:00.000Z')
		expect((await grid.eventNamed('Quarter hour')).end).toBe(
			'2025-03-12T11:15:00.000Z'
		)
	})

	test('month: an all-day bar has no handle on touch', async ({ page }) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)
		await expect(month.bar('allday-1')).toBeVisible()
		await expect(page.locator('[data-resize-handle]:visible')).toHaveCount(0)
	})
})

/* ------------------------------------------------------------------ */

for (const machineZone of ['UTC', 'America/New_York']) {
	test.describe(`persona 2: international user, tz=America/New_York, machine ${machineZone}`, () => {
		test.use({
			timezoneId: machineZone,
			viewport: { width: 1280, height: 2000 },
		})

		const NY = 'America/New_York'
		/** The wall clock in New York, "2025-03-09 01:00:00". */
		const wall = (iso: string) =>
			new Date(iso).toLocaleString('sv-SE', { timeZone: NY })

		const openDay = (page: Page, date: string) =>
			openSettled(page, {
				scenario: 'dst-days',
				view: 'day',
				orientation: 'vertical',
				timezone: NY,
				date,
				settings: { eventResizableFromStart: 'true' },
			})

		/**
		 * The row a person points at, by the clock hour it is labelled with
		 * (`vertical-cell-2025-03-09-03-00-resource-r1`). Rows are labelled by
		 * clock hour (docs/time-grid.md), so "the 03:00 row" is what a user means.
		 */
		const rowAt = (page: Page, day: string, hour: string) =>
			page
				.locator(`[data-testid="vertical-cell-${day}-${hour}-00-resource-r1"]`)
				.first()

		const bar = (page: Page, id: string) =>
			page.getByTestId(`vertical-event-${id}`)

		test('spring: start edge dragged across the skipped hour starts at the 01:00 row', async ({
			page,
		}) => {
			await openDay(page, '2025-03-09T13:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(
				page,
				handleOf(bar(page, 'spring'), 'start'),
				rowAt(page, '2025-03-09', '01')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Spring change')
			expect(wall(row.start)).toBe('2025-03-09 01:00:00')
			expect(row.end).toBe('2025-03-09T14:00:00.000Z')
			const [change] = await grid.eventChanges()
			// delta is wall-clock by contract (docs/types-and-interfaces.md): 09:00 -> 01:00.
			expect(change.delta).toEqual({ days: 0, milliseconds: -8 * 3_600_000 })
			expect(change.endDelta).toEqual({ days: 0, milliseconds: 0 })
		})

		test('spring: start edge dragged to the first row after the gap starts at 03:00 EDT', async ({
			page,
		}) => {
			await openDay(page, '2025-03-09T13:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(
				page,
				handleOf(bar(page, 'spring'), 'start'),
				rowAt(page, '2025-03-09', '03')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Spring change')
			expect(wall(row.start)).toBe('2025-03-09 03:00:00')
			expect(row.start).toBe('2025-03-09T07:00:00.000Z')
		})

		test('spring: move to 00:00, then resize the END across the skipped hour to the 03:00 row', async ({
			page,
		}) => {
			await openDay(page, '2025-03-09T13:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(page, bar(page, 'spring'), rowAt(page, '2025-03-09', '00'))
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const moved = await grid.eventNamed('Spring change')
			console.log(
				`SPRING moved: ${moved.start} -> ${moved.end} (wall ${wall(moved.start)} -> ${wall(moved.end)})`
			)
			await dragTo(
				page,
				handleOf(bar(page, 'spring'), 'end'),
				rowAt(page, '2025-03-09', '03')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(2)
			const row = await grid.eventNamed('Spring change')
			expect(row.start).toBe(moved.start)
			expect(wall(row.end)).toBe('2025-03-09 04:00:00')
			const change = (await grid.eventChanges()).at(1)
			const movedEndWall = Number(wall(moved.end).slice(11, 13))
			expect(change?.delta).toEqual({ days: 0, milliseconds: 0 })
			expect(change?.endDelta).toEqual({
				days: 0,
				milliseconds: (4 - movedEndWall) * 3_600_000,
			})
		})

		test('autumn: start edge dragged across the repeated hour starts at the 03:00 row', async ({
			page,
		}) => {
			await openDay(page, '2025-11-02T14:00:00.000Z')
			const grid = new TimeGrid(page)
			const row03 = rowAt(page, '2025-11-02', '03')
			console.log(
				`AUTUMN row 03 data-start=${await attr(row03, 'data-start')} data-end=${await attr(row03, 'data-end')}`
			)
			await dragTo(page, handleOf(bar(page, 'autumn'), 'start'), row03)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Autumn change')
			expect(wall(row.start)).toBe('2025-11-02 03:00:00')
			expect(wall(row.end)).toBe('2025-11-02 10:00:00')
		})

		test('autumn: start edge dragged onto the repeated 01:00 row (informational)', async ({
			page,
		}) => {
			await openDay(page, '2025-11-02T14:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(
				page,
				handleOf(bar(page, 'autumn'), 'start'),
				rowAt(page, '2025-11-02', '01')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Autumn change')
			console.log(
				`AUTUMN start->01 row: ${row.start} (wall ${wall(row.start)})`
			)
			expect(wall(row.start)).toBe('2025-11-02 01:00:00')
		})

		test('autumn: end edge on an ordinary stretch ends at the hovered row wall-clock end', async ({
			page,
		}) => {
			await openDay(page, '2025-11-02T14:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(
				page,
				handleOf(bar(page, 'autumn'), 'end'),
				rowAt(page, '2025-11-02', '11')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Autumn change')
			expect(wall(row.end)).toBe('2025-11-02 12:00:00')
			const [change] = await grid.eventChanges()
			expect(change.endDelta).toEqual({ days: 0, milliseconds: 2 * 3_600_000 })
			expect(change.delta).toEqual({ days: 0, milliseconds: 0 })
		})

		test('autumn: move to 00:00, then resize the END across the repeated hour to the 03:00 row', async ({
			page,
		}) => {
			await openDay(page, '2025-11-02T14:00:00.000Z')
			const grid = new TimeGrid(page)
			await dragTo(page, bar(page, 'autumn'), rowAt(page, '2025-11-02', '00'))
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const moved = await grid.eventNamed('Autumn change')
			console.log(
				`AUTUMN moved to 00 row: ${moved.start} -> ${moved.end} (wall ${wall(moved.start)} -> ${wall(moved.end)})`
			)
			await dragTo(
				page,
				handleOf(bar(page, 'autumn'), 'end'),
				rowAt(page, '2025-11-02', '03')
			)
			await expect.poll(async () => (await grid.eventChanges()).length).toBe(2)
			const row = await grid.eventNamed('Autumn change')
			expect(row.start).toBe(moved.start)
			expect(wall(row.end)).toBe('2025-11-02 04:00:00')
		})

		test('month: timed multi-day start edge dragged back across the spring change keeps its wall-clock time', async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'timed-multi-day',
				view: 'month',
				timezone: NY,
				date: '2025-03-12T13:00:00.000Z',
				settings: { eventResizableFromStart: 'true' },
			})
			const month = new MonthGrid(page)
			const before = await month.eventNamed('Field survey')
			await dragTo(
				page,
				handleOf(month.bar('timed-span-1'), 'start'),
				month.cellOn('2025-03-08')
			)
			await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
			const row = await month.eventNamed('Field survey')
			expect(row.end).toBe(before.end)
			expect(wall(row.start).slice(11)).toBe(wall(before.start).slice(11))
			expect(wall(row.start).slice(0, 10)).toBe('2025-03-08')
			const [change] = await month.eventChanges()
			expect(change.delta).toEqual({ days: -2, milliseconds: 0 })
		})
	})
}

/* ------------------------------------------------------------------ */

test.describe('persona 3: edge-case hunter', () => {
	test.use({ viewport: { width: 1280, height: 2200 } })

	test('week: stretching to the last slot ends exactly at midnight (exclusive), then shrinks back', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 60, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T23:00').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		let row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T14:00:00.000Z')
		expect(row.end).toBe('2025-03-13T00:00:00.000Z')
		// Still one bar, in Wednesday's column only (an exclusive midnight end must not spill a sliver into Thursday).
		await expect(grid.bars('basic-2')).toHaveCount(1)
		const bar = grid.bars('basic-2')
		const barBox = await bar.boundingBox()
		const colBox = await grid.dayColumns.nth(3).boundingBox()
		console.log(
			`MIDNIGHT bar bottom ${barBox && barBox.y + barBox.height}, col bottom ${colBox && colBox.y + colBox.height}`
		)
		// Shrink back from the midnight end.
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T16:00').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(2)
		row = await grid.eventNamed('Design review')
		expect(row.end).toBe('2025-03-12T17:00:00.000Z')
		// FullCalendar's diffDayAndTime: -1 calendar day plus +17h of wall-clock time = -7h.
		const shrink = (await grid.eventChanges()).at(1)?.endDelta
		expect((shrink?.days ?? 0) * 86_400_000 + (shrink?.milliseconds ?? 0)).toBe(
			-7 * 3_600_000
		)
	})

	test('month: an all-day event (end = next midnight) resized by one cell stays exclusive-end', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-13')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Public holiday')
		expect(row.start).toBe('2025-03-12T00:00:00.000Z')
		expect(row.end).toBe('2025-03-14T00:00:00.000Z')
		// And dropping on its own last day is a no-op (end already = that day + 1).
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-13')
		)
		await page.waitForTimeout(300)
		expect((await month.eventNamed('Public holiday')).end).toBe(
			'2025-03-14T00:00:00.000Z'
		)
		expect(await month.eventChanges()).toHaveLength(1)
	})

	test('month: a timed multi-day block keeps its time of day when its end is resized', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'spanning-event', view: 'month' })
		const month = new MonthGrid(page)
		// Conference fortnight: 5 Mar 09:00 to 19 Mar 17:00 (spans three week rows).
		await dragTo(
			page,
			handleOf(month.bar('spanning-1'), 'end'),
			month.cellOn('2025-03-21')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Conference fortnight')
		expect(row.start).toBe('2025-03-05T09:00:00.000Z')
		expect(row.end).toBe('2025-03-21T17:00:00.000Z')
		await expect(page.locator('[data-resize-handle="end"]')).toHaveCount(1)
	})

	test('week: an event spanning midnight has the end handle only on its last bar; resize its end', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: {
				slot: 60,
				eventResizableFromStart: 'true',
				scrollTime: '00:00',
			},
		})
		const grid = new TimeGrid(page)
		const bars = grid.bars('overnight-1')
		await expect(bars).toHaveCount(2)
		await expect(page.locator('[data-resize-handle="end"]')).toHaveCount(1)
		await expect(page.locator('[data-resize-handle="start"]')).toHaveCount(1)
		await dragTo(
			page,
			handleOf(bars.nth(1), 'end'),
			grid.slotAt('2025-03-13T04:00').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Night shift')
		expect(row.start).toBe('2025-03-12T22:00:00.000Z')
		expect(row.end).toBe('2025-03-13T05:00:00.000Z')
	})

	test('week: start edge of a midnight-spanning event dragged past its end does not flip', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: {
				slot: 60,
				eventResizableFromStart: 'true',
				scrollTime: '00:00',
			},
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			handleOf(grid.bars('overnight-1').first(), 'start'),
			grid.slotAt('2025-03-13T06:00').first()
		)
		console.log(`FLIP mirrors while held: ${await grid.dragMirror.count()}`)
		expect(await bodyCursor(page)).toBe('')
		await page.mouse.up()
		await page.waitForTimeout(300)
		const row = await grid.eventNamed('Night shift')
		expect(row.start).toBe('2025-03-12T22:00:00.000Z')
		expect(row.end).toBe('2025-03-13T02:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
	})

	test('week: start edge dragged exactly to the last slot before the end leaves one slot', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				slot: 30,
				eventResizableFromStart: 'true',
				scrollTime: '09:00',
			},
		})
		const grid = new TimeGrid(page)
		// Design review 14:00-15:30 -> start edge to the 15:00 slot: 15:00-15:30.
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'start'),
			grid.slotAt('2025-03-12T15:00').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T15:00:00.000Z')
		expect(row.end).toBe('2025-03-12T15:30:00.000Z')
		// Dragging the start onto the slot the event ENDS in (15:30) would give start = end.
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'start'),
			grid.slotAt('2025-03-12T15:30').first()
		)
		await page.waitForTimeout(300)
		const after = await grid.eventNamed('Design review')
		expect(after.start).toBe('2025-03-12T15:00:00.000Z')
		expect(after.end).toBe('2025-03-12T15:30:00.000Z')
		expect(await grid.eventChanges()).toHaveLength(1)
	})

	test('15-minute slots: shrinking to exactly one slot, then growing again', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'short-events', view: 'week' })
		const grid = new TimeGrid(page)
		// Half hour 09:30-10:00 -> hover the 09:30 slot: end = 09:45, one slot.
		await dragTo(
			page,
			handleOf(grid.bars('short-2'), 'end'),
			grid.slotAt('2025-03-12T09:30').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		let row = await grid.eventNamed('Half hour')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T09:45:00.000Z')
		// One-slot bar's handle is still reachable and still grows.
		await dragTo(
			page,
			handleOf(grid.bars('short-2'), 'end'),
			grid.slotAt('2025-03-12T10:15').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(2)
		row = await grid.eventNamed('Half hour')
		expect(row.end).toBe('2025-03-12T10:30:00.000Z')
	})

	test('15-minute bar: the handle is capped to a third, the middle still moves the event', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { eventResizableFromStart: 'true' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('short-1')
		// One snapshot, so nothing moves between the measurements.
		const geometry = await page.evaluate(() => {
			const wrap = document.querySelector(
				'[data-testid="vertical-event-short-1"]'
			) as HTMLElement
			const visible = wrap.firstElementChild as HTMLElement
			const rect = (el: Element) => {
				const box = el.getBoundingClientRect()
				return { top: box.top, bottom: box.bottom, height: box.height }
			}
			return {
				wrap: rect(wrap),
				visible: rect(visible),
				start: rect(
					visible.querySelector('[data-resize-handle="start"]') as Element
				),
				end: rect(
					visible.querySelector('[data-resize-handle="end"]') as Element
				),
			}
		})
		console.log(`CAP: ${JSON.stringify(geometry)}`)
		expect(geometry.end.height).toBeLessThanOrEqual(
			geometry.visible.height / 3 + 0.5
		)
		// The middle of the visible bar is covered by neither handle.
		const middleY = (geometry.visible.top + geometry.visible.bottom) / 2
		expect(middleY).toBeGreaterThanOrEqual(geometry.start.bottom)
		expect(middleY).toBeLessThanOrEqual(geometry.end.top)
		const centreOfVisible = await centre(bar.locator('> *').first())
		await page.mouse.move(centreOfVisible.x, centreOfVisible.y)
		await page.mouse.down()
		const target = await centre(grid.slotAt('2025-03-12T11:00').first())
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				centreOfVisible.x + ((target.x - centreOfVisible.x) * step) / 8,
				centreOfVisible.y + ((target.y - centreOfVisible.y) * step) / 8
			)
		}
		await page.mouse.up()
		await expect
			.poll(async () => (await grid.eventNamed('Quarter hour')).start)
			.toBe('2025-03-12T11:00:00.000Z')
		expect((await grid.eventNamed('Quarter hour')).end).toBe(
			'2025-03-12T11:15:00.000Z'
		)
		expect(await grid.eventChanges()).toHaveLength(1)
	})

	for (const slot of [15, 30, 60] as const) {
		test(`a press on the end handle nudged 3px does not change the event (${slot}-minute slots)`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1280, height: 2000 })
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { slot, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const from = await centre(handleOf(grid.bars('basic-1'), 'end'))
			await page.mouse.move(from.x, from.y)
			await page.mouse.down()
			// 3px in all, in steps with pauses, so dnd-kit has measured the cell under the pointer before the release.
			for (let step = 1; step <= 12; step += 1) {
				await page.mouse.move(from.x, from.y + (3 * step) / 12)
				await page.waitForTimeout(40)
			}
			await page.waitForTimeout(200)
			await page.mouse.up()
			await page.waitForTimeout(300)
			const row = await grid.eventNamed('Morning stand-up')
			expect(row.end).toBe('2025-03-12T10:00:00.000Z')
			expect(await grid.eventChanges()).toEqual([])
		})
	}

	test('the end handle lies inside its own bar, within the slots the event occupies', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const geometry = await page.evaluate(() => {
			const wrap = document.querySelector(
				'[data-testid="vertical-event-basic-1"]'
			) as HTMLElement
			const handle = wrap.querySelector(
				'[data-resize-handle="end"]'
			) as HTMLElement
			// The slot the event ends in is the last one it covers: 09:30 (09:30-10:00).
			const lastSlot = document.querySelector(
				'[data-testid^="vertical-cell-"][data-start^="2025-03-12T09:30"]'
			) as HTMLElement
			const handleBox = handle.getBoundingClientRect()
			const slotBox = lastSlot.getBoundingClientRect()
			return {
				handleCentreY: (handleBox.top + handleBox.bottom) / 2,
				handleBottom: handleBox.bottom,
				lastSlotBottom: slotBox.bottom,
			}
		})
		console.log(`HANDLE GEOMETRY ${JSON.stringify(geometry)}`)
		// A press at the handle's centre must hover the slot the event ends in, not the one after it.
		expect(geometry.handleCentreY).toBeLessThan(geometry.lastSlotBottom)
		// A slot's box excludes its 1px bottom border, which is where a bar ends:
		// measured, the handle's bottom is 0.6px past the slot box and 0.4px short
		// of the next slot's top. One border width is the honest tolerance.
		expect(geometry.handleBottom).toBeLessThanOrEqual(
			geometry.lastSlotBottom + 1
		)
	})

	const RESIZE_TARGETS = ['10:30', '11:30', '09:30', '12:30'] as const

	test('successive resizes, each started once the bar has settled, all commit', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		for (const hhmm of RESIZE_TARGETS) {
			await dragTo(
				page,
				handleOf(grid.bars('basic-1'), 'end'),
				grid.slotAt(`2025-03-12T${hhmm}`).first()
			)
			// The bar replays its 500ms entrance animation after each commit.
			await page.evaluate(() =>
				Promise.all(document.getAnimations().map((a) => a.finished))
			)
		}
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(4)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T13:00:00.000Z')
		const ms = (await grid.eventChanges()).map((c) => c.endDelta?.milliseconds)
		// 10:00 -> 11:00 -> 12:00 -> 10:00 -> 13:00
		expect(ms).toEqual([3_600_000, 3_600_000, -7_200_000, 10_800_000])
	})

	test('back-to-back resizes with no pause never leave a half-applied state', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		for (const hhmm of RESIZE_TARGETS) {
			await dragTo(
				page,
				handleOf(grid.bars('basic-1'), 'end'),
				grid.slotAt(`2025-03-12T${hhmm}`).first()
			)
		}
		await page.waitForTimeout(800)
		const changes = await grid.eventChanges()
		const row = await grid.eventNamed('Morning stand-up')
		const totalMs = changes.reduce(
			(sum, c) => sum + (c.endDelta?.milliseconds ?? 0),
			0
		)
		console.log(
			`BACK-TO-BACK: ${changes.length} of 4 committed, end ${row.end}`
		)
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(Date.parse(row.end) - Date.parse('2025-03-12T10:00:00.000Z')).toBe(
			totalMs
		)
		// Known limitation, documented in docs/time-grid.md: a drag started inside
		// the bar's 500ms entrance animation (it replays after every commit) can
		// be dropped, so not every one of the four need commit. What must hold is
		// the invariant above: whatever committed, nothing is half-applied.
		expect(changes.length).toBeGreaterThanOrEqual(1)
	})

	test('Escape mid-resize restores the event and commits nothing', async ({
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
			grid.slotAt('2025-03-12T11:30').first()
		)
		await expect(grid.dragMirror).toHaveCount(1)
		await page.keyboard.press('Escape')
		await expect(grid.dragMirror).toHaveCount(0)
		await page.mouse.up()
		await page.waitForTimeout(300)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
		expect(await bodyCursor(page)).toBe('')
		expect(await page.locator('[data-drop-target="true"]').count()).toBe(0)
		// And the next resize still works.
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T10:30').first()
		)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
	})

	test('releasing outside the grid (over the toolbar / page margin) commits nothing', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const start = await centre(handleOf(grid.bars('basic-1'), 'end'))
		await page.mouse.move(start.x, start.y)
		await page.mouse.down()
		await page.mouse.move(start.x, start.y + 40, { steps: 4 })
		await page.mouse.move(start.x, 4, { steps: 8 })
		await page.mouse.move(2, 2, { steps: 4 })
		await page.mouse.up()
		await page.waitForTimeout(300)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
		await expect(grid.dragMirror).toHaveCount(0)
	})

	test('month: "+N more" dialog open - events in it have no resize handle', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'many-events', view: 'month' })
		const month = new MonthGrid(page)
		await month.overflowIndicators.first().click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const handlesInDialog = await dialog.locator('[data-resize-handle]').count()
		console.log(`MORE-DIALOG handles inside dialog: ${handlesInDialog}`)
		expect(handlesInDialog).toBe(0)
		expect(await month.eventChanges()).toEqual([])
	})

	test('month: a single-day timed event (dot) has no handle even beside resizable bars', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'basic', view: 'month' })
		await expect(page.locator('[data-resize-handle]:visible')).toHaveCount(0)
	})
})
