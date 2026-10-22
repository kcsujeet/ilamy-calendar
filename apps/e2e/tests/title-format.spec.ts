import { expect, test } from '@playwright/test'
import { gotoScenario } from './support/harness'

/*
 * `titleFormat` formats the view's whole range, as FullCalendar does
 * (title-formatting.ts:15-16, 25-31): a format that shows days names the month
 * range in the month view and the year range in the year view, not the
 * current date.
 */
const intlRange = (
	options: Intl.DateTimeFormatOptions,
	startIso: string,
	endIso: string
) =>
	new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).formatRange(
		new Date(startIso),
		new Date(endIso)
	)

test.describe('titleFormat follows the view range', () => {
	for (const date of ['2025-03-12T09:00:00.000Z', '2025-03-31T09:00:00.000Z']) {
		test(`month view {day, month, year} names the month range (current date ${date.slice(0, 10)})`, async ({
			page,
		}) => {
			const format = {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
			} as const
			await gotoScenario(page, {
				scenario: 'basic',
				view: 'month',
				date,
				settings: { titleFormat: JSON.stringify(format) },
			})

			const expected = intlRange(
				format,
				'2025-03-01T00:00:00.000Z',
				'2025-03-31T00:00:00.000Z'
			)
			await expect(page.getByTestId('calendar-title')).toContainText(expected)
		})
	}

	test('year view {month, year} names the year range', async ({ page }) => {
		const format = { month: 'long', year: 'numeric' } as const
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'year',
			settings: { titleFormat: JSON.stringify(format) },
		})

		const expected = intlRange(
			format,
			'2025-01-01T00:00:00.000Z',
			'2025-12-31T00:00:00.000Z'
		)
		await expect(page.getByTestId('calendar-title')).toContainText(expected)
	})

	test('month view {month, year} still reads the month', async ({ page }) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'month',
			settings: {
				titleFormat: JSON.stringify({ month: 'long', year: 'numeric' }),
			},
		})

		await expect(page.getByTestId('calendar-title')).toContainText('March 2025')
	})
})
