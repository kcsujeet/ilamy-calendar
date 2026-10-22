import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, type ScenarioOptions } from './support/harness'
import { TimeGrid } from './support/pages'

/**
 * Slot and snap sizes (roadmap 3.3.5): `slotDuration` is any divisor of an
 * hour, and `snapDuration` can be finer than the slot for a drag, a resize and
 * a drag-to-create selection, in the vertical grid and in the horizontal
 * resource timeline (#101, #138).
 *
 * The pointer goes down and moves in real steps so dnd-kit activates, and it
 * is aimed at a FRACTION of a cell, because the snap bucket under the pointer
 * is what is being pinned.
 */

type Point = { x: number; y: number }

/** A point inside a cell, `across` and `down` being fractions (0..1) of its box. */
const pointIn = async (
	cell: Locator,
	across: number,
	down: number
): Promise<Point> => {
	const box = await cell.boundingBox()
	if (!box) {
		throw new Error('the cell is not laid out')
	}
	return { x: box.x + box.width * across, y: box.y + box.height * down }
}

/** Presses at `from`, moves in steps so the sensor activates, and releases at `to`. */
const dragPointer = async (page: Page, from: Point, to: Point) => {
	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	for (let step = 1; step <= 8; step += 1) {
		await page.mouse.move(
			from.x + ((to.x - from.x) * step) / 8,
			from.y + ((to.y - from.y) * step) / 8
		)
	}
	await page.mouse.up()
}

/**
 * Opens a scenario and waits out the header animations: a handle is a few
 * pixels wide, so a press aimed at a half-faded, still-moving bar misses it.
 */
const openSettled = async (page: Page, options: ScenarioOptions) => {
	await gotoScenario(page, options)
	await page.evaluate(() =>
		Promise.all(document.getAnimations().map((animation) => animation.finished))
	)
}

/** The first pixels of a bar, where a grab has no offset into the event. */
const topEdgeOf = async (bar: Locator): Promise<Point> => {
	const box = await bar.boundingBox()
	if (!box) {
		throw new Error('the bar is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + 2 }
}

/** The left edge of a horizontal bar, past its resize handle's strip. */
const leftEdgeOf = async (bar: Locator): Promise<Point> => {
	const box = await bar.boundingBox()
	if (!box) {
		throw new Error('the bar is not laid out')
	}
	return { x: box.x + 3, y: box.y + box.height / 2 }
}

const handleOf = (bar: Locator, edge: 'start' | 'end') =>
	bar.locator(`[data-resize-handle="${edge}"]`)

/** The cell of a resource lane whose range opens at this instant. */
const laneCell = (page: Page, resourceId: string, startISO: string) =>
	page
		.locator(`[data-resource-id="${resourceId}"][data-start="${startISO}"]`)
		.first()

test.describe('slotDuration', () => {
	test('20 minutes draws three rows to the hour', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 20, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		const nineOClockRows = grid.slotAt('2025-03-12T09')
		await expect(nineOClockRows).toHaveCount(3)
		await expect(nineOClockRows.nth(0)).toHaveAttribute(
			'data-start',
			'2025-03-12T09:00:00.000Z'
		)
		await expect(nineOClockRows.nth(1)).toHaveAttribute(
			'data-start',
			'2025-03-12T09:20:00.000Z'
		)
		await expect(nineOClockRows.nth(2)).toHaveAttribute(
			'data-start',
			'2025-03-12T09:40:00.000Z'
		)
	})

	test('5 minutes draws twelve rows to the hour', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 5, scrollTime: '09:00' },
		})

		await expect(new TimeGrid(page).slotAt('2025-03-12T09')).toHaveCount(12)
	})

	for (const slot of [15, 30, 60]) {
		test(`${slot} minutes still draws ${60 / slot} rows to the hour`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: { slot, scrollTime: '09:00' },
			})

			await expect(new TimeGrid(page).slotAt('2025-03-12T09')).toHaveCount(
				60 / slot
			)
		})
	}
})

