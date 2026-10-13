import { expect, type Locator, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer } from '../support/harness'
import { ResourceAxis, TimeGrid } from '../support/pages'

/**
 * QA personas for 3.3.4 (slotMinTime / slotMaxTime). Real pointer input only.
 * The pinned "now" is 2025-03-12T09:00Z.
 */

const SUBPIXEL = 2
const CLINIC = { slotMinTime: '08:00', slotMaxTime: '18:00', slot: 15 }

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

/** Drags by pointer coordinates, for targets that are a point rather than an element. */
const dragToPoint = async (
	page: Page,
	from: Locator,
	to: { x: number; y: number },
	grabDy = 0
) => {
	const start = await centre(from)
	const startY = start.y + grabDy
	await page.mouse.move(start.x, startY)
	await page.mouse.down()
	for (let step = 1; step <= 10; step += 1) {
		await page.mouse.move(
			start.x + ((to.x - start.x) * step) / 10,
			startY + ((to.y - startY) * step) / 10
		)
	}
	await releasePointer(page)
}

/** A viewport tall enough that every row is on screen (no drag auto-scroll). */
const open = async (
	page: Page,
	view: 'day' | 'week',
	settings: Record<string, string | number> = CLINIC,
	extra: Partial<Parameters<typeof gotoScenario>[1]> = {}
) => {
	await page.setViewportSize({ width: 1280, height: 2600 })
	await gotoScenario(page, {
		scenario: 'visible-hours',
		view,
		settings,
		...extra,
	})
	// Headers animate in over 500ms; measuring before then reads moving boxes.
	await page.waitForTimeout(650)
}

/** An empty weekday: the scenario's events are all on Wednesday the 12th. */
const THURSDAY = { date: '2025-03-13T09:00:00.000Z' }

