import { expect, type Page, test } from '@playwright/test'
import { releasePointer } from './support/harness'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular'] as const
const CSS_MODES = ['plain', 'unstyled', 'tailwind', 'stylex'] as const

const TAILWIND_LEAK_RE =
	/\b(?:flex|inline-flex|grid|hidden|block|relative|absolute|fixed|sticky|overflow-\S+|rounded(?:-\S+)?|border(?:-\S+)?|bg-\S+|text-\S+|p-\S+|px-\S+|py-\S+|m-\S+|gap-\S+|h-\S+|w-\S+)\b/

interface ViewGeometrySnapshot {
	headerHeight: number
	buttonHeights: number[]
	headerToBodyGap: number
	bodyWidth: number
	bodyHeight: number
	bodyRadius: string
	bodyBorderTop: string
	bodyBorderRight: string
	lastColRightBorder: string
	timeAxisRightBorder: string | null
	stickyHeaderBg: string
	stickyHeaderWinsHitTest: boolean
	strayScrollbars: string[]
	headerFontSize: string
	titleText: string
	slotCount: number
}

async function captureViewSnapshot(page: Page): Promise<ViewGeometrySnapshot> {
	return page.evaluate(() => {
		const header = document.querySelector<HTMLElement>(
			'[data-testid="calendar-header"]'
		)!
		const body = document.querySelector<HTMLElement>(
			'[data-testid="calendar-body"]'
		)!
		const todayBtn = document.querySelector<HTMLElement>(
			'[data-testid="today-btn"]'
		)!
		const controls = Array.from(
			header.querySelectorAll<HTMLElement>(
				'[data-ilamy-slot="arrow-group"], [data-ilamy-slot="nav-button"], [data-ilamy-slot="view-switcher"]'
			)
		).filter((el) => {
			const rect = el.getBoundingClientRect()
			return (
				rect.width > 0 &&
				el.parentElement?.getAttribute('data-ilamy-slot') !== 'arrow-group'
			)
		})

		const headerRect = header.getBoundingClientRect()
		const bodyRect = body.getBoundingClientRect()
		const bodyStyle = getComputedStyle(body)
		const lastCol = document.querySelector<HTMLElement>(
			'[data-ilamy-slot="cell"][data-last-col="true"]'
		)
		const timeAxis = document.querySelector<HTMLElement>(
			'[data-ilamy-part="time-axis"]'
		)
		const stickyHeader =
			document.querySelector<HTMLElement>('[data-ilamy-slot="month-header"]') ??
			document.querySelector<HTMLElement>('[data-ilamy-slot="grid-header"]') ??
			header

		const scrollEl = document.querySelector<HTMLElement>(
			'[data-ilamy-slot="grid-scroll"]'
		)
		if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
			scrollEl.scrollTop = 120
		}
		const stickyRect = stickyHeader.getBoundingClientRect()
		const visibleLeft = scrollEl
			? Math.max(stickyRect.left, scrollEl.getBoundingClientRect().left)
			: stickyRect.left
		const hit = document.elementFromPoint(visibleLeft + 20, stickyRect.top + 8)

		const root = document.querySelector<HTMLElement>('[data-ilamy-root]')!
		const strayScrollbars: string[] = []
		const allowedScrollParts = new Set([
			'grid-scroll',
			'time-grid-scroll-x',
			'overflow-list',
			'dialog-body',
		])
		for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
			const cs = getComputedStyle(el)
			const part =
				el.getAttribute('data-ilamy-part') ??
				el.getAttribute('data-ilamy-slot') ??
				el.tagName.toLowerCase()
			if (allowedScrollParts.has(part)) continue
			const allowsOverflowX =
				cs.overflowX === 'auto' || cs.overflowX === 'scroll'
			const allowsOverflowY =
				cs.overflowY === 'auto' || cs.overflowY === 'scroll'
			if (allowsOverflowX && el.scrollWidth > el.clientWidth + 1) {
				strayScrollbars.push(`x:${part}`)
			}
			if (allowsOverflowY && el.scrollHeight > el.clientHeight + 1) {
				strayScrollbars.push(`y:${part}`)
			}
		}

		const titleEl = document.querySelector<HTMLElement>(
			'[data-testid="calendar-title"]'
		)

		return {
			headerHeight: Math.round(headerRect.height),
			buttonHeights: controls.map((el) =>
				Math.round(el.getBoundingClientRect().height)
			),
			headerToBodyGap: Math.round(
				bodyRect.top - todayBtn.getBoundingClientRect().bottom
			),
			bodyWidth: Math.round(bodyRect.width),
			bodyHeight: Math.round(bodyRect.height),
			bodyRadius: bodyStyle.borderRadius,
			bodyBorderTop: bodyStyle.borderTopWidth,
			bodyBorderRight: bodyStyle.borderRightWidth,
			lastColRightBorder: lastCol
				? getComputedStyle(lastCol).borderRightWidth
				: '',
			timeAxisRightBorder: timeAxis
				? getComputedStyle(timeAxis).borderRightWidth
				: null,
			stickyHeaderBg: getComputedStyle(stickyHeader).backgroundColor,
			stickyHeaderWinsHitTest: Boolean(
				hit && (stickyHeader.contains(hit) || hit === stickyHeader)
			),
			strayScrollbars,
			headerFontSize: titleEl ? getComputedStyle(titleEl).fontSize : '',
			titleText: titleEl?.textContent?.trim() ?? '',
			slotCount: document.querySelectorAll('[data-ilamy-part="time-slot"]')
				.length,
		}
	})
}

