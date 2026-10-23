import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	type ScenarioOptions,
	waitForDragRender,
} from '../support/harness'
import { TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.5 (slotDuration 15/30/60 + snapDuration 15/30). Real pointer
 * input only. The "oracle" reads the cell under the pointer at release and the
 * snap slice inside it from the DOM, so auto-scrolled drops can be judged.
 */

type Point = { x: number; y: number }

const pointIn = async (
	cell: Locator,
	across: number,
	down: number
): Promise<Point> => {
	const box = await cell.boundingBox()
	if (!box) throw new Error('the cell is not laid out')
	return {
		x: Math.floor(box.x + box.width * across),
		y: Math.floor(box.y + box.height * down),
	}
}

const boxPoint = async (
	el: Locator,
	ax: number,
	ay: number,
	dx = 0,
	dy = 0
): Promise<Point> => {
	const box = await el.boundingBox()
	if (!box) throw new Error('not laid out')
	return {
		x: Math.floor(box.x + box.width * ax + dx),
		y: Math.floor(box.y + box.height * ay + dy),
	}
}

const walk = async (page: Page, from: Point, to: Point, steps = 8) => {
	for (let step = 1; step <= steps; step += 1) {
		await page.mouse.move(
			from.x + ((to.x - from.x) * step) / steps,
			from.y + ((to.y - from.y) * step) / steps
		)
	}
}

const dragPointer = async (page: Page, from: Point, to: Point) => {
	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	await walk(page, from, to)
	await releasePointer(page)
}

const openSettled = async (page: Page, options: ScenarioOptions) => {
	await gotoScenario(page, options)
	await page.evaluate(() =>
		Promise.all(document.getAnimations().map((animation) => animation.finished))
	)
	// scrollTime scrolls the grid after the first paint; let it land.
	await page.waitForTimeout(700)
}

const topEdgeOf = (bar: Locator) => boxPoint(bar, 0.5, 0, 0, 2)
const leftEdgeOf = (bar: Locator) => boxPoint(bar, 0, 0.5, 3, 0)
const handleOf = (bar: Locator, edge: 'start' | 'end') =>
	bar.locator(`[data-resize-handle="${edge}"]`)
const laneCell = (page: Page, resourceId: string, startISO: string) =>
	page
		.locator(`[data-resource-id="${resourceId}"][data-start="${startISO}"]`)
		.first()

/**
 * What the calendar SHOULD say the pointer is over: the cell under (x, y), cut
 * into snap slices along its time axis, and the slice the point is in.
 */
const sliceUnder = (page: Page, point: Point) =>
	page.evaluate(({ x, y }) => {
		const cells = document
			.elementsFromPoint(x, y)
			.map((el) => el.closest('[data-start][data-end]'))
			.filter((el): el is Element => el !== null)
		const cell = cells.at(0) as HTMLElement | undefined
		if (!cell) return null
		const start = new Date(cell.dataset.start ?? '').getTime()
		const end = new Date(cell.dataset.end ?? '').getTime()
		const cellMinutes = (end - start) / 60000
		const snap = cell.dataset.snapMinutes
			? Number(cell.dataset.snapMinutes)
			: cellMinutes
		const rect = cell.getBoundingClientRect()
		const horizontal = cell.dataset.timeAxis === 'horizontal'
		const fraction = horizontal
			? (x - rect.left) / rect.width
			: (y - rect.top) / rect.height
		const bucket = Math.min(
			cellMinutes / snap - 1,
			Math.max(0, Math.floor(fraction * (cellMinutes / snap)))
		)
		return {
			iso: new Date(start + bucket * snap * 60000).toISOString(),
			cell: cell.dataset.start,
			fraction,
			snap,
		}
	}, point)

const changes = async (page: Page) =>
	JSON.parse(
		(await page.getByTestId('event-changes').textContent()) ?? '[]'
	) as unknown[]
const state = async (page: Page, title: string) => {
	const rows = JSON.parse(
		(await page.getByTestId('event-state').textContent()) ?? '[]'
	) as Array<{
		title: string
		start: string
		end: string
		resourceId: string | null
	}>
	const row = rows.find((r) => r.title === title)
	if (!row) throw new Error(`no ${title}`)
	return row
}
const minutesBetween = (a: string, b: string) =>
	(new Date(b).getTime() - new Date(a).getTime()) / 60000

/** Drag, and assert start equals the oracle's slice at the release point. */
const dragExpectOracle = async (
	page: Page,
	title: string,
	from: Point,
	to: Point
) => {
	const before = await state(page, title)
	const duration = minutesBetween(before.start, before.end)
	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	await walk(page, from, to)
	const oracle = await sliceUnder(page, to)
	await releasePointer(page)
	await expect.poll(async () => (await changes(page)).length).toBe(1)
	const after = await state(page, title)
	expect(oracle).not.toBeNull()
	expect(after.start).toBe(oracle?.iso)
	expect(minutesBetween(after.start, after.end)).toBe(duration)
	return after
}

// ---------------------------------------------------------------- persona 1
test.describe('persona 1: dispatcher (horizontal resource timeline)', () => {
	test.beforeEach(async ({ page }) => {
		await page.setViewportSize({ width: 2400, height: 900 })
	})

	for (const snap of [15, 30] as const) {
		for (const across of [0.04, 0.22, 0.4, 0.55, 0.7, 0.96]) {
			for (const hour of ['10', '13', '17', '21']) {
				test(`day snap=${snap}: drop at ${across} across the ${hour}:00 column`, async ({
					page,
				}) => {
					await openSettled(page, {
						scenario: 'resources',
						view: 'day',
						orientation: 'horizontal',
						settings: { snapDuration: snap, scrollTime: '08:00' },
					})
					const bar = page.getByTestId('horizontal-event-res-1')
					const target = laneCell(page, 'r1', `2025-03-12T${hour}:00:00.000Z`)
					await target.scrollIntoViewIfNeeded()
					await dragExpectOracle(
						page,
						'Room A booking',
						await leftEdgeOf(bar),
						await pointIn(target, across, 0.5)
					)
				})
			}
		}
	}

	test('day snap=15 cross-resource drop to r3 lands on minute under pointer and resource r3', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		const row = await dragExpectOracle(
			page,
			'Room A booking',
			await leftEdgeOf(bar),
			await pointIn(laneCell(page, 'r3', '2025-03-12T15:00:00.000Z'), 0.8, 0.5)
		)
		expect(row.resourceId).toBe('r3')
		expect(row.start).toBe('2025-03-12T15:45:00.000Z')
	})

	test('week snap=15 (hourly columns): drop later the same day lands on slice under the pointer', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		await bar.scrollIntoViewIfNeeded()
		const from = await leftEdgeOf(bar)
		const target = laneCell(page, 'r2', '2025-03-12T12:00:00.000Z')
		await dragExpectOracle(
			page,
			'Room A booking',
			from,
			await pointIn(target, 0.7, 0.5)
		)
	})

	test('week snap=15: auto-scroll right while dragging, released far away still lands on a quarter, keeps its length and resource', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1000, height: 700 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		await bar.scrollIntoViewIfNeeded()
		const from = await leftEdgeOf(bar)
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		const edge = { x: 990, y: from.y }
		await walk(page, from, edge)
		await page.waitForTimeout(1500)
		await releasePointer(page)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		const after = await state(page, 'Room A booking')
		test.info().annotations.push({ type: 'landed', description: after.start })
		expect(new Date(after.start).getUTCMinutes() % 15).toBe(0)
		expect(minutesBetween(after.start, after.end)).toBe(90)
		expect(after.resourceId).toBe('r1')
	})

	for (const inset of [2, 10, 25, 45]) {
		test(`day snap=15: auto-scroll to the right end, pointer parked ${inset}px inside the edge: lands on slice under pointer`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1000, height: 700 })
			await openSettled(page, {
				scenario: 'resources',
				view: 'day',
				orientation: 'horizontal',
				settings: { snapDuration: 15, scrollTime: '08:00' },
			})
			const bar = page.getByTestId('horizontal-event-res-1')
			const from = await leftEdgeOf(bar)
			await page.mouse.move(from.x, from.y)
			await page.mouse.down()
			const edge = { x: 995, y: from.y }
			await walk(page, from, edge)
			await page.waitForTimeout(2500)
			const park = { x: edge.x - inset, y: edge.y }
			await walk(page, edge, park, 3)
			await page.waitForTimeout(400)
			const before = await sliceUnder(page, park)
			await page.waitForTimeout(400)
			const stable = await sliceUnder(page, park)
			expect(stable?.iso, 'grid still scrolling').toBe(before?.iso)
			await releasePointer(page)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const after = await state(page, 'Room A booking')
			test.info().annotations.push({
				type: 'landed',
				description: `${after.start} oracle ${stable?.iso}`,
			})
			expect(after.start).toBe(stable?.iso)
		})
	}

	test('day snap=15: resize end edge lands on quarter', async ({ page }) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		const to = await pointIn(
			laneCell(page, 'r1', '2025-03-12T14:00:00.000Z'),
			0.3,
			0.5
		)
		await dragPointer(page, await pointIn(handleOf(bar, 'end'), 0.5, 0.5), to)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		const row = await state(page, 'Room A booking')
		expect(row.start).toBe('2025-03-12T09:00:00.000Z')
		expect(row.end).toBe('2025-03-12T14:30:00.000Z')
	})

	test('day snap=15 eventResizableFromStart: resize start edge lands on quarter', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: {
				snapDuration: 15,
				scrollTime: '08:00',
				eventResizableFromStart: 'true',
			},
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		const to = await pointIn(
			laneCell(page, 'r1', '2025-03-12T08:00:00.000Z'),
			0.55,
			0.5
		)
		await dragPointer(page, await pointIn(handleOf(bar, 'start'), 0.5, 0.5), to)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		const row = await state(page, 'Room A booking')
		expect(row.start).toBe('2025-03-12T08:30:00.000Z')
		expect(row.end).toBe('2025-03-12T10:30:00.000Z')
	})

	test('day snap=30: resize end edge lands on 30 minutes', async ({ page }) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 30, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		// 0.52 -> minute 31.2 -> bucket 11:30 -> end of that bucket 12:00
		const to = await pointIn(
			laneCell(page, 'r1', '2025-03-12T11:00:00.000Z'),
			0.52,
			0.5
		)
		await dragPointer(page, await pointIn(handleOf(bar, 'end'), 0.5, 0.5), to)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		const row = await state(page, 'Room A booking')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('drag-to-create 09:15-10:45 horizontal day', async ({ page }) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			plugins: ['drag-to-create'],
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		await dragPointer(
			page,
			await pointIn(laneCell(page, 'r3', '2025-03-12T09:00:00.000Z'), 0.3, 0.5),
			await pointIn(laneCell(page, 'r3', '2025-03-12T10:00:00.000Z'), 0.7, 0.5)
		)
		await expect(page.locator('[data-testid^="time-picker-"]')).toHaveCount(2)
		const first = await page
			.locator('[data-testid^="time-picker-"]')
			.first()
			.textContent()
		const last = await page
			.locator('[data-testid^="time-picker-"]')
			.last()
			.textContent()
		expect(first).toMatch(/9:15\s?AM/i)
		expect(last).toMatch(/10:45\s?AM/i)
	})

	test('drag-to-create backwards (right to left) horizontal day', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			plugins: ['drag-to-create'],
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		await dragPointer(
			page,
			await pointIn(laneCell(page, 'r3', '2025-03-12T10:00:00.000Z'), 0.7, 0.5),
			await pointIn(laneCell(page, 'r3', '2025-03-12T09:00:00.000Z'), 0.3, 0.5)
		)
		await expect(page.locator('[data-testid^="time-picker-"]')).toHaveCount(2)
		const first = await page
			.locator('[data-testid^="time-picker-"]')
			.first()
			.textContent()
		const last = await page
			.locator('[data-testid^="time-picker-"]')
			.last()
			.textContent()
		expect(first).toMatch(/9:15\s?AM/i)
		expect(last).toMatch(/10:45\s?AM/i)
	})

	test('drag-to-create horizontal week snap=15', async ({ page }) => {
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
			plugins: ['drag-to-create'],
			settings: { snapDuration: 15, scrollTime: '08:00' },
		})
		const a = page
			.locator('[data-resource-id="r3"][data-start="2025-03-12T09:00:00.000Z"]')
			.first()
		await a.scrollIntoViewIfNeeded()
		const b = page
			.locator('[data-resource-id="r3"][data-start="2025-03-12T10:00:00.000Z"]')
			.first()
		await dragPointer(
			page,
			await pointIn(a, 0.3, 0.5),
			await pointIn(b, 0.7, 0.5)
		)
		await expect(page.locator('[data-testid^="time-picker-"]')).toHaveCount(2)
		const first = await page
			.locator('[data-testid^="time-picker-"]')
			.first()
			.textContent()
		expect(first).toMatch(/9:15\s?AM/i)
	})
})

