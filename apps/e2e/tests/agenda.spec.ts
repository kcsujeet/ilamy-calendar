import { expect, type Page, test } from '@playwright/test'
import { gotoScenario } from './support/harness'

/*
 * The agenda plugin lists an event under every day it covers, timed or
 * all-day (docs/agenda-view.md; FullCalendar ListView.tsx eventRangeToSegs).
 */
const openAgenda = async (page: Page, scenario: string) => {
	await gotoScenario(page, { scenario, view: 'agenda', plugins: ['agenda'] })
	await expect(page.getByTestId('agenda-view')).toBeVisible()
}

const dayGroups = (page: Page) =>
	page
		.locator('[data-testid^="agenda-day-"]')
		.evaluateAll((groups) =>
			groups.map((group) => group.getAttribute('data-testid'))
		)

test.describe('agenda: events that cross midnight', () => {
	test('a timed event that crosses midnight is listed under both days', async ({
		page,
	}) => {
		await openAgenda(page, 'overnight-event')

		expect(await dayGroups(page)).toEqual([
			'agenda-day-2025-03-12',
			'agenda-day-2025-03-13',
		])
	})

	test('a timed multi-day event reads start time, then end time, with a day counter', async ({
		page,
	}) => {
		await openAgenda(page, 'overnight-event')

		const firstDay = page.getByTestId('agenda-day-2025-03-12')
		const lastDay = page.getByTestId('agenda-day-2025-03-13')
		await expect(firstDay).toContainText('10:00 PM')
		await expect(firstDay).toContainText('(Day 1/2)')
		await expect(lastDay).toContainText('2:00 AM')
		await expect(lastDay).toContainText('(Day 2/2)')
	})

	test('a two-week timed event is listed under each of its days, middle days read All day', async ({
		page,
	}) => {
		await openAgenda(page, 'spanning-event')

		expect(await dayGroups(page)).toHaveLength(15)
		await expect(page.getByTestId('agenda-day-2025-03-12')).toContainText(
			'All day'
		)
		await expect(page.getByTestId('agenda-day-2025-03-05')).toContainText(
			'9:00 AM'
		)
		await expect(page.getByTestId('agenda-day-2025-03-19')).toContainText(
			'5:00 PM'
		)
	})
})

/*
 * The agenda lists every day of its window: `hiddenDays` does not apply to it
 * (docs/agenda-view.md). The title describes what the view draws, so it names
 * the whole week even when the grid views would trim it.
 */
test.describe('agenda: the title with hidden days', () => {
	test('the Week window titles the whole week it lists', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'spanning-event',
			view: 'agenda',
			plugins: ['agenda'],
			settings: {
				agendaWindow: 'week',
				hiddenDays: 'wednesday,saturday,sunday',
			},
		})
		await expect(page.getByTestId('agenda-view')).toBeVisible()

		const days = await dayGroups(page)
		expect(days.at(0)).toBe('agenda-day-2025-03-09')
		expect(days.at(-1)).toBe('agenda-day-2025-03-15')
		await expect(page.getByTestId('calendar-title')).toHaveText('Mar 9 – 15')
	})
})
