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
		expect(metrics.gridOverflow).toBe('hidden')
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
		// 1. Shadcn CSS variables + unlayered override win cleanly
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

		// 2. data-unstyled="true" disables @layer ilamy.theme chrome while keeping @layer ilamy.base layout
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
})
