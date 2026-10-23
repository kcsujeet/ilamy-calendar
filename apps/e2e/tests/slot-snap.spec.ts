import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	type ScenarioOptions,
	waitForDragRender,
} from './support/harness'
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
	await releasePointer(page)
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

	test('a snap finer than a 30-minute slot lands on the 15 minutes under the pointer', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)

		// 0.6 down the 11:00-11:30 slot is minute 18: the 15-minute bucket.
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, 0.6)
		)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T11:15:00.000Z')
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
		await releasePointer(page)

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
		await releasePointer(page)

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

test.describe('the snapped preview follows the pointer between slices of one cell', () => {
	/**
	 * Where the mirror sits inside the cell, as a fraction (0..1) of the cell
	 * along `axis`: `edge` picks its leading edge (a drag) or trailing edge (a
	 * resize). The mirror carries no time of its own, so its geometry is what a
	 * person sees.
	 */
	const mirrorWithin = async (
		page: Page,
		cell: Locator,
		axis: 'x' | 'y',
		edge: 'leading' | 'trailing'
	) => {
		const mirror = await page
			.locator('[data-testid^="event-drag-preview-"]')
			.first()
			.boundingBox()
		const box = await cell.boundingBox()
		if (!mirror || !box) {
			throw new Error('the mirror or the cell is not laid out')
		}
		const origin = axis === 'y' ? box.y : box.x
		const size = axis === 'y' ? box.height : box.width
		const mirrorStart = axis === 'y' ? mirror.y : mirror.x
		const mirrorSize = axis === 'y' ? mirror.height : mirror.width
		const at = edge === 'leading' ? mirrorStart : mirrorStart + mirrorSize
		return (at - origin) / size
	}

	/** Presses at `from`, enters the cell at `enter`, then slides to `slide` without leaving it. */
	const pressEnterSlide = async (
		page: Page,
		from: Point,
		enter: Point,
		slide: Point
	) => {
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				from.x + ((enter.x - from.x) * step) / 8,
				from.y + ((enter.y - from.y) * step) / 8
			)
		}
		await page.mouse.move(slide.x, slide.y, { steps: 6 })
	}

	test('a vertical drag preview moves to the slice the pointer slides to', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const cell = grid.slotAt('2025-03-12T11:00')

		await pressEnterSlide(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(cell, 0.5, 0.1),
			await pointIn(cell, 0.5, 0.9)
		)

		// 0.9 of the hour is minute 54: the 11:45 slice, three quarters down.
		expect(await mirrorWithin(page, cell, 'y', 'leading')).toBeCloseTo(0.75, 1)
		await releasePointer(page)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.start).toBe('2025-03-12T11:45:00.000Z')
	})

	test('a horizontal drag preview moves to the slice the pointer slides to', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const cell = laneCell(page, 'r2', '2025-03-12T13:00:00.000Z')

		await pressEnterSlide(
			page,
			await leftEdgeOf(page.getByTestId('horizontal-event-res-1')),
			await pointIn(cell, 0.1, 0.5),
			await pointIn(cell, 0.9, 0.5)
		)

		expect(await mirrorWithin(page, cell, 'x', 'leading')).toBeCloseTo(0.75, 1)
		await releasePointer(page)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.start).toBe('2025-03-12T13:45:00.000Z')
	})

	test('a vertical resize preview ends on the slice the pointer slides to', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 60, snapDuration: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const cell = grid.slotAt('2025-03-12T11:00')

		await pressEnterSlide(
			page,
			await pointIn(handleOf(grid.bars('basic-1'), 'end'), 0.5, 0.5),
			await pointIn(cell, 0.5, 0.1),
			await pointIn(cell, 0.5, 0.9)
		)

		// Ends with the 11:45 slice: 12:00, the cell's bottom edge.
		expect(await mirrorWithin(page, cell, 'y', 'trailing')).toBeCloseTo(1, 1)
		await releasePointer(page)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('a horizontal resize preview ends on the slice the pointer slides to', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const cell = laneCell(page, 'r1', '2025-03-12T11:00:00.000Z')

		await pressEnterSlide(
			page,
			await pointIn(
				handleOf(page.getByTestId('horizontal-event-res-1'), 'end'),
				0.5,
				0.5
			),
			await pointIn(cell, 0.1, 0.5),
			await pointIn(cell, 0.9, 0.5)
		)

		expect(await mirrorWithin(page, cell, 'x', 'trailing')).toBeCloseTo(1, 1)
		await releasePointer(page)
		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})
})

/*
 * A time column is ONE drop target and finds the slot under the pointer itself,
 * so its edges have to be the edges the cells are drawn with. They are not
 * equal: the last slot of an hour gives 1px to the line below it (15.9, 15.9,
 * 15.9, 14.9px at 15 minutes; 30.5 and 29.5px at 30), and a whole-pixel pointer
 * is what a mouse reports.
 */
