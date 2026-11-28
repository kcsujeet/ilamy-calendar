import { expect, test } from '@playwright/test'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular'] as const
const CSS_MODES = ['plain', 'unstyled', 'stylex'] as const

interface CellMeasurement {
	framework: string
	css: string
	rootTestId: string | null
	hasHeaderTestId: boolean
	unstyledAttr: string | null
	rootRadius: string
	rootBoxShadow: string
	rootBg: string
	headerHeight: number
	buttonHeights: number[]
	headerToBodyGap: number | null
	bodyRadius: string
	overflowX: number
	navChangedTitle: boolean
}

test.describe('QA Protocol Phase 1 matrix baseline & harness parameters', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('unknown framework, css, or components query params fail loudly (Rule 5)', async ({
		page,
	}) => {
		for (const badParam of [
			'framework=ember',
			'css=bootstrap',
			'components=chakra',
		]) {
			await page.goto(`/?${badParam}`)
			await expect(page.getByTestId('harness-error')).toBeVisible()
		}
	})

	test('mounts, renders events, navigates, and respects CSS modes across all 5 frameworks', async ({
		page,
	}, testInfo) => {
		const measurements: CellMeasurement[] = []

		for (const framework of FRAMEWORKS) {
			for (const css of CSS_MODES) {
				const errors: string[] = []
				const onPageError = (err: Error) => errors.push(err.message)
				page.on('pageerror', onPageError)

				await page.goto(
					`/?scenario=basic&view=month&framework=${framework}&css=${css}`
				)

				const header = page.getByTestId('calendar-header')
				await expect(header.first()).toBeVisible()

				// Seed event from basic scenario renders in all frameworks
				await expect(page.getByText('Morning stand-up')).toBeVisible()

				const before = await page.evaluate(() => {
					const headerEl = document.querySelector(
						'[data-testid="calendar-header"]'
					)
					const rootEl =
						document.querySelector('[data-ilamy-root]') ??
						headerEl?.parentElement
					const bodyEl =
						document.querySelector('[data-testid="calendar-body"]') ??
						document.querySelector(
							'[data-testid="ilamy-calendar"] [data-testid^="dom-"][data-testid$="-view"]'
						)
					const buttons = Array.from(headerEl?.querySelectorAll('button') ?? [])
					const buttonHeights = buttons.map((b) =>
						Math.round(b.getBoundingClientRect().height)
					)
					const headerRect = headerEl?.getBoundingClientRect()
					const bodyRect = bodyEl?.getBoundingClientRect()
					const rootStyle = rootEl ? getComputedStyle(rootEl) : null
					const bodyStyle = bodyEl ? getComputedStyle(bodyEl) : null

					return {
						rootTestId: rootEl?.getAttribute('data-testid') ?? null,
						hasHeaderTestId: Boolean(
							document.querySelector('[data-testid="calendar-header"]')
						),
						unstyledAttr:
							rootEl?.getAttribute('data-unstyled') ??
							rootEl
								?.closest('[data-unstyled]')
								?.getAttribute('data-unstyled') ??
							null,
						rootRadius: rootStyle?.borderRadius ?? '',
						rootBoxShadow: rootStyle?.boxShadow ?? '',
						rootBg: rootStyle?.backgroundColor ?? '',
						headerHeight: headerRect ? Math.round(headerRect.height) : 0,
						buttonHeights,
						headerToBodyGap:
							headerRect && bodyRect
								? Math.round(bodyRect.top - headerRect.bottom)
								: null,
						bodyRadius: bodyStyle?.borderRadius ?? '',
						overflowX: document.documentElement.scrollWidth - window.innerWidth,
					}
				})

				if (css === 'unstyled') {
					expect(before.unstyledAttr, `${framework} unstyled attr`).toBe('true')
				}

				const headerBefore = await header.first().textContent()
				await header.first().getByRole('button', { name: /^Next/i }).click()
				await expect
					.poll(() => header.first().textContent(), {
						message: `${framework} (${css}) Next navigation must change header text`,
					})
					.not.toBe(headerBefore)

				const navChangedTitle =
					(await header.first().textContent()) !== headerBefore
				expect(errors, `${framework} (${css}) page errors`).toEqual([])

				measurements.push({
					framework,
					css,
					navChangedTitle,
					...before,
				})
				page.off('pageerror', onPageError)
			}
		}

		await testInfo.attach('phase1-matrix-measurements.json', {
			body: JSON.stringify(measurements, null, 2),
			contentType: 'application/json',
		})
	})
})
