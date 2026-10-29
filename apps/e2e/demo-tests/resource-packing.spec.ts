import type { CalendarEvent, IlamyCalendarApi } from '@ilamy/calendar'
import { expect, type Locator, type Page, test } from '@playwright/test'
import { formDialog, pickTime, saveForm } from '../tests/support/event-form'
import { releasePointer } from '../tests/support/harness'

const NOW = '2026-10-28T06:00:00.000Z'
const ROOM = 'room-c'
interface EventInput {
	id: string
	start: string
	end: string
	resourceId?: string
}

/*
 * The unchanged demo exposes neither a ref nor a window test bridge, and its
 * picker only offers quarter hours. Read its provider to reach the public API
 * for exact-minute setup; never mutate React state or call the layout directly.
 */
const demoApi = async (page: Page, events: EventInput[] = []) => {
	const state = await page
		.getByTestId('ilamy-calendar')
		.evaluate((element, inputs) => {
			interface Fiber {
				memoizedProps: {
					value?: IlamyCalendarApi
					resourceEvents?: CalendarEvent[]
				}
				return: Fiber | null
				child: Fiber | null
				sibling: Fiber | null
				stateNode: object | null
			}
			const key = Object.keys(element).find((name) =>
				name.startsWith('__reactFiber$')
			)
			if (!key) throw new Error('React demo root not found')
			let root = Reflect.get(element, key) as Fiber
			while (root.return) root = root.return
			if (!root.stateNode) throw new Error('React root has no state')
			const currentRoot = Reflect.get(root.stateNode, 'current') as Fiber
			// The DOM's attached fiber can belong to the previous render. Find the
			// element in the committed tree before reading the consumer's callbacks.
			const pending = [currentRoot]
			let fiber: Fiber | null = null
			while (pending.length) {
				const candidate = pending.pop()
				if (!candidate) break
				if (candidate.stateNode === element) {
					fiber = candidate
					break
				}
				if (candidate.child) pending.push(candidate.child)
				if (candidate.sibling) pending.push(candidate.sibling)
			}
			let api: IlamyCalendarApi | undefined
			let published: CalendarEvent[] = []
			while (fiber) {
				const value = fiber.memoizedProps?.value
				if (value?.addEvent && !api) api = value
				if (fiber.memoizedProps?.resourceEvents)
					published = fiber.memoizedProps.resourceEvents
				fiber = fiber.return
			}
			if (!api) throw new Error('Calendar public API not found')
			for (const input of inputs) {
				const at = (time: string) => {
					const [hour, minute] = time.split(':').map(Number)
					return api.currentDate
						.hour(hour)
						.minute(minute)
						.second(0)
						.millisecond(0)
				}
				const event: CalendarEvent = {
					id: input.id,
					title: input.id,
					start: at(input.start),
					end: at(input.end),
					resourceId: input.resourceId ?? 'room-c',
					allDay: false,
				}
				const exists = api.rawEvents.some(
					(existing) => existing.id === input.id
				)
				if (exists) api.updateEvent(input.id, event)
				else api.addEvent(event)
			}
			const serialize = (event: CalendarEvent) => ({
				id: event.id,
				start: event.start.toISOString(),
				end: event.end.toISOString(),
				resourceId: event.resourceId,
			})
			return {
				events: api.rawEvents.map(serialize),
				published: published.map(serialize),
			}
		}, events)
	if (events.length > 0) await settleDemo(page)
	return state
}

const settleDemo = (page: Page) =>
	page.getByTestId('ilamy-calendar').evaluate(async (calendar) => {
		const animations = document.getAnimations().filter((animation) => {
			const effect = animation.effect
			const target = effect instanceof KeyframeEffect ? effect.target : null
			return target !== null && calendar.contains(target)
		})
		await Promise.all(animations.map((animation) => animation.finished))
	})