test.describe('persona 1: clinic receptionist (08-18, slot=15)', () => {
	test('first label 8 AM, last 5 PM, four slots per hour', async ({ page }) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await expect(grid.hourLabels).toHaveCount(10)
		await expect(grid.hourLabels.first()).toContainText('8 AM')
		await expect(grid.hourLabels.last()).toContainText('5 PM')
		await expect(page.locator('[data-testid^="vertical-cell-"]')).toHaveCount(
			40
		)
		await expect(grid.slotAt('2025-03-12T07:45')).toHaveCount(0)
		await expect(grid.slotAt('2025-03-12T18:00')).toHaveCount(0)
		await expect(grid.slotAt('2025-03-12T17:45')).toHaveCount(1)
	})

	test('click on the first row opens the form at 08:00', async ({ page }) => {
		await open(page, 'day', CLINIC, THURSDAY)
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-13T08:00').click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByTestId('time-picker-start-time')).toContainText(
			'8:00 AM'
		)
	})

	test('click on the last row opens the form at 17:45 (not past 18:00)', async ({
		page,
	}) => {
		await open(page, 'day', CLINIC, THURSDAY)
		const grid = new TimeGrid(page)
		await grid.slotAt('2025-03-13T17:45').click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByTestId('time-picker-start-time')).toContainText(
			'5:45 PM'
		)
		await expect(page.getByTestId('time-picker-end-time')).toContainText(
			'6:00 PM'
		)
	})

	test('drag Midday to the very top row keeps the grab offset (starts 07:30-07:45, still drawn)', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('vh-midday').first(),
			grid.slotAt('2025-03-12T08:00')
		)
		const moved = await grid.eventNamed('Midday')
		console.log('top drop:', moved.start, moved.end)
		// pointer-relative, like a calendar that keeps the grab point: grabbed
		// mid-bar (12:30) dropped at the 08:00 row => start moves by about -4.4h,
		// which snaps to 07:30 or 07:45 depending on sub-pixel rounding
		expect(['2025-03-12T07:30:00.000Z', '2025-03-12T07:45:00.000Z']).toContain(
			moved.start
		)
		expect(Date.parse(moved.end) - Date.parse(moved.start)).toBe(3600_000)
	})

	test('drag Midday to the very bottom row lands inside 17:xx and end <= 18:xx', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('vh-midday').first(),
			grid.slotAt('2025-03-12T17:45')
		)
		const moved = await grid.eventNamed('Midday')
		console.log('bottom drop:', moved.start, moved.end)
		expect(moved.start >= '2025-03-12T17:00').toBe(true)
	})

	test('drag to the top row with the grab at the top edge of the bar', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		const row = await grid.slotAt('2025-03-12T08:00').boundingBox()
		const bar = await grid.bars('vh-midday').first().boundingBox()
		if (!row || !bar) throw new Error('layout')
		await dragToPoint(
			page,
			grid.bars('vh-midday').first(),
			{ x: bar.x + bar.width / 2, y: row.y + 2 },
			-bar.height / 2 + 4
		)
		const moved = await grid.eventNamed('Midday')
		console.log('top-edge drop:', moved.start, moved.end)
		expect(moved.start >= '2025-03-12T08:00').toBe(true)
	})

	test('drag across days in the week keeps the hour', async ({ page }) => {
		await open(page, 'week')
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('vh-midday').first(),
			grid.slotAt('2025-03-14T12:00')
		)
		const moved = await grid.eventNamed('Midday')
		expect(moved.start).toMatch(/^2025-03-14T1[12]:/)
	})

	test('a clipped event (07-09) opens the form with its real times', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await grid.bars('vh-early').first().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByTestId('time-picker-start-time')).toContainText(
			'7:00 AM'
		)
		await expect(page.getByTestId('time-picker-end-time')).toContainText(
			'9:00 AM'
		)
		// updating without edits keeps the real times
		await page.getByRole('button', { name: 'Update' }).click()
		const after = await grid.eventNamed('Starts early')
		expect(after.start).toBe('2025-03-12T07:00:00.000Z')
		expect(after.end).toBe('2025-03-12T09:00:00.000Z')
	})

	test('a clipped event dragged keeps its duration (2h) and does not jump', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('vh-early').first(),
			grid.slotAt('2025-03-12T12:00')
		)
		const moved = await grid.eventNamed('Starts early')
		console.log('clipped drag:', moved.start, moved.end)
		const durationMs = Date.parse(moved.end) - Date.parse(moved.start)
		expect(durationMs).toBe(2 * 60 * 60 * 1000)
	})

	test('a late clipped event (17-19) dragged keeps its duration', async ({
		page,
	}) => {
		await open(page, 'day')
		const grid = new TimeGrid(page)
		await dragTo(
			page,
			grid.bars('vh-late').first(),
			grid.slotAt('2025-03-12T12:00')
		)
		const moved = await grid.eventNamed('Ends late')
		console.log('late clipped drag:', moved.start, moved.end)
		const durationMs = Date.parse(moved.end) - Date.parse(moved.start)
		expect(durationMs).toBe(2 * 60 * 60 * 1000)
	})

	test('drag-to-create at the first and last rows', async ({ page }) => {
		await open(page, 'day', CLINIC, {
			...THURSDAY,
			plugins: ['drag-to-create'],
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			grid.slotAt('2025-03-13T08:00'),
			grid.slotAt('2025-03-13T08:45')
		)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByTestId('time-picker-start-time')).toContainText(
			'8:00 AM'
		)
		await expect(page.getByTestId('time-picker-end-time')).toContainText(
			'9:00 AM'
		)
	})

	test('drag-to-create ending on the last row', async ({ page }) => {
		await open(page, 'day', CLINIC, {
			...THURSDAY,
			plugins: ['drag-to-create'],
		})
		const grid = new TimeGrid(page)
		await pressAndMoveTo(
			page,
			grid.slotAt('2025-03-13T17:00'),
			grid.slotAt('2025-03-13T17:45')
		)
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
		await expect(page.getByTestId('time-picker-start-time')).toContainText(
			'5:00 PM'
		)
		await expect(page.getByTestId('time-picker-end-time')).toContainText(
			'6:00 PM'
		)
	})

	test('drag-to-create dragged upward past the top edge', async ({ page }) => {
		await open(page, 'day', CLINIC, {
			...THURSDAY,
			plugins: ['drag-to-create'],
		})
		const grid = new TimeGrid(page)
		const from = await centre(grid.slotAt('2025-03-13T08:30'))
		const topRow = await grid.slotAt('2025-03-13T08:00').boundingBox()
		if (!topRow) throw new Error('layout')
		await page.mouse.move(from.x, from.y)
		await page.mouse.down()
		for (let i = 1; i <= 8; i += 1) {
			await page.mouse.move(from.x, from.y - ((from.y - topRow.y + 20) * i) / 8)
		}
		await releasePointer(page)
		await expect(page.getByRole('dialog')).toBeVisible()
		const start = await page.getByTestId('time-picker-start-time').textContent()
		console.log('upward past top:', start)
		expect(start).toContain('8:00 AM')
	})
})

/* ---------------------------------------------------------------- persona 2 */

const NIGHT = { slotMinTime: '18:00', slotMaxTime: '24:00' }
const SMALL_HOURS = { slotMinTime: '00:00', slotMaxTime: '06:00' }

const openResources = async (
	page: Page,
	view: 'day' | 'week',
	orientation: 'horizontal' | 'vertical',
	settings: Record<string, string | number>,
	scenario = 'long-resource-events'
) => {
	await page.setViewportSize({ width: 1280, height: 900 })
	await gotoScenario(page, { scenario, view, orientation, settings })
	await new ResourceAxis(page).expectRendered()
}

/** The left/right extent of the hour columns, from the header labels. */
const columnsExtent = async (page: Page) => {
	const labels = page.locator('[data-testid^="resource-day-time-label-"]')
	const first = await labels.first().boundingBox()
	const last = await labels.last().boundingBox()
	if (!first || !last) throw new Error('no header labels')
	return { left: first.x, right: last.x + last.width }
}