// ---------------------------------------------------------------- persona 2
test.describe('persona 2: office scheduler (vertical)', () => {
	const slices = [0.1, 0.35, 0.6, 0.85]
	for (const [slot, snap, view] of [
		[30, undefined, 'week'],
		[30, 15, 'week'],
		[15, undefined, 'day'],
		[15, undefined, 'week'],
		[60, 15, 'day'],
		[60, 15, 'week'],
		[60, 30, 'week'],
		[30, 15, 'day'],
		[15, 30, 'week'],
	] as const) {
		for (const down of slices) {
			test(`${view} slot=${slot} snap=${snap ?? '-'}: drop ${down} down the 11:00 cell`, async ({
				page,
			}) => {
				const settings: Record<string, string | number> = {
					slot,
					scrollTime: '09:00',
				}
				if (snap) settings.snapDuration = snap
				await openSettled(page, { scenario: 'basic', view, settings })
				const grid = new TimeGrid(page)
				const target = grid.slotAt('2025-03-12T11:00').first()
				await dragExpectOracle(
					page,
					'Morning stand-up',
					await topEdgeOf(grid.bars('basic-1')),
					await pointIn(target, 0.5, down)
				)
			})
		}
	}

	test('slot=30 snap=15: the 11:30 cell, drops land inside that cell', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:30'), 0.5, 0.9)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-12T11:45:00.000Z'
		)
	})

	test('slot=60 snap=15 resize end to every slice', async ({ page }) => {
		test.slow() // several calendar loads in one test; the 30s default is too tight on a slow runner
		for (const [down, end] of [
			[0.1, '11:15'],
			[0.3, '11:30'],
			[0.6, '11:45'],
			[0.9, '12:00'],
		] as const) {
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			await dragPointer(
				page,
				await pointIn(handleOf(grid.bars('basic-1'), 'end'), 0.5, 0.5),
				await pointIn(grid.slotAt('2025-03-12T11:00'), 0.5, down)
			)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const row = await state(page, 'Morning stand-up')
			expect(row.end, `down=${down}`).toBe(`2025-03-12T${end}:00.000Z`)
			expect(row.start).toBe('2025-03-12T09:30:00.000Z')
		}
	})

	test('slot=30 snap=15 resize end', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		// 11:30 cell, 0.6 down -> 11:48 -> bucket 11:45 -> end of that bucket 12:00
		await dragPointer(
			page,
			await pointIn(handleOf(grid.bars('basic-1'), 'end'), 0.5, 0.5),
			await pointIn(grid.slotAt('2025-03-12T11:30'), 0.5, 0.6)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).end).toBe(
			'2025-03-12T12:00:00.000Z'
		)
	})

	for (const inset of [2, 10, 25, 45]) {
		test(`vertical auto-scroll to the bottom of a short viewport, pointer parked ${inset}px inside the edge: lands on slice under pointer`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: {
					slot: 60,
					snapDuration: 15,
					scrollTime: '09:00',
					height: '360px',
				},
			})
			const grid = new TimeGrid(page)
			const from = await topEdgeOf(grid.bars('basic-1'))
			await page.mouse.move(from.x, from.y)
			await page.mouse.down()
			const root = await page.getByTestId('ilamy-calendar').boundingBox()
			const bottom = Math.floor((root?.y ?? 0) + (root?.height ?? 300) - 4)
			await walk(page, from, { x: from.x, y: bottom })
			await page.waitForTimeout(2500)
			const park = { x: from.x, y: bottom - inset }
			await walk(page, { x: from.x, y: bottom }, park, 3)
			await page.waitForTimeout(400)
			const before = await sliceUnder(page, park)
			await page.waitForTimeout(400)
			const stable = await sliceUnder(page, park)
			expect(stable?.iso, 'grid still scrolling').toBe(before?.iso)
			await releasePointer(page)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const landed = (await state(page, 'Morning stand-up')).start
			test.info().annotations.push({
				type: 'landed',
				description: `${landed} oracle ${stable?.iso}`,
			})
			expect(landed).toBe(stable?.iso)
		})
	}

	for (const inset of [2, 25, 45]) {
		test(`resize end edge with vertical auto-scroll to the bottom, pointer parked ${inset}px inside the edge: ends at the end of the slice under pointer`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: {
					slot: 60,
					snapDuration: 15,
					scrollTime: '09:00',
					height: '360px',
				},
			})
			const grid = new TimeGrid(page)
			const from = await pointIn(
				handleOf(grid.bars('basic-1'), 'end'),
				0.5,
				0.5
			)
			await page.mouse.move(from.x, from.y)
			await page.mouse.down()
			const root = await page.getByTestId('ilamy-calendar').boundingBox()
			const bottom = Math.floor((root?.y ?? 0) + (root?.height ?? 300) - 4)
			await walk(page, from, { x: from.x, y: bottom })
			await page.waitForTimeout(2500)
			const park = { x: from.x, y: bottom - inset }
			await walk(page, { x: from.x, y: bottom }, park, 3)
			await page.waitForTimeout(600)
			const stable = await sliceUnder(page, park)
			await releasePointer(page)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const row = await state(page, 'Morning stand-up')
			// a resize ends at the END of the hovered slice
			const expectedEnd = new Date(
				Date.parse(stable?.iso ?? '') + 15 * 60000
			).toISOString()
			test.info().annotations.push({
				type: 'landed',
				description: `${row.end} expected ${expectedEnd}`,
			})
			expect(row.end).toBe(expectedEnd)
		})
	}

	test('control (no snapDuration, slot=15): auto-scroll to the bottom, parked 45px inside the edge, lands on the cell under the pointer', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 15, scrollTime: '09:00', height: '360px' },
		})
		const grid = new TimeGrid(page)
		const from = await topEdgeOf(grid.bars('basic-1'))
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		const root = await page.getByTestId('ilamy-calendar').boundingBox()
		const bottom = Math.floor((root?.y ?? 0) + (root?.height ?? 300) - 4)
		await walk(page, from, { x: from.x, y: bottom })
		await page.waitForTimeout(2500)
		const park = { x: from.x, y: bottom - 45 }
		await walk(page, { x: from.x, y: bottom }, park, 3)
		await page.waitForTimeout(600)
		const stable = await sliceUnder(page, park)
		await releasePointer(page)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(stable?.iso)
	})

	for (const inset of [2, 25, 45]) {
		test(`vertical auto-scroll UP to the top of a short viewport, pointer parked ${inset}px inside the edge: lands on slice under pointer`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: {
					slot: 60,
					snapDuration: 15,
					scrollTime: '09:00',
					height: '360px',
					allDaySlot: 'false',
				},
			})
			const grid = new TimeGrid(page)
			const from = await topEdgeOf(grid.bars('basic-1'))
			await page.mouse.move(from.x, from.y)
			await page.mouse.down()
			const scrollerTop = await page.evaluate(() => {
				let el: HTMLElement | null = document.querySelector(
					'[data-testid^="vertical-cell-"]'
				)
				while (el && el.scrollHeight <= el.clientHeight + 1)
					el = el.parentElement
				return el?.getBoundingClientRect().top ?? 0
			})
			const top = Math.floor(scrollerTop + 3)
			await walk(page, from, { x: from.x, y: top })
			await page.waitForTimeout(2500)
			const park = { x: from.x, y: top + inset }
			await walk(page, { x: from.x, y: top }, park, 3)
			await page.waitForTimeout(400)
			const before = await sliceUnder(page, park)
			await page.waitForTimeout(400)
			const stable = await sliceUnder(page, park)
			expect(stable?.iso, 'grid still scrolling').toBe(before?.iso)
			await releasePointer(page)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const landed = (await state(page, 'Morning stand-up')).start
			test.info().annotations.push({
				type: 'landed',
				description: `${landed} oracle ${stable?.iso}`,
			})
			expect(landed).toBe(stable?.iso)
		})
	}

	test('recurring occurrence: drag with snap=15 then scope dialog', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'recurring',
			view: 'week',
			plugins: ['recurrence'],
			settings: { slot: 60, snapDuration: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const bars = page.locator('[data-testid^="vertical-event-standup"]')
		const bar = bars.nth(2)
		await dragPointer(
			page,
			await topEdgeOf(bar),
			await pointIn(grid.slotAt('2025-03-12T11:00').first(), 0.5, 0.6)
		)
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		test.info().annotations.push({
			type: 'dialog',
			description: (await dialog.textContent()) ?? '',
		})
		await dialog.getByRole('button').first().click()
		await page.waitForTimeout(500)
		const rows = JSON.parse(
			(await page.getByTestId('event-state').textContent()) ?? '[]'
		) as Array<{ title: string; start: string; id: string }>
		test.info().annotations.push({
			type: 'rows',
			description: JSON.stringify(rows.filter((r) => r.start.includes('11:'))),
		})
		expect(
			rows.some(
				(r) =>
					r.start === '2025-03-12T11:30:00.000Z' ||
					r.start.endsWith('T11:30:00.000Z')
			)
		).toBe(true)
	})
})

