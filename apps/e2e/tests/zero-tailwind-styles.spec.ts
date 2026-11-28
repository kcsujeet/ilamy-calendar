import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from '@playwright/test'

const STYLES_CSS = readFileSync(
	resolve(import.meta.dirname, '../../../packages/calendar/dist/styles.css'),
	'utf8'
)

const buildFixtureHtml = (extraAttrs = '', extraStyle = '') => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>${STYLES_CSS}</style>
  <style>
    html, body { margin: 0; padding: 16px; height: 100vh; box-sizing: border-box; }
    .host { height: 420px; width: 960px; }
    ${extraStyle}
  </style>
</head>
<body>
  <div class="host">
    <div data-ilamy-root ${extraAttrs}>
      <header data-ilamy-slot="header">
        <div data-ilamy-slot="nav-group">
          <div data-ilamy-slot="arrow-group">
            <button type="button" data-ilamy-slot="nav-button">&lt;</button>
            <button type="button" data-ilamy-slot="nav-button">&gt;</button>
          </div>
          <button type="button" data-ilamy-slot="nav-button" id="today-btn">Today</button>
          <button type="button" data-ilamy-slot="nav-button" id="title-btn">Nov 2026</button>
        </div>
        <div data-ilamy-slot="actions-group">
          <div data-ilamy-slot="view-switcher" role="group">
            <button type="button" data-ilamy-slot="view-button">Day</button>
            <button type="button" data-ilamy-slot="view-button" data-state="active" id="active-view-btn">Month</button>
          </div>
          <button type="button" data-ilamy-slot="nav-button" data-variant="primary" id="new-btn">+ New</button>
        </div>
      </header>
      <div data-ilamy-slot="grid" id="grid">
        <div data-ilamy-slot="month-header" data-sticky="true">
          <div data-ilamy-slot="day-header">Sun</div>
          <div data-ilamy-slot="day-header">Mon</div>
          <div data-ilamy-slot="day-header" id="last-day-header">Sat</div>
        </div>
        <div data-ilamy-slot="grid-scroll" id="grid-scroll">
          ${Array.from({ length: 6 })
						.map(
							(_, r) => `
            <div data-ilamy-slot="grid-row" style="min-height: 120px;">
              <div data-ilamy-slot="cell">1</div>
              <div data-ilamy-slot="cell" data-today="true" id="today-cell-${r}">
                <span data-ilamy-today-badge>22</span>
              </div>
              <div data-ilamy-slot="cell" class="last-cell">7</div>
            </div>
          `
						)
						.join('')}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

const TAILWIND_UTILITY_RE =
	/\b(?:flex|inline-flex|grid|hidden|block|relative|absolute|fixed|sticky|overflow-\S+|rounded(?:-\S+)?|border(?:-\S+)?|bg-\S+|text-\S+|p-\S+|px-\S+|py-\S+|m-\S+|gap-\S+|h-\S+|w-\S+)\b/

