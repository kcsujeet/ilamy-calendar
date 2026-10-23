import { expect, test } from '@playwright/test'
import { dateButtons, formDialog, saveForm } from './support/event-form'
import { gotoScenario } from './support/harness'
import { TimeGrid } from './support/pages'

/*
 * A browser in Europe/London, Lisbon or Dublin, and a calendar with NO
 * `timezone` prop, so the calendar's zone is the browser's. These zones read an
 * offset of 0 in winter. dayjs turns a zero offset into a UTC-flagged instance
 * (`dayjs/plugin/utc`, `utc()` via `utcOffset(0)`), and a zoneless string read
 * through `dayjs.tz()` with no zone set came back flagged: `add(1, 'day')` then
 * added 24 hours and `startOf('day')` rounded in UTC, an hour off after the
 * spring change on Sunday 30 March 2025 (01:00 GMT to 02:00 BST).
 *
 * `tz=none` in the harness leaves the prop unset. New York with no prop and
 * London WITH the prop both passed before the fix; only the zero offset with no
 * zone failed.
 */
const ZERO_OFFSET_ZONES = ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin']

for (const browserZone of ZERO_OFFSET_ZONES) {
	test.describe(`browser ${browserZone}, no timezone prop`, () => {
		test.use({ timezoneId: browserZone })

		test('an all-day event created on 30 March 2025 ends at the next midnight', async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'seed',
				view: 'week',
				timezone: 'none',
				date: '2025-03-30T12:00:00.000Z',
				settings: { seed: '[]', firstDayOfWeek: 'sunday' },
			})
			const grid = new TimeGrid(page)
			await page
				.locator(
					'[data-testid="all-day-row"] [data-all-day="true"][data-start="2025-03-30T00:00:00.000Z"]'
				)
				.first()
				.click()
			await formDialog(page).waitFor()
			await expect(dateButtons(page).nth(1)).toHaveText('Mar 30, 2025')
			await saveForm(page)

			const created = (await grid.eventState()).at(-1)
			expect(created?.start).toBe('2025-03-30T00:00:00.000Z')
			// 00:00 BST on 31 March.
			expect(created?.end).toBe('2025-03-30T23:00:00.000Z')
		})

		test('after next and previous in the month view every cell still starts at its own midnight', async ({
			page,
		}) => {
			await gotoScenario(page, {
				scenario: 'seed',
				view: 'month',
				timezone: 'none',
				date: '2025-03-12T12:00:00.000Z',
				settings: { seed: '[]', externalToolbar: 'true' },
			})
			const date = page.getByTestId('external-date')
			await page.getByTestId('external-next').click()
			await expect(date).toHaveText('2025-04-12T11:00:00.000Z')
			await page.getByTestId('external-prev').click()
			await expect(date).toHaveText('2025-03-12T12:00:00.000Z')

			const starts = await page
				.locator('[data-testid^="day-cell-"]')
				.evaluateAll((cells) =>
					cells.map((cell) => cell.getAttribute('data-start'))
				)
			// 23 Feb to 5 Apr. Midnight is 00:00Z until the clocks go forward at
			// 01:00 on the 30th, and 23:00Z of the day before after it.
			const FIRST_CELL = Date.UTC(2025, 1, 23)
			const MS_PER_DAY = 86_400_000
			const MS_PER_HOUR = 3_600_000
			const FIRST_BST_CELL = 36
			const expected = Array.from({ length: 42 }, (_, index) => {
				const midnightUtc = FIRST_CELL + index * MS_PER_DAY
				const isBst = index >= FIRST_BST_CELL
				const start = isBst ? midnightUtc - MS_PER_HOUR : midnightUtc
				return new Date(start).toISOString()
			})
			expect(starts).toEqual(expected)
		})
	})
}
