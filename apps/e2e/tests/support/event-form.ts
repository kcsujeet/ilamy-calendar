import type { Page } from '@playwright/test'

/**
 * The event form, as a person drives it: the dialog, its two date pickers and
 * its two time pickers. Questions the specs ask, not raw selectors.
 */

export const formDialog = (page: Page) =>
	page.locator('[data-slot="dialog-content"]')

/** Start Date, then End Date: the two buttons that open a day picker. */
export const dateButtons = (page: Page) =>
	page.locator(
		'form button[data-slot="popover-trigger"]:has(svg.lucide-calendar)'
	)

export const allDayBox = (page: Page) => page.locator('form #allDay')

export const submitButton = (page: Page) =>
	page.locator('form button[type="submit"]')

export const pickTime = async (
	page: Page,
	which: 'start' | 'end',
	label: string
) => {
	await page.getByTestId(`time-picker-${which}-time`).click()
	await page
		.locator('[data-slot="popover-content"] button', {
			hasText: new RegExp(`^${label}$`),
		})
		.first()
		.click()
}

export const pickDay = async (page: Page, which: 0 | 1, day: number) => {
	await dateButtons(page).nth(which).click()
	await page
		.locator('[data-slot="calendar"] td[data-outside="false"] button')
		.getByText(String(day), { exact: true })
		.click()
	await page.locator('[data-slot="calendar"]').waitFor({ state: 'detached' })
}

export const timeShown = async (page: Page, which: 'start' | 'end') =>
	(await page.getByTestId(`time-picker-${which}-time`).textContent())?.trim()

export const saveForm = async (page: Page) => {
	await submitButton(page).click()
	await formDialog(page).waitFor({ state: 'detached' })
}