test.describe('snapDuration in the vertical time grid', () => {
	const settings = { slot: 60, snapDuration: 15, scrollTime: '09:00' }

	for (const [down, expectedStart, expectedEnd] of [
		[0.1, '11:00', '11:30'],
		[0.3, '11:15', '11:45'],
		[0.6, '11:30', '12:00'],
		[0.9, '11:45', '12:15'],
	] as const) {
		test(`an event dropped ${down} of the way down an hour row lands on ${expectedStart}`, async ({
			page,
		}) => {
			await openSettled(page, { scenario: 'basic', view: 'week', settings })
			const grid = new TimeGrid(page)

			await dragPointer(
				page,
				await topEdgeOf(grid.bars('basic-1')),
				await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, down)
			)

			await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
			const row = await grid.eventNamed('Morning stand-up')
			expect(row.start).toBe(`2025-03-12T${expectedStart}:00.000Z`)
			expect(row.end).toBe(`2025-03-12T${expectedEnd}:00.000Z`)
		})
	}

	test('a resize ends on the quarter hour under the handle', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		const grid = new TimeGrid(page)

		// 0.6 down the 11:00 row is in the 11:30 bucket, whose end is 11:45.
		await dragPointer(
			page,
			await pointIn(handleOf(grid.bars('basic-1'), 'end'), 0.5, 0.5),
			await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.6)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		expect(row.end).toBe('2025-03-12T11:45:00.000Z')
	})

	test('without a snapDuration the hour row stays the unit', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 60, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.6)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T11:00:00.000Z')
	})

	test('a snap finer than a 30-minute slot lands on the 5 minutes under the pointer', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, snapDuration: 5, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		// 0.4 down the 11:00-11:30 slot is minute 12: the 10-minute bucket.
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.4)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T11:10:00.000Z')
	})
})

test.describe('snapDuration in the horizontal resource timeline (#101)', () => {
	const settings = { snapDuration: 15, scrollTime: '08:00' }

	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings,
		})
	})

	test('a booking dropped across an hour column lands on the quarter hour under the pointer', async ({
		page,
	}) => {
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-1')

		// 0.3 across the 13:00 column is minute 18: the 15-minute bucket.
		await dragPointer(
			page,
			await leftEdgeOf(bar),
			await pointIn(laneCell(page, 'r2', '2025-03-12T13:00:00.000Z'), 0.3, 0.5)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.resourceId).toBe('r2')
		expect(row.start).toBe('2025-03-12T13:15:00.000Z')
		expect(row.end).toBe('2025-03-12T14:45:00.000Z')
	})

	test('a resize ends on the quarter hour under the handle', async ({
		page,
	}) => {
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-1')

		// 0.6 across the 11:00 column is minute 36: the 30-minute bucket, ending 11:45.
		await dragPointer(
			page,
			await pointIn(handleOf(bar, 'end'), 0.5, 0.5),
			await pointIn(laneCell(page, 'r1', '2025-03-12T11:00:00.000Z'), 0.6, 0.5)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.resourceId).toBe('r1')
		expect(row.start).toBe('2025-03-12T09:00:00.000Z')
		expect(row.end).toBe('2025-03-12T11:45:00.000Z')
	})
})