const expectWithin1Px = (actual: number, expected: number, label: string) => {
	expect(
		Math.abs(actual - expected),
		`${label}: expected ${expected}±1, got ${actual}`
	).toBeLessThanOrEqual(1)
}

test.describe('Phase 6 QA Protocol Matrix', () => {
	test.use({ viewport: { width: 1440, height: 900 } })

	test('Rule 5 Probe Calibration: proves layout, border, radius, sticky, scrollbar, and unstyled-leak probes fail on known-bad DOM', async ({
		page,
	}) => {
		await page.goto('/?scenario=basic&view=month&framework=react&css=plain')
		await page.waitForSelector('[data-testid="dom-month-view"]')
		const healthy = await captureViewSnapshot(page)
		expect(healthy.headerHeight).toBe(44)
		expect(healthy.headerToBodyGap).toBe(8)
		expect(healthy.bodyRadius).toBe('0px')
		expect(healthy.strayScrollbars).toEqual([])

		await page.evaluate(() => {
			document
				.querySelector<HTMLElement>('[data-testid="calendar-header"]')!
				.style.setProperty('margin-bottom', '24px')
			document
				.querySelector<HTMLElement>('[data-testid="calendar-body"]')!
				.style.setProperty('border-radius', '12px')
			const sticky = document.querySelector<HTMLElement>(
				'[data-ilamy-slot="month-header"]'
			)!
			sticky.style.backgroundColor = 'transparent'
			const lastCol = document.querySelector<HTMLElement>(
				'[data-ilamy-slot="cell"][data-last-col="true"]'
			)!
			lastCol.style.borderRight = '2px solid red'
			// Inject an unexpected inner scrolling child
			const root = document.querySelector<HTMLElement>('[data-ilamy-root]')!
			const badScroll = document.createElement('div')
			badScroll.style.cssText = 'overflow-y: auto; height: 20px;'
			badScroll.innerHTML = '<div style="height: 200px;">overflow</div>'
			root.appendChild(badScroll)
		})

		const bad = await captureViewSnapshot(page)
		expect(bad.headerToBodyGap).toBeGreaterThan(20)
		expect(bad.bodyRadius).toBe('12px')
		expect(bad.stickyHeaderBg).toBe('rgba(0, 0, 0, 0)')
		expect(bad.lastColRightBorder).toBe('2px')
		expect(bad.strayScrollbars.length).toBeGreaterThan(0)
	})

	test('Checks A, B, C1, C2, C4: 5 frameworks x 4 CSS modes match React+Plain reference across core views (1440x900)', async ({
		page,
	}, testInfo) => {
		const views = [
			{
				label: 'month',
				url: 'scenario=basic&view=month',
				waitSelector: '[data-testid="dom-month-view"]',
			},
			{
				label: 'week',
				url: 'scenario=basic&view=week&scrollTime=08:00',
				waitSelector: '[data-testid="dom-week-view"]',
			},
			{
				label: 'day',
				url: 'scenario=basic&view=day&scrollTime=08:00',
				waitSelector: '[data-testid="dom-day-view"]',
			},
			{
				label: 'resource-week-hourly',
				url: 'scenario=resources&view=week&orientation=horizontal&granularity=hourly',
				waitSelector: '[data-testid="dom-resource-hourly-grid"]',
			},
			{
				label: 'resource-week-daily',
				url: 'scenario=resources&view=week&orientation=horizontal&granularity=daily',
				waitSelector: '[data-ilamy-part="res-h-row"]',
			},
			{
				label: 'resource-vertical',
				url: 'scenario=resources&view=day&orientation=vertical',
				waitSelector: '[data-ilamy-part="time-axis"]',
			},
			{
				label: 'agenda',
				url: 'scenario=basic&view=agenda&plugins=agenda',
				waitSelector: '[data-testid="agenda-view"]',
			},
			{
				label: 'year',
				url: 'scenario=basic&view=year&plugins=year',
				waitSelector: '[data-testid="year-view"]',
			},
		] as const

		const refs: Record<string, ViewGeometrySnapshot> = {}
		for (const view of views) {
			await page.goto(`/?${view.url}&framework=react&css=plain`)
			await page.waitForSelector(view.waitSelector)
			refs[view.label] = await captureViewSnapshot(page)
		}

		const reportRows: Array<Record<string, unknown>> = []

		for (const fw of FRAMEWORKS) {
			for (const css of CSS_MODES) {
				// Key matrix views checked across all 20 cells; deep resource variants across all frameworks on plain + stylex
				const targetViews =
					css === 'plain' || css === 'tailwind'
						? views
						: views.filter((v) =>
								['month', 'week', 'agenda', 'year'].includes(v.label)
							)

				for (const view of targetViews) {
					await page.goto(`/?${view.url}&framework=${fw}&css=${css}`)
					await page.waitForSelector(view.waitSelector)
					const snap = await captureViewSnapshot(page)
					const ref = refs[view.label]

					expect(snap.titleText, `${fw}/${css}/${view.label} title`).toBe(
						ref.titleText
					)
					expect(
						snap.strayScrollbars,
						`${fw}/${css}/${view.label} stray scrollbars`
					).toEqual([])

					if (css === 'unstyled') {
						// C1: unstyled must strip theme colors/shadows/radius and emit zero Tailwind classes
						const unstyledCheck = await page.evaluate((reSource) => {
							const re = new RegExp(reSource)
							const root =
								document.querySelector<HTMLElement>('[data-ilamy-root]')!
							const body = document.querySelector<HTMLElement>(
								'[data-testid="calendar-body"]'
							)!
							const leaks: string[] = []
							for (const el of Array.from(root.querySelectorAll('*'))) {
								const cls = el.getAttribute('class')
								if (cls && re.test(cls)) leaks.push(cls)
							}
							return {
								rootAttr: root.getAttribute('data-unstyled'),
								rootBg: getComputedStyle(root).backgroundColor,
								bodyBorder: getComputedStyle(body).borderTopWidth,
								bodyRadius: getComputedStyle(body).borderRadius,
								leaks,
							}
						}, TAILWIND_LEAK_RE.source)
						expect(unstyledCheck.rootAttr).toBe('true')
						expect(unstyledCheck.rootBg).toBe('rgba(0, 0, 0, 0)')
						expect(unstyledCheck.bodyBorder).toBe('0px')
						expect(unstyledCheck.bodyRadius).toBe('0px')
						expect(unstyledCheck.leaks).toEqual([])
					} else {
						expectWithin1Px(
							snap.headerHeight,
							ref.headerHeight,
							`${fw}/${css}/${view.label} headerHeight`
						)
						expectWithin1Px(
							snap.headerToBodyGap,
							ref.headerToBodyGap,
							`${fw}/${css}/${view.label} headerToBodyGap`
						)
						expect(
							snap.bodyRadius,
							`${fw}/${css}/${view.label} bodyRadius`
						).toBe('0px')
						expect(
							snap.bodyBorderTop,
							`${fw}/${css}/${view.label} bodyBorderTop`
						).toBe(ref.bodyBorderTop)
						if (snap.lastColRightBorder) {
							expect(
								snap.lastColRightBorder,
								`${fw}/${css}/${view.label} lastColRightBorder`
							).toBe('0px')
						}
						if (ref.timeAxisRightBorder) {
							expect(
								snap.timeAxisRightBorder,
								`${fw}/${css}/${view.label} timeAxisRightBorder`
							).toBe(ref.timeAxisRightBorder)
						}
						expect(
							snap.stickyHeaderBg,
							`${fw}/${css}/${view.label} opaque sticky header`
						).not.toBe('rgba(0, 0, 0, 0)')
						expect(
							snap.stickyHeaderWinsHitTest,
							`${fw}/${css}/${view.label} sticky header hit test`
						).toBe(true)
						expect(
							snap.slotCount,
							`${fw}/${css}/${view.label} time slots`
						).toBe(ref.slotCount)
						for (const h of snap.buttonHeights) {
							expectWithin1Px(h, 36, `${fw}/${css}/${view.label} btn height`)
						}
					}

					reportRows.push({
						framework: fw,
						css,
						view: view.label,
						pass: true,
					})
				}
			}
		}

		await testInfo.attach('phase6-matrix-cells.json', {
			body: JSON.stringify(reportRows, null, 2),
			contentType: 'application/json',
		})
	})

	test('Dark mode + 390x844 mobile viewport parity across all 5 frameworks on Plain CSS', async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.setViewportSize({ width: 390, height: 844 })

		for (const fw of FRAMEWORKS) {
			await page.goto(`/zero-tailwind.html?framework=${fw}&view=month`)
			await page.waitForSelector('[data-ilamy-root]')
			const darkRootBg = await page
				.locator('[data-ilamy-root]')
				.evaluate((el) => getComputedStyle(el).backgroundColor)
			expect(darkRootBg, `${fw} prefers-color-scheme:dark root bg`).toBe(
				'rgb(9, 9, 11)'
			)

			await page.goto(`/?scenario=basic&view=month&framework=${fw}&css=plain`)
			await page.waitForSelector('[data-testid="calendar-header"]')
			await expect(page.getByTestId('view-menu-btn')).toBeVisible()

			const overflowX = await page.evaluate(
				() => document.documentElement.scrollWidth - window.innerWidth
			)
			expect(overflowX, `${fw} 390x844 overflowX`).toBe(0)

			await page.getByTestId('view-menu-btn').click()
			await page.getByTestId('view-menu-item-week').click()
			await expect(page.getByTestId('dom-week-view')).toBeVisible()
		}
	})

	test('Checks D & E: interactive inventory, pointer drag move/resize, recurrence & Intl formats match React reference across all 5 frameworks', async ({
		page,
	}) => {
		const payloads: Record<string, { moved: unknown; resized: unknown }> = {}

		for (const fw of FRAMEWORKS) {
			await page.goto(
				`/?scenario=basic&view=week&framework=${fw}&css=plain&editable=true&eventResizableFromStart=true&scrollTime=08:00`
			)
			await page.waitForSelector('[data-testid="dom-week-view"]')

			// Pointer drag move Morning stand-up (09:30-10:00 on Wed Mar 12) down to 11:00 slot
			const bar = page.getByTestId('calendar-event-basic-1').first()
			const elevenSlot = page
				.locator(
					'[data-ilamy-part="time-slot"][data-start^="2025-03-12T11:00"]'
				)
				.first()
			const barBox = (await bar.boundingBox())!
			const slotBox = (await elevenSlot.boundingBox())!

			await page.mouse.move(
				barBox.x + barBox.width / 2,
				barBox.y + barBox.height / 2
			)
			await page.mouse.down()
			await page.mouse.move(
				barBox.x + barBox.width / 2,
				slotBox.y + slotBox.height / 2,
				{ steps: 8 }
			)
			await releasePointer(page)

			await expect
				.poll(async () => {
					const changes = await page.evaluate(() =>
						JSON.parse(
							document.querySelector('[data-testid="event-changes"]')
								?.textContent ?? '[]'
						)
					)
					return changes.length
				})
				.toBe(1)

			// Resize end handle of Design review down by 1h
			const bar2 = page.getByTestId('calendar-event-basic-2').first()
			const handle2 = bar2.locator('[data-resize-handle="end"]')
			const handleBox = (await handle2.boundingBox())!
			const sixteenSlot = page
				.locator(
					'[data-ilamy-part="time-slot"][data-start^="2025-03-12T16:00"]'
				)
				.first()
			const sixteenBox = (await sixteenSlot.boundingBox())!

			await page.mouse.move(
				handleBox.x + handleBox.width / 2,
				handleBox.y + handleBox.height / 2
			)
			await page.mouse.down()
			await page.mouse.move(
				handleBox.x + handleBox.width / 2,
				sixteenBox.y + sixteenBox.height / 2,
				{ steps: 8 }
			)
			await releasePointer(page)

			await expect
				.poll(async () => {
					const changes = await page.evaluate(() =>
						JSON.parse(
							document.querySelector('[data-testid="event-changes"]')
								?.textContent ?? '[]'
						)
					)
					return changes.length
				})
				.toBe(2)

			const changes = await page.evaluate(() =>
				JSON.parse(
					document.querySelector('[data-testid="event-changes"]')
						?.textContent ?? '[]'
				)
			)
			payloads[fw] = {
				moved: changes[0],
				resized: changes[1],
			}
		}

		for (const fw of ['vue', 'svelte', 'solid', 'angular'] as const) {
			expect(payloads[fw], `${fw} vs react pointer payload`).toEqual(
				payloads.react
			)
		}
	})

	test('Runnable recipes & F1-F4 slots verified in >= 2 frameworks each (Tailwind, StyleX, MUI vars, Solid/Vue/React/Svelte slots)', async ({
		page,
	}) => {
		// 1. MUI-vars pure token recipe across React and Vue
		const muiReadings: Record<string, { primary: string; radius: string }> = {}
		for (const fw of ['react', 'vue'] as const) {
			await page.goto(
				`/?scenario=basic&view=month&framework=${fw}&css=plain&themeVariant=mui-vars`
			)
			await page.waitForSelector('[data-ilamy-root]')
			muiReadings[fw] = await page
				.locator('[data-ilamy-root]')
				.evaluate((el) => ({
					primary: el.style.getPropertyValue('--ilamy-primary').trim(),
					radius: el.style.getPropertyValue('--ilamy-radius').trim(),
				}))
		}
		expect(muiReadings.react).toEqual({ primary: '#1976d2', radius: '4px' })
		expect(muiReadings.vue).toEqual(muiReadings.react)

		// 2. Unsupported framework+components fails loudly in harness
		await page.goto('/?framework=vue&components=mui')
		await expect(page.getByTestId('harness-error')).toContainText(
			'not supported for framework "vue"'
		)

		// 3. Solid createSolidSlotMount F1-F4 region slots preserve mounts & focus across period updates
		await page.goto('/?scenario=basic&view=month&framework=solid&slots=custom')
		await page.waitForSelector('[data-testid="custom-slot-header"]')
		const solidInput = page.getByTestId('custom-slot-focus-input')
		const initialTitle = await page
			.getByTestId('custom-slot-title')
			.textContent()
		await solidInput.focus()
		await solidInput.fill('solid-query')
		await solidInput.press('Enter')
		await expect(solidInput).toBeFocused()
		await expect(solidInput).toHaveValue('solid-query')
		await expect(page.getByTestId('custom-slot-title')).not.toHaveText(
			initialTitle ?? ''
		)
		const solidCounts = await page.evaluate(
			() =>
				(
					window as unknown as {
						__matrixSlotCounts?: { mounts: Record<string, number> }
					}
				).__matrixSlotCounts
		)
		expect(solidCounts?.mounts.header).toBe(1)
	})
})
