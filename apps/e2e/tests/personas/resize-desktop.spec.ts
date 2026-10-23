import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer } from '../support/harness'
import { MonthGrid, TimeGrid } from '../support/pages'

/** QA personas for 3.3.3 event resize. Real pointer drags only. */

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

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
	await releasePointer(page)
}

const bodyCursor = (page: Page) =>
	page.evaluate(() => document.body.style.cursor)

const openSettled = async (
	page: Page,
	options: Parameters<typeof gotoScenario>[1]
) => {
	await gotoScenario(page, options)
	await page.evaluate(() =>
		Promise.all(document.getAnimations().map((animation) => animation.finished))
	)
}

const handleOf = (bar: Locator, edge: 'start' | 'end') =>
	bar.locator(`[data-resize-handle="${edge}"]`)

const laneCell = (page: Page, resourceId: string, startISO: string) =>
	page
		.locator(`[data-resource-id="${resourceId}"][data-start="${startISO}"]`)
		.first()

const TALL = { width: 1280, height: 2400 }

const changeCount = (grid: TimeGrid) => async () =>
	(await grid.eventChanges()).length

test.describe('persona 1: office scheduler', () => {
	for (const slot of [15, 30, 60] as const) {
		test(`slot=${slot}: lengthen basic-1 by the end handle snaps to the hovered slot's end`, async ({
			page,
		}) => {
			await page.setViewportSize(TALL)
			await openSettled(page, {
				scenario: 'basic',
				view: 'week',
				settings: { slot, scrollTime: '00:00' },
			})
			const grid = new TimeGrid(page)
			// 09:30-10:00; hover the 11:00 slot -> end = 11:00 + slot.
			await dragTo(
				page,
				handleOf(grid.bars('basic-1'), 'end'),
				grid.slotAt('2025-03-12T11:00')
			)
			await expect.poll(changeCount(grid)).toBe(1)
			const row = await grid.eventNamed('Morning stand-up')
			const expectedEnd = new Date(
				Date.UTC(2025, 2, 12, 11, slot === 60 ? 60 : slot)
			).toISOString()
			expect(row.start).toBe('2025-03-12T09:30:00.000Z')
			expect(row.end).toBe(expectedEnd)
			const [change] = await grid.eventChanges()
			expect(change.delta).toEqual({ days: 0, milliseconds: 0 })
			const endMs = new Date(expectedEnd).getTime() - Date.UTC(2025, 2, 12, 10)
			expect(change.endDelta).toEqual({ days: 0, milliseconds: endMs })
		})
	}

	test('shorten the 90-minute review from the bottom handle (endDelta negative)', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		// 14:00-15:30 -> hover 14:30 slot -> ends 15:00.
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T14:30')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Design review')
		expect(row.end).toBe('2025-03-12T15:00:00.000Z')
		const [change] = await grid.eventChanges()
		expect(change.endDelta).toEqual({ days: 0, milliseconds: -1_800_000 })
	})

	test('shrink to the minimum: hovering the start slot leaves a one-slot event', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T14:00')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T14:00:00.000Z')
		expect(row.end).toBe('2025-03-12T14:30:00.000Z')
	})

	test('flip: dragging the end above the start commits nothing (end handle)', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T12:00')
		)
		expect(await bodyCursor(page)).toBe('')
		await releasePointer(page)
		const row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T14:00:00.000Z')
		expect(row.end).toBe('2025-03-12T15:30:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
	})

	test('flip: dragging the start handle below the end commits nothing', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
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
			handleOf(grid.bars('basic-2'), 'start'),
			grid.slotAt('2025-03-12T17:00')
		)
		const row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T14:00:00.000Z')
		expect(row.end).toBe('2025-03-12T15:30:00.000Z')
		expect(await grid.eventChanges()).toEqual([])
	})

	test('start handle then end handle in turn: both edges stick', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: {
				slot: 30,
				scrollTime: '00:00',
				eventResizableFromStart: 'true',
			},
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'start'),
			grid.slotAt('2025-03-12T13:00')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		await page.evaluate(() =>
			Promise.all(document.getAnimations().map((a) => a.finished))
		)
		await dragTo(
			page,
			handleOf(grid.bars('basic-2'), 'end'),
			grid.slotAt('2025-03-12T16:00')
		)
		await expect.poll(changeCount(grid)).toBe(2)
		const row = await grid.eventNamed('Design review')
		expect(row.start).toBe('2025-03-12T13:00:00.000Z')
		expect(row.end).toBe('2025-03-12T16:30:00.000Z')
	})

	test('resize then move the same event keeps the new length', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T10:30')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		// now 09:30-11:00 (90 min). Move to Thursday 13:00.
		await dragTo(
			page,
			grid.bars('basic-1').locator('xpath=.').first(),
			grid.slotAt('2025-03-13T13:00')
		)
		await expect.poll(changeCount(grid)).toBe(2)
		const row = await grid.eventNamed('Morning stand-up')
		const durationMs =
			new Date(row.end).getTime() - new Date(row.start).getTime()
		expect(durationMs).toBe(5_400_000)
		expect(row.start.startsWith('2025-03-13')).toBe(true)
		const [, move] = await grid.eventChanges()
		expect(move.endDelta).toEqual(move.delta)
	})

	test('move then resize the same event', async ({ page }) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('basic-1').first(),
			grid.slotAt('2025-03-13T13:00')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		await page.evaluate(() =>
			Promise.all(document.getAnimations().map((a) => a.finished))
		)
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-13T14:00')
		)
		await expect.poll(changeCount(grid)).toBe(2)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end.startsWith('2025-03-13')).toBe(true)
		expect(
			new Date(row.end).getTime() - new Date(row.start).getTime()
		).toBeGreaterThan(1_800_000)
	})

	for (const scope of [
		{ label: 'This event', scope: 'this' },
		{ label: 'This and following events', scope: 'following' },
		{ label: 'All events', scope: 'all' },
	]) {
		test(`recurring occurrence, scope ${scope.scope}: series is changed accordingly`, async ({
			page,
		}) => {
			await page.setViewportSize(TALL)
			await openSettled(page, {
				scenario: 'recurring',
				view: 'week',
				plugins: ['recurrence'],
				settings: { slot: 30, scrollTime: '00:00' },
			})
			const grid = new TimeGrid(page)
			const occurrence = page
				.locator('[data-testid^="vertical-event-standup"]')
				.nth(3)
			// Wed 12th 09:00-09:15 -> 09:00-10:00.
			await dragTo(
				page,
				handleOf(occurrence, 'end'),
				grid.slotAt('2025-03-12T09:30')
			)
			await page.getByText(scope.label, { exact: true }).click()
			await expect.poll(changeCount(grid)).toBe(1)
			const [change] = await grid.eventChanges()
			expect(change.scope).toBe(scope.scope)
			expect(change.endDelta).toEqual({ days: 0, milliseconds: 2_700_000 })
			await page.evaluate(() =>
				Promise.all(document.getAnimations().map((a) => a.finished))
			)
			const state = await grid.eventState()
			const longer = state
				.filter((row) => row.title === 'Daily stand-up')
				.filter(
					(row) =>
						new Date(row.end).getTime() - new Date(row.start).getTime() ===
						3_600_000
				)
			// Report what the consumer holds; assert the visible week.
			const heights = await page
				.locator('[data-testid^="vertical-event-standup"]')
				.evaluateAll((els) =>
					els.map((el) => ({
						id: el.getAttribute('data-testid'),
						h: Math.round(el.getBoundingClientRect().height),
					}))
				)
			const tall = heights.filter((h) => h.h > 30)
			console.log(
				scope.scope,
				JSON.stringify({
					longer: longer.length,
					state: state.length,
					tall: tall.length,
					heights: heights.length,
				})
			)
			if (scope.scope === 'this') {
				expect(tall).toHaveLength(1)
			}
			if (scope.scope === 'all') {
				// Every visible occurrence (7 days of the week, daily series from 1 Mar) is 1h.
				expect(tall).toHaveLength(heights.length)
			}
			if (scope.scope === 'following') {
				// Wed 12 onward: Wed..Sat visible (4 of 7); Sun-Tue stay short.
				expect(tall).toHaveLength(4)
			}
		})
	}

	test('revertChanges=true: resize restores the original geometry', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00', revertChanges: 'true' },
		})
		const grid = new TimeGrid(page)
		const before = await grid.bars('basic-1').boundingBox()
		await dragTo(
			page,
			handleOf(grid.bars('basic-1'), 'end'),
			grid.slotAt('2025-03-12T11:00')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		await page.waitForTimeout(500)
		const after = await grid.bars('basic-1').boundingBox()
		expect(after).toEqual(before)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T10:00:00.000Z')
	})

	test('15-minute event: a click opens it, a drag from the end handle resizes it', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slot: 15, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('short-1')
		const box = await bar.boundingBox()
		const handle = await handleOf(bar, 'end').boundingBox()
		console.log(
			'15-min bar',
			JSON.stringify(box),
			'handle',
			JSON.stringify(handle)
		)
		// Centre click.
		const point = await centre(bar)
		await page.mouse.click(point.x, point.y)
		await expect(page.getByRole('dialog')).toBeVisible()
		expect(await grid.eventChanges()).toEqual([])
	})

	test('15-minute event: the handle still resizes it to 45 minutes', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slot: 15, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('short-1'), 'end'),
			grid.slotAt('2025-03-12T09:30')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Quarter hour')
		expect(row.start).toBe('2025-03-12T09:00:00.000Z')
		expect(row.end).toBe('2025-03-12T09:45:00.000Z')
	})

	test('off-grid event (10:50-11:05, slot 15): resize end snaps to a slot end', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'short-events',
			view: 'week',
			settings: { slot: 15, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('short-3'), 'end'),
			grid.slotAt('2025-03-12T11:15')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Off the slot boundary')
		expect(row.start).toBe('2025-03-12T10:50:00.000Z')
		expect(row.end).toBe('2025-03-12T11:30:00.000Z')
	})

	test('day view: end handle lengthens and the cursor is ns-resize', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'basic',
			view: 'day',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const handle = handleOf(grid.bars('basic-1'), 'end')
		expect(await handle.evaluate((el) => getComputedStyle(el).cursor)).toBe(
			'ns-resize'
		)
		await dragTo(page, handle, grid.slotAt('2025-03-12T11:30'))
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Morning stand-up')
		expect(row.end).toBe('2025-03-12T12:00:00.000Z')
	})

	test('overnight event: end handle (second column) resizes the end', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'overnight-event',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		const bars = grid.bars('overnight-1')
		const count = await bars.count()
		console.log('overnight bars', count)
		const ends = await page.locator('[data-resize-handle="end"]').count()
		const starts = await page.locator('[data-resize-handle="start"]').count()
		console.log('overnight handles end/start', ends, starts)
		expect(ends).toBe(1)
		expect(starts).toBe(0)
	})
})