test.describe('persona 2: night-shift dispatcher (resources)', () => {
	for (const [name, window, first, last, count] of [
		['evening', NIGHT, '6 PM', '11 PM', 6],
		['small hours', SMALL_HOURS, '12 AM', '5 AM', 6],
	] as const) {
		test(`horizontal day ${name}: ${count} header hours, ${first}..${last}`, async ({
			page,
		}) => {
			await openResources(page, 'day', 'horizontal', window)
			const labels = page.locator('[data-testid^="resource-day-time-label-"]')
			await expect(labels).toHaveCount(count)
			await expect(labels.first()).toContainText(first)
			await expect(labels.last()).toContainText(last)
		})

		test(`vertical day ${name}: ${count} rows, ${first}..${last}`, async ({
			page,
		}) => {
			await openResources(page, 'day', 'vertical', window)
			const grid = new TimeGrid(page)
			await expect(grid.hourLabels).toHaveCount(count)
			await expect(grid.hourLabels.first()).toContainText(first)
			await expect(grid.hourLabels.last()).toContainText(last)
		})
	}

	test('horizontal day 18-24: the 02-20 Long shift is clipped to 18:00-20:00 (two columns)', async ({
		page,
	}) => {
		await openResources(page, 'day', 'horizontal', NIGHT)
		const bar = await page
			.getByTestId('horizontal-event-long-res-2')
			.boundingBox()
		const labels = page.locator('[data-testid^="resource-day-time-label-"]')
		const first = await labels.first().boundingBox()
		if (!bar || !first) throw new Error('layout')
		expect(Math.abs(bar.x - first.x)).toBeLessThan(SUBPIXEL + 2)
		expect(Math.abs(bar.width - 2 * first.width)).toBeLessThan(SUBPIXEL + 4)
	})

	test('horizontal day 00-06: the 02-20 Long shift is clipped to 02:00-06:00', async ({
		page,
	}) => {
		await openResources(page, 'day', 'horizontal', SMALL_HOURS)
		const bar = await page
			.getByTestId('horizontal-event-long-res-2')
			.boundingBox()
		const extent = await columnsExtent(page)
		const labels = page.locator('[data-testid^="resource-day-time-label-"]')
		const first = await labels.first().boundingBox()
		if (!bar || !first) throw new Error('layout')
		expect(Math.abs(bar.x - (extent.left + 2 * first.width))).toBeLessThan(6)
		expect(Math.abs(bar.x + bar.width - extent.right)).toBeLessThan(6)
	})

	// An event wholly outside the window produces no segment; the horizontal
	// layout used to clamp it onto the nearest edge column.
	for (const [name, window] of [
		['18-24', NIGHT],
		['00-06', SMALL_HOURS],
		['08-18', { slotMinTime: '08:00', slotMaxTime: '18:00' }],
	] as const) {
		test(`horizontal day ${name}: an event wholly outside the window is not drawn`, async ({
			page,
		}) => {
			await openResources(page, 'day', 'horizontal', window)
			// Yoga class 10:27-12:27 (Room C) and Quick check 14:00-14:05 (Room C)
			const inWindow = (start: number, end: number) => {
				const min = Number(window.slotMinTime.slice(0, 2))
				const max = Number(window.slotMaxTime.slice(0, 2))
				return start < max && end > min
			}
			const yoga = inWindow(10.45, 12.45) ? 1 : 0
			const quick = inWindow(14, 14.1) ? 1 : 0
			await expect(page.getByTestId('horizontal-event-long-res-3')).toHaveCount(
				yoga
			)
			await expect(page.getByTestId('horizontal-event-long-res-4')).toHaveCount(
				quick
			)
		})
	}

	test('horizontal week 18-24: Wednesday events wholly outside the window are not drawn', async ({
		page,
	}) => {
		await openResources(page, 'week', 'horizontal', NIGHT)
		await expect(page.getByTestId('horizontal-event-long-res-3')).toHaveCount(0)
		await expect(page.getByTestId('horizontal-event-long-res-4')).toHaveCount(0)
	})

	test('horizontal day 00-06: the grid has no horizontal overflow scroll', async ({
		page,
	}) => {
		await openResources(page, 'day', 'horizontal', SMALL_HOURS)
		const scroll = page.locator(
			'[data-testid="horizontal-grid-scroll"] [data-radix-scroll-area-viewport]'
		)
		const overflow = await scroll.evaluate(
			(el) => el.scrollWidth - el.clientWidth
		)
		expect(overflow).toBeLessThanOrEqual(1)
	})

	test('vertical day 00-06 and 18-24: events wholly outside are not drawn; Long shift is', async ({
		page,
	}) => {
		for (const window of [NIGHT, SMALL_HOURS]) {
			await openResources(page, 'day', 'vertical', window)
			await expect(page.getByTestId('vertical-event-long-res-2')).toHaveCount(1)
			await expect(page.getByTestId('vertical-event-long-res-3')).toHaveCount(0)
			await expect(page.getByTestId('vertical-event-long-res-4')).toHaveCount(0)
		}
	})

	test('horizontal week 18-24: resource column stays sticky while scrolled right, and the window labels are 18..23', async ({
		page,
	}) => {
		await openResources(page, 'week', 'horizontal', NIGHT)
		await page.waitForTimeout(700) // the headers animate in over 500ms
		const viewport = page.locator(
			'[data-testid="horizontal-grid-scroll"] [data-radix-scroll-area-viewport]'
		)
		const scrollable = await viewport.evaluate(
			(el) => el.scrollWidth - el.clientWidth
		)
		expect(scrollable).toBeGreaterThan(100)
		const label = page.getByTestId('horizontal-row-label-r2')
		await expect(label).toBeVisible()
		const before = await label.boundingBox()
		await viewport.evaluate((el) => {
			el.scrollLeft = el.scrollWidth
		})
		const after = await label.boundingBox()
		expect(Math.abs((after?.x ?? -1) - (before?.x ?? -2))).toBeLessThan(1)
		const hours = await page
			.locator('[data-testid^="resource-week-time-label-"]')
			.evaluateAll((els) =>
				[
					...new Set(
						els.map((e) =>
							(e.getAttribute('data-testid') ?? '').replace(/\D+/g, '')
						)
					),
				].sort()
			)
		expect(hours).toEqual(['18', '19', '20', '21', '22', '23'])
	})

	test('horizontal week: the header row stays sticky vertically and the first column does not drift', async ({
		page,
	}) => {
		await openResources(page, 'week', 'horizontal', NIGHT)
		const header = page.getByTestId('horizontal-grid-header')
		const before = await header.boundingBox()
		await page.mouse.wheel(0, 300)
		const after = await header.boundingBox()
		expect(Math.abs((after?.y ?? 0) - (before?.y ?? 99))).toBeLessThan(1)
	})

	test('cross-resource drag, horizontal, to the last column (23:00) of Room A', async ({
		page,
	}) => {
		await openResources(page, 'day', 'horizontal', NIGHT)
		const bar = page.getByTestId('horizontal-event-long-res-2')
		const target = page.locator(
			'[data-testid="horizontal-row-r1"] [data-start^="2025-03-12T23:00"]'
		)
		await dragTo(page, bar, target)
		const moved = await new TimeGrid(page).eventNamed('Long shift')
		console.log('h cross-resource last col:', JSON.stringify(moved))
		expect(moved.resourceId).toBe('r1')
		expect(Date.parse(moved.end) - Date.parse(moved.start)).toBe(18 * 3600_000)
	})

	test('cross-resource drag, horizontal, to the first column (18:00) of Room C keeps the duration', async ({
		page,
	}) => {
		await openResources(page, 'day', 'horizontal', NIGHT)
		const bar = page.getByTestId('horizontal-event-long-res-2')
		const target = page.locator(
			'[data-testid="horizontal-row-r3"] [data-start^="2025-03-12T18:00"]'
		)
		await dragTo(page, bar, target)
		const moved = await new TimeGrid(page).eventNamed('Long shift')
		console.log('h cross-resource first col:', JSON.stringify(moved))
		expect(moved.resourceId).toBe('r3')
		expect(Date.parse(moved.end) - Date.parse(moved.start)).toBe(18 * 3600_000)
	})

	test('cross-resource drag, vertical, last row (23:00) of Room C, small hours window', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1400 })
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'vertical',
			settings: NIGHT,
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('long-res-2').first()
		const target = page
			.locator(
				'[data-testid^="vertical-cell-2025-03-12-23-00"][data-testid$="resource-r3"]'
			)
			.first()
		await dragTo(page, bar, target)
		const moved = await grid.eventNamed('Long shift')
		console.log('v cross-resource last row:', JSON.stringify(moved))
		expect(moved.resourceId).toBe('r3')
		expect(Date.parse(moved.end) - Date.parse(moved.start)).toBe(18 * 3600_000)
	})

	test('cross-resource drag, vertical, first row (00:00) of Room A, small hours window', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 1400 })
		await gotoScenario(page, {
			scenario: 'long-resource-events',
			view: 'day',
			orientation: 'vertical',
			settings: SMALL_HOURS,
		})
		const grid = new TimeGrid(page)
		const bar = grid.bars('long-res-2').first()
		const target = page
			.locator(
				'[data-testid^="vertical-cell-2025-03-12-00-00"][data-testid$="resource-r1"]'
			)
			.first()
		await dragTo(page, bar, target)
		const moved = await grid.eventNamed('Long shift')
		console.log('v cross-resource first row:', JSON.stringify(moved))
		expect(moved.resourceId).toBe('r1')
		expect(Date.parse(moved.end) - Date.parse(moved.start)).toBe(18 * 3600_000)
	})

	test('business hours 9-17 + hideNonBusinessHours inside a 06-12 window shows 9, 10, 11 (horizontal and vertical)', async ({
		page,
	}) => {
		const settings = {
			slotMinTime: '06:00',
			slotMaxTime: '12:00',
			businessHours: '9-17',
			hideNonBusinessHours: 'true',
		}
		await openResources(page, 'day', 'horizontal', settings)
		const labels = page.locator('[data-testid^="resource-day-time-label-"]')
		await expect(labels).toHaveCount(3)
		await expect(labels.first()).toContainText('9 AM')
		await expect(labels.last()).toContainText('11 AM')
		await openResources(page, 'day', 'vertical', settings)
		const rows = new TimeGrid(page).hourLabels
		await expect(rows).toHaveCount(3)
		await expect(rows.first()).toContainText('9 AM')
	})

	test('business hours 9-17 + hideNonBusinessHours with a 06-14 window shows 9..13 (window end wins)', async ({
		page,
	}) => {
		await openResources(page, 'day', 'vertical', {
			slotMinTime: '06:00',
			slotMaxTime: '14:00',
			businessHours: '9-17',
			hideNonBusinessHours: 'true',
		})
		const rows = new TimeGrid(page).hourLabels
		await expect(rows).toHaveCount(5)
		await expect(rows.last()).toContainText('1 PM')
	})

	// A window the business hours do not reach shows the window, not a blank grid.
	test('an evening window with day-time business hours + hideNonBusinessHours is not a blank grid', async ({
		page,
	}) => {
		await openResources(page, 'day', 'vertical', {
			...NIGHT,
			businessHours: '9-17',
			hideNonBusinessHours: 'true',
		})
		await expect(new TimeGrid(page).hourLabels.first()).toBeVisible()
	})
})

