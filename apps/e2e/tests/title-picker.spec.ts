import { expect, test } from '@playwright/test'
import { gotoScenario } from './support/harness'

/*
 * The title dropdown's month and year grids hand the calendar a date. The
 * browser stays in UTC and only the calendar's `timezone` is New York, so the
 * machine's zone cannot be what makes these pass. Picking must keep the clock
 * face and take the UTC offset in force on the picked day, not the offset of
 * the date the grid started from (docs/timezones.md, "Building a day or a
 * clock time: re-anchor, do not step").
 */

const NEW_YORK = 'America/New_York'

const openTitlePicker = async (
	page: import('@playwright/test').Page,
	options: { view: 'month' | 'year'; date: string }
) => {
	await gotoScenario(page, {
		scenario: 'basic',
		view: options.view,
		timezone: NEW_YORK,
		date: options.date,
		settings: { externalToolbar: 'true' },
	})
	await page.getByTestId('calendar-title').click()
}

test.describe('title month picker', () => {
	test('picking June from January keeps the 12:00 clock face', async ({
		page,
	}) => {
		// 12:00 EST on 15 Jan 2025.
		await openTitlePicker(page, {
			view: 'month',
			date: '2025-01-15T17:00:00.000Z',
		})
		await page
			.locator('[data-slot="month-grid"] button', { hasText: 'Jun' })
			.click()

		await expect(page.getByTestId('calendar-title')).toHaveText('Jun 2025')
		// 12:00 EDT on 1 June.
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-06-01T16:00:00.000Z'
		)
	})

	test('picking January from just after midnight in summer stays in January', async ({
		page,
	}) => {
		// 00:30 EDT on 1 June 2025.
		await openTitlePicker(page, {
			view: 'month',
			date: '2025-06-01T04:30:00.000Z',
		})
		await page
			.locator('[data-slot="month-grid"] button', { hasText: 'Jan' })
			.click()

		await expect(page.getByTestId('calendar-title')).toHaveText('Jan 2025')
		// 00:30 EST on 1 January.
		await expect(page.getByTestId('external-date')).toHaveText(
			'2025-01-01T05:30:00.000Z'
		)
	})
})

test.describe('title year picker', () => {
	test('picking a year keeps the clock face on a day whose offset differs', async ({
		page,
	}) => {
		// 12:00 EDT on 9 Mar 2025, the day the clocks went forward.
		await openTitlePicker(page, {
			view: 'year',
			date: '2025-03-09T16:00:00.000Z',
		})
		await page
			.locator('[data-slot="year-grid"] button', { hasText: '2024' })
			.click()

		await expect(page.getByTestId('calendar-title')).toHaveText('2024')
		// 12:00 EST on 9 Mar 2024, a day before that year's change.
		await expect(page.getByTestId('external-date')).toHaveText(
			'2024-03-09T17:00:00.000Z'
		)
	})
})
