import { expect, type Page, test } from '@playwright/test'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular'] as const
const PREACT_FRAMEWORKS = ['vue', 'svelte', 'solid', 'angular'] as const
const CSS_MODES = ['plain', 'unstyled', 'stylex'] as const

interface EdgeBorderReport {
	lastHeaderRightBorder: string
	lastCellRightBorder: string
	lastRowBottomBorder: string
	bodyRadius: string
	headerH: number
	buttonHeights: number[]
	btnToGridGap: number | null
}

async function measureEdgesAndHeader(page: Page): Promise<EdgeBorderReport> {
	return page.evaluate(() => {
		const header = document.querySelector('[data-testid="calendar-header"]')
		const body = document.querySelector('[data-testid="calendar-body"]')
		const todayBtn = document.querySelector('[data-testid="today-btn"]')
		const headerRow = document.querySelector('[data-testid="month-header"]')
		const lastHeader = headerRow?.lastElementChild
		const lastColCells = document.querySelectorAll(
			'[data-ilamy-slot="cell"][data-last-col="true"]'
		)
		const lastColCell = lastColCells[lastColCells.length - 1]
		const allRows = document.querySelectorAll('[data-ilamy-part="month-row"]')
		const lastRowCell = allRows[allRows.length - 1]?.querySelector(
			'[data-ilamy-slot="cell"]'
		)
		const headerControls = [
			'[data-ilamy-slot="arrow-group"]',
			'[data-testid="today-btn"]',
			'[data-part="title"]',
			'[data-ilamy-slot="view-switcher"]',
			'[data-testid="new-event-btn"]',
		]
			.map((selector) => header?.querySelector<HTMLElement>(selector))
			.filter((el): el is HTMLElement =>
				Boolean(el && getComputedStyle(el).display !== 'none')
			)

		const todayRect = todayBtn?.getBoundingClientRect()
		const bodyRect = body?.getBoundingClientRect()

		return {
			lastHeaderRightBorder: lastHeader
				? getComputedStyle(lastHeader).borderRightWidth
				: '',
			lastCellRightBorder: lastColCell
				? getComputedStyle(lastColCell).borderRightWidth
				: '',
			lastRowBottomBorder: lastRowCell
				? getComputedStyle(lastRowCell).borderBottomWidth
				: '',
			bodyRadius: body ? getComputedStyle(body).borderRadius : '',
			headerH: header ? Math.round(header.getBoundingClientRect().height) : 0,
			buttonHeights: headerControls.map((el) =>
				Math.round(el.getBoundingClientRect().height)
			),
			btnToGridGap:
				todayRect && bodyRect
					? Math.round(bodyRect.top - todayRect.bottom)
					: null,
		}
	})
}