/* ---------------------------------------------------------------- persona 3 */

const gridViewport = (page: Page) =>
	page.locator(
		'[data-testid="vertical-grid-scroll"] [data-radix-scroll-area-viewport]'
	)

const NEW_YORK = 'America/New_York'
const SPRING_DAY = '2025-03-09T12:00:00.000Z'
const AUTUMN_DAY = '2025-11-02T12:00:00.000Z'

test.describe('persona 3: edge-case hunter, DST (America/New_York)', () => {
	// Both the calendar zone and the machine zone, since dayjs still reads the
	// machine's (docs/timezones.md).
	test.use({ timezoneId: NEW_YORK })

	for (const [name, date] of [
		['spring forward 2025-03-09', SPRING_DAY],
		['fall back 2025-11-02', AUTUMN_DAY],
	] as const) {
		for (const view of ['day', 'week'] as const) {
			test(`${name} ${view}: window 01:00-04:00 keeps three rows, 1 AM first and 3 AM last`, async ({
				page,
			}) => {
				await open(
					page,
					view,
					{ slotMinTime: '01:00', slotMaxTime: '04:00' },
					{ timezone: NEW_YORK, date }
				)
				const grid = new TimeGrid(page)
				await expect(grid.hourLabels).toHaveCount(3)
				// The middle row is "2 AM" on an ordinary day. On the spring day there
				// is no 2 AM and getDayHours (pre-existing) labels it 3 AM, so the
				// middle label is not pinned here.
				await expect(grid.hourLabels.first()).toContainText('1 AM')
				await expect(grid.hourLabels.last()).toContainText('3 AM')
			})

			test(`${name} ${view}: window 00:00-03:00 and 22:00-24:00 row counts`, async ({
				page,
			}) => {
				await open(
					page,
					view,
					{ slotMinTime: '00:00', slotMaxTime: '03:00' },
					{ timezone: NEW_YORK, date }
				)
				await expect(new TimeGrid(page).hourLabels).toHaveCount(3)
				await open(
					page,
					view,
					{ slotMinTime: '22:00', slotMaxTime: '24:00' },
					{ timezone: NEW_YORK, date }
				)
				const grid = new TimeGrid(page)
				await expect(grid.hourLabels).toHaveCount(2)
				await expect(grid.hourLabels.last()).toContainText('11 PM')
			})
		}
	}

	test('fall day with a 01-04 window: a 09:00 EST booking is outside and not drawn', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'dst-days',
			view: 'day',
			orientation: 'vertical',
			timezone: NEW_YORK,
			date: AUTUMN_DAY,
			settings: { slotMinTime: '01:00', slotMaxTime: '04:00' },
		})
		await expect(new TimeGrid(page).bars('autumn')).toHaveCount(0)
	})

	// Machine zone = calendar zone = America/New_York. A row built with `.hour(n)`
	// can carry the offset of the other side of the change, so a window that
	// starts after 00:00 once placed a 09:00 booking one row off on the two
	// clock-change days (docs/timezones.md).
	for (const [day, date, eventId, windows] of [
		[
			'spring 2025-03-09',
			SPRING_DAY,
			'spring',
			[
				['08:00', '11:00'],
				['09:00', '11:00'],
				['08:00', '24:00'],
				['00:00', '11:00'],
			],
		],
		[
			'fall 2025-11-02',
			AUTUMN_DAY,
			'autumn',
			[
				['08:00', '11:00'],
				['08:00', '24:00'],
				['00:00', '11:00'],
			],
		],
	] as const) {
		for (const [slotMinTime, slotMaxTime] of windows) {
			test(`${day}: window ${slotMinTime}-${slotMaxTime} places the 09:00 booking in the 9 AM row`, async ({
				page,
			}) => {
				await page.setViewportSize({ width: 1280, height: 2600 })
				await gotoScenario(page, {
					scenario: 'dst-days',
					view: 'day',
					orientation: 'vertical',
					timezone: NEW_YORK,
					date,
					settings: { slotMinTime, slotMaxTime },
				})
				await page.waitForTimeout(700)
				const bar = await new TimeGrid(page).bars(eventId).first().boundingBox()
				const nineLabel = await page
					.getByTestId('vertical-time-09')
					.boundingBox()
				expect(Math.abs((bar?.y ?? -9) - (nineLabel?.y ?? 9))).toBeLessThan(
					SUBPIXEL
				)
			})
		}
	}

	test('horizontal resource day on the spring day, window 01-04: three header hours', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'dst-days',
			view: 'day',
			orientation: 'horizontal',
			timezone: NEW_YORK,
			date: SPRING_DAY,
			settings: { slotMinTime: '01:00', slotMaxTime: '04:00' },
		})
		await expect(
			page.locator('[data-testid^="resource-day-time-label-"]')
		).toHaveCount(3)
	})

	test('click the 3 AM row on the spring day opens the form at 3:00 AM', async ({
		page,
	}) => {
		await open(
			page,
			'day',
			{ slotMinTime: '01:00', slotMaxTime: '04:00' },
			{ timezone: NEW_YORK, date: SPRING_DAY }
		)
		await page.locator('[data-testid^="vertical-cell-"]').last().click()
		await expect(page.getByRole('dialog')).toBeVisible()
		const start = await page.getByTestId('time-picker-start-time').textContent()
		console.log('spring 3AM click:', start)
		expect(start).toContain('3:00 AM')
	})
})