test.describe('Zero-Tailwind standalone @ilamy/calendar/styles.css contract', () => {
	test('renders exact header heights, 8px gap, 1px borders without double edges, and working wheel scroll', async ({
		page,
	}) => {
		await page.setContent(buildFixtureHtml())

		const metrics = await page.evaluate(() => {
			const h = (sel: string) =>
				Math.round(document.querySelector(sel)!.getBoundingClientRect().height)
			const todayBtn = document.querySelector('#today-btn')!
			const grid = document.querySelector('#grid')!
			const scroll = document.querySelector('#grid-scroll')!
			const lastHeader = document.querySelector('#last-day-header')!
			const lastCell = document.querySelector('.last-cell')!
			const todayCell = document.querySelector('#today-cell-0')!

			return {
				arrowGroupH: h('[data-ilamy-slot="arrow-group"]'),
				todayH: h('#today-btn'),
				switcherH: h('[data-ilamy-slot="view-switcher"]'),
				newH: h('#new-btn'),
				btnToGridGap: Math.round(
					grid.getBoundingClientRect().top -
						todayBtn.getBoundingClientRect().bottom
				),
				gridOverflow: getComputedStyle(grid).overflow,
				gridBorder: getComputedStyle(grid).borderRightWidth,
				lastHeaderBorderRight: getComputedStyle(lastHeader).borderRightWidth,
				lastCellBorderRight: getComputedStyle(lastCell).borderRightWidth,
				scrollOverflowY: getComputedStyle(scroll).overflowY,
				todayCellBg: getComputedStyle(todayCell).backgroundColor,
				normalCellBg: getComputedStyle(lastCell).backgroundColor,
			}
		})

		expect(metrics.arrowGroupH).toBe(36)
		expect(metrics.todayH).toBe(36)
		expect(metrics.switcherH).toBe(36)
		expect(metrics.newH).toBe(36)
		expect(metrics.btnToGridGap).toBe(8)
		expect(metrics.gridOverflow).toBe('clip')
		expect(metrics.gridBorder).toBe('1px')
		expect(metrics.lastHeaderBorderRight).toBe('0px')
		expect(metrics.lastCellBorderRight).toBe('0px')
		expect(metrics.scrollOverflowY).toBe('auto')
		expect(metrics.todayCellBg).toBe(metrics.normalCellBg)

		// Real pointer wheel scroll inside grid-scroll
		const box = await page.locator('#grid-scroll').boundingBox()
		expect(box).not.toBeNull()
		if (box) {
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
			await page.mouse.wheel(0, 240)
		}
		await expect
			.poll(() => page.locator('#grid-scroll').evaluate((el) => el.scrollTop))
			.toBeGreaterThan(0)
	})

	test('inherits shadcn CSS variables, allows unlayered overrides without !important, and respects data-unstyled', async ({
		page,
	}) => {
		await page.setContent(
			buildFixtureHtml(
				'',
				`:root { --primary: rgb(124, 58, 237); --background: rgb(250, 250, 255); }
				 #today-btn { border-radius: 999px; }`
			)
		)

		const themed = await page.evaluate(() => ({
			rootBg: getComputedStyle(document.querySelector('[data-ilamy-root]')!)
				.backgroundColor,
			newBtnBg: getComputedStyle(document.querySelector('#new-btn')!)
				.backgroundColor,
			todayBtnRadius: getComputedStyle(document.querySelector('#today-btn')!)
				.borderRadius,
		}))

		expect(themed.rootBg).toBe('rgb(250, 250, 255)')
		expect(themed.newBtnBg).toBe('rgb(124, 58, 237)')
		expect(themed.todayBtnRadius).toBe('999px')

		await page.setContent(buildFixtureHtml('data-unstyled="true"'))
		const unstyled = await page.evaluate(() => ({
			gridBorder: getComputedStyle(document.querySelector('#grid')!)
				.borderTopWidth,
			gridDisplay: getComputedStyle(document.querySelector('#grid')!).display,
			headerDisplay: getComputedStyle(
				document.querySelector('[data-ilamy-slot="header"]')!
			).display,
		}))
		expect(unstyled.gridBorder).toBe('0px')
		expect(unstyled.gridDisplay).toBe('flex')
		expect(unstyled.headerDisplay).toBe('flex')
	})

	test('real mounted @ilamy/calendar/dom renders all views, native dialogs, Escape order, 3-dot resize handles, and sticky occlusion with zero Tailwind CSS', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		await page.goto('/zero-tailwind.html?editable=1&resizableFromStart=1')
		await page.waitForSelector('[data-testid="ilamy-calendar"]')

		// Confirm zero Tailwind stylesheet or utility classes anywhere in calendar DOM
		for (const view of ['month', 'week', 'day', 'year', 'agenda'] as const) {
			await page.getByTestId(`view-btn-${view}`).click()
			const classLeak = await page.evaluate((reSource) => {
				const re = new RegExp(reSource)
				const root = document.querySelector('[data-ilamy-root]')
				if (!root) return ['missing root']
				const leaks: string[] = []
				for (const el of Array.from(root.querySelectorAll('*'))) {
					const cls = el.getAttribute('class')
					if (cls && re.test(cls)) leaks.push(cls)
				}
				return leaks
			}, TAILWIND_UTILITY_RE.source)
			expect(classLeak, `${view} zero-Tailwind class check`).toEqual([])
		}

		// Switch back to month and inspect layout, gaps, opaque sticky header, and dialog flow
		await page.getByTestId('view-btn-month').click()
		const layout = await page.evaluate(() => {
			const header = document.querySelector('[data-testid="calendar-header"]')!
			const grid = document.querySelector('[data-testid="calendar-body"]')!
			const todayBtn = document.querySelector('[data-testid="today-btn"]')!
			const newBtn = document.querySelector('[data-testid="new-event-btn"]')!
			const switcher = document.querySelector(
				'[data-ilamy-slot="view-switcher"]'
			)!
			const scroll = document.querySelector('[data-ilamy-slot="grid-scroll"]')!
			const gridStyle = getComputedStyle(grid)
			return {
				headerH: Math.round(header.getBoundingClientRect().height),
				todayH: Math.round(todayBtn.getBoundingClientRect().height),
				newH: Math.round(newBtn.getBoundingClientRect().height),
				switcherH: Math.round(switcher.getBoundingClientRect().height),
				btnGap: Math.round(
					grid.getBoundingClientRect().top -
						todayBtn.getBoundingClientRect().bottom
				),
				gridRadius: gridStyle.borderRadius,
				gridOverflow: gridStyle.overflow,
				scrollHeight: scroll.scrollHeight,
				clientHeight: scroll.clientHeight,
			}
		})
		expect(layout.headerH).toBe(44)
		expect(layout.todayH).toBe(36)
		expect(layout.newH).toBe(36)
		expect(layout.switcherH).toBe(36)
		expect(layout.btnGap).toBe(8)
		expect(layout.gridRadius).toBe('0px')
		expect(layout.gridOverflow).toBe('clip')

		// Sticky header occlusion in horizontal resources view
		await page.goto(
			'/zero-tailwind.html?view=week&resources=1&granularity=daily&editable=1'
		)
		await page.waitForSelector('[data-ilamy-slot="grid-header"]')
		const stickyHit = await page.evaluate(() => {
			const scroll = document.querySelector('[data-ilamy-slot="grid-scroll"]')!
			scroll.scrollTop = 140
			const headerEl = document.querySelector(
				'[data-ilamy-slot="grid-header"]'
			)!
			const rect = headerEl.getBoundingClientRect()
			const hitLeft = document.elementFromPoint(rect.left + 20, rect.top + 10)
			const hitRight = document.elementFromPoint(rect.left + 240, rect.top + 10)
			return {
				headerBgAlpha: getComputedStyle(headerEl).backgroundColor,
				leftInsideHeader: Boolean(headerEl.contains(hitLeft)),
				rightInsideHeader: Boolean(headerEl.contains(hitRight)),
			}
		})
		expect(stickyHit.headerBgAlpha).not.toBe('rgba(0, 0, 0, 0)')
		expect(stickyHit.leftInsideHeader).toBe(true)
		expect(stickyHit.rightInsideHeader).toBe(true)

		// Click cell -> native dialog -> open start-date popover -> Escape closes ONLY popover -> submit creates event
		await page.goto('/zero-tailwind.html?view=month&editable=1')
		await page.waitForSelector('[data-testid="day-cell-2026-11-20"]')
		await page.getByTestId('day-cell-2026-11-20').click()
		const dialog = page.getByTestId('dom-event-dialog')
		await expect(dialog).toBeVisible()

		await dialog.locator('#start-date').click()
		await expect(page.locator('[data-ilamy-part="popover"]')).toBeVisible()
		await page.keyboard.press('Escape')
		await expect(page.locator('[data-ilamy-part="popover"]')).toHaveCount(0)
		await expect(dialog).toBeVisible()

		await dialog.locator('input[name="title"]').fill('Native Dialog Created')
		await page.getByTestId('dom-event-save-btn').click()
		await expect(dialog).toHaveCount(0)
		await expect(page.getByText('Native Dialog Created')).toBeVisible()

		const recorded = await page.evaluate(
			() =>
				(
					window as unknown as {
						__zeroTwChanges?: Array<{ action: string; title: string }>
					}
				).__zeroTwChanges
		)
		expect(recorded?.some((c) => c.title === 'Native Dialog Created')).toBe(
			true
		)

		// Hover multi-day event end segment reveals VS Code 3-dot resize handle with ew-resize cursor
		const handle = page.getByTestId('resize-handle-end-ztw-span')
		const eventBar = page
			.getByTestId('calendar-event-ztw-span')
			.filter({ has: handle })
		await eventBar.hover()
		await expect
			.poll(async () =>
				handle.evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity))
			)
			.toBeGreaterThan(0)
		const handleCursor = await handle.evaluate(
			(el) => getComputedStyle(el).cursor
		)
		expect(handleCursor).toBe('ew-resize')

		// Unstyled mode strips chrome on agenda/dialogs/cells while keeping grid structure
		await page.goto('/zero-tailwind.html?view=agenda&unstyled=1')
		await page.waitForSelector('[data-testid="agenda-view"]')
		const unstyledCheck = await page.evaluate(() => {
			const root = document.querySelector('[data-ilamy-root]')!
			const dot = document.querySelector('[data-ilamy-part="agenda-dot"]')!
			const grid = document.querySelector('[data-testid="calendar-body"]')!
			return {
				rootBg: getComputedStyle(root).backgroundColor,
				gridBorder: getComputedStyle(grid).borderTopWidth,
				dotBg: getComputedStyle(dot).backgroundColor,
			}
		})
		expect(unstyledCheck.rootBg).toBe('rgba(0, 0, 0, 0)')
		expect(unstyledCheck.gridBorder).toBe('0px')
		expect(unstyledCheck.dotBg).toBe('rgba(0, 0, 0, 0)')

		// Dark mode flips surface & foreground tokens cleanly
		await page.goto('/zero-tailwind.html?view=month&dark=1')
		await page.waitForSelector('[data-testid="dom-month-view"]')
		const darkRoot = await page.evaluate(() => {
			const root = document.querySelector('[data-ilamy-root]')!
			return {
				bg: getComputedStyle(root).backgroundColor,
				color: getComputedStyle(root).color,
			}
		})
		expect(darkRoot.bg).toBe('rgb(9, 9, 11)')
		expect(darkRoot.color).toBe('rgb(250, 250, 250)')
	})

	test('C3: zero-Tailwind standalone @ilamy/calendar/styles.css renders cleanly across all 5 frameworks', async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1280, height: 800 })
		for (const fw of ['react', 'vue', 'svelte', 'solid', 'angular'] as const) {
			await page.goto(`/zero-tailwind.html?framework=${fw}&view=month`)
			await page.waitForSelector('[data-testid="dom-month-view"]')

			const classLeak = await page.evaluate((reSource) => {
				const re = new RegExp(reSource)
				const root = document.querySelector('[data-ilamy-root]')!
				const leaks: string[] = []
				for (const el of Array.from(root.querySelectorAll('*'))) {
					const cls = el.getAttribute('class')
					if (cls && re.test(cls)) leaks.push(cls)
				}
				return leaks
			}, TAILWIND_UTILITY_RE.source)
			expect(classLeak, `${fw} zero-Tailwind class leaks`).toEqual([])

			const metrics = await page.evaluate(() => {
				const body = document.querySelector('[data-testid="calendar-body"]')!
				const header = document.querySelector(
					'[data-testid="calendar-header"]'
				)!
				return {
					headerH: Math.round(header.getBoundingClientRect().height),
					bodyBorderTop: getComputedStyle(body).borderTopWidth,
				}
			})
			expect(metrics.headerH, `${fw} header height without Tailwind`).toBe(44)
			expect(metrics.bodyBorderTop, `${fw} body border without Tailwind`).toBe(
				'1px'
			)
		}
	})
})
