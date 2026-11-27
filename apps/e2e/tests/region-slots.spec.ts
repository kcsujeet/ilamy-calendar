import { expect, type Page, test } from '@playwright/test'

interface SpikeEventRecord {
	id: string | number
	title: string
	description?: string
	data?: {
		category?: string
		note?: string
	}
}

const readSpikeEvents = async (page: Page): Promise<SpikeEventRecord[]> => {
	const raw = await page.getByTestId('spike-events').textContent()
	return JSON.parse(raw ?? '[]') as SpikeEventRecord[]
}

const activeElementInfo = async (
	page: Page
): Promise<{
	tag: string | null
	testId: string | null
	insideDialog: boolean
	insideCalendarRoot: boolean
	isFocusGuard: boolean
}> =>
	page.evaluate(() => {
		const active = document.activeElement
		const popup = document.querySelector('[data-testid="form-dialog-popup"]')
		const calRoot = document.querySelector('[data-ilamy-root]')
		return {
			tag: active ? active.tagName.toLowerCase() : null,
			testId: active ? active.getAttribute('data-testid') : null,
			insideDialog: Boolean(active && popup?.contains(active)),
			insideCalendarRoot: Boolean(active && calRoot?.contains(active)),
			isFocusGuard: Boolean(
				active &&
				(active.hasAttribute('data-base-ui-focus-guard') ||
					active.hasAttribute('data-floating-ui-focus-guard'))
			),
		}
	})

const VARIANTS = [
	{
		name: 'React 19 + @base-ui/react',
		query: 'react-base-ui',
		expectedTheme: 'base-ui-indigo',
		// Dev harness mounts <StrictMode> (2 initial effect passes); CI runs vite preview (1 pass).
		expectedInitialMounts: process.env.CI ? '1' : '2',
		hasReactContextView: true,
	},
	{
		name: 'Svelte 5 + bits-ui',
		query: 'svelte-bits-ui',
		expectedTheme: 'bits-ui-emerald',
		expectedInitialMounts: '1',
		hasReactContextView: false,
	},
] as const

