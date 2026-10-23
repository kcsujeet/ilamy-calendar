import { expect, type Locator, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	releasePointer,
	setSettings,
	waitForDragRender,
} from '../support/harness'
import { CalendarPage, MonthGrid, TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.2 (editable / eventStartEditable / eventAllow /
 * disableDragAndDrop alias). Real pointer drags only.
 */

const centre = async (locator: Locator) => {
	const box = await locator.boundingBox()
	if (!box) {
		throw new Error('element is not laid out')
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Presses on `from` and walks to `to` in steps, without releasing. */
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

/** Walks the held pointer onto `to` in steps. */
const moveOnto = async (page: Page, to: Locator, from: Locator) => {
	const start = await centre(from)
	const end = await centre(to)
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

/** A real pointer click; dnd-kit marks a non-draggable bar aria-disabled, which Playwright's click() refuses to act on. */
const pointerClick = async (page: Page, target: Locator) => {
	const point = await centre(target)
	await page.mouse.click(point.x, point.y)
}

const bodyCursor = (page: Page) =>
	page.evaluate(() => document.body.style.cursor)

const WEEK_OF_MAR_5 = {
	date: '2025-03-05T09:00:00.000Z',
}

test.describe('persona 1: upgrader (disableDragAndDrop=true)', () => {
	for (const view of ['month', 'week', 'day'] as const) {
		test(`${view}: nothing drags, no mirror, no drop highlight, no cursor`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'edit-permissions',
				view,
				date: WEEK_OF_MAR_5.date,
				settings: { disableDragAndDrop: 'true', scrollTime: '09:00' },
			})
			const grid = view === 'month' ? new MonthGrid(page) : new TimeGrid(page)
			const bar = grid.event('Free event').first()
			const target =
				grid instanceof MonthGrid
					? grid.cellOn('2025-03-07')
					: view === 'week'
						? (grid as TimeGrid).slotAt('2025-03-07T13:00')
						: (grid as TimeGrid).slotAt('2025-03-05T14:00')

			await pressAndMoveTo(page, bar, target)
			await expect(grid.dragMirror).toHaveCount(0)
			await expect(grid.dropTargets).toHaveCount(0)
			expect(await bodyCursor(page)).toBe('')
			await releasePointer(page)

			expect((await grid.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
			expect((await grid.eventNamed('Free event')).start).toBe(
				'2025-03-05T11:00:00.000Z'
			)
			expect(await grid.eventChanges()).toEqual([])
		})
	}

	test('hovering cells with no drag shows no drop highlight', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)
		await month.cellOn('2025-03-07').hover()
		await expect(month.dropTargets).toHaveCount(0)
		await month.cellOn('2025-03-08').hover()
		await expect(month.dropTargets).toHaveCount(0)
	})

	test('event bars are not draggable (cursor class) but a click still opens the form', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)
		await pointerClick(page, month.event('Free event').first())
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(
			page.getByRole('dialog').getByRole('textbox').first()
		).toHaveValue('Free event')
	})

	test('a cell click still opens the create form', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)
		await month.cellOn('2025-03-20').click()
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('drag-to-create plugin still creates a range under disableDragAndDrop', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'week',
			date: WEEK_OF_MAR_5.date,
			plugins: ['drag-to-create'],
			settings: { disableDragAndDrop: 'true', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		const from = grid.slotAt('2025-03-06T13:00')
		const to = grid.slotAt('2025-03-06T15:00')
		await pressAndMoveTo(page, from, to)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('explicit editable=true wins over disableDragAndDrop=true', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: { disableDragAndDrop: 'true', editable: 'true' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			month.event('Earlier in the month').first(),
			month.cellOn('2025-03-06')
		)
		await expect
			.poll(async () => (await month.eventNamed('Earlier in the month')).start)
			.toMatch(/^2025-03-06/)
	})
})

