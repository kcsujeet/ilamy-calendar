import { expect, test } from '@playwright/test'
import { formDialog } from './support/event-form'
import { gotoScenario } from './support/harness'

/*
 * A 3.2.1 app passes a full `translations` object, which lacks the nine keys
 * 3.3 added. The `Translations` type forbids that, plain JS or a cast does
 * not, and the picker must show English for those keys rather than the raw key
 * name (docs/translation-usage.md). `translations=pre-3.3` is that object, with
 * the search box in Spanish so the spec can tell the object was in use.
 */
test.describe('a translations object written before 3.3', () => {
	test('the time picker shows English for its new keys and the app text for the old ones', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { translations: 'pre-3.3' },
		})
		await page.getByRole('button', { name: 'New', exact: true }).click()
		await formDialog(page).waitFor()
		await page.getByTestId('time-picker-start-time').click()

		const search = page.getByPlaceholder('Buscar hora')
		await expect(search).toBeVisible()
		await search.fill('zzz')

		await expect(page.getByText('N/A', { exact: true })).toBeVisible()
		await expect(page.getByText('noTimeFound')).toHaveCount(0)
	})

	test('the date picker shows English for its month navigation labels', async ({
		page,
	}) => {
		await gotoScenario(page, {
			scenario: 'basic',
			view: 'week',
			settings: { translations: 'pre-3.3' },
		})
		await page.getByRole('button', { name: 'New', exact: true }).click()
		await formDialog(page).waitFor()
		await page
			.locator(
				'form button[data-slot="popover-trigger"]:has(svg.lucide-calendar)'
			)
			.first()
			.click()

		await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible()
		await expect(page.getByRole('button', { name: 'nextMonth' })).toHaveCount(0)
	})
})
