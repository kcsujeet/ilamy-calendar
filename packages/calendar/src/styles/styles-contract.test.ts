import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pkgRoot = resolve(import.meta.dir, '../..')
const baseCss = readFileSync(resolve(pkgRoot, 'dist/styles/base.css'), 'utf8')
const themeCss = readFileSync(resolve(pkgRoot, 'dist/styles/theme.css'), 'utf8')
const combinedCss = readFileSync(resolve(pkgRoot, 'dist/styles.css'), 'utf8')

describe('Layered CSS contract (@ilamy/calendar/styles.css)', () => {
	it('declares cascade layers upfront and never uses !important', () => {
		expect(
			combinedCss.startsWith(
				'@layer theme, base, ilamy.base, ilamy.theme, components, utilities;'
			)
		).toBe(true)
		expect(baseCss).toContain('@layer ilamy.base')
		expect(themeCss).toContain('@layer ilamy.theme')
		expect(combinedCss).not.toContain('!important')
	})

	it('bridges shadcn CSS variables with light/dark fallbacks and no layout-spacing tokens', () => {
		expect(baseCss).toContain('var(--background,')
		expect(baseCss).toContain('var(--foreground,')
		expect(baseCss).toContain('var(--border,')
		expect(baseCss).toContain('var(--primary,')
		expect(baseCss).toContain('var(--radius,')
		expect(baseCss).not.toContain('--ilamy-header-gap')
		expect(baseCss).toContain('@supports (color: light-dark(white, black))')
		expect(baseCss).toContain('@media (prefers-color-scheme: dark)')
	})

	it('includes WCAG scrollbar-color + WebKit fallback inside @supports not (scrollbar-color: auto)', () => {
		expect(baseCss).toContain('scrollbar-width: thin')
		expect(baseCss).toContain('scrollbar-color:')
		expect(baseCss).toContain('@supports not (scrollbar-color: auto)')
		expect(baseCss).toContain('scrollbar-width: auto')
		expect(baseCss).toContain('::-webkit-scrollbar')
	})

	it('gates visual theme rules on :not([data-unstyled]) and avoids double outer borders', () => {
		expect(themeCss).toContain(":not([data-unstyled='true'])")
		expect(themeCss).toContain(':not(:last-child)')
		expect(themeCss).toContain('[data-ilamy-today-badge]')
		expect(themeCss).toMatch(
			/\[data-ilamy-part=['"]col-header-label['"]\]\)\s*\{[^}]*line-height:\s*1\.5rem/
		)

		const selectorHeaders = themeCss
			.split('\n')
			.map((line) => line.trim())
			.filter(
				(line) =>
					line.startsWith(':where(') &&
					line.includes('[data-ilamy-') &&
					!line.includes('[data-unstyled=')
			)
		expect(selectorHeaders).toEqual([])
	})

	it('enforces 24px minimum touch height on +N more buttons and CSS inline-time gap', () => {
		expect(baseCss).toMatch(
			/\[data-ilamy-slot=['"]more-link['"]\]\)\s*\{[^}]*min-height:\s*1\.5rem/
		)
		expect(baseCss).toMatch(
			/\[data-ilamy-part=['"]event-label['"]\]\s*>\s*\[data-ilamy-part=['"]event-time['"]\]\)\s*\{[^}]*margin-inline-end:/
		)
	})
})
