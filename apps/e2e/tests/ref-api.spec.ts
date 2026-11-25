import { expect, type Page, test } from '@playwright/test'
import {
	gotoScenario,
	settleAnimations,
	waitForDragRender,
} from './support/harness'
import { MonthGrid } from './support/pages'

/*
 * The calendar driven from OUTSIDE through its `ref`. `externalToolbar=1` adds
 * buttons beside the calendar that call `ref.current` methods, and prints
 * `ref.current.currentDate` and `.view` so a spec can read what the ref reports.
 */
const open = (
	page: Page,
	view: 'day' | 'week' | 'month',
	settings: Record<string, string | number> = {}
) =>
	gotoScenario(page, {
		scenario: 'basic',
		view,
		settings: { externalToolbar: 'true', height: '500px', ...settings },
	})

const press = (page: Page, name: string) =>
	page.getByTestId(`external-${name}`).click()

const refDate = (page: Page) => page.getByTestId('external-date')
const refView = (page: Page) => page.getByTestId('external-view')

const gridViewport = (page: Page) =>
	page.locator('[data-ilamy-slot="grid-scroll"]')

test.describe('controlling the calendar through its ref', () => {
	test('next, prev and today navigate, and the ref reads the new date', async ({
		page,
	}) => {
		await open(page, 'week')
		await expect(refDate(page)).toHaveText('2025-03-12T09:00:00.000Z')

		await press(page, 'next')
		await expect(refDate(page)).toHaveText('2025-03-19T09:00:00.000Z')

		await press(page, 'prev')
		await press(page, 'prev')
		await expect(refDate(page)).toHaveText('2025-03-05T09:00:00.000Z')

		await press(page, 'today')
		await expect(refDate(page)).toHaveText('2025-03-12T09:00:00.000Z')
	})

	test('gotoDate moves the rendered calendar to a fixed date', async ({
		page,
	}) => {
		await open(page, 'month')

		await press(page, 'goto')

		await expect(refDate(page)).toHaveText('2025-07-04T12:00:00.000Z')
		await expect(page.getByTestId('calendar-title')).toContainText('Jul 2025')
	})

	test('changeView switches the rendered view', async ({ page }) => {
		await open(page, 'month')
		await expect(page.getByTestId('dom-week-view')).toHaveCount(0)

		await press(page, 'week')

		await expect(refView(page)).toHaveText('week')
		await expect(page.getByTestId('dom-week-view')).toBeVisible()
	})

	test('scrollToTime scrolls the hour grid to 13:30', async ({ page }) => {
		await open(page, 'day')
		const viewport = gridViewport(page)
		await expect(viewport).toBeVisible()
		await settleAnimations(page)
		await waitForDragRender(page)

		await press(page, 'scroll')

		const label = page.locator(
			'[data-ilamy-part="time-axis-hour"][data-hour="13"]'
		)
		const viewportTop = (await viewport.boundingBox())?.y ?? 0
		const rowHeight = (await label.boundingBox())?.height ?? 0
		// 13:30 is half a row into the 13:00 row, so that row starts half a row
		// above the viewport's top edge.
		await expect
			.poll(async () => {
				const labelTop = (await label.boundingBox())?.y ?? 0
				return labelTop + rowHeight / 2 - viewportTop
			})
			.toBeCloseTo(0, 0)
	})

	test('refetchEvents asks the events function again', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'async-events',
			view: 'month',
			settings: { externalToolbar: 'true', fetch: 'delayed', fetchDelay: 50 },
		})
		const month = new MonthGrid(page)
		await expect(month.event('March lunch')).toBeVisible()
		const callsBefore = (await month.fetchLog()).length

		await press(page, 'refetch')

		await expect
			.poll(async () => (await month.fetchLog()).length)
			.toBe(callsBefore + 1)
	})
})
