import { expect, type Page, test } from '@playwright/test'
import { gotoScenario } from './support/harness'

interface Point {
	x: number
	y: number
}

const centreOf = async (page: Page, selector: string): Promise<Point> => {
	const box = await page.locator(selector).first().boundingBox()
	if (!box) {
		throw new Error(`nothing is drawn for ${selector}`)
	}
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const dragBetween = async (page: Page, from: Point, to: Point) => {
	await page.mouse.move(from.x, from.y)
	await page.mouse.down()
	await page.mouse.move(to.x, to.y, { steps: 10 })
	await page.mouse.up()
}

const loggedSelections = (page: Page) =>
	page.evaluate(
		() =>
			(
				window as unknown as {
					__selectLog?: Array<{
						start: string
						end: string
						allDay: boolean | null
					}>
				}
			).__selectLog ?? []
	)

const openWeek = async (page: Page, settings: Record<string, string> = {}) => {
	// Tall enough that every hour is drawn, so no drag auto-scrolls.
	await page.setViewportSize({ width: 1280, height: 1700 })
	await gotoScenario(page, {
		scenario: 'basic',
		view: 'week',
		plugins: ['drag-to-create'],
		settings: { scrollTime: '00:00', ...settings },
	})
	await page.waitForTimeout(900)
}

const cellStarting = (iso: string) => `[data-start="${iso}"]`

test.describe('drag-to-create in the time grid', () => {
	test('the selection follows the pointer over an existing event bar', async ({
		page,
	}) => {
		await openWeek(page, { onSelect: 'log' })
		// "Design review" is 14:00-15:30. Releasing in the middle of its bar must
		// end the selection in the 14:00 slot (so at 15:00), not stop before it.
		const bar = await page.getByTestId('vertical-event-basic-2').boundingBox()
		if (!bar) {
			throw new Error('the Design review bar is not drawn')
		}
		await dragBetween(
			page,
			await centreOf(page, cellStarting('2025-03-12T11:00:00.000Z')),
			{ x: bar.x + bar.width / 2, y: bar.y + 10 }
		)
		const [selection] = await loggedSelections(page)
		expect(selection?.end).toBe('2025-03-12T15:00:00.000Z')
	})

	test('pressing an existing event still drags it and never opens the create form', async ({
		page,
	}) => {
		await openWeek(page)
		const bar = await page.getByTestId('vertical-event-basic-2').boundingBox()
		if (!bar) {
			throw new Error('the Design review bar is not drawn')
		}
		const grab = { x: bar.x + bar.width / 2, y: bar.y + bar.height / 2 }
		await dragBetween(page, grab, { x: grab.x, y: grab.y + 120 })
		await expect(page.locator('[role=dialog]')).toHaveCount(0)
	})

	test('Escape then release inside the press cell cancels without opening the form', async ({
		page,
	}) => {
		await openWeek(page)
		const cell = await centreOf(page, cellStarting('2025-03-12T16:00:00.000Z'))
		await page.mouse.move(cell.x, cell.y)
		await page.mouse.down()
		await page.mouse.move(cell.x + 5, cell.y + 5, { steps: 3 })
		await page.keyboard.press('Escape')
		await page.mouse.up()
		await page.waitForTimeout(300)
		await expect(page.locator('[role=dialog]')).toHaveCount(0)
	})

	test('a plain click after a cancelled drag still opens the form', async ({
		page,
	}) => {
		await openWeek(page)
		const cell = await centreOf(page, cellStarting('2025-03-12T16:00:00.000Z'))
		await page.mouse.move(cell.x, cell.y)
		await page.mouse.down()
		await page.mouse.move(cell.x + 5, cell.y + 5, { steps: 3 })
		await page.keyboard.press('Escape')
		await page.mouse.up()
		await page.mouse.click(cell.x, cell.y)
		await expect(page.locator('[role=dialog]')).toHaveCount(1)
	})
})

test.describe('drag-to-create in the month grid', () => {
	// Month cells report allDay false in 3.x (FullCalendar's day grid reports
	// true, DayGridRows.tsx:256); docs/migration-v4.md lists the change.
	test('a selection reports allDay false', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 1700 })
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			plugins: ['drag-to-create'],
			settings: { onSelect: 'log' },
		})
		await page.waitForTimeout(900)
		const from = await centreOf(page, '[data-testid="day-cell-2025-03-20"]')
		const to = await centreOf(page, '[data-testid="day-cell-2025-03-22"]')
		await dragBetween(
			page,
			{ x: from.x, y: from.y + 20 },
			{ x: to.x, y: to.y + 20 }
		)
		const [selection] = await loggedSelections(page)
		expect(selection?.allDay).toBe(false)
	})
})
