import { expect, test } from '@playwright/test'

test.describe('Theme and cross-framework parity in the live demo', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('header heights, header-to-grid gap, and square grid border match across Tailwind, StyleX, and MUI', async ({
		page,
	}) => {
		await page.goto('/')
		await page.waitForSelector('[data-testid="calendar-header"]')

		for (const theme of ['Tailwind', 'StyleX', 'MUI']) {
			await page.getByRole('button', { name: theme, exact: true }).click()
			await page.waitForSelector('[data-testid="calendar-header"]')

			const metrics = await page.evaluate(() => {
				const header = document.querySelector('[data-testid="calendar-header"]')
				const body = document.querySelector('[data-testid="calendar-body"]')
				const prevBtn = header?.querySelector('button[aria-label="Previous"]')
				const arrowGroup = prevBtn?.parentElement
				const newBtn = header?.querySelector('button[aria-label="New"]')
				const todayBtn = Array.from(
					header?.querySelectorAll('button') ?? []
				).find((b) => b.innerText.trim() === 'Today')
				const group = header?.querySelector(
					'[role="group"], [role="radiogroup"]'
				)
				const bodyStyle = body ? getComputedStyle(body) : null

				const h = (el: Element | null | undefined) =>
					el ? Math.round(el.getBoundingClientRect().height) : null

				const agRect = arrowGroup?.getBoundingClientRect()
				const bodyRect = body?.getBoundingClientRect()

				return {
					headerH: h(header),
					arrowGroupH: h(arrowGroup),
					todayH: h(todayBtn),
					newH: h(newBtn),
					switcherH: h(group),
					btnToGridGap:
						agRect && bodyRect
							? Math.round(bodyRect.top - agRect.bottom)
							: null,
					gridRadius: bodyStyle?.borderRadius,
					gridOverflow: bodyStyle?.overflow,
				}
			})

			expect(metrics.headerH, `${theme} header height`).toBe(48)
			expect(metrics.btnToGridGap, `${theme} header-to-grid gap`).toBe(8)
			expect(metrics.arrowGroupH, `${theme} arrow group height`).toBe(36)
			expect(metrics.todayH, `${theme} Today height`).toBe(36)
			expect(metrics.newH, `${theme} New height`).toBe(36)
			expect(metrics.switcherH, `${theme} ViewSwitcher height`).toBe(36)
			expect(metrics.gridRadius, `${theme} grid border-radius`).toBe('0px')
			expect(metrics.gridOverflow, `${theme} grid overflow`).toBe('hidden')
		}
	})

	test('Resources Week view preserves resource colors and does not shade today cells gray across Tailwind, StyleX, and MUI', async ({
		page,
	}) => {
		await page.goto('/')
		await page.getByRole('button', { name: 'Resources', exact: true }).click()
		await page.waitForSelector('[data-testid="calendar-header"]')

		for (const theme of ['Tailwind', 'StyleX', 'MUI']) {
			await page.getByRole('button', { name: theme, exact: true }).click()
			await page.waitForSelector('[data-testid="calendar-body"]')

			const check = await page.evaluate(() => {
				const firstRes = document.querySelector<HTMLElement>(
					'[data-testid^="horizontal-row-label-"]'
				)
				const cells = Array.from(
					document.querySelectorAll<HTMLElement>('[data-testid^="day-cell-"]')
				)
				const bgs = new Set(
					cells.slice(0, 48).map((c) => getComputedStyle(c).backgroundColor)
				)
				return {
					resourceBg: firstRes
						? getComputedStyle(firstRes).backgroundColor
						: '',
					distinctCellBgs: Array.from(bgs),
				}
			})

			expect(check.resourceBg, `${theme} resource label bg`).not.toBe(
				'rgb(255, 255, 255)'
			)
			expect(check.resourceBg, `${theme} resource label bg`).not.toBe(
				'rgba(0, 0, 0, 0)'
			)
			// Today's cells must not have MUI's disabled-like gray background
			expect(
				check.distinctCellBgs,
				`${theme} cell backgrounds should not include disabled gray`
			).not.toContain('rgba(0, 0, 0, 0.08)')
		}
	})

	test('switching React -> Vue in Resources preserves Hourly week granularity and toggles to Daily', async ({
		page,
	}) => {
		await page.goto('/')
		await page.getByRole('button', { name: 'Resources', exact: true }).click()
		await page.waitForSelector('[data-testid="calendar-header"]')

		// Switch to Vue 3.5 while Week Granularity is Hourly
		await page.getByRole('button', { name: /Vue/ }).click()
		await page.waitForSelector('[data-testid="dom-resource-hourly-grid"]')

		const hourlySlots = await page
			.locator('[data-testid^="dom-resource-hour-slot-"]')
			.count()
		expect(hourlySlots).toBeGreaterThanOrEqual(24)

		// Toggle Week Granularity to Daily -> switches to daily grid
		await page.getByRole('button', { name: 'Daily', exact: true }).click()
		await expect(
			page.locator('[data-testid="dom-resource-hourly-grid"]')
		).toHaveCount(0)
		const dailyCells = await page
			.locator('[data-testid="ilamy-dom-calendar"] [data-testid^="day-cell-"]')
			.count()
		expect(dailyCells).toBeGreaterThanOrEqual(7)

		// Toggle back to Hourly -> returns to hourly grid
		await page.getByRole('button', { name: 'Hourly', exact: true }).click()
		await page.waitForSelector('[data-testid="dom-resource-hourly-grid"]')
	})
})