test.describe('Phase 0 Spike: region slots lifecycle & context across frameworks', () => {
	test('unknown spike fails loudly with harness error', async ({ page }) => {
		await page.goto('/?spike=bogus')
		await expect(page.getByTestId('harness-error')).toContainText(
			'Unknown spike: bogus'
		)
	})

	for (const variant of VARIANTS) {
		test.describe(variant.name, () => {
			test('F1 & F3: region slots preserve mounts, focus, and app/calendar context across real UI and keyboard updates', async ({
				page,
			}) => {
				await page.goto(`/?spike=${variant.query}`)
				await page.getByTestId('custom-header-slot').waitFor()
				await page.getByTestId('spike-event-1').waitFor()

				await expect(page.getByTestId('header-theme')).toHaveText(
					variant.expectedTheme
				)
				await expect(page.getByTestId('header-title')).toHaveText('March 2025')
				await expect(page.getByTestId('header-context-date')).toContainText(
					'2025-03-'
				)
				await expect(page.getByTestId('header-mount-count')).toHaveText(
					variant.expectedInitialMounts
				)
				await expect(page.getByTestId('event-mount-count-1')).toHaveText(
					variant.expectedInitialMounts
				)

				const headerSearch = page.getByTestId('header-search')
				await headerSearch.click()
				await headerSearch.fill('hello')

				// Real UI navigation button click keeps header slot subtree & input value intact
				// (`Initial Event` in March is unmounted outside its month grid).
				await page.getByTestId('header-next').click()
				await expect(page.getByTestId('header-title')).toHaveText('April 2025')
				await expect(page.getByTestId('header-context-date')).toContainText(
					'2025-04-'
				)
				await expect(page.getByTestId('header-mount-count')).toHaveText(
					variant.expectedInitialMounts
				)
				await expect(headerSearch).toHaveValue('hello')

				// Real keyboard navigation while header-search keeps focus
				await headerSearch.focus()
				await expect(headerSearch).toBeFocused()
				await page.keyboard.press('Alt+ArrowRight')

				await expect(page.getByTestId('header-title')).toHaveText('May 2025')
				await expect(page.getByTestId('header-context-date')).toContainText(
					'2025-05-'
				)
				await expect(page.getByTestId('header-mount-count')).toHaveText(
					variant.expectedInitialMounts
				)
				await expect(headerSearch).toHaveValue('hello')
				await expect(headerSearch).toBeFocused()

				// Open the library Dialog inside slots.eventForm
				await page.getByTestId('header-new').click()
				const dialogPopup = page.getByTestId('form-dialog-popup')
				await expect(dialogPopup).toBeVisible()
				await expect(page.getByTestId('form-theme')).toHaveText(
					variant.expectedTheme
				)
				if (variant.hasReactContextView) {
					await expect(page.getByTestId('form-context-view')).toHaveText(
						'month'
					)
				}

				const initialFormMounts = await page
					.getByTestId('form-mount-count')
					.textContent()
				expect(initialFormMounts).toBe(variant.expectedInitialMounts)

				const titleInput = page.getByTestId('form-title-input')
				await titleInput.click()
				await titleInput.fill('Sprint Planning')
				await expect(titleInput).toBeFocused()

				// Trigger a real keyboard calendar update WHILE the library Dialog is open and focused
				await page.keyboard.press('Alt+ArrowRight')

				await expect(page.getByTestId('header-title')).toHaveText('June 2025')
				await expect(dialogPopup).toBeVisible()
				await expect(page.getByTestId('form-mount-count')).toHaveText(
					variant.expectedInitialMounts
				)
				await expect(titleInput).toHaveValue('Sprint Planning')
				await expect(titleInput).toBeFocused()
			})

			test('F2: nested Select & Popover work inside Dialog with proper Escape order, backdrop close, and focus trap', async ({
				page,
			}) => {
				await page.goto(`/?spike=${variant.query}`)
				await page.getByTestId('header-new').click()

				const dialogPopup = page.getByTestId('form-dialog-popup')
				await expect(dialogPopup).toBeVisible()

				// Nested Select inside Dialog
				await page.getByTestId('form-category-trigger').click()
				await page.getByTestId('form-category-urgent').click()
				await expect(page.getByTestId('form-category-value')).toHaveText(
					'urgent'
				)
				await expect(dialogPopup).toBeVisible()

				// Nested Popover inside Dialog: first Escape closes Popover only
				await page.getByTestId('form-note-popover-trigger').click()
				const popoverPopup = page.getByTestId('form-note-popover-popup')
				await expect(popoverPopup).toBeVisible()
				await page.getByTestId('popover-set-note').click()
				await expect(
					page.getByTestId('form-note-popover-trigger')
				).toContainText('pinned')

				await page.keyboard.press('Escape')
				await expect(popoverPopup).toBeHidden()
				await expect(dialogPopup).toBeVisible()

				// Second Escape closes the Dialog
				await page.keyboard.press('Escape')
				await expect(dialogPopup).toBeHidden()

				// Outside click on backdrop closes Dialog
				await page.getByTestId('header-new').click()
				await expect(dialogPopup).toBeVisible()
				await page
					.getByTestId('form-backdrop')
					.click({ position: { x: 10, y: 10 } })
				await expect(dialogPopup).toBeHidden()

				// Focus stays trapped inside the Dialog popup (never escaping into calendar root behind it) across Tab navigation
				await page.getByTestId('header-new').click()
				await expect(dialogPopup).toBeVisible()
				await page.getByTestId('form-title-input').focus()
				for (let step = 0; step < 8; step += 1) {
					await page.keyboard.press('Tab')
					await expect
						.poll(async () => {
							const active = await activeElementInfo(page)
							return !active.insideCalendarRoot && active.insideDialog
						})
						.toBe(true)
				}
			})

			test('F4: custom eventForm creates and updates events including clearing optional fields', async ({
				page,
			}) => {
				await page.goto(`/?spike=${variant.query}`)
				await page.getByTestId('header-new').click()
				await expect(page.getByTestId('form-dialog-popup')).toBeVisible()

				await page.getByTestId('form-title-input').fill('Architecture Sync')
				await page.getByTestId('form-description-input').fill('Preact slots')
				await page.getByTestId('form-category-trigger').click()
				await page.getByTestId('form-category-urgent').click()
				await page.getByTestId('form-save').click()

				await expect(page.getByTestId('form-dialog-popup')).toBeHidden()

				const afterCreate = await readSpikeEvents(page)
				expect(afterCreate).toHaveLength(2)
				const created = afterCreate.find(
					(row) => row.title === 'Architecture Sync'
				)
				expect(created).toBeDefined()
				expect(created?.description).toBe('Preact slots')
				expect(created?.data).toEqual({ category: 'urgent', note: 'none' })

				// Edit the created event and clear optional description
				const createdId = String(created?.id)
				const createdBtn = page.getByTestId(`spike-event-${createdId}`)
				await expect(createdBtn).toContainText('Architecture Sync')
				await createdBtn.click()

				await expect(page.getByTestId('form-dialog-popup')).toBeVisible()
				await expect(page.getByTestId('form-title-input')).toHaveValue(
					'Architecture Sync'
				)
				await expect(page.getByTestId('form-description-input')).toHaveValue(
					'Preact slots'
				)
				await page.getByTestId('form-description-input').fill('')
				await page.getByTestId('form-save').click()
				await expect(page.getByTestId('form-dialog-popup')).toBeHidden()

				const afterEdit = await readSpikeEvents(page)
				expect(afterEdit).toHaveLength(2)
				const updated = afterEdit.find((row) => String(row.id) === createdId)
				expect(updated?.description).toBe('')
				expect(updated?.data?.category).toBe('urgent')
			})
		})
	}
})
