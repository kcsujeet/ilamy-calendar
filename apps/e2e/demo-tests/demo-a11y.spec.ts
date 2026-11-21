import { expect, test } from '@playwright/test'
import { expectNoAxeViolations } from '../tests/support/axe'

test.describe('demo accessibility (axe-core WCAG 2.2 A+AA)', () => {
	test('demo shell and React Tailwind calendar have zero axe violations', async ({
		page,
	}) => {
		await page.goto('/')
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page)
	})

	test('React StyleX and MUI themes have zero axe violations', async ({
		page,
	}) => {
		await page.goto('/')
		await page.getByTestId('theme-stylex').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})

		await page.getByTestId('theme-mui').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})
	})

	test('Vue (@ilamy/dom) views and dialogs have zero axe violations', async ({
		page,
	}) => {
		await page.goto('/')
		await page.getByTestId('framework-vue').click()
		const domCalendar = page.getByTestId('ilamy-dom-calendar')
		await expect(domCalendar).toBeVisible()

		for (const viewLabel of ['Month', 'Week', 'Day', 'Agenda', 'Year']) {
			await domCalendar
				.getByRole('button', { name: viewLabel, exact: true })
				.click()
			await expectNoAxeViolations(page, {
				include: '[data-testid="ilamy-dom-calendar"]',
			})
		}

		// Open create event dialog and scan
		await domCalendar.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('dom-event-dialog')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="dom-event-dialog"]',
		})
		await page.keyboard.press('Escape')
	})

	for (const fw of ['svelte', 'solid', 'angular'] as const) {
		test(`${fw} adapter calendar has zero axe violations`, async ({ page }) => {
			await page.goto('/')
			await page.getByTestId(`framework-${fw}`).click()
			await expect(page.getByTestId('ilamy-dom-calendar')).toBeVisible()
			await expectNoAxeViolations(page, {
				include: '[data-testid="ilamy-dom-calendar"]',
			})
		})
	}
})