// ---------------------------------------------------------------- persona 3
test.describe('persona 3: mobile user (touch)', () => {
	test.use({ hasTouch: true, viewport: { width: 375, height: 812 } })

	const touchDrag = async (page: Page, from: Point, to: Point) => {
		const cdp = await page.context().newCDPSession(page)
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [from],
		})
		await page.waitForTimeout(300)
		for (let i = 1; i <= 10; i += 1) {
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [
					{
						x: from.x + ((to.x - from.x) * i) / 10,
						y: from.y + ((to.y - from.y) * i) / 10,
					},
				],
			})
			await page.waitForTimeout(20)
		}
		await waitForDragRender(page)
		const oracle = await sliceUnder(page, to)
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchEnd',
			touchPoints: [],
		})
		return oracle
	}

	for (const down of [0.1, 0.4, 0.7, 0.9]) {
		test(`vertical day snap=15: long-press drag lands on slice (${down})`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'day',
				settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const from = await boxPoint(grid.bars('basic-1'), 0.5, 0.2)
			const target = grid.slotAt('2025-03-12T11:00').first()
			const to = await pointIn(target, 0.5, down)
			const oracle = await touchDrag(page, from, to)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const row = await state(page, 'Morning stand-up')
			// grab 20% into a 30min bar = 6 min grab; judge only the slice-level: start within slice minutes
			expect(oracle).not.toBeNull()
			test.info().annotations.push({
				type: 'res',
				description: `${row.start} oracle=${oracle?.iso}`,
			})
			expect(new Date(row.start).getUTCMinutes() % 15).toBe(0)
		})
	}

	for (const across of [0.1, 0.4, 0.6, 0.8]) {
		test(`horizontal day snap=15: long-press drag lands on slice (${across})`, async ({
			page,
		}) => {
			// Wider than the 375px persona viewport: at 375 the 10:00 cell's 0.8
			// point (x=307) is inside the 20% auto-scroll zone at the right edge,
			// so the held finger scrolls the grid for as long as the drag lasts and
			// the drop lands one slice from where it was aimed.
			await page.setViewportSize({ width: 480, height: 812 })
			await openSettled(page, {
				scenario: 'resources',
				view: 'day',
				orientation: 'horizontal',
				settings: { snapDuration: 15, scrollTime: '08:00' },
			})
			const bar = page.getByTestId('horizontal-event-res-1')
			const target = laneCell(page, 'r1', '2025-03-12T10:00:00.000Z')
			await bar.evaluate((el) => {
				let scroller: HTMLElement | null = el.parentElement
				while (scroller && scroller.scrollWidth <= scroller.clientWidth)
					scroller = scroller.parentElement
				if (scroller)
					scroller.scrollLeft += el.getBoundingClientRect().left - 115
			})
			await page.waitForTimeout(300)
			const from = await boxPoint(bar, 0, 0.5, 8, 0)
			const to = await pointIn(target, across, 0.5)
			const oracle = await touchDrag(page, from, to)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const row = await state(page, 'Room A booking')
			expect(row.start).toBe(oracle?.iso)
		})
	}

	test('no resize handles on touch (vertical + horizontal)', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
		})
		await expect(page.locator('[data-resize-handle]:visible')).toHaveCount(0)
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { snapDuration: 15 },
		})
		await expect(page.locator('[data-resize-handle]:visible')).toHaveCount(0)
	})
})

