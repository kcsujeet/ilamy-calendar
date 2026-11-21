import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

interface AxeScanOptions {
	include?: string
	exclude?: string[]
}

/**
 * Runs an axe-core WCAG 2.0/2.1/2.2 A+AA audit against the current page (or
 * scoped selector) and fails with a compact, actionable summary of any
 * violation found.
 */
export const expectNoAxeViolations = async (
	page: Page,
	options: AxeScanOptions = {}
) => {
	let builder = new AxeBuilder({ page }).withTags(WCAG_AA_TAGS)
	if (options.include) {
		builder = builder.include(options.include)
	}
	for (const selector of options.exclude ?? []) {
		builder = builder.exclude(selector)
	}
	const results = await builder.analyze()
	const summary = results.violations.map((violation) => ({
		id: violation.id,
		impact: violation.impact,
		help: violation.help,
		nodes: violation.nodes.slice(0, 5).map((node) => ({
			target: node.target.join(' '),
			summary: node.failureSummary,
		})),
	}))
	expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
}