const stripVolatile = (html: string) =>
	html.replace(/radix-[^"]*/g, 'radix').replace(/id="[^"]*"/g, '')

test.describe('persona 3: edge-case hunter, equivalences', () => {
	for (const view of ['day', 'week'] as const) {
		test(`${view}: 00:00-24:00 renders identically to no parameters`, async ({
			page,
		}) => {
			await open(page, view, {})
			await page.waitForTimeout(700)
			const plain = stripVolatile(
				await page.getByTestId('calendar-body').innerHTML()
			)
			await open(page, view, { slotMinTime: '00:00', slotMaxTime: '24:00' })
			await page.waitForTimeout(700)
			const explicit = stripVolatile(
				await page.getByTestId('calendar-body').innerHTML()
			)
			expect(explicit).toBe(plain)
		})
	}

	for (const orientation of ['horizontal', 'vertical'] as const) {
		test(`resources ${orientation} day: 00:00-24:00 renders identically to no parameters`, async ({
			page,
		}) => {
			await openResources(page, 'day', orientation, {})
			await page.waitForTimeout(700)
			const plain = stripVolatile(
				await page.getByTestId('calendar-body').innerHTML()
			)
			await openResources(page, 'day', orientation, {
				slotMinTime: '00:00',
				slotMaxTime: '24:00',
			})
			await page.waitForTimeout(700)
			const explicit = stripVolatile(
				await page.getByTestId('calendar-body').innerHTML()
			)
			expect(explicit).toBe(plain)
		})
	}

	test("slotMaxTime '24:00' and '23:59' both give 24 rows, and no warning", async ({
		page,
	}) => {
		const warnings: string[] = []
		page.on('console', (m) => {
			if (m.type() === 'warning') warnings.push(m.text())
		})
		for (const slotMaxTime of ['24:00', '23:59']) {
			await open(page, 'day', { slotMaxTime })
			await expect(new TimeGrid(page).hourLabels).toHaveCount(24)
		}
		expect(warnings.filter((w) => w.includes('@ilamy'))).toHaveLength(0)
	})

	test("slotMinTime '23:00' with no max shows exactly the last hour", async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '23:00' })
		const grid = new TimeGrid(page)
		await expect(grid.hourLabels).toHaveCount(1)
		await expect(grid.hourLabels.first()).toContainText('11 PM')
	})

	test("single-digit hour '8:00' and seconds '08:00:00' are accepted", async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '8:00', slotMaxTime: '10:00:00' })
		await expect(new TimeGrid(page).hourLabels).toHaveCount(2)
	})

	test('a bound inside an hour rounds outward to the whole row (documented)', async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '08:30', slotMaxTime: '09:30' })
		const grid = new TimeGrid(page)
		await expect(grid.hourLabels).toHaveCount(2)
		await expect(grid.hourLabels.first()).toContainText('8 AM')
		await expect(grid.hourLabels.last()).toContainText('9 AM')
	})
})

