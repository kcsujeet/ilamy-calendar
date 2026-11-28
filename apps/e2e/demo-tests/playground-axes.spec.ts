import { expect, type Page, test } from '@playwright/test'

const openDemo = async (page: Page) => {
	const now = new Date('2026-10-25T10:00:00.000Z')
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
	await page.getByTestId('ilamy-calendar').waitFor()
}

test.describe('QA Protocol: 3-Axis Playground (Framework x CSS x Component Library)', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('3 unlabeled axes enforce full compatibility and auto-reset unsupported pairings cleanly', async ({
		page,
	}) => {
		await openDemo(page)

		const axesBar = page.getByTestId('playground-axes-bar')
		await expect(axesBar.getByTestId('css-plain')).toBeVisible()
		await expect(axesBar.getByTestId('css-unstyled')).toBeVisible()
		await expect(axesBar.getByTestId('css-tailwind')).toBeVisible()
		await expect(axesBar.getByTestId('css-stylex')).toBeVisible()
		await expect(axesBar.getByTestId('components-native')).toBeVisible()
		await expect(axesBar.getByTestId('components-radix')).toBeVisible()
		await expect(axesBar.getByTestId('components-base-ui')).toBeVisible()
		await expect(axesBar.getByTestId('components-mui')).toBeVisible()
		await expect(axesBar.getByText('Custom Slot')).toHaveCount(0)

		// Mui works on React + Plain CSS, then disables & resets to Built-in when switching CSS to Tailwind
		await page.getByTestId('components-mui').click()
		await expect(page.locator('[data-active-components="mui"]')).toBeVisible()

		await page.getByTestId('css-tailwind').click()
		await expect(page.getByTestId('components-mui')).toBeDisabled()
		expect(
			await page.getByTestId('components-mui').getAttribute('title')
		).toContain('Plain CSS')
		await expect(
			page.locator('[data-active-components="native"]')
		).toBeVisible()
		await expect(page.getByTestId('components-radix')).toBeEnabled()
		await expect(page.getByTestId('components-base-ui')).toBeEnabled()

		// Switching to Vue disables Radix UI, Base UI, and MUI and resets to Built-in
		await page.getByTestId('components-base-ui').click()
		await expect(
			page.locator('[data-active-components="base-ui"]')
		).toBeVisible()
		await page.getByTestId('framework-vue').click()
		await expect(
			page.locator('[data-active-components="native"]')
		).toBeVisible()
		for (const lib of ['radix', 'base-ui', 'mui'] as const) {
			const btn = page.getByTestId(`components-${lib}`)
			await expect(btn).toBeDisabled()
			expect(await btn.getAttribute('title')).toContain('React')
		}

		// Switching back to React on Plain CSS re-enables all 3 component libraries
		await page.getByTestId('framework-react').click()
		await page.getByTestId('css-plain').click()
		await expect(page.getByTestId('components-radix')).toBeEnabled()
		await expect(page.getByTestId('components-base-ui')).toBeEnabled()
		await expect(page.getByTestId('components-mui')).toBeEnabled()
	})

	test('G3: Switching framework and CSS preserves view and resource granularity', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('preset-resource').click()
		await expect(page.getByTestId('dom-resource-hourly-grid')).toBeVisible()

		for (const fw of ['vue', 'svelte', 'solid', 'angular', 'react'] as const) {
			await page.getByTestId(`framework-${fw}`).click()
			await expect(
				page.getByTestId('dom-resource-hourly-grid'),
				`${fw} preserves hourly resource grid`
			).toBeVisible()
		}

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

		await page.getByTestId('settings-tab-theme').click()
		await expect(page.getByText('Active Theme')).toHaveCount(0)
		await page.getByTestId('settings-tab-general').click()
		await expect(page.getByText('Calendar Mode')).toHaveCount(0)

		const stripMetrics = await page
			.getByTestId('playground-status-strip')
			.evaluate((el) => ({
				cursor: getComputedStyle(el).cursor,
				buttons: el.querySelectorAll('button, a').length,
			}))
		expect(stripMetrics.cursor).not.toBe('pointer')
		expect(stripMetrics.buttons).toBe(0)

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

	test('Component libraries visibly swap full-width header, interactive date picker, and event/scope dialogs for Radix UI, Base UI, and MUI', async ({
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

		const assertFullWidthHeader = async () => {
			const align = await page.evaluate(() => {
				const header = document.querySelector('[data-testid="calendar-header"]')
				const newBtn = header?.querySelector(
					'[data-testid="new-event-btn"]'
				) as HTMLElement | null
				if (!header || !newBtn) return null
				const h = header.getBoundingClientRect()
				const b = newBtn.getBoundingClientRect()
				return { rightGap: Math.abs(h.right - b.right) }
			})
			expect(align).not.toBeNull()
			expect(align?.rightGap ?? 999).toBeLessThanOrEqual(16)
		}

		// 1. React + Tailwind + Radix UI (shows shadcn/ui pairing cleanly)
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-radix').click()
		await expect(
			page.locator(
				'[data-testid="calendar-header"] [data-component-library="radix"]'
			)
		).toBeVisible()
		await assertFullWidthHeader()
		await expect(page.getByTestId('playground-status-strip')).toContainText(
			'Radix UI (shadcn/ui)'
		)
		await expect(page.locator('pre code')).toContainText('RadixHeader')

		// Date selector opens @radix-ui/react-popover and navigates week
		const initialTitle = await page.getByTestId('calendar-title').innerText()
		await page.getByTestId('calendar-title').click()
		const radixPopover = page.getByTestId('radix-date-picker-popover')
		await expect(radixPopover).toBeVisible()
		await radixPopover
			.getByRole('button', { name: 'Wednesday, October 14, 2026' })
			.click()
		await expect(radixPopover).toHaveCount(0)
		await expect(page.getByTestId('calendar-title')).not.toHaveText(
			initialTitle
		)
		await page.getByRole('button', { name: 'Today', exact: true }).click()

		await page.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('radix-event-form-dialog')).toBeVisible()
		await page.getByTestId('radix-form-title').fill('Radix Demo Event')
		await page.getByTestId('radix-form-save').click()
		await expect(page.getByTestId('radix-event-form-dialog')).toHaveCount(0)
		await expect(page.getByText('Radix Demo Event')).toBeVisible()

		await page.locator('[data-testid^="calendar-event-20"]').first().click()
		await expect(page.getByTestId('radix-event-form-dialog')).toBeVisible()
		await page.getByTestId('radix-form-save').click()
		await expect(
			page.getByTestId('radix-recurrence-scope-dialog')
		).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByTestId('radix-recurrence-scope-dialog')).toHaveCount(
			0
		)

		// 2. React + Tailwind + Base UI (@base-ui/react)
		await page.getByTestId('components-base-ui').click()
		await expect(
			page.locator(
				'[data-testid="calendar-header"] [data-component-library="base-ui"]'
			)
		).toBeVisible()
		await assertFullWidthHeader()
		await expect(page.getByTestId('playground-status-strip')).toContainText(
			'Base UI (shadcn/ui)'
		)
		await expect(page.locator('pre code')).toContainText(
			'@base-ui/react/dialog'
		)

		await page.getByTestId('calendar-title').click()
		const baseUiPopover = page.getByTestId('base-ui-date-picker-popover')
		await expect(baseUiPopover).toBeVisible()
		await baseUiPopover
			.getByRole('button', { name: 'Wednesday, October 14, 2026' })
			.click()
		await expect(baseUiPopover).toHaveCount(0)
		await expect(page.getByTestId('calendar-title')).not.toHaveText(
			initialTitle
		)
		await page.getByRole('button', { name: 'Today', exact: true }).click()

		await page.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('base-ui-event-form-dialog')).toBeVisible()
		await page.getByTestId('base-ui-form-title').fill('Base UI Demo Event')
		await page.getByTestId('base-ui-form-save').click()
		await expect(page.getByTestId('base-ui-event-form-dialog')).toHaveCount(0)
		await expect(page.getByText('Base UI Demo Event')).toBeVisible()

		await page.locator('[data-testid^="calendar-event-20"]').first().click()
		await expect(page.getByTestId('base-ui-event-form-dialog')).toBeVisible()
		await page.getByTestId('base-ui-form-save').click()
		await expect(
			page.getByTestId('base-ui-recurrence-scope-dialog')
		).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(
			page.getByTestId('base-ui-recurrence-scope-dialog')
		).toHaveCount(0)

		// 3. React + Plain CSS + MUI
		await page.getByTestId('css-plain').click()
		await page.getByTestId('components-mui').click()
		await expect(
			page.locator(
				'[data-testid="calendar-header"] [data-component-library="mui"]'
			)
		).toBeVisible()
		await assertFullWidthHeader()
		await expect(page.locator('pre code')).toContainText('MuiHeader')

		await page.getByTestId('calendar-title').click()
		const muiPopover = page.getByTestId('mui-date-picker-popover')
		await expect(muiPopover).toBeVisible()
		await muiPopover
			.getByRole('button', { name: 'Wednesday, October 14, 2026' })
			.click()
		await expect(muiPopover).toHaveCount(0)
		await expect(page.getByTestId('calendar-title')).not.toHaveText(
			initialTitle
		)
		await page.getByRole('button', { name: 'Today', exact: true }).click()

		await page.getByTestId('new-event-btn').click()
		await expect(page.getByTestId('mui-event-form-dialog')).toBeVisible()
		await page.getByTestId('mui-form-title').fill('MUI Demo Event')
		await page.getByTestId('mui-form-save').click()
		await expect(page.getByTestId('mui-event-form-dialog')).toHaveCount(0)
		await expect(page.getByText('MUI Demo Event')).toBeVisible()

		await page.locator('[data-testid^="calendar-event-20"]').first().click()
		await expect(page.getByTestId('mui-event-form-dialog')).toBeVisible()
		await page.getByTestId('mui-form-save').click()
		await expect(page.getByTestId('mui-recurrence-scope-dialog')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.getByTestId('mui-recurrence-scope-dialog')).toHaveCount(0)

		// 4. Built-in + Tailwind recurrence scope dialog has styled bordered cards
		await page.getByTestId('components-native').click()
		await page.getByTestId('css-tailwind').click()
		await page.locator('[data-testid^="calendar-event-20"]').first().click()
		await expect(page.getByTestId('dom-event-dialog')).toBeVisible()
		await page.getByTestId('dom-event-save-btn').click()
		const scopeBtn = page
			.locator(
				'[data-testid="recurrence-edit-dialog"] [data-ilamy-part="scope-option"]'
			)
			.first()
		await expect(scopeBtn).toBeVisible()
		const scopeStyles = await scopeBtn.evaluate((el) => {
			const cs = getComputedStyle(el)
			return {
				textAlign: cs.textAlign,
				borderTopWidth: cs.borderTopWidth,
				paddingTop: cs.paddingTop,
			}
		})
		expect(scopeStyles.textAlign).toBe('left')
		expect(scopeStyles.borderTopWidth).not.toBe('0px')
		expect(scopeStyles.paddingTop).not.toBe('0px')
		await page.keyboard.press('Escape')
	})

	test('week view title picker highlights entire week row on hover across Plain CSS, Tailwind, and Base UI while day view highlights single day', async ({
		page,
	}) => {
		await openDemo(page)

		const assertPickerWeekAndDayHover = async (pickerRootSelector: string) => {
			await page.getByRole('button', { name: 'Week', exact: true }).click()
			await page.getByTestId('calendar-title').click()

			const picker = page.locator(pickerRootSelector)
			await expect(picker).toBeVisible()

			const hoveredRow = picker
				.locator('[data-week-hover="true"]:not([data-selected-week="true"])')
				.nth(0)
			const unhoveredRow = picker
				.locator('[data-week-hover="true"]:not([data-selected-week="true"])')
				.nth(1)
			const selectedRow = picker.locator('[data-selected-week="true"]')

			await expect(hoveredRow).toBeVisible()
			await expect(unhoveredRow).toBeVisible()
			await expect(selectedRow).toBeVisible()

			// Move pointer onto the middle day of a non-selected week row
			await hoveredRow.locator('button').nth(3).hover()

			// All 7 cells of the hovered week row must share one non-transparent hover background
			await expect
				.poll(async () => {
					const bgs = await hoveredRow
						.locator('button')
						.evaluateAll((btns) =>
							btns.map((b) => getComputedStyle(b).backgroundColor)
						)
					return (
						bgs.length === 7 &&
						bgs[0] !== 'rgba(0, 0, 0, 0)' &&
						bgs.every((bg) => bg === bgs[0])
					)
				})
				.toBe(true)

			const hoverBg = await hoveredRow
				.locator('button')
				.first()
				.evaluate((b) => getComputedStyle(b).backgroundColor)

			// An unhovered non-selected week stays transparent
			await expect
				.poll(() =>
					unhoveredRow
						.locator('button')
						.first()
						.evaluate((b) => getComputedStyle(b).backgroundColor)
				)
				.toBe('rgba(0, 0, 0, 0)')

			// Selected week stays solid primary even when hovered
			await selectedRow.locator('button').nth(2).hover()
			await expect
				.poll(async () => {
					const bgs = await selectedRow
						.locator('button')
						.evaluateAll((btns) =>
							btns.map((b) => getComputedStyle(b).backgroundColor)
						)
					return (
						bgs.length === 7 &&
						bgs[0] !== 'rgba(0, 0, 0, 0)' &&
						bgs[0] !== hoverBg &&
						bgs.every((bg) => bg === bgs[0])
					)
				})
				.toBe(true)

			await page.keyboard.press('Escape')
			await expect(picker).toHaveCount(0)

			// Switch to Day view: hovering highlights only the hovered day button
			await page.getByRole('button', { name: 'Day', exact: true }).click()
			await page.getByTestId('calendar-title').click()
			await expect(picker).toBeVisible()

			const dayTarget = picker.locator('button[aria-pressed="false"]').nth(10)
			const daySibling = picker.locator('button[aria-pressed="false"]').nth(11)
			await dayTarget.hover()

			await expect
				.poll(() =>
					dayTarget.evaluate((b) => getComputedStyle(b).backgroundColor)
				)
				.not.toBe('rgba(0, 0, 0, 0)')
			expect(
				await daySibling.evaluate((b) => getComputedStyle(b).backgroundColor)
			).toBe('rgba(0, 0, 0, 0)')

			await page.keyboard.press('Escape')
			await expect(picker).toHaveCount(0)
		}

		// 1. Built-in + Plain CSS
		await page.getByTestId('css-plain').click()
		await page.getByTestId('components-native').click()
		await assertPickerWeekAndDayHover('[data-slot="calendar"]')

		// 2. Built-in + Tailwind
		await page.getByTestId('css-tailwind').click()
		await page.getByTestId('components-native').click()
		await assertPickerWeekAndDayHover('[data-slot="calendar"]')

		// 3. Base UI (shared HeaderDatePickerGrid used by Radix UI, Base UI, MUI)
		await page.getByTestId('components-base-ui').click()
		await assertPickerWeekAndDayHover(
			'[data-testid="base-ui-date-picker-popover"] [data-testid="header-date-picker-grid"]'
		)
	})
})
