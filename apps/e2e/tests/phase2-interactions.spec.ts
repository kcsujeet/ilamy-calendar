import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	PINNED_NOW,
	releasePointer,
	settleAnimations,
	waitForDragRender,
} from './support/harness'

interface PublishedRow {
	id: string
	start: string
	end: string
	resourceId: string | number | null
	allDay: boolean
}

const dragSteps = async (
	page: Page,
	from: { x: number; y: number },
	to: { x: number; y: number },
	steps = 12
) => {
	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	for (let step = 1; step <= steps; step += 1) {
		const ratio = step / steps
		await page.mouse.move(
			from.x + (to.x - from.x) * ratio,
			from.y + (to.y - from.y) * ratio
		)
	}
	await releasePointer(page)
}

const assertElementUnderPoint = async (
	_page: Page,
	locator: Locator,
	point: { x: number; y: number }
) => {
	const hit = await locator.evaluate((el, pt) => {
		const actual = document.elementFromPoint(pt.x, pt.y)
		return Boolean(actual && (el === actual || el.contains(actual)))
	}, point)
	expect(hit).toBe(true)
}

const boxOf = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('Element has no bounding box')
	}
	return box
}

const publishedEvents = async (page: Page): Promise<PublishedRow[]> => {
	const raw = await page.getByTestId('event-state').textContent()
	return JSON.parse(raw ?? '[]') as PublishedRow[]
}

const publishedChangesCount = async (page: Page): Promise<number> => {
	const raw = await page.getByTestId('event-changes').textContent()
	return (JSON.parse(raw ?? '[]') as unknown[]).length
}

const slotLocator = (
	page: Page,
	_framework: 'react' | 'vue' | 'svelte' | 'solid' | 'angular',
	startPrefix: string
) => page.locator(`[data-cell="true"][data-start^="${startPrefix}"]`).first()

const eventBarLocator = (
	page: Page,
	_framework: 'react' | 'vue' | 'svelte' | 'solid' | 'angular',
	id: string
) => page.getByTestId(`calendar-event-${id}`).first()

const seedSingleTimedEvent = () =>
	JSON.stringify([
		{
			id: 'e-drag',
			uid: 'e-drag',
			title: 'Focus Block',
			start: '2025-03-12T09:00:00.000Z',
			end: '2025-03-12T10:00:00.000Z',
		},
	])

const openInteractionScenario = async (
	page: Page,
	framework: 'react' | 'vue' | 'svelte' | 'solid' | 'angular',
	params: Record<string, string>
) => {
	const now = new Date(PINNED_NOW)
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	const search = new URLSearchParams({
		framework,
		scenario: 'seed',
		view: 'week',
		tz: 'UTC',
		date: PINNED_NOW,
		scrollTime: '08:00',
		editable: 'true',
		...params,
	})
	await page.goto(`/?${search.toString()}`)
	await page.getByTestId('harness').waitFor()
	await page.getByTestId('ilamy-calendar').waitFor()
	await settleAnimations(page)
	await waitForDragRender(page)
}