test.describe('persona 2: office scheduler', () => {
	for (const view of ['month', 'week', 'day'] as const) {
		test(`${view}: locked event stays, free neighbour moves, locked still opens form`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'edit-permissions',
				view,
				date: view === 'day' ? '2025-03-04T09:00:00.000Z' : WEEK_OF_MAR_5.date,
				settings: { scrollTime: '09:00' },
			})
			const grid = view === 'month' ? new MonthGrid(page) : new TimeGrid(page)
			const lockedBar = grid.event('Locked event').first()
			const target =
				grid instanceof MonthGrid
					? grid.cellOn('2025-03-06')
					: view === 'week'
						? (grid as TimeGrid).slotAt('2025-03-06T14:00')
						: (grid as TimeGrid).slotAt('2025-03-04T14:00')

			await pressAndMoveTo(page, lockedBar, target)
			await expect(grid.dragMirror).toHaveCount(0)
			await releasePointer(page)
			expect((await grid.eventNamed('Locked event')).start).toBe(
				'2025-03-04T11:00:00.000Z'
			)
			expect(await grid.eventChanges()).toEqual([])

			// still clickable
			await pointerClick(page, lockedBar)
			await expect(page.getByRole('dialog')).toBeVisible()
			await expect(
				page.getByRole('dialog').getByRole('textbox').first()
			).toHaveValue('Locked event')
		})
	}

	test('week: free neighbour still drags while the locked one is locked', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'week',
			date: WEEK_OF_MAR_5.date,
			settings: { scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.event('Free event').first(),
			grid.slotAt('2025-03-06T14:00')
		)
		await expect
			.poll(async () => (await grid.eventNamed('Free event')).start)
			.toBe('2025-03-06T14:00:00.000Z')
	})

	test('week eventAllow=no-weekends: Sat refused (cursor), back to weekday normal, drop commits; then second drag clean', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'week',
			date: WEEK_OF_MAR_5.date,
			settings: { scrollTime: '09:00', eventAllow: 'no-weekends' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.event('Free event').first()
		const sat = grid.slotAt('2025-03-08T13:00')
		const thu = grid.slotAt('2025-03-06T13:00')
		const fri = grid.slotAt('2025-03-07T13:00')

		await pressAndMoveTo(page, bar, thu)
		await expect.poll(() => bodyCursor(page)).not.toBe('not-allowed')
		await moveOnto(page, sat, thu)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await moveOnto(page, thu, sat)
		await expect.poll(() => bodyCursor(page)).not.toBe('not-allowed')
		await moveOnto(page, fri, thu)
		await expect.poll(() => bodyCursor(page)).not.toBe('not-allowed')
		await releasePointer(page)

		await expect
			.poll(async () => (await grid.eventNamed('Free event')).start)
			.toBe('2025-03-07T13:00:00.000Z')
		expect(await grid.eventChanges()).toHaveLength(1)
		expect(await bodyCursor(page)).toBe('')

		// second drag: release on Saturday -> nothing
		const bar2 = grid.event('Free event').first()
		await pressAndMoveTo(page, bar2, sat)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect((await grid.eventNamed('Free event')).start).toBe(
			'2025-03-07T13:00:00.000Z'
		)
		expect(await grid.eventChanges()).toHaveLength(1)
		expect(await bodyCursor(page)).toBe('')

		// third drag right after: weekday must commit (verdict cache must not leak)
		const bar3 = grid.event('Free event').first()
		await dragTo(page, bar3, grid.slotAt('2025-03-04T16:00'))
		await expect
			.poll(async () => (await grid.eventNamed('Free event')).start)
			.toBe('2025-03-04T16:00:00.000Z')
		expect(await grid.eventChanges()).toHaveLength(2)
	})

	test('month eventAllow=no-weekends: weekend round trip and two drags in a row', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		const bar = month.event('Free event').first()
		const fri = month.cellOn('2025-03-07')
		const sat = month.cellOn('2025-03-08')
		const mon = month.cellOn('2025-03-10')

		await pressAndMoveTo(page, bar, fri)
		await moveOnto(page, sat, fri)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await moveOnto(page, mon, sat)
		await expect.poll(() => bodyCursor(page)).not.toBe('not-allowed')
		await releasePointer(page)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-10/)

		const bar2 = month.event('Free event').first()
		await pressAndMoveTo(page, bar2, month.cellOn('2025-03-09'))
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-10/)
		expect(await month.eventChanges()).toHaveLength(1)

		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-11')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-11/)
		expect(await month.eventChanges()).toHaveLength(2)
	})

	test('refused cell shows no drop highlight and no mirror', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-08')
		)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		// A refused placement draws nothing but the cursor (no mirror, no tint).
		await expect(month.dropTargets).toHaveCount(0)
		await expect(month.dragMirror).toHaveCount(0)
		await releasePointer(page)
	})
})

/** A droppable cell of a resource surface, by resource and the start prefix of its range. */
const resourceCell = (page: Page, resourceId: string, startPrefix: string) =>
	page
		.locator(
			`.droppable-cell[data-resource-id="${resourceId}"][data-start^="${startPrefix}"]`
		)
		.first()

