import { expect, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	settleAnimations,
} from './support/harness'
import { CalendarPage, TimeGrid } from './support/pages'

const lane = (resourceId: string, startISO: string) =>
	`[data-resource-id="${resourceId}"][data-start="${startISO}"]`

test.describe('horizontal row packing', () => {
	for (const [view, granularity, secondStart, expectedOffset] of [
		['day', 'hourly', '09:17', 0],
		['day', 'hourly', '09:16', 25],
		['week', 'hourly', '09:17', 0],
		['week', 'daily', '09:17', 25],
		['month', 'daily', '09:17', 25],
	] as const) {
		test(`${view} ${granularity}: 09:17/${secondStart} keeps the existing rows`, async ({
			page,
		}) => {
			const firstEnd = '2025-03-12T09:17:00.000Z'
			const secondStartISO = `2025-03-12T${secondStart}:00.000Z`
			const events = [
				{
					id: 'packing-a',
					title: 'Packing A',
					start: '2025-03-12T07:00:00.000Z',
					end: firstEnd,
					resourceId: 'r1',
				},
				{
					id: 'packing-b',
					title: 'Packing B',
					start: secondStartISO,
					end: '2025-03-12T11:00:00.000Z',
					resourceId: 'r1',
				},
			]
			const seed = JSON.stringify(events)
			const settings = {
				seed,
				granularity,
				dayMaxEvents: 2,
				eventHeight: 24,
				eventSpacing: 1,
			}
			await gotoScenario(page, {
				scenario: 'seed-resources',
				view,
				orientation: 'horizontal',
				settings,
			})
			await settleAnimations(page)

			const first = page.getByTestId('horizontal-event-packing-a')
			const second = page.getByTestId('horizontal-event-packing-b')
			const firstBox = await first.boundingBox()
			const secondBox = await second.boundingBox()
			if (!(firstBox && secondBox)) {
				throw new Error('Both events must have a rendered bar')
			}
			const offset = secondBox.y - firstBox.y
			expect(offset).toBeCloseTo(expectedOffset, 5)

			const calendar = new CalendarPage(page)
			const firstEvent = await calendar.eventNamed('Packing A')
			const secondEvent = await calendar.eventNamed('Packing B')
			expect(firstEvent.end).toBe(firstEnd)
			expect(secondEvent.start).toBe(secondStartISO)
		})
	}
})

/**
 * The bar drawn on top a few pixels inside a bar's left edge, as a pointer
 * would hit it. Overlapping bars are layered with a left offset, so the left
 * edge is where each one can always be grabbed.
 */
const topmostBarAtLeftEdge = async (page: Page, testId: string) => {
	const bar = page.getByTestId(testId).first()
	await bar.evaluate((el) =>
		el.scrollIntoView({ block: 'center', inline: 'center' })
	)
	await page.waitForTimeout(300)
	const box = await bar.boundingBox()
	if (!box) {
		throw new Error(`no box for ${testId}`)
	}
	return page.evaluate(
		({ x, y }) =>
			document
				.elementFromPoint(x, y)
				?.closest('[data-testid^="vertical-event-"]')
				?.getAttribute('data-testid'),
		{ x: box.x + 4, y: box.y + box.height / 2 }
	)
}

test.describe('vertical resource grids with whole-day rows', () => {
	for (const [view, granularity] of [
		['month', undefined],
		['week', 'daily'],
	] as const) {
		const name = granularity ? `${view} ${granularity}` : view
		test(`two same-day events in one room are both visible and grabbable (vertical ${name})`, async ({
			page,
		}) => {
			const settings: Record<string, string | number> = {
				height: '700px',
				resourceCount: 6,
			}
			if (granularity) {
				settings.granularity = granularity
			}
			await gotoScenario(page, {
				scenario: 'venue-rooms',
				view,
				orientation: 'vertical',
				settings,
			})
			await page.waitForTimeout(800)
			// "Single A" (Room 2, 09:00-10:00) and "Two days" (Room 2, 12 March
			// 20:00 to 13 March 04:00) share Wednesday in the same room column.
			expect(await topmostBarAtLeftEdge(page, 'vertical-event-q-single')).toBe(
				'vertical-event-q-single'
			)
			expect(await topmostBarAtLeftEdge(page, 'vertical-event-q-span')).toBe(
				'vertical-event-q-span'
			)
		})
	}
})

test.describe('numeric resource ids', () => {
	for (const orientation of ['horizontal', 'vertical'] as const) {
		test(`drag-to-create in a numeric-id room stores the id as a number and draws the event (${orientation})`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 2400, height: 1000 })
			await gotoScenario(page, {
				scenario: 'numeric-resources',
				view: 'day',
				orientation,
				plugins: ['drag-to-create'],
				settings: { height: '900px' },
			})
			const calendar = new CalendarPage(page)
			await page.waitForTimeout(800)
			const first = await page
				.locator(lane('0', '2025-03-12T17:00:00.000Z'))
				.first()
				.boundingBox()
			const last = await page
				.locator(lane('0', '2025-03-12T19:00:00.000Z'))
				.first()
				.boundingBox()
			if (!(first && last)) {
				throw new Error('the lane cells are not drawn')
			}
			const startX = first.x + first.width / 2
			const startY = first.y + first.height / 2
			await page.mouse.move(startX, startY)
			await page.mouse.down()
			for (let step = 1; step <= 8; step += 1) {
				await page.mouse.move(
					startX + ((last.x - first.x) * step) / 8,
					startY + ((last.y - first.y) * step) / 8
				)
			}
			await releasePointer(page)
			await page.getByLabel('Title').fill('Dragged')
			await page.getByRole('button', { name: /create|save|add/i }).click()
			await page.waitForTimeout(400)

			const row = await calendar.eventNamed('Dragged')
			// Resource ids are `string | number`; the lane's own id is the number 0.
			expect(row.resourceId).toBe(0)
			await expect(
				page.getByTestId(`${orientation}-event-${row.id}`)
			).toHaveCount(1)
		})
	}
})