test.describe('the slot under the pointer, as the cells are drawn', () => {
	const probe = JSON.stringify([
		{
			id: 'P',
			uid: 'P',
			title: 'Probe',
			start: '2025-03-12T08:00:00.000Z',
			end: '2025-03-12T09:00:00.000Z',
		},
	])

	test('a 30-minute slot with a 15-minute snap, pointer a quarter pixel above its middle, lands on the first quarter', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'seed',
			view: 'day',
			orientation: 'vertical',
			settings: {
				slot: 30,
				snapDuration: 15,
				scrollTime: '07:00',
				height: '700px',
				seed: probe,
			},
		})
		const grid = new TimeGrid(page)
		const slot = grid.slotAt('2025-03-12T10:00').first()
		const box = await slot.boundingBox()
		if (!box) {
			throw new Error('the slot is not laid out')
		}
		// The largest whole pixel still above the middle line of the drawn slot.
		const middle = box.y + box.height / 2
		const y = Math.ceil(middle) - 1
		expect(y).toBeGreaterThanOrEqual(box.y)
		expect(y).toBeLessThan(middle)

		await dragPointer(page, await topEdgeOf(grid.bars('P').first()), {
			x: box.x + box.width / 2,
			y,
		})

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Probe')
		expect(row.start).toBe('2025-03-12T10:00:00.000Z')
	})

	const sweepRow = (extra: Record<string, unknown> = {}) =>
		JSON.stringify([
			{
				id: 'sweep-1',
				uid: 'sweep-1',
				title: 'Sweep',
				start: '2025-03-12T08:00:00.000Z',
				end: '2025-03-12T09:30:00.000Z',
				...extra,
			},
		])

	/**
	 * Walks the pointer down a column a pixel at a time and records the pixels
	 * where the cell under it changes, and where the lit slot changes.
	 */
	const edgesDownColumn = async (
		page: Page,
		options: ScenarioOptions,
		column: Locator
	) => {
		await page.setViewportSize({ width: 1280, height: 1700 })
		await openSettled(page, options)
		const first = await column.boundingBox()
		const bar = await page
			.getByTestId('vertical-event-sweep-1')
			.first()
			.boundingBox()
		if (!(first && bar)) {
			throw new Error('the column or the bar is not laid out')
		}
		const x = first.x + first.width / 2
		await page.mouse.move(bar.x + bar.width / 2, bar.y + 1)
		await page.mouse.down()
		await page.mouse.move(bar.x + bar.width / 2 + 4, bar.y + 8, { steps: 3 })
		await page.mouse.move(x, first.y + 4, { steps: 5 })
		const cellEdges: number[] = []
		const litEdges: number[] = []
		let lastCell = ''
		let lastLit = ''
		for (let y = Math.ceil(first.y) + 2; y < first.y + 200; y += 1) {
			await page.mouse.move(x, y)
			await waitForDragRender(page)
			const seen = await page.evaluate(
				([px, py]) => {
					const cell = document
						.elementsFromPoint(px, py)
						.find((el) =>
							(el as HTMLElement).dataset.testid?.startsWith('vertical-cell-')
						) as HTMLElement | undefined
					const lit = [
						...document.querySelectorAll('[data-drop-target="true"]'),
					]
						.map((el) => (el as HTMLElement).dataset.start ?? '')
						.sort()
					return { cell: cell?.dataset.start ?? '', lit: lit.at(0) ?? '' }
				},
				[x, y]
			)
			if (seen.cell && lastCell && seen.cell !== lastCell) {
				cellEdges.push(y)
			}
			lastCell = seen.cell || lastCell
			if (seen.lit && lastLit && seen.lit !== lastLit) {
				litEdges.push(y)
			}
			lastLit = seen.lit || lastLit
		}
		await page.mouse.up()
		return { cellEdges, litEdges }
	}

	/** How far each lit-slot edge sits from the cell edge it belongs to. */
	const lags = ({
		cellEdges,
		litEdges,
	}: Awaited<ReturnType<typeof edgesDownColumn>>) =>
		litEdges.map((edge, index) => edge - (cellEdges.at(index) ?? Number.NaN))

	test.describe('the lit slot changes at the pixel the cell under the pointer changes', () => {
		test.setTimeout(240_000)

		test('in a week at 15 minutes', async ({ page }) => {
			const edges = await edgesDownColumn(
				page,
				{
					scenario: 'seed',
					view: 'week',
					settings: {
						slot: 15,
						scrollTime: '00:00',
						seed: sweepRow(),
					},
				},
				page
					.locator(
						'[data-testid^="vertical-cell-"][data-start^="2025-03-13T00:00"]'
					)
					.first()
			)

			expect(edges.litEdges.length).toBeGreaterThan(5)
			expect(edges.litEdges).toHaveLength(edges.cellEdges.length)
			expect(new Set(lags(edges)).size).toBe(1)
		})

		test('in a resource day at 15 minutes', async ({ page }) => {
			const edges = await edgesDownColumn(
				page,
				{
					scenario: 'seed-resources',
					view: 'day',
					orientation: 'vertical',
					settings: {
						slot: 15,
						scrollTime: '00:00',
						seed: sweepRow({ resourceId: 'r1' }),
					},
				},
				page
					.locator(
						'[data-testid^="vertical-cell-"][data-resource-id="r2"][data-start^="2025-03-12T00:00"]'
					)
					.first()
			)

			expect(edges.litEdges.length).toBeGreaterThan(5)
			expect(edges.litEdges).toHaveLength(edges.cellEdges.length)
			expect(new Set(lags(edges)).size).toBe(1)
		})
	})
})
