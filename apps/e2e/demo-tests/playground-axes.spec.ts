import { expect, type Page, test } from '@playwright/test'

const openDemo = async (page: Page) => {
	const now = new Date('2026-10-25T10:00:00.000Z')
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
	await page.getByTestId('ilamy-calendar').waitFor()
}

test.describe('QA Protocol G1-G7: 3-Axis Playground & Component Library Slots', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('G1 & G2: Framework, CSS, and Components are independent; unsupported component libraries disable loudly without silent swap', async ({
		page,
	}) => {
		await openDemo(page)

		// G1: Verify MUI and shadcn are in Components axis, not CSS axis
		const axesBar = page.getByTestId('playground-axes-bar')
		await expect(axesBar.getByTestId('css-plain')).toBeVisible()
		await expect(axesBar.getByTestId('css-unstyled')).toBeVisible()
		await expect(axesBar.getByTestId('css-tailwind')).toBeVisible()
		await expect(axesBar.getByTestId('css-stylex')).toBeVisible()
		await expect(axesBar.getByTestId('components-native')).toBeVisible()
		await expect(axesBar.getByTestId('components-shadcn')).toBeVisible()
		await expect(axesBar.getByTestId('components-mui')).toBeVisible()
		await expect(axesBar.getByTestId('components-custom-slot')).toBeVisible()

		// Select Tailwind CSS + MUI Components on React
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-mui').click()
		const rootCard = page.locator('[data-active-framework="react"]')
		await expect(rootCard).toHaveAttribute('data-active-css', 'tailwind')
		await expect(rootCard).toHaveAttribute('data-active-components', 'mui')

		// G2: Switch to Vue -> MUI is disabled with explanatory title, CSS stays tailwind, and NO silent replacement occurs
		await page.getByTestId('framework-vue').click()
		await expect(page.locator('[data-active-framework="vue"]')).toHaveAttribute(
			'data-active-css',
			'tailwind'
		)
		await expect(page.locator('[data-active-framework="vue"]')).toHaveAttribute(
			'data-active-components',
			'mui'
		)
		await expect(page.getByTestId('components-mui')).toBeDisabled()
		await expect(page.getByTestId('components-shadcn')).toBeDisabled()
		expect(
			await page.getByTestId('components-mui').getAttribute('title')
		).toContain('React')
		await expect(page.getByTestId('component-unavailable-notice')).toBeVisible()

		// Switching back to React restores MUI component dialog cleanly
		await page.getByTestId('framework-react').click()
		await expect(page.getByTestId('components-mui')).toBeEnabled()
		await expect(page.getByTestId('component-unavailable-notice')).toHaveCount(
			0
		)
	})

	test('G3: Switching framework, CSS, and Components preserves view and resource granularity', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('preset-resource').click()
		await expect(page.getByTestId('dom-resource-hourly-grid')).toBeVisible()

		// Cycle frameworks -> resource week hourly remains intact
		for (const fw of ['vue', 'svelte', 'solid', 'angular', 'react'] as const) {
			await page.getByTestId(`framework-${fw}`).click()
			await expect(
				page.getByTestId('dom-resource-hourly-grid'),
				`${fw} preserves hourly resource grid`
			).toBeVisible()
		}

		// Cycle CSS options -> resource week hourly remains intact
		for (const css of ['tailwind', 'stylex', 'unstyled', 'plain'] as const) {
			await page.getByTestId(`css-${css}`).click()
			await expect(
				page.getByTestId('dom-resource-hourly-grid'),
				`${css} preserves hourly resource grid`
			).toBeVisible()
		}
	})

	test('G4, G5, G6: No duplicate controls, honest non-clickable chips, and zero stray scrollbars', async ({
		page,
	}) => {
		await openDemo(page)

		// G4: Zero duplicate theme/framework/mode controls in sidebar
		await page.getByTestId('settings-tab-theme').click()
		await expect(page.getByText('Active Theme')).toHaveCount(0)
		await page.getByTestId('settings-tab-general').click()
		await expect(page.getByText('Calendar Mode')).toHaveCount(0)

		// G5: Status strip is plain non-interactive text without pointer cursor
		const stripMetrics = await page
			.getByTestId('playground-status-strip')
			.evaluate((el) => ({
				cursor: getComputedStyle(el).cursor,
				buttons: el.querySelectorAll('button, a').length,
			}))
		expect(stripMetrics.cursor).not.toBe('pointer')
		expect(stripMetrics.buttons).toBe(0)

		// G6: No horizontal or vertical scrollbar inside top axes bar or preset nav
		const barOverflow = await page
			.getByTestId('playground-axes-bar')
			.evaluate((el) => ({
				x: el.scrollWidth - el.clientWidth,
				y: el.scrollHeight - el.clientHeight,
			}))
		expect(barOverflow).toEqual({ x: 0, y: 0 })

		const navOverflow = await page
			.locator('nav[aria-label="Demo presets"]')
			.evaluate((el) => ({
				x: el.scrollWidth - el.clientWidth,
				y: el.scrollHeight - el.clientHeight,
			}))
		expect(navOverflow).toEqual({ x: 0, y: 0 })
	})

	test('G7 & Component Slots: Code panel updates per axis and shadcn / MUI / Custom Slot dialogs create events', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByRole('button', { name: /Code & Events/i }).click()
		const weekBtn = page.getByTestId('view-btn-week')
		if (await weekBtn.isVisible()) {
			await weekBtn.click()
		} else {
			await page.getByTestId('view-menu-btn').click()
			await page.getByTestId('view-menu-item-week').click()
		}
		await expect(page.getByTestId('dom-week-view')).toBeVisible()

		// 1. React + Tailwind + shadcn
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-shadcn').click()
		await expect(page.locator('pre code')).toContainText(
			'@ilamy/calendar/styles/base.css'
		)
		await expect(page.locator('pre code')).toContainText('tailwindSlotProps')
		await expect(page.locator('pre code')).toContainText('ShadcnEventForm')

		await page.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('shadcn-event-form-dialog')).toBeVisible()
		await page.getByTestId('shadcn-form-title').fill('Shadcn Demo Event')
		await page.getByTestId('shadcn-form-save').click()
		await expect(page.getByTestId('shadcn-event-form-dialog')).toHaveCount(0)
		await expect(page.getByText('Shadcn Demo Event')).toBeVisible()

		// 2. React + Plain CSS + MUI
		await page.getByTestId('css-plain').click()
		await page.getByTestId('components-mui').click()
		await expect(page.locator('pre code')).toContainText('MuiEventForm')
		await page.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('mui-event-form-dialog')).toBeVisible()
		await page.getByTestId('mui-form-title').fill('MUI Demo Event')
		await page.getByTestId('mui-form-save').click()
		await expect(page.getByTestId('mui-event-form-dialog')).toHaveCount(0)
		await expect(page.getByText('MUI Demo Event')).toBeVisible()

		// 3. Vue + Tailwind + Custom Slot
		await page.getByTestId('framework-vue').click()
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-custom-slot').click()
		await expect(page.locator('pre code')).toContainText('#event-form')
		const vueStage = page.getByTestId('framework-stage-vue')
		await expect(vueStage.getByTestId('dom-week-view')).toBeVisible()
		await vueStage.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('custom-event-form-dialog')).toBeVisible()
		await page
			.getByTestId('custom-slot-form-title')
			.fill('Vue Custom Slot Event')
		await page.getByTestId('custom-slot-form-save').click()
		await expect(page.getByTestId('custom-event-form-dialog')).toBeHidden()
		await expect(page.getByText('Vue Custom Slot Event')).toBeVisible()
	})
})