const setting = async (page: Page, label: string, option: string) => {
	await page
		.getByText(label, { exact: true })
		.locator('..')
		.getByRole('combobox')
		.click()
	await page.getByRole('option', { name: option, exact: true }).click()
}

const openResourceDay = async (page: Page) => {
	const now = new Date(NOW)
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
	await page.getByRole('button', { name: 'Resource', exact: true }).click()
	await page.getByRole('button', { name: 'Horizontal', exact: true }).click()
	const calendar = page.getByTestId('ilamy-calendar')
	await calendar.getByRole('button', { name: 'Month', exact: true }).click()
	await page.getByRole('menuitem', { name: 'Day', exact: true }).click()
	await settleDemo(page)
}

const bar = (page: Page, id: string) =>
	page.getByTestId(`horizontal-event-${id}`)
const row = (page: Page, resourceId = ROOM) =>
	page.getByTestId(`horizontal-row-${resourceId}`)
const box = async (locator: Locator) => {
	const bounds = await locator.boundingBox()
	if (!bounds) throw new Error('Element has no geometry')
	return bounds
}
const rowDifference = async (page: Page, a: string, b: string) => {
	const first = await box(bar(page, a))
	const second = await box(bar(page, b))
	return Math.round(second.y - first.y)
}
const fitsRow = async (page: Page, id: string, resourceId = ROOM) => {
	const event = await box(bar(page, id))
	const resource = await box(row(page, resourceId))
	expect(event.y).toBeGreaterThanOrEqual(resource.y)
	expect(event.y + event.height).toBeLessThanOrEqual(
		resource.y + resource.height
	)
}

test.use({ viewport: { width: 1500, height: 1200 } })

for (const [end, start, laneDifference] of [
	['09:00', '09:00', 0],
	['09:17', '09:17', 0],
	['09:17', '09:45', 0],
	['09:17', '09:16', 25],
] as const) {
	test(`demo hourly handoff ${end}/${start}`, async ({ page }, testInfo) => {
		await openResourceDay(page)
		await demoApi(page, [
			{ id: 'packing-a', start: '07:00', end },
			{ id: 'packing-b', start, end: '11:00' },
		])
		await expect
			.poll(() => rowDifference(page, 'packing-a', 'packing-b'))
			.toBe(laneDifference)
		const state = await demoApi(page)
		expect(state.events.find((event) => event.id === 'packing-a')?.end).toBe(
			`2026-10-28T${end}:00.000Z`
		)
		expect(state.events.find((event) => event.id === 'packing-b')?.start).toBe(
			`2026-10-28T${start}:00.000Z`
		)
		await fitsRow(page, 'packing-b')
		const isReportedHandoff = end === '09:17' && start === '09:17'
		if (isReportedHandoff) {
			const desktopPath = testInfo.outputPath('handoff-desktop.png')
			await page.screenshot({ path: desktopPath })
			await page.setViewportSize({ width: 390, height: 844 })
			await bar(page, 'packing-b').scrollIntoViewIfNeeded()
			await settleDemo(page)
			const mobilePath = testInfo.outputPath('handoff-mobile.png')
			await page.screenshot({ path: mobilePath })
		}
	})
}

test('demo nested chains reuse rows and keep resources independent', async ({
	page,
}) => {
	await openResourceDay(page)
	await demoApi(page, [
		{ id: 'packing-long', start: '07:00', end: '12:00' },
		{ id: 'packing-a', start: '08:00', end: '09:17' },
		{ id: 'packing-b', start: '09:17', end: '10:00' },
		{ id: 'packing-c', start: '09:18', end: '09:45' },
		{ id: 'packing-d', start: '10:00', end: '11:00' },
		{
			id: 'packing-independent',
			start: '07:00',
			end: '12:00',
			resourceId: 'equipment-1',
		},
	])
	for (const [id, offset] of [
		['packing-a', 25],
		['packing-b', 25],
		['packing-c', 50],
		['packing-d', 25],
	] as const) {
		await expect
			.poll(() => rowDifference(page, 'packing-long', id))
			.toBe(offset)
		await fitsRow(page, id)
	}
	const independent = await box(bar(page, 'packing-independent'))
	const resource = await box(row(page, 'equipment-1'))
	expect(Math.round(independent.y - resource.y)).toBe(1)
	await fitsRow(page, 'packing-independent', 'equipment-1')
})