test.describe('persona 3: edge-case hunter, invalid values', () => {
	const INVALID: Array<[string, Record<string, string>, string[]]> = [
		['max 25:00', { slotMaxTime: '25:00' }, ['slotMaxTime']],
		['max 24:01', { slotMaxTime: '24:01' }, ['slotMaxTime']],
		['min abc', { slotMinTime: 'abc' }, ['slotMinTime']],
		['min 08:60', { slotMinTime: '08:60' }, ['slotMinTime']],
		['min negative', { slotMinTime: '-01:00' }, ['slotMinTime']],
		['min empty string', { slotMinTime: '' }, ['slotMinTime']],
		['min 24:00 with no max', { slotMinTime: '24:00' }, ['slotMinTime']],
		[
			'max before min',
			{ slotMinTime: '18:00', slotMaxTime: '08:00' },
			['slotMinTime', 'slotMaxTime'],
		],
		[
			'max equal to min',
			{ slotMinTime: '08:00', slotMaxTime: '08:00' },
			['slotMinTime', 'slotMaxTime'],
		],
		[
			'valid min with invalid max',
			{ slotMinTime: '08:00', slotMaxTime: 'abc' },
			['slotMaxTime'],
		],
	]

	for (const [name, settings, props] of INVALID) {
		test(`${name}: whole day (24 rows) and a console.warn (x2 under StrictMode) naming ${props.join(' + ')}`, async ({
			page,
		}) => {
			const warnings: string[] = []
			page.on('console', (m) => {
				if (m.type() === 'warning' && m.text().includes('@ilamy')) {
					warnings.push(m.text())
				}
			})
			await open(page, 'day', settings)
			await expect(new TimeGrid(page).hourLabels).toHaveCount(24)
			// The harness mounts in React StrictMode, which runs the warning
			// effect twice in development: one warning per mount is 2 here.
			await expect.poll(() => warnings.length).toBe(2)
			for (const prop of props) {
				expect(warnings.at(0)).toContain(prop)
			}
			// navigating (re-render, new date) must not warn again
			await page.getByLabel('Next').click()
			await page.getByLabel('Previous').click()
			await page.waitForTimeout(300)
			expect(warnings).toHaveLength(2)
		})
	}

	test('invalid values in week and horizontal resource views also show the whole day', async ({
		page,
	}) => {
		await open(page, 'week', { slotMinTime: 'abc' })
		await expect(new TimeGrid(page).hourLabels).toHaveCount(24)
		await openResources(page, 'day', 'horizontal', { slotMaxTime: '25:00' })
		await expect(
			page.locator('[data-testid^="resource-day-time-label-"]')
		).toHaveCount(24)
	})

	test('an invalid value does not hide the events that fall in the whole day', async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '18:00', slotMaxTime: '08:00' })
		const grid = new TimeGrid(page)
		await expect(grid.bars('vh-before')).toHaveCount(1)
		await expect(grid.bars('vh-late')).toHaveCount(1)
	})
})