test.describe('Phase 2 headless pointer engine across frameworks', () => {
	test('Rule 5 probes: businessHours constraint blocks drop on closed cell and eventResizableFromStart gates start handle', async ({
		page,
	}) => {
		const seed = seedSingleTimedEvent()
		await openInteractionScenario(page, 'vue', {
			slot: '60',
			snapDuration: '15',
			businessHours: '9-17',
			eventConstraint: 'businessHours',
			seed,
		})

		const bar = eventBarLocator(page, 'vue', 'e-drag')
		await expect(bar).toBeVisible()
		// Default omits start resize handle; end handle is present
		await expect(bar.locator('[data-resize-handle="start"]')).toHaveCount(0)
		await expect(bar.locator('[data-resize-handle="end"]')).toHaveCount(1)

		// Probe must fail: dragging onto 08:00 (outside 9-17) commits 0 changes
		const closedCell = slotLocator(page, 'vue', '2025-03-12T08:00')
		const barBox = await boxOf(bar)
		const closedBox = await boxOf(closedCell)
		const barCenter = { x: barBox.x + barBox.width / 2, y: barBox.y + 10 }
		await assertElementUnderPoint(page, bar, barCenter)
		await dragSteps(page, barCenter, {
			x: closedBox.x + closedBox.width / 2,
			y: closedBox.y + closedBox.height / 2,
		})
		expect(await publishedChangesCount(page)).toBe(0)

		// Probe must succeed: dragging onto open 11:00 commits 1 change
		const openCell = slotLocator(page, 'vue', '2025-03-12T11:00')
		const openBox = await boxOf(openCell)
		await dragSteps(page, barCenter, {
			x: openBox.x + openBox.width / 2,
			y: openBox.y + 5,
		})
		await expect.poll(() => publishedChangesCount(page)).toBe(1)

		// With eventResizableFromStart=true, start handle renders and resizes start
		await openInteractionScenario(page, 'vue', {
			slot: '60',
			snapDuration: '15',
			eventResizableFromStart: 'true',
			seed,
		})
		const startBar = eventBarLocator(page, 'vue', 'e-drag')
		await expect(startBar.locator('[data-resize-handle="start"]')).toHaveCount(
			1
		)
	})

	for (const framework of [
		'react',
		'vue',
		'svelte',
		'solid',
		'angular',
	] as const) {
		test(`${framework}: real-pointer move, end resize, and start resize with snapDuration=15 match canonical ISO payloads`, async ({
			page,
		}) => {
			const seed = seedSingleTimedEvent()
			await openInteractionScenario(page, framework, {
				slot: '60',
				snapDuration: '15',
				eventResizableFromStart: 'true',
				seed,
			})

			// 1. Move from 09:00..10:00 (grab at y+11 to clear start resize handle while staying in 0..15m quarter) to Thursday 11:30 slice
			const bar = eventBarLocator(page, framework, 'e-drag')
			const barBox = await boxOf(bar)
			const barTopGrab = { x: barBox.x + barBox.width / 2, y: barBox.y + 11 }
			await assertElementUnderPoint(page, bar, barTopGrab)

			const targetHour = slotLocator(page, framework, '2025-03-13T11:00')
			const targetBox = await boxOf(targetHour)
			const dropPoint = {
				x: targetBox.x + targetBox.width / 2,
				y: targetBox.y + targetBox.height * 0.6, // 11:30 quarter (0.5..0.75)
			}
			await dragSteps(page, barTopGrab, dropPoint)
			await expect.poll(() => publishedChangesCount(page)).toBe(1)

			let rows = await publishedEvents(page)
			expect(rows[0].start).toBe('2025-03-13T11:30:00.000Z')
			expect(rows[0].end).toBe('2025-03-13T12:30:00.000Z')

			// 2. End resize down to 13:15 slice -> new end = 13:30
			await waitForDragRender(page)
			const movedBar = eventBarLocator(page, framework, 'e-drag')
			await movedBar.scrollIntoViewIfNeeded()
			const endHandle = movedBar.locator('[data-resize-handle="end"]')
			const endBox = await boxOf(endHandle)
			const endGrab = {
				x: endBox.x + endBox.width / 2,
				y: endBox.y + endBox.height / 2,
			}
			await assertElementUnderPoint(page, movedBar, endGrab)
			const slot13 = slotLocator(page, framework, '2025-03-13T13:00')
			const box13 = await boxOf(slot13)
			await dragSteps(page, endGrab, {
				x: box13.x + box13.width / 2,
				y: box13.y + box13.height * 0.35, // 13:15..13:30 quarter
			})
			await expect.poll(() => publishedChangesCount(page)).toBe(2)

			rows = await publishedEvents(page)
			expect(rows[0].start).toBe('2025-03-13T11:30:00.000Z')
			expect(rows[0].end).toBe('2025-03-13T13:30:00.000Z')

			// 3. Start resize up to 10:15 slice -> new start = 10:15
			await waitForDragRender(page)
			const resizedBar = eventBarLocator(page, framework, 'e-drag')
			await resizedBar.scrollIntoViewIfNeeded()
			const startHandle = resizedBar.locator('[data-resize-handle="start"]')
			const startBox = await boxOf(startHandle)
			const startGrab = {
				x: startBox.x + startBox.width / 2,
				y: startBox.y + startBox.height / 2,
			}
			await assertElementUnderPoint(page, resizedBar, startGrab)
			const slot10 = slotLocator(page, framework, '2025-03-13T10:00')
			const box10 = await boxOf(slot10)
			await dragSteps(page, startGrab, {
				x: box10.x + box10.width / 2,
				y: box10.y + box10.height * 0.35, // 10:15..10:30 quarter
			})
			await expect.poll(() => publishedChangesCount(page)).toBe(3)

			rows = await publishedEvents(page)
			expect(rows[0].start).toBe('2025-03-13T10:15:00.000Z')
			expect(rows[0].end).toBe('2025-03-13T13:30:00.000Z')
		})
	}

	for (const framework of ['react', 'vue'] as const) {
		test(`${framework}: drag-to-create supports reverse selection, snapDuration=15, and Escape cancellation`, async ({
			page,
		}) => {
			await openInteractionScenario(page, framework, {
				plugins: 'drag-to-create',
				onSelect: 'log',
				slot: '60',
				snapDuration: '15',
				seed: '[]',
			})

			const c09 = slotLocator(page, framework, '2025-03-12T09:00')
			const c11 = slotLocator(page, framework, '2025-03-12T11:00')
			const box09 = await boxOf(c09)
			const box11 = await boxOf(c11)

			// 1. Escape cancels active drag-to-create without logging selection
			await page.mouse.move(box09.x + box09.width / 2, box09.y + 10)
			await page.mouse.down()
			await page.mouse.move(box09.x + box09.width / 2, box11.y + 10, {
				steps: 6,
			})
			await page.keyboard.press('Escape')
			await releasePointer(page)
			const canceledCount = await page.evaluate(
				() =>
					(window as unknown as { __selectLog?: unknown[] }).__selectLog
						?.length ?? 0
			)
			expect(canceledCount).toBe(0)

			// 2. Reverse drag from 11:30 quarter back to 09:15 quarter -> 09:15..11:45
			await dragSteps(
				page,
				{
					x: box11.x + box11.width / 2,
					y: box11.y + box11.height * 0.6,
				},
				{
					x: box09.x + box09.width / 2,
					y: box09.y + box09.height * 0.35,
				}
			)

			await expect
				.poll(() =>
					page.evaluate(
						() =>
							(window as unknown as { __selectLog?: unknown[] }).__selectLog
								?.length ?? 0
					)
				)
				.toBe(1)

			const logged = await page.evaluate(
				() =>
					(
						window as unknown as {
							__selectLog?: Array<{ start: string; end: string }>
						}
					).__selectLog?.[0]
			)
			expect(logged?.start).toBe('2025-03-12T09:15:00.000Z')
			expect(logged?.end).toBe('2025-03-12T11:45:00.000Z')
		})
	}

	test('vue: edge auto-scroll advances scrollTop during drag-to-create and extends selection', async ({
		page,
	}) => {
		await openInteractionScenario(page, 'vue', {
			onSelect: 'log',
			height: '420px',
			scrollTime: '08:00',
			slot: '60',
			seed: '[]',
		})

		const grid = page.getByTestId('dom-week-view')
		const startCell = slotLocator(page, 'vue', '2025-03-12T09:00')
		const startBox = await boxOf(startCell)
		const gridBox = await boxOf(grid)
		await assertElementUnderPoint(page, startCell, {
			x: startBox.x + startBox.width / 2,
			y: startBox.y + 10,
		})
		const beforeScrollTop = await grid.evaluate((el) => el.scrollTop)

		await page.mouse.move(startBox.x + startBox.width / 2, startBox.y + 10)
		await page.mouse.down()
		await page.mouse.move(
			startBox.x + startBox.width / 2,
			gridBox.y + gridBox.height - 10,
			{ steps: 8 }
		)
		await page.waitForTimeout(250)
		await releasePointer(page)

		const afterScrollTop = await grid.evaluate((el) => el.scrollTop)
		expect(afterScrollTop).toBeGreaterThan(beforeScrollTop)

		const logged = await page.evaluate(
			() =>
				(
					window as unknown as {
						__selectLog?: Array<{ start: string; end: string }>
					}
				).__selectLog?.[0]
		)
		expect(logged).toBeDefined()
		expect(new Date(logged?.end ?? '').getUTCHours()).toBeGreaterThanOrEqual(14)
	})

	test('vue: horizontal hourly resource timeline cells support real-pointer drag move and resize with snapDuration=15', async ({
		page,
	}) => {
		const now = new Date(PINNED_NOW)
		await page.clock.install({ time: now })
		await page.clock.setFixedTime(now)
		const seed = encodeURIComponent(
			JSON.stringify([
				{
					id: 'res-ev',
					uid: 'res-ev',
					title: 'Room Booking',
					start: '2025-03-12T09:00:00.000Z',
					end: '2025-03-12T10:00:00.000Z',
					resourceId: 'r1',
				},
			])
		)
		await page.goto(
			`/?framework=vue&scenario=seed-resources&view=day&orientation=horizontal&tz=UTC&date=${PINNED_NOW}&slot=60&snapDuration=15&editable=true&seed=${seed}`
		)
		await page.getByTestId('dom-resource-hourly-grid').waitFor()

		const bar = page.getByTestId('calendar-event-res-ev').first()
		const barBox = await boxOf(bar)
		const grab = { x: barBox.x + 8, y: barBox.y + barBox.height / 2 }
		await assertElementUnderPoint(page, bar, grab)

		const r2Ten = page.getByTestId('dom-resource-hour-slot-r2-2025-03-12-10')
		const r2TenBox = await boxOf(r2Ten)
		await dragSteps(page, grab, {
			x: r2TenBox.x + r2TenBox.width * 0.6, // 10:30 quarter
			y: r2TenBox.y + r2TenBox.height / 2,
		})
		await expect.poll(() => publishedChangesCount(page)).toBe(1)

		const rows = await publishedEvents(page)
		expect(rows[0].resourceId).toBe('r2')
		expect(rows[0].start).toBe('2025-03-12T10:30:00.000Z')
		expect(rows[0].end).toBe('2025-03-12T11:30:00.000Z')
	})
})