test.describe('editing a cross-resource event', () => {
	test('renaming it through the form keeps its resourceIds and adds no resourceId', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'venue-rooms',
			view: 'day',
			orientation: 'horizontal',
			settings: { height: '700px' },
		})
		const calendar = new CalendarPage(page)
		await page.waitForTimeout(800)
		await page.getByTestId('horizontal-event-q-multi').nth(1).click()
		await page.getByLabel('Title').fill('Multi renamed')
		await page.getByRole('button', { name: /update|save/i }).click()
		await page.waitForTimeout(400)

		const row = await calendar.eventNamed('Multi renamed')
		expect(row.resourceIds).toEqual(['v1', 'v3', 'v28'])
		expect(row.resourceId).toBeNull()
	})
})

/*
 * A column of the vertical resource week is ONE drop target; its slots are not
 * registered with dnd-kit one by one (30 rooms at 15 minutes mounted 20,000
 * droppables, 7 s of dnd-kit copying its registry). The slot under the pointer
 * is found from the pointer's height in the column, so what this pins is that
 * the drop still lands on the exact slot and the exact room under the pointer.
 */
test.describe('dropping onto a slot of a vertical resource week', () => {
	const settings = { slot: 15, scrollTime: '08:00' }

	/** The slot of a room whose range opens at this instant. */
	const slotOf = (page: Page, resourceId: string, startISO: string) =>
		page.locator(
			`[data-testid^="vertical-cell-"][data-resource-id="${resourceId}"][data-start="${startISO}"]`
		)

	const centerOf = async (target: ReturnType<typeof slotOf>) => {
		const box = await target.boundingBox()
		if (!box) {
			throw new Error('the slot is not laid out')
		}
		return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
	}

	/** Presses the top edge of a bar and moves to `to` in steps, leaving the pointer down. */
	const dragBarTo = async (
		page: Page,
		barId: string,
		to: { x: number; y: number }
	) => {
		const box = await page.getByTestId(barId).first().boundingBox()
		if (!box) {
			throw new Error(`no box for ${barId}`)
		}
		const from = { x: box.x + box.width / 2, y: box.y + 2 }
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(
				from.x + ((to.x - from.x) * step) / 8,
				from.y + ((to.y - from.y) * step) / 8
			)
		}
	}

	test.beforeEach(async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'week',
			orientation: 'vertical',
			settings,
		})
		await page.evaluate(() =>
			Promise.all(
				document.getAnimations().map((animation) => animation.finished)
			)
		)
	})

	test('an event dropped on a 15-minute slot of another room lands on that room and slot', async ({
		page,
	}) => {
		const grid = new TimeGrid(page)
		const target = slotOf(page, 'r2', '2025-03-12T11:15:00.000Z')

		await dragBarTo(page, 'vertical-event-res-1', await centerOf(target))
		await releasePointer(page)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A booking')
		expect([row.resourceId, row.start]).toEqual([
			'r2',
			'2025-03-12T11:15:00.000Z',
		])
	})

	// A 1px line separates the hours. dnd-kit hit-tests whole pixels, which are
	// never on it, so the cells covered the line and a drop on it landed on the
	// slot above; one that read no cell would land on today, which the pinned
	// clock makes Wednesday the 12th, so the event is one from Thursday the 13th.
	test('an event released on the line between two hours lands on the slot above it', async ({
		page,
	}) => {
		const grid = new TimeGrid(page)
		const above = await slotOf(
			page,
			'r2',
			'2025-03-13T10:45:00.000Z'
		).boundingBox()
		const below = await slotOf(
			page,
			'r2',
			'2025-03-13T11:00:00.000Z'
		).boundingBox()
		if (!(above && below)) {
			throw new Error('the slots are not laid out')
		}
		const line = {
			x: above.x + above.width / 2,
			y: (above.y + above.height + below.y) / 2,
		}

		await dragBarTo(page, 'vertical-event-res-4', line)
		await releasePointer(page)

		await expect.poll(async () => (await grid.eventChanges()).length).toBe(1)
		const row = await grid.eventNamed('Room A, later')
		expect([row.resourceId, row.start]).toEqual([
			'r2',
			'2025-03-13T10:45:00.000Z',
		])
	})

	test('tints the slots the drop covers in the room under the pointer, and no other room', async ({
		page,
	}) => {
		const grid = new TimeGrid(page)
		const target = slotOf(page, 'r2', '2025-03-12T11:15:00.000Z')

		await dragBarTo(page, 'vertical-event-res-1', await centerOf(target))

		await expect(target).toHaveAttribute('data-drop-target', 'true')
		const tintedRooms = await grid.dropTargets.evaluateAll((cells) => [
			...new Set(cells.map((cell) => cell.getAttribute('data-resource-id'))),
		])
		expect(tintedRooms).toEqual(['r2'])
		await releasePointer(page)
	})
})