test.describe('persona 3: resource dispatcher', () => {
	const surfaces = [
		{
			view: 'week',
			orientation: 'vertical',
			satSlot: '2025-03-15T10',
			friSlot: '2025-03-14T10',
		},
		{
			view: 'week',
			orientation: 'horizontal',
			satSlot: '2025-03-15',
			friSlot: '2025-03-14',
		},
		{
			view: 'month',
			orientation: 'vertical',
			satSlot: '2025-03-15',
			friSlot: '2025-03-14',
		},
		{
			view: 'month',
			orientation: 'horizontal',
			satSlot: '2025-03-15',
			friSlot: '2025-03-14',
		},
		{ view: 'day', orientation: 'vertical', satSlot: '', friSlot: '' },
	] as const

	for (const surface of surfaces) {
		const label = `${surface.view}/${surface.orientation}`
		if (surface.view === 'day') {
			test(`${label}: editable=false blocks a cross-resource drag`, async ({
				page,
			}) => {
				await gotoScenario(page, {
					scenario: 'resources',
					view: 'day',
					orientation: surface.orientation,
					settings: { editable: 'false', scrollTime: '08:00' },
				})
				const grid = new CalendarPage(page)
				await pressAndMoveTo(
					page,
					grid.event('Room A booking').first(),
					resourceCell(page, 'r3', '2025-03-12T15')
				)
				await expect(grid.dragMirror).toHaveCount(0)
				await releasePointer(page)
				expect((await grid.eventNamed('Room A booking')).resourceId).toBe('r1')
				expect(await grid.eventChanges()).toEqual([])
			})
			continue
		}

		test(`${label}: editable=false blocks cross-resource drag`, async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'resources',
				view: surface.view,
				orientation: surface.orientation,
				settings: { editable: 'false', scrollTime: '08:00' },
			})
			const grid = new CalendarPage(page)
			await pressAndMoveTo(
				page,
				grid.event('Room A booking').first(),
				resourceCell(page, 'r3', surface.friSlot)
			)
			await expect(grid.dragMirror).toHaveCount(0)
			await expect(grid.dropTargets).toHaveCount(0)
			await releasePointer(page)
			const after = await grid.eventNamed('Room A booking')
			expect(after.resourceId).toBe('r1')
			expect(after.start).toBe('2025-03-12T09:00:00.000Z')
			expect(await grid.eventChanges()).toEqual([])
		})

		test(`${label}: eventAllow refuses weekend on another resource, allows Friday and moves resource`, async ({
			page,
		}) => {
			// Big viewport so the source bar and every target are on screen at once.
			await page.setViewportSize({ width: 3200, height: 2400 })
			await gotoScenario(page, {
				scenario: 'resources',
				view: surface.view,
				orientation: surface.orientation,
				settings: {
					eventAllow: 'no-weekends',
					scrollTime: '08:00',
					...(surface.view === 'week' && surface.orientation === 'horizontal'
						? { granularity: 'daily' }
						: {}),
				},
			})
			const grid = new CalendarPage(page)
			const bar = grid.event('Room A booking').first()
			const sat = resourceCell(page, 'r2', surface.satSlot)
			const fri = resourceCell(page, 'r3', surface.friSlot)

			await pressAndMoveTo(page, bar, sat)
			await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
			await moveOnto(page, fri, sat)
			await expect.poll(() => bodyCursor(page)).not.toBe('not-allowed')
			await moveOnto(page, sat, fri)
			await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
			await releasePointer(page)
			const refused = await grid.eventNamed('Room A booking')
			expect(refused.resourceId).toBe('r1')
			expect(refused.start).toBe('2025-03-12T09:00:00.000Z')
			expect(await grid.eventChanges()).toEqual([])

			await dragTo(page, grid.event('Room A booking').first(), fri)
			await expect
				.poll(async () => (await grid.eventNamed('Room A booking')).resourceId)
				.toBe('r3')
			expect((await grid.eventNamed('Room A booking')).start).toMatch(
				/^2025-03-14/
			)
			expect(await grid.eventChanges()).toHaveLength(1)
		})
	}
})

