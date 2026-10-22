import { expect, type Page, test } from '@playwright/test'
import { gotoScenario, releasePointer } from './support/harness'
import { CalendarPage } from './support/pages'

const lane = (resourceId: string, startISO: string) =>
	`[data-resource-id="${resourceId}"][data-start="${startISO}"]`

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