test.describe('snapDuration while the grid scrolls under a held pointer', () => {
	/**
	 * The slice a parked pointer is over, read from the DOM the way a person would
	 * judge it: the cell under the pointer and where in it the pointer sits.
	 */
	const sliceUnder = (page: Page, point: Point, axis: 'x' | 'y') =>
		page.evaluate(
			({ point: at, axis: along }) => {
				const cell = document
					.elementFromPoint(at.x, at.y)
					?.closest<HTMLElement>('[data-start]')
				if (!cell?.dataset.start) {
					return null
				}
				const box = cell.getBoundingClientRect()
				const fraction =
					along === 'y'
						? (at.y - box.top) / box.height
						: (at.x - box.left) / box.width
				const cellStartMs = Date.parse(cell.dataset.start)
				const cellEndMs = Date.parse(cell.dataset.end ?? cell.dataset.start)
				const minutes = (cellEndMs - cellStartMs) / 60_000
				const offset = Math.floor(fraction * (minutes / 15)) * 15
				return new Date(cellStartMs + offset * 60_000).toISOString()
			},
			{ point, axis }
		)

	test('a wheel scroll mid-drag lands the event on the slice under the pointer, not the last one', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				slot: 60,
				snapDuration: 15,
				scrollTime: '08:00',
				height: '500px',
			},
		})
		const grid = new TimeGrid(page)
		const from = await topEdgeOf(grid.bars('basic-1'))
		const to = await pointIn(grid.slotAt('2025-03-12T10:00'), 0.5, 0.5)

		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				from.x + ((to.x - from.x) * step) / 8,
				from.y + ((to.y - from.y) * step) / 8
			)
		}
		// The pointer parks; the grid moves two hour rows (120px) under it, so the slice under it is the same fraction of a cell two hours on.
		await page.mouse.wheel(0, 120)
		await page.waitForTimeout(300)
		const expected = await sliceUnder(page, to, 'y')
		await page.mouse.up()

		expect(expected).not.toBeNull()
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe(expected)
	})

	test('a wheel scroll mid-resize ends the event at the end of the slice under the pointer', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: {
				slot: 60,
				snapDuration: 15,
				scrollTime: '08:00',
				height: '500px',
			},
		})
		const grid = new TimeGrid(page)
		const from = await pointIn(handleOf(grid.bars('basic-1'), 'end'), 0.5, 0.5)
		const to = await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.5)

		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				from.x + ((to.x - from.x) * step) / 8,
				from.y + ((to.y - from.y) * step) / 8
			)
		}
		await page.mouse.wheel(0, 120)
		await page.waitForTimeout(300)
		const sliceStart = await sliceUnder(page, to, 'y')
		await page.mouse.up()

		expect(sliceStart).not.toBeNull()
		const expectedEnd = new Date(
			Date.parse(sliceStart ?? '') + 15 * 60_000
		).toISOString()
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe(expectedEnd)
	})
})

test.describe('snapDuration with drag-to-create', () => {
	const timeOf = (page: Page, which: 'first' | 'last') =>
		page.locator('[data-testid^="time-picker-"]')[which]().textContent()

	test('a selection in the vertical grid runs between snapped quarter hours', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			plugins: ['drag-to-create'],
			settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		// Down at 0.3 of the 11:00 row (11:15), up at 0.6 of the 12:00 row (12:30-12:45).
		await dragPointer(
			page,
			await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.3),
			await pointIn(grid.slotAt('2025-03-12T12:00'), 0.5, 0.6)
		)

		await expect(page.locator('[data-testid^="time-picker-"]')).toHaveCount(2)
		expect(await timeOf(page, 'first')).toMatch(/11:15\s?AM/i)
		expect(await timeOf(page, 'last')).toMatch(/12:45\s?PM/i)
	})

	test('a selection in the horizontal resource timeline runs between snapped quarter hours', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			plugins: ['drag-to-create'],
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})

		await dragPointer(
			page,
			await pointIn(laneCell(page, 'r3', '2025-03-12T14:00:00.000Z'), 0.3, 0.5),
			await pointIn(laneCell(page, 'r3', '2025-03-12T16:00:00.000Z'), 0.6, 0.5)
		)

		await expect(page.locator('[data-testid^="time-picker-"]')).toHaveCount(2)
		expect(await timeOf(page, 'first')).toMatch(/2:15\s?PM/i)
		expect(await timeOf(page, 'last')).toMatch(/4:45\s?PM/i)
	})
})