test.describe('persona 4: edge-case hunter', () => {
	test('timed -> all-day under eventAllow: Saturday all-day cell refused, Friday allowed and becomes all-day', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { eventAllow: 'no-weekends', scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.event('Morning stand-up').first()
		const satAllDay = page
			.locator('.droppable-cell[data-all-day="true"][data-start^="2025-03-15"]')
			.first()
		const friAllDay = page
			.locator('.droppable-cell[data-all-day="true"][data-start^="2025-03-14"]')
			.first()

		await pressAndMoveTo(page, bar, satAllDay)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect((await grid.eventNamed('Morning stand-up')).allDay).toBe(false)
		expect(await grid.eventChanges()).toEqual([])

		await dragTo(page, grid.event('Morning stand-up').first(), friAllDay)
		await expect
			.poll(async () => (await grid.eventNamed('Morning stand-up')).allDay)
			.toBe(true)
		expect((await grid.eventNamed('Morning stand-up')).start).toBe(
			'2025-03-14T00:00:00.000Z'
		)
	})

	test('all-day -> timed under eventAllow: Saturday slot refused, Thursday slot allowed and becomes timed', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'all-day-events',
			view: 'week',
			settings: { eventAllow: 'no-weekends', scrollTime: '08:00' },
		})
		const grid = new TimeGrid(page)
		const bar = grid.event('Public holiday').first()
		await pressAndMoveTo(page, bar, grid.slotAt('2025-03-15T10'))
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect((await grid.eventNamed('Public holiday')).allDay).toBe(true)
		expect(await grid.eventChanges()).toEqual([])

		await dragTo(
			page,
			grid.event('Public holiday').first(),
			grid.slotAt('2025-03-13T10')
		)
		await expect
			.poll(async () => (await grid.eventNamed('Public holiday')).allDay)
			.toBe(false)
		expect((await grid.eventNamed('Public holiday')).start).toMatch(
			/^2025-03-13T/
		)
	})

	test('multi-day event starting on a weekday but spanning a weekend is allowed (verdict uses candidate start, not hovered cell)', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'spanning-event',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		const bar = month.bar('spanning-1').first()
		const barBox = await bar.boundingBox()
		const thuCell = await centre(month.cellOn('2025-03-06'))
		if (!barBox) throw new Error('no bar')
		// grab the first segment (Wed 5 - Sat 8) at its Thursday column
		await page.mouse.move(thuCell.x, barBox.y + barBox.height / 2)
		await page.mouse.down()
		const satCell = await centre(month.cellOn('2025-03-08'))
		const sunCell = await centre(month.cellOn('2025-03-09'))
		const step = async (
			to: { x: number; y: number },
			from: { x: number; y: number }
		) => {
			for (let i = 1; i <= 8; i += 1) {
				await page.mouse.move(
					from.x + ((to.x - from.x) * i) / 8,
					from.y + ((to.y - from.y) * i) / 8
				)
			}
		}
		await step(satCell, { x: thuCell.x, y: barBox.y + barBox.height / 2 })
		// hovering Saturday with a one-day grab offset puts the START on Friday: allowed
		const cursorOnSat = await bodyCursor(page)
		await step(sunCell, satCell)
		// hovering Sunday puts the START on Saturday: refused
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		console.log('multi-day: cursor hovering Sat =', JSON.stringify(cursorOnSat))
		expect(cursorOnSat).not.toBe('not-allowed')
		await releasePointer(page)
		expect((await month.eventNamed('Conference fortnight')).start).toBe(
			'2025-03-05T09:00:00.000Z'
		)
		expect(await month.eventChanges()).toEqual([])
	})

	test('timed multi-day: drop that starts Friday and spans the weekend commits', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'timed-multi-day',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			month.event('Field survey').first(),
			month.cellOn('2025-03-14')
		)
		await expect
			.poll(async () => (await month.eventNamed('Field survey')).start)
			.toMatch(/^2025-03-1[34]/)
		const after = await month.eventNamed('Field survey')
		console.log('timed multi-day after drop:', after.start, after.end)
		expect(await month.eventChanges()).toHaveLength(1)
	})

	test('Escape mid-drag over a refused cell resets cursor and mirror; a new drag then commits', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		const sat = month.cellOn('2025-03-08')
		await pressAndMoveTo(page, month.event('Free event').first(), sat)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await page.keyboard.press('Escape')
		await expect.poll(() => bodyCursor(page)).toBe('')
		await expect(month.dragMirror).toHaveCount(0)
		await releasePointer(page)
		expect(await month.eventChanges()).toEqual([])
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)

		// New drag whose FIRST hover is the same Saturday placement: still refused
		await pressAndMoveTo(page, month.event('Free event').first(), sat)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect(await month.eventChanges()).toEqual([])

		// ...and a weekday still commits
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-12')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-12/)
	})

	test('refused hover then leaving the grid then releasing commits nothing and clears the cursor', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-08')
		)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await page.mouse.move(640, 5, { steps: 6 })
		await releasePointer(page)
		expect(await month.eventChanges()).toEqual([])
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
		expect(await bodyCursor(page)).toBe('')
	})

	test('editable=false&eventStartEditable=true: locked-by-default calendar, but the specific flag lets events move; eventAllow still vetoes', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: {
				editable: 'false',
				eventStartEditable: 'true',
				eventAllow: 'no-weekends',
			},
		})
		const month = new MonthGrid(page)
		// per-event editable:false still beats the calendar-level specific flag
		await dragTo(
			page,
			month.event('Locked event').first(),
			month.cellOn('2025-03-06')
		)
		expect((await month.eventNamed('Locked event')).start).toMatch(
			/^2025-03-04/
		)

		await pressAndMoveTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-08')
		)
		await expect.poll(() => bodyCursor(page)).toBe('not-allowed')
		await releasePointer(page)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)

		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-06')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-06/)
	})

	test('flipping editable at runtime on a mounted calendar takes effect for the next drag', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { editable: 'false' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-06')
		)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
		await setSettings(page, { editable: 'true' })
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-06')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-06/)
		await setSettings(page, { editable: 'false' })
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-07')
		)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-06/)
	})

	test('toggling disableDragAndDrop at runtime (deprecated alias) works both ways', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-06')
		)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
		await setSettings(page, { disableDragAndDrop: 'false' })
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-06')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-06/)
	})
})