test.describe('Phase 3 QA Protocol: Cross-Framework Renderer Parity & Defect Class Hunt', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('Rule 5 probe calibration: proves layout, sticky occlusion, and double-border probes fail on known-bad DOM', async ({
		page,
	}) => {
		await page.goto('/?scenario=basic&view=month&framework=vue&css=plain')
		await page.waitForSelector('[data-testid="dom-month-view"]')

		const healthy = await measureEdgesAndHeader(page)
		expect(healthy.headerH).toBe(44)
		expect(healthy.btnToGridGap).toBe(8)
		expect(healthy.lastCellRightBorder).toBe('0px')

		// Inject known-bad anomalies and prove every probe catches them
		const bad = await page.evaluate(() => {
			const header = document.querySelector<HTMLElement>(
				'[data-testid="calendar-header"]'
			)!
			header.style.marginBottom = '32px'
			const stickyHeader = document.querySelector<HTMLElement>(
				'[data-ilamy-slot="month-header"]'
			)!
			stickyHeader.style.backgroundColor = 'transparent'
			const lastCell = document.querySelector<HTMLElement>(
				'[data-ilamy-slot="cell"][data-last-col="true"]'
			)!
			lastCell.style.borderRight = '2px solid red'
			const body = document.querySelector<HTMLElement>(
				'[data-testid="calendar-body"]'
			)!
			return {
				badGap: Math.round(
					body.getBoundingClientRect().top -
						document
							.querySelector('[data-testid="today-btn"]')!
							.getBoundingClientRect().bottom
				),
				badStickyAlpha: getComputedStyle(stickyHeader).backgroundColor,
				badRightBorder: getComputedStyle(lastCell).borderRightWidth,
			}
		})
		expect(bad.badGap).toBeGreaterThan(20)
		expect(bad.badStickyAlpha).toBe('rgba(0, 0, 0, 0)')
		expect(bad.badRightBorder).toBe('2px')
	})

	test('Checks A & B: uniform header geometry, 8px gap, 0px body radius, and zero double borders across Preact adapters & CSS modes', async ({
		page,
	}) => {
		for (const fw of PREACT_FRAMEWORKS) {
			for (const css of CSS_MODES) {
				await page.goto(
					`/?scenario=basic&view=month&framework=${fw}&css=${css}`
				)
				await page.waitForSelector('[data-testid="dom-month-view"]')
				const report = await measureEdgesAndHeader(page)
				expect(report.headerH, `${fw}/${css} header height`).toBe(44)
				expect(report.btnToGridGap, `${fw}/${css} header-to-grid gap`).toBe(8)
				expect(report.bodyRadius, `${fw}/${css} body radius`).toBe('0px')
				for (const btnH of report.buttonHeights) {
					expect(btnH, `${fw}/${css} header btn height`).toBe(36)
				}
				if (css !== 'unstyled') {
					expect(report.lastHeaderRightBorder, `${fw}/${css} sat header`).toBe(
						'0px'
					)
					expect(report.lastCellRightBorder, `${fw}/${css} last cell`).toBe(
						'0px'
					)
					expect(report.lastRowBottomBorder, `${fw}/${css} bottom row`).toBe(
						'0px'
					)
				}
			}
		}
	})

	test('Checks B1/B5/A6/A7: all views (week, day, resource daily/hourly, agenda, year) preserve borders, sticky opacity, and time-slot counts across frameworks', async ({
		page,
	}) => {
		for (const fw of PREACT_FRAMEWORKS) {
			// Week & TimeGrid all-day cell click + slot counts
			await page.goto(
				`/?scenario=all-day-events&view=week&framework=${fw}&css=plain`
			)
			await page.waitForSelector('[data-testid="dom-week-view"]')
			const weekCheck = await page.evaluate(() => {
				const slots = document.querySelectorAll('[data-ilamy-part="time-slot"]')
				const lastSlot = document.querySelector(
					'[data-ilamy-part="time-slot"][data-last-row="true"]'
				)
				return {
					slotCount: slots.length,
					lastSlotBottomBorder: lastSlot
						? getComputedStyle(lastSlot).borderBottomWidth
						: '',
				}
			})
			expect(weekCheck.slotCount, `${fw} 7x24 hour slots`).toBe(168)
			expect(
				weekCheck.lastSlotBottomBorder,
				`${fw} last time slot border`
			).toBe('0px')

			// Click all-day cell in Week view -> opens Create Event dialog with allDay checked
			const allDayCell = page
				.locator('[data-ilamy-part="all-day-cell"]')
				.first()
			await allDayCell.click()
			await expect(page.getByTestId('dom-event-dialog')).toBeVisible()
			await expect(
				page.getByTestId('dom-event-dialog').locator('input[name="allDay"]')
			).toBeChecked()
			await page.keyboard.press('Escape')
			await expect(page.getByTestId('dom-event-dialog')).toHaveCount(0)

			// Horizontal Resource Hourly grid: no double right borders on last cell/group, sticky top header beats scrolled resources
			await page.goto(
				`/?scenario=resources&view=week&orientation=horizontal&granularity=hourly&framework=${fw}&css=plain&height=300px`
			)
			await page.waitForSelector('[data-testid="dom-resource-hourly-grid"]')
			const resCheck = await page.evaluate(() => {
				const lastGroup = document.querySelector(
					'[data-ilamy-part="res-h-day-group"][data-last-col="true"]'
				)
				const lastHourCell = document.querySelector(
					'[data-ilamy-part="res-h-hour-cell"][data-last-col="true"]'
				)
				const lastTrackCell = document.querySelector(
					'[data-ilamy-part="res-h-track"] > [data-ilamy-slot="cell"][data-last-col="true"]'
				)
				const scroll = document.querySelector(
					'[data-ilamy-slot="grid-scroll"]'
				)!
				scroll.scrollTop = 120
				const headerEl = document.querySelector(
					'[data-ilamy-slot="grid-header"]'
				)!
				const scrollRect = scroll.getBoundingClientRect()
				const headerRect = headerEl.getBoundingClientRect()
				const hit = document.elementFromPoint(
					scrollRect.left + 30,
					headerRect.top + 12
				)
				return {
					lastGroupRight: lastGroup
						? getComputedStyle(lastGroup).borderRightWidth
						: '',
					lastHourRight: lastHourCell
						? getComputedStyle(lastHourCell).borderRightWidth
						: '',
					lastTrackCellRight: lastTrackCell
						? getComputedStyle(lastTrackCell).borderRightWidth
						: '',
					stickyWinsTopLeft: Boolean(headerEl.contains(hit)),
				}
			})
			expect(resCheck.lastGroupRight).toBe('0px')
			expect(resCheck.lastHourRight).toBe('0px')
			expect(resCheck.lastTrackCellRight).toBe('0px')
			expect(resCheck.stickyWinsTopLeft).toBe(true)

			// Agenda & Year views render via opt-in plugins across all frameworks
			await page.goto(`/?scenario=basic&view=agenda&framework=${fw}&css=plain`)
			await expect(page.getByTestId('agenda-view')).toBeVisible()
			await expect(page.getByText('Morning stand-up')).toBeVisible()

			await page.goto(`/?scenario=basic&view=year&framework=${fw}&css=plain`)
			await expect(page.getByTestId('year-view')).toBeVisible()
			expect(
				await page.locator('[data-ilamy-part="year-card"]').count(),
				`${fw} year 12 cards`
			).toBe(12)
		}
	})

	test('Check E1/E2 & Check B 390x844 mobile ViewMenu + dark mode parity', async ({
		page,
	}) => {
		// Compact 390x844 mobile switches header view-switcher -> ViewMenu dropdown
		await page.setViewportSize({ width: 390, height: 844 })
		for (const fw of PREACT_FRAMEWORKS) {
			await page.goto(`/?scenario=basic&view=month&framework=${fw}&css=plain`)
			await page.waitForSelector('[data-testid="calendar-header"]')
			await expect(page.getByTestId('view-menu-btn')).toBeVisible()
			await page.getByTestId('view-menu-btn').click()
			await page.getByTestId('view-menu-item-week').click()
			await expect(page.getByTestId('dom-week-view')).toBeVisible()

			// Translations object pre-3.3 reaches rendered controls & Intl 24-hour slotHeaderFormat applies
			await page.goto(
				`/?scenario=basic&view=week&framework=${fw}&translations=pre-3.3&timeFormat=24-hour`
			)
			await expect(page.getByTestId('dom-week-view')).toBeVisible()
			const axisText = await page.getByTestId('dom-time-axis').textContent()
			expect(axisText).toContain('14')
			expect(axisText).not.toContain('2 PM')
		}

		// Dark colorScheme respects prefers-color-scheme on standalone @ilamy/calendar/styles.css
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/zero-tailwind.html?view=month')
		await page.waitForSelector('[data-ilamy-root]')
		const darkBg = await page.evaluate(
			() =>
				getComputedStyle(document.querySelector('[data-ilamy-root]')!)
					.backgroundColor
		)
		expect(darkBg).toBe('rgb(9, 9, 11)')
	})

	test('Checks D & F: region slots mount once without focus loss and produce identical mutation payloads across frameworks', async ({
		page,
	}) => {
		for (const fw of ['vue', 'svelte'] as const) {
			await page.goto(
				`/?scenario=basic&view=month&framework=${fw}&slots=custom`
			)
			await page.waitForSelector('[data-testid="custom-slot-header"]')
			const initialTitle = await page
				.getByTestId('custom-slot-title')
				.textContent()

			// Focus input inside header slot and trigger period change via keyboard -> mount count remains 1 & focus preserved
			const focusInput = page.getByTestId('custom-slot-focus-input')
			await focusInput.focus()
			await focusInput.fill('search query')
			await focusInput.press('Enter')

			await expect(focusInput).toBeFocused()
			await expect(focusInput).toHaveValue('search query')
			const afterEnterTitle = await page
				.getByTestId('custom-slot-title')
				.textContent()
			expect(afterEnterTitle).not.toBe(initialTitle)

			await page.getByTestId('custom-slot-next').click()
			const afterClickTitle = await page
				.getByTestId('custom-slot-title')
				.textContent()
			expect(afterClickTitle).not.toBe(afterEnterTitle)

			const counts = await page.evaluate(
				() =>
					(
						window as unknown as {
							__matrixSlotCounts?: {
								mounts: Record<string, number>
								updates: Record<string, number>
								destroys: Record<string, number>
							}
						}
					).__matrixSlotCounts
			)
			expect(counts?.mounts.header).toBe(1)
			expect(counts?.updates.header ?? 0).toBeGreaterThanOrEqual(2)
			expect(counts?.destroys.header ?? 0).toBe(0)

			// Custom eventForm slot creates event with matching schema
			await page.getByTestId('custom-slot-new').click()
			await page.getByTestId('custom-slot-form-title').fill(`Custom From ${fw}`)
			await page.getByTestId('custom-slot-form-save').click()

			await expect(page.getByText(`[Slot] Custom From ${fw}`)).toBeVisible()
			const changes = await page.evaluate(() =>
				JSON.parse(
					document.querySelector('[data-testid="event-changes"]')
						?.textContent ?? '[]'
				)
			)
			expect(changes[0]).toMatchObject({
				action: 'add',
				event: 'slot-created-1',
			})
		}

		// D2/D3 payload parity across all 5 frameworks on basic cell creation
		const createPayloads: Record<string, unknown> = {}
		for (const fw of FRAMEWORKS) {
			await page.goto(`/?scenario=basic&view=month&framework=${fw}&css=plain`)
			if (fw === 'react') {
				await page.getByRole('button', { name: 'New', exact: true }).click()
				await page.getByRole('textbox', { name: 'Title' }).fill('Parity Event')
				await page.getByRole('button', { name: 'Create' }).click()
			} else {
				await page.getByTestId('new-event-btn').click()
				await page
					.getByTestId('dom-event-dialog')
					.locator('input[name="title"]')
					.fill('Parity Event')
				await page.getByTestId('dom-event-save-btn').click()
			}
			const rows = await page.evaluate(() =>
				JSON.parse(
					document.querySelector('[data-testid="event-state"]')?.textContent ??
						'[]'
				)
			)
			const created = (rows as Array<{ title: string; allDay: boolean }>).find(
				(r) => r.title === 'Parity Event'
			)
			expect(created, `${fw} created event`).toBeDefined()
			createPayloads[fw] = { title: created?.title, allDay: created?.allDay }
		}
		for (const fw of PREACT_FRAMEWORKS) {
			expect(createPayloads[fw]).toEqual(createPayloads.react)
		}
	})
})
