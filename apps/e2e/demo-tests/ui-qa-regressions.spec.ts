import { expect, type Page, test } from '@playwright/test'

const PINNED_NOW = '2026-10-26T10:30:00.000Z'

const openDemo = async (page: Page) => {
	const now = new Date(PINNED_NOW)
	await page.clock.install({ time: now })
	await page.clock.setFixedTime(now)
	await page.goto('/')
	await page.getByTestId('ilamy-calendar').waitFor()
}

const switchView = async (
	page: Page,
	view: 'day' | 'week' | 'month' | 'agenda' | 'year'
) => {
	const calendar = page.getByTestId('ilamy-calendar')
	const btn = calendar.getByTestId(`view-btn-${view}`)
	if (await btn.isVisible()) {
		await btn.click()
	} else {
		await calendar.getByTestId('view-menu-btn').click()
		await page.getByTestId(`view-menu-item-${view}`).click()
	}
}

test.describe('Playground UI/UX QA Regressions', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('toggling renderHour in Day view renders cleanly with zero page errors', async ({
		page,
	}) => {
		const pageErrors: string[] = []
		page.on('pageerror', (err) => pageErrors.push(err.message))

		await openDemo(page)
		await switchView(page, 'day')
		await page.getByTestId('settings-tab-theme').click()

		const toggle = page.getByLabel('Custom hour labels (renderHour)')
		await toggle.check()
		await expect(
			page.locator('[data-ilamy-part="time-axis-hour"] .font-bold').first()
		).toBeVisible()
		await toggle.uncheck()
		await expect(page.getByTestId('dom-day-view')).toBeVisible()

		expect(pageErrors).toEqual([])
	})

	test('renderEvent and custom now indicator render with proper geometry', async ({
		page,
	}) => {
		await openDemo(page)
		await switchView(page, 'day')
		await page.getByTestId('settings-tab-theme').click()

		await page.getByLabel('Custom event renderer (renderEvent)').check()
		const firstEvent = page.locator('[data-ilamy-slot="event-bar"]').first()
		await expect(firstEvent).toBeVisible()
		const radius = await firstEvent
			.locator('> div')
			.first()
			.evaluate((el) => getComputedStyle(el).borderRadius)
		expect(radius).not.toBe('9999px')

		await page.getByLabel('Custom now indicator').check()
		const nowLine = page.getByTestId('current-time-indicator').first()
		await nowLine.scrollIntoViewIfNeeded()
		const nowGeometry = await nowLine.evaluate((el) => {
			const outer = el.getBoundingClientRect()
			const inner = el.querySelector('div')?.getBoundingClientRect()
			return {
				outerWidth: outer.width,
				innerLeftOffset: inner ? Math.abs(inner.left - outer.left) : 0,
				innerWidth: inner ? inner.width : 0,
			}
		})
		expect(nowGeometry.innerLeftOffset).toBeLessThan(8)
		expect(nowGeometry.innerWidth).toBeGreaterThan(nowGeometry.outerWidth * 0.9)
	})

	test('Tailwind mode keeps pastel event fills and centers compact month event labels', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('css-tailwind').click()

		const barMetrics = await page
			.locator('[data-ilamy-slot="event-bar"][data-custom-color="true"]')
			.first()
			.evaluate((el) => {
				const content = el.querySelector(
					'[data-ilamy-part="event-bar-content"]'
				) as HTMLElement | null
				const label = el.querySelector(
					'[data-ilamy-part="event-label"]'
				) as HTMLElement | null
				if (!content || !label) return null
				const contentRect = content.getBoundingClientRect()
				const labelRect = label.getBoundingClientRect()
				return {
					bg: getComputedStyle(el).backgroundColor,
					compact: el.getAttribute('data-compact') === 'true',
					topGap: labelRect.top - contentRect.top,
					bottomGap: contentRect.bottom - labelRect.bottom,
				}
			})

		expect(barMetrics).not.toBeNull()
		expect(barMetrics?.bg).not.toBe('rgb(0, 0, 0)')
		expect(barMetrics?.bg).not.toBe('rgb(24, 24, 27)')
		if (barMetrics) {
			expect(Math.abs(barMetrics.topGap - barMetrics.bottomGap)).toBeLessThan(4)
		}
	})

	test('Plain CSS Create Event color swatches and date popover are unclipped', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('new-event-btn').click()

		const dialogBody = page.locator('[data-ilamy-part="dialog-body"]')
		await expect(dialogBody).toBeVisible()

		const swatchClip = await dialogBody.evaluate((body) => {
			const swatch = body.querySelector(
				'[data-ilamy-part="color-swatch"][data-selected="true"]'
			) as HTMLElement | null
			if (!swatch) return null
			const bodyRect = body.getBoundingClientRect()
			const swatchRect = swatch.getBoundingClientRect()
			return {
				leftClearance: swatchRect.left - bodyRect.left,
			}
		})
		expect(swatchClip).not.toBeNull()
		expect(swatchClip?.leftClearance ?? 0).toBeGreaterThanOrEqual(4)

		await page
			.locator('[data-ilamy-part="dialog"]')
			.getByRole('button', { name: /^Start Date/ })
			.click()
		const popover = page.locator('[data-ilamy-part="popover"]').first()
		await expect(popover).toBeVisible()
		const popBox = await popover.boundingBox()
		expect(popBox).not.toBeNull()
		if (popBox) {
			expect(popBox.width).toBeLessThanOrEqual(320)
			expect(popBox.x).toBeGreaterThanOrEqual(0)
			expect(popBox.x + popBox.width).toBeLessThanOrEqual(1440)
		}
	})

	test('Read-Only preset disables + New button and event editing dialog', async ({
		page,
	}) => {
		await openDemo(page)
		await page.getByTestId('preset-read-only').click()
		await expect(page.getByTestId('new-event-btn')).toHaveCount(0)

		await page.locator('[data-ilamy-slot="event-bar"]').first().click()
		await expect(page.locator('[data-ilamy-part="dialog"][open]')).toHaveCount(
			0
		)
	})

	test('Tablet 900x900 renders cleanly with zero horizontal page overflow', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 900, height: 900 })
		await openDemo(page)

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth - window.innerWidth
		)
		expect(overflow).toBeLessThanOrEqual(0)
	})

	test('Mobile 390x844 Inspector dialog header and Agenda badges do not overlap', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 })
		await openDemo(page)

		await page.getByRole('button', { name: 'Calendar Inspector' }).click()
		const inspectorDialog = page.getByRole('dialog')
		const liveProps = inspectorDialog.getByText('Live props')
		const closeBtn = inspectorDialog.getByRole('button', { name: 'Close' })
		await expect(liveProps).toBeVisible()
		const liveBox = await liveProps.boundingBox()
		const closeBox = await closeBtn.boundingBox()
		expect(liveBox).not.toBeNull()
		expect(closeBox).not.toBeNull()
		if (liveBox && closeBox) {
			expect(liveBox.x + liveBox.width).toBeLessThanOrEqual(closeBox.x + 1)
		}
		await page.keyboard.press('Escape')

		await switchView(page, 'agenda')
		const badgeOverlap = await page.evaluate(() => {
			const rows = Array.from(
				document.querySelectorAll('[data-ilamy-part="agenda-row"]')
			)
			for (const row of rows) {
				const title = row.querySelector('[data-ilamy-part="agenda-title"]')
				const badge = row.querySelector('[data-ilamy-part="agenda-badge"]')
				if (title && badge) {
					const t = title.getBoundingClientRect()
					const b = badge.getBoundingClientRect()
					if (t.right > b.left + 1) {
						return { titleRight: t.right, badgeLeft: b.left }
					}
				}
			}
			return null
		})
		expect(badgeOverlap).toBeNull()
	})
})