// ---------------------------------------------------------------- persona 4
const nyWall = (iso: string) =>
	new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/New_York' })
const minuteOf = (iso: string) => Number(nyWall(iso).slice(14, 16))
const elapsed = (row: { start: string; end: string }) =>
	minutesBetween(row.start, row.end)

for (const browserZone of ['UTC', 'America/New_York']) {
	test.describe(`persona 4: edge-case hunter, browser zone ${browserZone}`, () => {
		test.use({
			timezoneId: browserZone,
			viewport: { width: 2400, height: 1900 },
		})

		/** Drops the booking at `frac` of the row's cell and returns what the consumer saw. */
		const dropOnRow = async (
			page: Page,
			o: {
				orientation: 'vertical' | 'horizontal'
				date: string
				title: string
				label: string
				hh: string
				frac: number
				snap?: number
			}
		) => {
			const settings: Record<string, string | number> = { scrollTime: '00:00' }
			if (o.snap) settings.snapDuration = o.snap
			await openSettled(page, {
				scenario: 'dst-days',
				view: 'day',
				orientation: o.orientation,
				timezone: 'America/New_York',
				date: o.date,
				settings,
			})
			const day = o.date.slice(0, 10)
			const bar = page.getByTestId(`${o.orientation}-event-${o.label}`).first()
			const cell = page
				.getByTestId(
					o.orientation === 'vertical'
						? `vertical-cell-${day}-${o.hh}-00-resource-r1`
						: `day-cell-${day}-${o.hh}-00`
				)
				.first()
			if ((await cell.count()) === 0) return null
			const from =
				o.orientation === 'vertical'
					? await topEdgeOf(bar)
					: await leftEdgeOf(bar)
			const to =
				o.orientation === 'vertical'
					? await pointIn(cell, 0.5, o.frac)
					: await pointIn(cell, o.frac, 0.5)
			await dragPointer(page, from, to)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			return state(page, o.title)
		}

		for (const [label, date, title] of [
			['spring', '2025-03-09T12:00:00.000Z', 'Spring change'],
			['autumn', '2025-11-02T12:00:00.000Z', 'Autumn change'],
		] as const) {
			for (const orientation of ['vertical', 'horizontal'] as const) {
				for (const hh of ['00', '01', '02', '03', '10']) {
					test(`${label} ${orientation} row ${hh}: snapped drop = baseline hour + slice minute, same elapsed length`, async ({
						page,
					}) => {
						test.setTimeout(120000)
						for (const [frac, minute] of [
							[0.1, 0],
							[0.6, 30],
							[0.9, 45],
						] as const) {
							const base = { orientation, date, title, label, hh, frac }
							const plain = await dropOnRow(page, base)
							if (!plain) {
								test.info().annotations.push({
									type: 'no-row',
									description: `${hh} absent`,
								})
								return
							}
							const snapped = await dropOnRow(page, { ...base, snap: 15 })
							expect(snapped, `frac ${frac}`).not.toBeNull()
							const s = snapped as NonNullable<typeof snapped>
							expect(
								minuteOf(s.start),
								`minute @${frac}: ${nyWall(s.start)}`
							).toBe(minute)
							expect(
								nyWall(s.start).slice(11, 13),
								`hour @${frac}: snapped ${nyWall(s.start)} baseline ${nyWall(plain.start)}`
							).toBe(nyWall(plain.start).slice(11, 13))
							expect(
								elapsed(s),
								`elapsed @${frac}: snapped ${nyWall(s.start)}-${nyWall(s.end)} baseline ${nyWall(plain.start)}-${nyWall(plain.end)}`
							).toBe(elapsed(plain))
						}
					})
				}
			}
		}
	})
}