test('demo row height follows lanes, and overflow counts only undisplayed events', async ({
	page,
}) => {
	await openResourceDay(page)
	await setting(page, 'Event Bar Height', '48px (two lines)')
	await setting(page, 'Max Events Per Day', '1 event')
	await demoApi(page, [
		{ id: 'packing-a', start: '09:01', end: '09:17' },
		{ id: 'packing-b', start: '09:17', end: '09:59' },
	])
	await expect.poll(() => rowDifference(page, 'packing-a', 'packing-b')).toBe(0)
	await expect(row(page).getByRole('button', { name: /More/ })).toHaveCount(0)
	const exactMinuteHeight = (await box(row(page))).height
	await demoApi(page, [
		{ id: 'packing-a', start: '07:00', end: '09:00' },
		{ id: 'packing-b', start: '09:00', end: '11:00' },
	])
	await expect
		.poll(async () => (await box(row(page))).height)
		.toBe(exactMinuteHeight)
	await demoApi(page, [
		{ id: 'packing-a', start: '09:01', end: '09:17' },
		{ id: 'packing-b', start: '09:17', end: '09:59' },
	])
	await demoApi(page, [{ id: 'packing-hidden', start: '09:18', end: '09:45' }])
	await expect(
		row(page).getByRole('button', { name: '+1 More', exact: true })
	).toBeVisible()
	await expect(bar(page, 'packing-hidden')).toHaveCount(0)
	await row(page).getByRole('button', { name: '+1 More', exact: true }).click()
	await expect(
		page.getByRole('dialog').getByText('packing-hidden', { exact: true })
	).toBeVisible()
})

test('demo reserves height for a high lane after its blockers end', async ({
	page,
}) => {
	await openResourceDay(page)
	await setting(page, 'Event Bar Height', '48px (two lines)')
	await demoApi(page, [
		{ id: 'packing-a', start: '07:00', end: '09:17' },
		{ id: 'packing-b', start: '07:00', end: '09:17' },
		{ id: 'packing-c', start: '08:00', end: '11:00' },
	])
	await expect
		.poll(() => rowDifference(page, 'packing-a', 'packing-c'))
		.toBe(98)
	await fitsRow(page, 'packing-c')
	expect((await box(row(page))).height).toBe(154)
})

test('demo pointer edit publishes the new time and repacks a real overlap', async ({
	page,
}) => {
	await openResourceDay(page)
	await page
		.getByLabel('Use event lifecycle callbacks (add/update/delete)', {
			exact: true,
		})
		.check()
	const initial = await demoApi(page)
	const resourceEvents = initial.events.filter(
		(event) => event.resourceId === ROOM
	)
	const firstId = String(resourceEvents[0].id)
	const secondId = String(resourceEvents[1].id)
	await demoApi(page, [
		{ id: firstId, start: '07:00', end: '09:17' },
		{ id: secondId, start: '09:17', end: '11:00' },
	])
	await expect.poll(() => rowDifference(page, firstId, secondId)).toBe(0)
	await expect
		.poll(async () => {
			const state = await demoApi(page)
			return state.published.find((event) => String(event.id) === firstId)?.end
		})
		.toBe('2026-10-28T09:17:00.000Z')
	const firstBar = bar(page, firstId)
	await firstBar.scrollIntoViewIfNeeded()
	await page.waitForTimeout(700)
	const eventBox = await box(firstBar)
	const x = eventBox.x + eventBox.width / 2
	const y = eventBox.y + eventBox.height / 2
	const isEventUnderPointer = await firstBar.evaluate(
		(element, point) =>
			element.contains(document.elementFromPoint(point.x, point.y)),
		{ x, y }
	)
	expect(isEventUnderPointer).toBe(true)
	await page.mouse.move(x, y)
	await page.mouse.click(x, y)
	await expect(formDialog(page)).toBeVisible()
	await pickTime(page, 'end', '9:30 AM')
	await saveForm(page)
	await expect
		.poll(async () => {
			const state = await demoApi(page)
			return state.published.find((event) => String(event.id) === firstId)?.end
		})
		.toBe('2026-10-28T09:30:00.000Z')
	await expect.poll(() => rowDifference(page, firstId, secondId)).toBe(25)
	await fitsRow(page, secondId)
})