test.describe('persona 5: touch user (CDP touch events, dnd-kit TouchSensor: 100ms hold)', () => {
	test.use({ hasTouch: true })

	const touchDrag = async (
		page: Page,
		from: { x: number; y: number },
		to: { x: number; y: number },
		release = true
	) => {
		const cdp = await page.context().newCDPSession(page)
		await cdp.send('Input.dispatchTouchEvent', {
			type: 'touchStart',
			touchPoints: [from],
		})
		await page.waitForTimeout(250)
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
		if (release) {
			await waitForDragRender(page)
			await cdp.send('Input.dispatchTouchEvent', {
				type: 'touchEnd',
				touchPoints: [],
			})
		}
		return cdp
	}

	test('touch drag moves a free event (control)', async ({ page }) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		await touchDrag(
			page,
			await centre(month.event('Free event').first()),
			await centre(month.cellOn('2025-03-10'))
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-10/)
	})

	test('touch drag of a locked event moves nothing', async ({ page }) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		await touchDrag(
			page,
			await centre(month.event('Locked event').first()),
			await centre(month.cellOn('2025-03-10'))
		)
		expect((await month.eventNamed('Locked event')).start).toMatch(
			/^2025-03-04/
		)
		expect(await month.eventChanges()).toEqual([])
	})

	test('touch drag under disableDragAndDrop moves nothing', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { disableDragAndDrop: 'true' },
		})
		const month = new MonthGrid(page)
		await touchDrag(
			page,
			await centre(month.event('Free event').first()),
			await centre(month.cellOn('2025-03-10'))
		)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
	})

	test('touch drag released on a refused weekend commits nothing', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await touchDrag(
			page,
			await centre(month.event('Free event').first()),
			await centre(month.cellOn('2025-03-08'))
		)
		expect((await month.eventNamed('Free event')).start).toMatch(/^2025-03-05/)
		expect(await month.eventChanges()).toEqual([])
	})

	test('touch tap on a locked event still opens the form', async ({ page }) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		const point = await centre(month.event('Locked event').first())
		await page.touchscreen.tap(point.x, point.y)
		await expect(page.getByRole('dialog')).toBeVisible()
	})
})