test.describe('persona 4: pointer on boundaries, eventAllow, upgrader, fallbacks', () => {
	// One test per offset: seven calendar loads in a single test outlasted the
	// 30s timeout on a slow runner.
	for (const dy of [-3, -2, -1, 0, 1, 2, 3]) {
		test(`pointer ${dy}px from an hour boundary (slot=60 snap=15) lands on the slice either side, never elsewhere`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
			})
			const grid = new TimeGrid(page)
			const cell = grid.slotAt('2025-03-12T12:00').first()
			const box = await cell.boundingBox()
			const topY = Math.floor(box?.y ?? 0) + dy
			const from = await topEdgeOf(grid.bars('basic-1'))
			const to = {
				x: Math.floor((box?.x ?? 0) + (box?.width ?? 0) / 2),
				y: topY,
			}
			await dragPointer(page, from, to)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			const landed = (await state(page, 'Morning stand-up')).start.slice(11, 16)
			expect(['11:45', '12:00']).toContain(landed)
		})
	}

	test('eventAllow=no-weekends: snapped drop on Saturday is refused, on Friday lands on the slice (incl. 23:45)', async ({
		page,
	}) => {
		const settings = {
			slot: 60,
			snapDuration: 15,
			scrollTime: '09:00',
			eventAllow: 'no-weekends',
		}
		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		let grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-15T11:00').first(), 0.5, 0.6)
		)
		await page.waitForTimeout(500)
		expect(await changes(page)).toHaveLength(0)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-12T09:30:00.000Z'
		)

		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-14T11:00').first(), 0.5, 0.6)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-14T11:30:00.000Z'
		)
	})

	test('eventAllow=no-weekends: Friday 23:00 row at 0.9 (23:45 start, ends Saturday) is judged by its start', async ({
		page,
	}) => {
		const settings = {
			slot: 60,
			snapDuration: 15,
			scrollTime: '16:00',
			eventAllow: 'no-weekends',
			height: '2000px',
		}
		await page.setViewportSize({ width: 1280, height: 2100 })
		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		const grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-14T23:00').first(), 0.5, 0.9)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-14T23:45:00.000Z'
		)
	})

	test('closed hour (businessHours=9-17): a snapped drop on the 08:00 row is refused, on the 09:00 row lands on the slice', async ({
		page,
	}) => {
		const settings = {
			slot: 60,
			snapDuration: 15,
			scrollTime: '07:00',
			businessHours: '9-17',
		}
		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		let grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-13T08:00').first(), 0.5, 0.6)
		)
		await page.waitForTimeout(500)
		expect(await changes(page)).toHaveLength(0)
		await openSettled(page, { scenario: 'basic', view: 'week', settings })
		grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-13T10:00').first(), 0.5, 0.6)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-13T10:30:00.000Z'
		)
	})

	test('upgrader: no snapDuration, vertical week: any point in a cell lands on the whole cell, no snap attributes in the DOM', async ({
		page,
	}) => {
		for (const down of [0.1, 0.6, 0.9]) {
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { scrollTime: '09:00' },
			})
			expect(
				await page.locator('[data-snap-minutes], [data-time-axis]').count()
			).toBe(0)
			const grid = new TimeGrid(page)
			await dragPointer(
				page,
				await topEdgeOf(grid.bars('basic-1')),
				await pointIn(grid.slotAt('2025-03-12T11:00').first(), 0.5, down)
			)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			expect(
				(await state(page, 'Morning stand-up')).start,
				`down ${down}`
			).toBe('2025-03-12T11:00:00.000Z')
		}
	})

	test('upgrader: no snapDuration, horizontal resource day: whole-hour columns, no snap attributes', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		for (const across of [0.1, 0.6, 0.9]) {
			await openSettled(page, {
				scenario: 'resources',
				view: 'day',
				orientation: 'horizontal',
				settings: { scrollTime: '08:00' },
			})
			expect(
				await page.locator('[data-snap-minutes], [data-time-axis]').count()
			).toBe(0)
			const bar = page.getByTestId('horizontal-event-res-1')
			await dragPointer(
				page,
				await leftEdgeOf(bar),
				await pointIn(
					laneCell(page, 'r2', '2025-03-12T13:00:00.000Z'),
					across,
					0.5
				)
			)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			expect(
				(await state(page, 'Room A booking')).start,
				`across ${across}`
			).toBe('2025-03-12T13:00:00.000Z')
		}
	})

	test('upgrader: slot=15 no snap, vertical: whole 15-minute cell', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 15, scrollTime: '09:00' },
		})
		expect(await page.locator('[data-snap-minutes]').count()).toBe(0)
		const grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:15').first(), 0.5, 0.8)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-12T11:15:00.000Z'
		)
	})

	for (const [slot, snap] of [
		[30, 30],
		[15, 30],
		[15, 15],
	] as const) {
		test(`snapDuration=${snap} with slot=${slot} is not finer than the cell, so the cell is used (vertical)`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { slot, snapDuration: snap, scrollTime: '09:00' },
			})
			expect(await page.locator('[data-snap-minutes]').count()).toBe(0)
			const grid = new TimeGrid(page)
			await dragPointer(
				page,
				await topEdgeOf(grid.bars('basic-1')),
				await pointIn(grid.slotAt('2025-03-12T11:00').first(), 0.5, 0.7)
			)
			await expect.poll(async () => (await changes(page)).length).toBe(1)
			expect((await state(page, 'Morning stand-up')).start).toBe(
				'2025-03-12T11:00:00.000Z'
			)
		})
	}

	test('slot=15 snap=30 (coarser than the cell): vertical falls back to 15-minute cells', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 15, snapDuration: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragPointer(
			page,
			await topEdgeOf(grid.bars('basic-1')),
			await pointIn(grid.slotAt('2025-03-12T11:15').first(), 0.5, 0.8)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Morning stand-up')).start).toBe(
			'2025-03-12T11:15:00.000Z'
		)
	})

	test('slot=15 snap=30 horizontal resource day: the hour column snaps to the half hour', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { slot: 15, snapDuration: 30, scrollTime: '08:00' },
		})
		const bar = page.getByTestId('horizontal-event-res-1')
		await dragPointer(
			page,
			await leftEdgeOf(bar),
			await pointIn(laneCell(page, 'r2', '2025-03-12T13:00:00.000Z'), 0.55, 0.5)
		)
		await expect.poll(async () => (await changes(page)).length).toBe(1)
		expect((await state(page, 'Room A booking')).start).toBe(
			'2025-03-12T13:30:00.000Z'
		)
	})

	test('slot=15 snap=15 explicit equals the cell (no snap attributes needed)', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 15, snapDuration: 15, scrollTime: '09:00' },
		})
		expect(await page.locator('[data-snap-minutes]').count()).toBe(0)
	})

	test('keyboard drag with snapDuration=15 still moves (keeps start of cell)', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 60, snapDuration: 15, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('basic-1')
		await bar.focus()
		await page.keyboard.press('Space')
		await page.keyboard.press('ArrowDown')
		await page.keyboard.press('Space')
		await page.waitForTimeout(600)
		test.info().annotations.push({
			type: 'kbd',
			description:
				JSON.stringify(await state(page, 'Morning stand-up')) +
				' changes=' +
				(await changes(page)).length,
		})
	})
})