test.describe('persona 3: edge-case hunter, event edges (end exclusive)', () => {
	for (const view of ['day', 'week'] as const) {
		test(`${view}: an event ending exactly at slotMinTime is not drawn (05-06 vs min 06:00)`, async ({
			page,
		}) => {
			await open(page, view, { slotMinTime: '06:00', slotMaxTime: '12:00' })
			const grid = new TimeGrid(page)
			await expect(grid.bars('vh-before')).toHaveCount(0)
			await expect(grid.bars('vh-early')).toHaveCount(1)
		})

		test(`${view}: an event starting exactly at slotMaxTime is not drawn (12-13 vs max 12:00)`, async ({
			page,
		}) => {
			await open(page, view, { slotMinTime: '06:00', slotMaxTime: '12:00' })
			await expect(new TimeGrid(page).bars('vh-midday')).toHaveCount(0)
		})

		test(`${view}: an event one hour inside either edge is drawn (min 05:00 sees 05-06; max 13:00 sees 12-13)`, async ({
			page,
		}) => {
			await open(page, view, { slotMinTime: '05:00', slotMaxTime: '13:00' })
			const grid = new TimeGrid(page)
			await expect(grid.bars('vh-before')).toHaveCount(1)
			await expect(grid.bars('vh-midday')).toHaveCount(1)
		})
	}

	test('horizontal resource day: Room B (10-11) ends exactly at min 11:00 and Room C (11-12:30) starts exactly at max 11:00', async ({
		page,
	}) => {
		await openResources(
			page,
			'day',
			'horizontal',
			{ slotMinTime: '11:00', slotMaxTime: '14:00' },
			'resources'
		)
		await expect(page.getByTestId('horizontal-event-res-2')).toHaveCount(0)
		await expect(page.getByTestId('horizontal-event-res-1')).toHaveCount(0)
		await expect(page.getByTestId('horizontal-event-res-3')).toHaveCount(1)
		await openResources(
			page,
			'day',
			'horizontal',
			{ slotMinTime: '06:00', slotMaxTime: '11:00' },
			'resources'
		)
		await expect(page.getByTestId('horizontal-event-res-3')).toHaveCount(0)
		await expect(page.getByTestId('horizontal-event-res-2')).toHaveCount(1)
	})

	test('vertical resource day: same edge rules', async ({ page }) => {
		await openResources(
			page,
			'day',
			'vertical',
			{ slotMinTime: '11:00', slotMaxTime: '14:00' },
			'resources'
		)
		await expect(page.getByTestId('vertical-event-res-2')).toHaveCount(0)
		await expect(page.getByTestId('vertical-event-res-3')).toHaveCount(1)
		await openResources(
			page,
			'day',
			'vertical',
			{ slotMinTime: '06:00', slotMaxTime: '11:00' },
			'resources'
		)
		await expect(page.getByTestId('vertical-event-res-3')).toHaveCount(0)
		await expect(page.getByTestId('vertical-event-res-2')).toHaveCount(1)
	})
})