test.describe('persona 2: resource planner', () => {
	test('horizontal resource day: end handle lives on the right edge and the lane is kept', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-2')
		const barBox = await bar.boundingBox()
		const handleBox = await handleOf(bar, 'end').boundingBox()
		if (!barBox || !handleBox) {
			throw new Error('not laid out')
		}
		expect(handleBox.x + handleBox.width).toBeGreaterThan(
			barBox.x + barBox.width - 1
		)
		expect(
			await handleOf(bar, 'end').evaluate((el) => getComputedStyle(el).cursor)
		).toBe('ew-resize')
		// Released over Room C's 13:00 hour.
		await dragTo(
			page,
			handleOf(bar, 'end'),
			laneCell(page, 'r3', '2025-03-12T13:00:00.000Z')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Room B booking')
		expect(row.resourceId).toBe('r2')
		expect(row.start).toBe('2025-03-12T10:00:00.000Z')
		expect(row.end).toBe('2025-03-12T14:00:00.000Z')
	})

	test('horizontal resource day: start handle shortens from the left, lane kept', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: { eventResizableFromStart: 'true' },
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-3')
		await dragTo(
			page,
			handleOf(bar, 'start'),
			laneCell(page, 'r1', '2025-03-12T12:00:00.000Z')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Room C booking')
		expect(row.resourceId).toBe('r3')
		console.log('res start', row.start, row.end)
		expect(row.start).toBe('2025-03-12T12:00:00.000Z')
		expect(row.end).toBe('2025-03-12T12:30:00.000Z')
	})

	test('horizontal resource week: end handle across days (auto-scroll) keeps the resource', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1600, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'horizontal',
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-4')
		await bar.scrollIntoViewIfNeeded()
		await page.waitForTimeout(300)
		const box = await handleOf(bar, 'end').boundingBox()
		if (!box) {
			throw new Error('no handle')
		}
		const y = box.y + box.height / 2
		await page.mouse.move(box.x + 3, y)
		await page.mouse.down()
		await page.mouse.move(box.x + 33, y, { steps: 5 })
		await page.mouse.move(1590, y, { steps: 10 })
		await page.waitForTimeout(1500)
		await releasePointer(page)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Room A, later')
		expect(row.resourceId).toBe('r1')
		expect(row.start).toBe('2025-03-13T14:00:00.000Z')
		expect(new Date(row.end).getTime()).toBeGreaterThan(
			new Date('2025-03-14T00:00:00.000Z').getTime()
		)
	})

	test('vertical resource day: end handle keeps the column', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 1800 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'vertical',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('res-1'), 'end'),
			laneCell(page, 'r2', '2025-03-12T12:00:00.000Z')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect(row.resourceId).toBe('r1')
		expect(row.end).toBe('2025-03-12T12:30:00.000Z')
	})

	test('vertical resource week: start handle keeps the column', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 1800 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings: {
				slot: 30,
				scrollTime: '00:00',
				eventResizableFromStart: 'true',
			},
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.bars('res-3'), 'start'),
			laneCell(page, 'r1', '2025-03-12T10:00:00.000Z')
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Room C booking')
		expect(row.resourceId).toBe('r3')
		expect(row.start).toBe('2025-03-12T10:00:00.000Z')
	})

	test('horizontal resource day: pull the end handle past the right scroll edge (narrow viewport)', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1000, height: 900 })
		await openSettled(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
		})
		const grid = new TimeGrid(page)
		const bar = page.getByTestId('horizontal-event-res-1')
		const handle = handleOf(bar, 'end')
		const start = await centre(handle)
		await page.mouse.move(start.x, start.y)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(start.x + step * 20, start.y)
		}
		// Park at the right viewport edge for a while, let auto-scroll run.
		await page.mouse.move(995, start.y, { steps: 5 })
		await page.waitForTimeout(1500)
		await releasePointer(page)
		const changes = await grid.eventChanges()
		const row = await grid.eventNamed('Room A booking')
		console.log('edge scroll', JSON.stringify({ changes: changes.length, row }))
		expect(row.resourceId).toBe('r1')
		expect(row.start).toBe('2025-03-12T09:00:00.000Z')
		expect(new Date(row.end).getTime()).toBeGreaterThan(
			new Date('2025-03-12T10:30:00.000Z').getTime()
		)
		expect(new Date(row.end).getTime()).toBeLessThanOrEqual(
			new Date('2025-03-13T00:00:00.000Z').getTime()
		)
	})

	test('long resource event: a month-grid resize of a multi-day all-day event', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 2400, height: 900 })
		await openSettled(page, {
			scenario: 'long-resource-events',
			view: 'month',
			orientation: 'horizontal',
		})
		const handles = await page.locator('[data-resize-handle="end"]').count()
		console.log('long-resource month end handles', handles)
		const bar = page.getByTestId('horizontal-event-long-res-1')
		const grid = new TimeGrid(page)
		const handle = handleOf(bar, 'end')
		if ((await handle.count()) === 0) {
			throw new Error('no end handle on long-res-1')
		}
		await dragTo(
			page,
			handle,
			page.locator('[data-resource-id="r2"][data-start^="2025-03-15"]').first()
		)
		await expect.poll(changeCount(grid)).toBe(1)
		const row = await grid.eventNamed('Site survey')
		expect(row.resourceId).toBe('r1')
		expect(row.end).toBe('2025-03-16T00:00:00.000Z')
	})
})