test('demo pointer resize publishes the new time and repacks a real overlap', async ({
	page,
}) => {
	await openResourceDay(page)
	await page
		.getByLabel('Use event lifecycle callbacks (add/update/delete)', {
			exact: true,
		})
		.check()
	const initial = await demoApi(page)
	const resourceEvents = initial.events.filter(
		(event) => event.resourceId === ROOM
	)
	const firstId = String(resourceEvents[0].id)
	const secondId = String(resourceEvents[1].id)
	await demoApi(page, [
		{ id: firstId, start: '07:00', end: '09:17' },
		{ id: secondId, start: '09:17', end: '11:00' },
	])
	await expect.poll(() => rowDifference(page, firstId, secondId)).toBe(0)
	await expect
		.poll(async () => {
			const state = await demoApi(page)
			return state.published.find((event) => String(event.id) === firstId)?.end
		})
		.toBe('2026-10-28T09:17:00.000Z')
	const handle = bar(page, firstId).locator('[data-resize-handle="end"]')
	await handle.scrollIntoViewIfNeeded()
	await page.waitForTimeout(700)
	const grab = await box(handle)
	const x = grab.x + grab.width / 2
	const y = grab.y + grab.height / 2
	const isHandle = await handle.evaluate(
		(element, point) =>
			element.contains(document.elementFromPoint(point.x, point.y)),
		{ x, y }
	)
	expect(isHandle).toBe(true)
	const cell = row(page).locator('[data-start="2026-10-28T09:00:00.000Z"]')
	const target = await box(cell)
	const targetX = target.x + target.width * 0.7
	const targetY = target.y + target.height - 8
	const targetIsCell = await cell.evaluate(
		(element, point) =>
			element.contains(document.elementFromPoint(point.x, point.y)),
		{ x: targetX, y: targetY }
	)
	expect(targetIsCell).toBe(true)
	await page.mouse.move(x, y)
	await page.mouse.down()
	await page.mouse.move(targetX, targetY, { steps: 12 })
	await releasePointer(page)
	await expect
		.poll(async () => {
			const state = await demoApi(page)
			return state.published.find((event) => String(event.id) === firstId)?.end
		})
		.toBe('2026-10-28T10:00:00.000Z')
	await expect.poll(() => rowDifference(page, firstId, secondId)).toBe(25)
	await fitsRow(page, secondId)
})

test('demo day-grid still stacks events on the same day and reports overflow', async ({
	page,
}) => {
	await openResourceDay(page)
	await demoApi(page, [
		{ id: 'packing-a', start: '07:00', end: '09:17' },
		{ id: 'packing-b', start: '09:17', end: '11:00' },
	])
	const calendar = page.getByTestId('ilamy-calendar')
	await calendar.getByRole('button', { name: 'Day', exact: true }).click()
	await page.getByRole('menuitem', { name: 'Month', exact: true }).click()
	await expect
		.poll(() => rowDifference(page, 'packing-a', 'packing-b'))
		.toBe(25)
	await setting(page, 'Max Events Per Day', '1 event')
	await expect(bar(page, 'packing-b')).toHaveCount(0)
	await expect(
		row(page).getByRole('button', { name: '+1 More', exact: true })
	).toHaveCount(1)
})