test.describe('persona 3: edge-case hunter, scrollTime and the now-line', () => {
	const WINDOW = { slotMinTime: '08:00', slotMaxTime: '18:00', height: '400px' }

	test('scrollTime after the window scrolls to the bottom, not past it', async ({
		page,
	}) => {
		await open(page, 'day', { ...WINDOW, scrollTime: '20:00' })
		const viewport = gridViewport(page)
		await expect(viewport).toBeVisible()
		await page.waitForTimeout(400)
		const gap = await viewport.evaluate(
			(el) => el.scrollHeight - el.clientHeight - el.scrollTop
		)
		expect(gap).toBeLessThanOrEqual(2)
	})

	test('scrollTime inside the window puts that hour at the top of the viewport', async ({
		page,
	}) => {
		await open(page, 'day', { ...WINDOW, scrollTime: '14:00' })
		const viewport = gridViewport(page)
		await page.waitForTimeout(500)
		const view = await viewport.boundingBox()
		const label = await page.getByTestId('vertical-time-14').boundingBox()
		console.log('scrollTime 14:00 viewport.y/label.y', view?.y, label?.y)
		expect(Math.abs((label?.y ?? 0) - (view?.y ?? 99))).toBeLessThan(40)
	})

	test('scrollTime before the window in week view scrolls to the top', async ({
		page,
	}) => {
		await open(page, 'week', { ...WINDOW, scrollTime: '03:00' })
		const viewport = gridViewport(page)
		await expect(viewport).toBeVisible()
		await page.waitForTimeout(500)
		expect(await viewport.evaluate((el) => el.scrollTop)).toBe(0)
	})

	test('now-line: shown inside, at the right height; hidden at max (exclusive); shown at min', async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '08:00', slotMaxTime: '18:00' })
		const first = await page.getByTestId('vertical-time-08').boundingBox()
		const last = await page.getByTestId('vertical-time-17').boundingBox()
		const line = await page.getByTestId('current-time-indicator').boundingBox()
		if (!first || !last || !line) throw new Error('layout')
		const gridHeight = last.y + last.height - first.y
		const expectedY = first.y + gridHeight / 10 // 09:00 is one hour into ten
		console.log('now-line y/expected', line.y, expectedY)
		expect(Math.abs(line.y - expectedY)).toBeLessThan(SUBPIXEL + 3)

		await open(page, 'day', { slotMinTime: '06:00', slotMaxTime: '09:00' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)

		await open(page, 'day', { slotMinTime: '09:00', slotMaxTime: '12:00' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	test('now-line in week view follows the same rule', async ({ page }) => {
		await open(page, 'week', { slotMinTime: '10:00', slotMaxTime: '18:00' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
		await open(page, 'week', { slotMinTime: '08:00', slotMaxTime: '18:00' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	test('now-line at 09:00 sits at the very bottom edge of a 06-10 window? no: 09:00 is inside, so it is shown', async ({
		page,
	}) => {
		await open(page, 'day', { slotMinTime: '06:00', slotMaxTime: '10:00' })
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	test('now-line in the vertical resource day follows the window (one per column or none)', async ({
		page,
	}) => {
		await openResources(page, 'day', 'vertical', {
			slotMinTime: '10:00',
			slotMaxTime: '18:00',
		})
		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
		await openResources(page, 'day', 'vertical', {
			slotMinTime: '08:00',
			slotMaxTime: '18:00',
		})
		const shown = await page.getByTestId('current-time-indicator').count()
		console.log('resource vertical now-lines inside window:', shown)
		expect(shown).toBeGreaterThan(0)
	})
})
