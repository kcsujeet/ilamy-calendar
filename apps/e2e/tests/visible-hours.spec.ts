import { expect, type Page, test } from '@playwright/test'

type Box = { x: number; y: number; width: number; height: number }

import { gotoScenario, releasePointer } from './support/harness'
import { ResourceAxis, TimeGrid } from './support/pages'

/*
 * `slotMinTime` / `slotMaxTime` choose the clock range an hour grid shows. The
 * pinned "now" is 09:00 UTC on 12 March 2025.
 */
const WINDOW = { slotMinTime: '08:00', slotMaxTime: '18:00' }

/**
 * Where a bar sits against a row, in rows: its top offset and its height. Row
 * borders and bar insets move the edges by a pixel or two, which is a few
 * hundredths of a row.
 */
const measureAgainstRow = (bar: Box | null, row: Box | null) => {
	if (!bar || !row) {
		throw new Error('the bar and the row must both be laid out')
	}
	return {
		topInRows: (bar.y - row.y) / row.height,
		heightInRows: bar.height / row.height,
	}
}

const openDay = (page: Page, settings: Record<string, string> = WINDOW) =>
	gotoScenario(page, { scenario: 'visible-hours', view: 'day', settings })

test.describe('visible hours: rows', () => {
	test('a week shows 8 AM first and 5 PM last', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'visible-hours',
			view: 'week',
			settings: WINDOW,
		})
		const labels = new TimeGrid(page).hourLabels

		await expect(labels).toHaveCount(10)
		await expect(labels.first()).toContainText('8 AM')
		await expect(labels.last()).toContainText('5 PM')
	})

	test('without the settings the grid still shows all 24 hours', async ({
		page,
	}) => {
		await openDay(page, {})

		await expect(new TimeGrid(page).hourLabels).toHaveCount(24)
	})
})

test.describe('visible hours: events', () => {
	test('an event starting before the window is clipped to the top and keeps its times', async ({
		page,
	}) => {
		await openDay(page)
		const grid = new TimeGrid(page)

		const bar = await grid.bars('vh-early').first().boundingBox()
		const firstRow = await grid.slotAt('2025-03-12T08:00').boundingBox()
		const { topInRows, heightInRows } = measureAgainstRow(bar, firstRow)
		expect(topInRows).toBeCloseTo(0, 1)
		expect(heightInRows).toBeCloseTo(1, 1)
		// The default bar draws only a title, so the real times are read from the
		// event the calendar holds: clipping must not rewrite them.
		const clipped = await grid.eventNamed('Starts early')
		expect(clipped.start).toBe('2025-03-12T07:00:00.000Z')
		expect(clipped.end).toBe('2025-03-12T09:00:00.000Z')
	})

	test('an event ending after the window is clipped to the bottom', async ({
		page,
	}) => {
		await openDay(page)
		const grid = new TimeGrid(page)

		const bar = await grid.bars('vh-late').first().boundingBox()
		const lastRow = await grid.slotAt('2025-03-12T17:00').boundingBox()
		const { topInRows, heightInRows } = measureAgainstRow(bar, lastRow)
		expect(topInRows).toBeCloseTo(0, 1)
		expect(heightInRows).toBeCloseTo(1, 1)
	})

	test('an event wholly outside the window is not drawn', async ({ page }) => {
		await openDay(page)

		await expect(new TimeGrid(page).bars('vh-before')).toHaveCount(0)
	})

	test('a drag onto the last row lands in that hour', async ({ page }) => {
		await openDay(page)
		const grid = new TimeGrid(page)
		const source = await grid.bars('vh-midday').first().boundingBox()
		const target = await grid.slotAt('2025-03-12T17:00').boundingBox()
		const isSourceLaidOut = source !== null
		const isTargetLaidOut = target !== null
		if (!isSourceLaidOut || !isTargetLaidOut) {
			throw new Error('drag needs both elements laid out')
		}
		const grabX = source.x + source.width / 2
		const grabY = source.y + 10
		const dropY = target.y + 10

		await page.mouse.move(grabX, grabY)
		await page.mouse.down()
		for (let step = 1; step <= 8; step += 1) {
			await page.mouse.move(grabX, grabY + ((dropY - grabY) * step) / 8)
		}
		await releasePointer(page)

		const moved = await grid.eventNamed('Midday')
		expect(moved.start).toMatch(/^2025-03-12T17:/)
	})
})

test.describe('visible hours: now and scroll', () => {
	test('the now-line shows when now is inside the window', async ({ page }) => {
		await openDay(page)

		await expect(page.getByTestId('current-time-indicator')).toHaveCount(1)
	})

	test('the now-line is hidden when now is outside the window', async ({
		page,
	}) => {
		await openDay(page, { slotMinTime: '10:00', slotMaxTime: '18:00' })

		await expect(page.getByTestId('current-time-indicator')).toHaveCount(0)
	})

	test('a scrollTime before the window scrolls to the top', async ({
		page,
	}) => {
		await openDay(page, { ...WINDOW, scrollTime: '06:00', height: '400px' })
		const viewport = page.locator(
			'[data-testid="vertical-grid-scroll"] [data-radix-scroll-area-viewport]'
		)

		await expect(viewport).toBeVisible()
		expect(await viewport.evaluate((el) => el.scrollTop)).toBe(0)
	})
})

test.describe('visible hours: resource hour timeline', () => {
	test('the horizontal resource day shows only the window hours', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'resources',
			view: 'day',
			orientation: 'horizontal',
			settings: WINDOW,
		})
		const headers = page.locator('[data-testid^="resource-day-time-label-"]')

		await new ResourceAxis(page).expectRendered()
		await expect(headers).toHaveCount(10)
		await expect(headers.first()).toContainText('8 AM')
		await expect(headers.last()).toContainText('5 PM')
	})
})