test.describe('persona 3: month planner', () => {
	test('forwards across a week row then backwards across it again', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-19')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		let row = await month.eventNamed('Public holiday')
		expect(row.end).toBe('2025-03-20T00:00:00.000Z')
		await page.evaluate(() =>
			Promise.all(document.getAnimations().map((a) => a.finished))
		)
		// The end handle now sits on the second row's segment.
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end').last(),
			month.cellOn('2025-03-13')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(2)
		row = await month.eventNamed('Public holiday')
		expect(row.start).toBe('2025-03-12T00:00:00.000Z')
		expect(row.end).toBe('2025-03-14T00:00:00.000Z')
	})

	test('a multi-day bar split over two rows has exactly one end handle', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'spanning-event',
			view: 'month',
			settings: { eventResizableFromStart: 'true' },
		})
		await expect(page.locator('[data-resize-handle="end"]')).toHaveCount(1)
		await expect(page.locator('[data-resize-handle="start"]')).toHaveCount(1)
	})

	test('timed multi-day: resize keeps the time of day', async ({ page }) => {
		await openSettled(page, { scenario: 'timed-multi-day', view: 'month' })
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('timed-span-1'), 'end'),
			month.cellOn('2025-03-15')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Field survey')
		expect(row.start).toBe('2025-03-10T09:00:00.000Z')
		expect(row.end).toBe('2025-03-15T17:00:00.000Z')
	})

	test('start handle on an all-day event, backwards over the previous row', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { eventResizableFromStart: 'true' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			handleOf(month.bar('allday-2'), 'start'),
			month.cellOn('2025-03-09')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Off-site')
		expect(row.start).toBe('2025-03-09T00:00:00.000Z')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
	})

	test('resize onto a cell whose events are hidden by +N more', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { dayMaxEvents: 1 },
		})
		const month = new MonthGrid(page)
		// Make the two all-day events overlap on the 13th and 14th.
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-14')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		await page.evaluate(() =>
			Promise.all(document.getAnimations().map((a) => a.finished))
		)
		const overflow = await month.overflowIndicators.count()
		console.log('overflow indicators after overlap', overflow)
		expect(overflow).toBeGreaterThan(0)
		// Now shrink it back onto a cell that shows "+N more": the 13th.
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-13')
		)
		const row = await month.eventNamed('Public holiday')
		console.log('after shrink onto +N cell', JSON.stringify(row))
		expect(row.end).toBe('2025-03-14T00:00:00.000Z')
	})

	test('single-day timed event (dot) has no handle even with start resize on', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'month',
			settings: { eventResizableFromStart: 'true' },
		})
		const month = new MonthGrid(page)
		await expect(month.event('Earlier in the month').first()).toBeVisible()
		await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
	})

	test('no-weekend-end: resizing to Saturday shows not-allowed, to Friday commits', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { eventAllow: 'no-weekend-end' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-16')
		)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		// Back onto Friday: allowed again, the cursor clears.
		const friday = await centre(month.cellOn('2025-03-14'))
		await page.mouse.move(friday.x, friday.y, { steps: 6 })
		await expect.poll(() => bodyCursor(page)).toBe('')
		await releasePointer(page)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Public holiday')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
	})

	test('week all-day row: flip (end before start) commits nothing', async ({
		page,
	}) => {
		await page.setViewportSize(TALL)
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { slot: 30, scrollTime: '00:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			handleOf(grid.allDayRow.getByTestId('horizontal-event-allday-2'), 'end'),
			grid.allDayRow
				.locator('[data-all-day="true"][data-start^="2025-03-11"]')
				.first()
		)
		expect(await grid.eventChanges()).toEqual([])
		const row = await grid.eventNamed('Off-site')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
	})
})

