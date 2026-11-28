import { expect, type Page, test } from '@playwright/test'
import { expectNoAxeViolations } from '../tests/support/axe'

const PINNED_WEDNESDAY = '2026-11-04T10:00:00.000Z'

const openDemo = async (page: Page) => {
	const now = new Date(PINNED_WEDNESDAY)
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
}

test.describe('demo accessibility (axe-core WCAG 2.2 A+AA)', () => {
	test('demo shell and React Tailwind calendar have zero axe violations', async ({
		page,
	}) => {
		await openDemo(page)
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page)
	})

	test('React Tailwind, Radix UI, Base UI, StyleX, and MUI axes have zero axe violations', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-radix').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})

		await page.getByTestId('components-base-ui').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})

		await page.getByTestId('css-stylex').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})

		await page.getByTestId('css-plain').click()
		await page.getByTestId('components-mui').click()
		await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="ilamy-calendar"]',
		})

		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-radix').click()
		await page.getByTestId('calendar-title').click()
		await expect(page.getByTestId('radix-date-picker-popover')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="radix-date-picker-popover"]',
		})
		await page.keyboard.press('Escape')

		await page.getByTestId('components-base-ui').click()
		await page.getByTestId('calendar-title').click()
		await expect(page.getByTestId('base-ui-date-picker-popover')).toBeVisible()
		await expectNoAxeViolations(page, {
			include: '[data-testid="base-ui-date-picker-popover"]',
		})
		await page.keyboard.press('Escape')
	})

	test('Vue (@ilamy/dom) views and dialogs have zero axe violations', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('framework-vue').click()
		const domCalendar = page.getByTestId('ilamy-calendar')
		await expect(domCalendar).toBeVisible()

		for (const view of ['month', 'week', 'day', 'agenda', 'year'] as const) {
			const viewBtn = domCalendar.getByTestId(`view-btn-${view}`)
			if (await viewBtn.isVisible()) {
				await viewBtn.click()
			} else {
				await domCalendar.getByTestId('view-menu-btn').click()
				await page.getByTestId(`view-menu-item-${view}`).click()
			}
			await expectNoAxeViolations(page, {
				include: '[data-testid="ilamy-calendar"]',
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
			await openDemo(page)
			await page.getByTestId(`framework-${fw}`).click()
			await expect(page.getByTestId('ilamy-calendar')).toBeVisible()
			await expectNoAxeViolations(page, {
				include: '[data-testid="ilamy-calendar"]',
			})
		})
	}
})