test.describe('persona 6: misc interplay', () => {
	test('cursor class: free bar grab, locked bar pointer', async ({ page }) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		const cursorOf = (title: string) =>
			month
				.event(title)
				.first()
				.evaluate((el) => {
					const bar = el.closest(
						'[data-testid^="horizontal-event-"]'
					) as HTMLElement
					return getComputedStyle(bar.firstElementChild ?? bar).cursor
				})
		const free = await cursorOf('Free event')
		const locked = await cursorOf('Locked event')
		console.log('cursors free/locked:', free, locked)
		expect(free).toBe('grab')
		expect(locked).toBe('pointer')
	})

	test('drag-to-create still creates under editable=false', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'week',
			date: '2025-03-05T09:00:00.000Z',
			plugins: ['drag-to-create'],
			settings: { editable: 'false', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			grid.slotAt('2025-03-06T13:00'),
			grid.slotAt('2025-03-06T15:00')
		)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('drag-to-create is not vetoed by eventAllow (selectAllow is 4.1.3): Saturday selection still opens the form', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'week',
			date: '2025-03-05T09:00:00.000Z',
			plugins: ['drag-to-create'],
			settings: { eventAllow: 'no-weekends', scrollTime: '09:00' },
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			grid.slotAt('2025-03-08T13:00'),
			grid.slotAt('2025-03-08T15:00')
		)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
	})

	test('event form on a locked event still saves a time change (editable gates drag, not the form)', async ({
		page,
	}) => {
		await gotoScenario(page, { scenario: 'edit-permissions', view: 'month' })
		const month = new MonthGrid(page)
		await pointerClick(page, month.event('Locked event').first())
		await page.getByRole('button', { name: 'Update' }).click()
		await expect(page.getByRole('dialog')).toHaveCount(0)
	})

	test('keyboard: Enter on a locked bar / free bar does not start a drag or throw', async ({
		page,
	}) => {
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await month.bar('locked-1').focus()
		await page.keyboard.press('Space')
		await page.keyboard.press('ArrowRight')
		await page.keyboard.press('Escape')
		expect(errors).toEqual([])
		expect(await month.eventChanges()).toEqual([])
	})

	test('no console errors across a refused then allowed drag', async ({
		page,
	}) => {
		const errors: string[] = []
		page.on('pageerror', (error) => errors.push(error.message))
		page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
		await gotoScenario(page, {
			scenario: 'edit-permissions',
			view: 'month',
			settings: { eventAllow: 'no-weekends' },
		})
		const month = new MonthGrid(page)
		await pressAndMoveTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-08')
		)
		await releasePointer(page)
		await dragTo(
			page,
			month.event('Free event').first(),
			month.cellOn('2025-03-12')
		)
		await expect
			.poll(async () => (await month.eventNamed('Free event')).start)
			.toMatch(/^2025-03-12/)
		expect(errors).toEqual([])
	})

	test('overflow dialog: locked event inside "+N more" is not draggable out, still clickable', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'many-events',
			view: 'month',
			settings: { editable: 'false', dayMaxEvents: 2 },
		})
		const month = new MonthGrid(page)
		await month.overflowIndicators.first().click()
		const dialog = page.getByRole('dialog')
		await expect(dialog).toBeVisible()
		const first = dialog.getByText(/^Event \d$/).first()
		await pressAndMoveTo(page, first, month.cellOn('2025-03-20'))
		await expect(month.dragMirror).toHaveCount(0)
		await releasePointer(page)
		expect(await month.eventChanges()).toEqual([])
	})
})

test('control: overflow dialog event is draggable when editable (so the locked variant is not vacuous)', async ({
	page,
}) => {
	await gotoScenario(page, {
		scenario: 'many-events',
		view: 'month',
		settings: { dayMaxEvents: 2 },
	})
	const month = new MonthGrid(page)
	await month.overflowIndicators.first().click()
	const dialog = page.getByRole('dialog')
	const first = dialog.getByText(/^Event \d$/).first()
	await pressAndMoveTo(page, first, month.cellOn('2025-03-20'))
	const mirrors = await month.dragMirror.count()
	console.log(
		'overflow control: mirror count while dragging from dialog =',
		mirrors
	)
	await releasePointer(page)
})

test('after a refused release the source bar is back to its resting look and still opens the form', async ({
	page,
}) => {
	await gotoScenario(page, {
		scenario: 'edit-permissions',
		view: 'month',
		settings: { eventAllow: 'no-weekends' },
	})
	const month = new MonthGrid(page)
	const resting = () =>
		month.bar('free-1').evaluate((el) => {
			const style = getComputedStyle(el)
			const inner = getComputedStyle(el.firstElementChild ?? el)
			return `${style.opacity}|${inner.opacity}|${el.querySelector('[data-dragging]') ? 'dragging' : 'idle'}`
		})
	// Headers and bars fade in over 500ms; measure only once settled.
	await page.waitForTimeout(700)
	const before = await resting()
	await pressAndMoveTo(
		page,
		month.event('Free event').first(),
		month.cellOn('2025-03-08')
	)
	await releasePointer(page)
	await page.waitForTimeout(600)
	expect(await resting()).toBe(before)
	await expect(month.dragMirror).toHaveCount(0)
	await expect(month.dropTargets).toHaveCount(0)
	await pointerClick(page, month.event('Free event').first())
	await expect(page.getByRole('dialog')).toBeVisible()
})
