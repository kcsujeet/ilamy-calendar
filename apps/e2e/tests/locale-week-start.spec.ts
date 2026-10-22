import { expect, test } from '@playwright/test'
import { dateButtons, formDialog } from './support/event-form'
import { gotoScenario } from './support/harness'

/*
 * `firstDayOfWeek` decides where a week starts, whatever the dayjs locale
 * says: fr and de start Monday, ar starts Saturday, and the default
 * `firstDayOfWeek` is Sunday. FullCalendar's `firstDay` overrides the locale's
 * default the same way (https://fullcalendar.io/docs/firstDay).
 * The week of Sunday 9 to Saturday 15 March 2025 is the one the dates below
 * walk through.
 */

const locales = ['fr', 'de', 'ar'] as const
const MARCH_9_TO_15 = [9, 10, 11, 12, 13, 14, 15]

/** A calendar day, the way a cell's `data-start` names it in UTC. */
const dayOfCell = (start: string | null) => start?.slice(0, 10)

for (const locale of locales) {
	test.describe(`locale ${locale}, Sunday-first`, () => {
		test('the week view draws the week that contains the current date, whatever the weekday', async ({
			page,
		}) => {
			const missing: number[] = []
			for (const day of MARCH_9_TO_15) {
				const wanted = `2025-03-${String(day).padStart(2, '0')}`
				await gotoScenario(page, {
					scenario: 'basic',
					view: 'week',
					date: `${wanted}T12:00:00.000Z`,
					settings: { locale },
				})
				const shown = await page
					.locator('[data-testid="all-day-row"] [data-all-day="true"]')
					.evaluateAll((cells) =>
						cells.map((cell) => cell.getAttribute('data-start'))
					)
				if (!shown.map(dayOfCell).includes(wanted)) {
					missing.push(day)
				}
			}
			expect(missing, 'dates whose own week is not drawn').toEqual([])
		})

		test('the month grid draws every day of the month', async ({ page }) => {
			// The first of March 2025 is a Saturday, so Sunday-first rows run
			// 23 Feb to 5 Apr, the grid English draws.
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'month',
				date: '2025-03-12T12:00:00.000Z',
				settings: { locale },
			})
			const starts = await page
				.locator('[data-testid^="day-cell-"]')
				.evaluateAll((cells) =>
					cells.map((cell) => cell.getAttribute('data-start'))
				)
			const days = starts.map(dayOfCell)
			expect(days.at(0)).toBe('2025-02-23')
			expect(days.at(-1)).toBe('2025-04-05')
			expect(days).toContain('2025-03-30')
			expect(days).toContain('2025-03-31')
		})

		test('the event form date picker offers every day of the month', async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'month',
				date: '2025-03-12T12:00:00.000Z',
				settings: { locale },
			})
			await page.getByRole('button', { name: /New/ }).click()
			await formDialog(page).waitFor()
			await dateButtons(page).nth(0).click()
			const inMonth = await page
				.locator('[data-slot="calendar"] td[data-outside="false"]')
				.allTextContents()
			expect(inMonth.map(Number)).toEqual(
				Array.from({ length: 31 }, (_, index) => index + 1)
			)
		})
	})
}