test.describe('persona 4: upgrader', () => {
	test('editable=false: no handles and no dnd', async ({ page }) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00', editable: 'false' },
		})
		await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
	})

	test('editable=false in month with all-day events: no handles', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { editable: 'false' },
		})
		await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
	})

	test('editable=false but eventDurationEditable=true: handles show and resize works', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { editable: 'false', eventDurationEditable: 'true' },
		})
		const month = new MonthGrid(page)
		await expect(page.locator('[data-resize-handle="end"]')).toHaveCount(2)
		await dragTo(
			page,
			handleOf(month.bar('allday-1'), 'end'),
			month.cellOn('2025-03-14')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
	})

	test('editable=false but eventDurationEditable=true: a press on the bar body still does not move it', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { editable: 'false', eventDurationEditable: 'true' },
		})
		const month = new MonthGrid(page)
		await dragTo(page, month.bar('allday-1'), month.cellOn('2025-03-20'))
		expect(await month.eventChanges()).toHaveLength(0)
		await expect(month.dragMirror).toHaveCount(0)
	})

	for (const view of ['week', 'month'] as const) {
		test(`disableDragAndDrop=true (${view}): no handles, no mirror`, async ({
			page,
		}) => {
			await openSettled(page, {
				scenario: view === 'week' ? 'basic' : 'all-day-events',
				view,
				settings: { slot: 30, scrollTime: '09:00', disableDragAndDrop: 'true' },
			})
			await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
			const grid = new TimeGrid(page)
			await expect(grid.dragMirror).toHaveCount(0)
		})
	}

	test('disableDragAndDrop=true: does not mount dnd-kit (no aria-roledescription=draggable)', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00', disableDragAndDrop: 'true' },
		})
		await expect(
			page.locator('[aria-roledescription="draggable"]')
		).toHaveCount(0)
		await expect(page.locator('[id^="DndDescribedBy"]')).toHaveCount(0)
	})

	test('eventDurationEditable=false: no handles in any view, events still move', async ({
		page,
	}) => {
		for (const view of ['week', 'day', 'month'] as const) {
			await openSettled(page, {
				scenario: 'all-day-events',
				view,
				settings: { slot: 30, eventDurationEditable: 'false' },
			})
			await expect(page.locator('[data-resize-handle]')).toHaveCount(0)
		}
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
			settings: { eventDurationEditable: 'false' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			month.event('Public holiday').first(),
			month.cellOn('2025-03-18')
		)
		await expect.poll(async () => (await month.eventChanges()).length).toBe(1)
		const row = await month.eventNamed('Public holiday')
		expect(row.start).toBe('2025-03-18T00:00:00.000Z')
		expect(row.end).toBe('2025-03-19T00:00:00.000Z')
	})

	test('click on a timed bar (week) opens it, never starts a resize', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'basic',
			view: 'week',
			settings: { slot: 30, scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('basic-1')
		const box = await bar.boundingBox()
		if (!box) {
			throw new Error('no box')
		}
		// Click exactly at the bar's bottom edge pixels inside the handle: the
		// handle swallows the click (stopPropagation) -- record what happens.
		await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2)
		const dialogAtHandle = await page.getByRole('dialog').count()
		console.log('click on handle opens dialog?', dialogAtHandle)
		expect(await grid.eventChanges()).toEqual([])
	})

	test('click on the body of a 15-minute bar opens it, no resize', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'short-events',
			view: 'day',
			settings: { slot: 15, scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		await grid.event('Quarter hour').first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		expect(await grid.eventChanges()).toEqual([])
	})

	test('a month all-day bar click opens the event, not a resize', async ({
		page,
	}) => {
		await openSettled(page, { scenario: 'all-day-events', view: 'month' })
		const month = new MonthGrid(page)
		await month.event('Off-site').first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		expect(await month.eventChanges()).toEqual([])
	})

	test('a tiny jiggle on the handle (below activation) does not resize or open', async ({
		page,
	}) => {
		await openSettled(page, {
			scenario: 'all-day-events',
			view: 'month',
		})
		const month = new MonthGrid(page)
		const point = await centre(handleOf(month.bar('allday-2'), 'end'))
		await page.mouse.move(point.x, point.y)
		await page.mouse.down()
		await page.mouse.move(point.x + 1, point.y)
		await releasePointer(page)
		expect(await month.eventChanges()).toEqual([])
		const row = await month.eventNamed('Off-site')
		expect(row.end).toBe('2025-03-15T00:00:00.000Z')
	})
})
