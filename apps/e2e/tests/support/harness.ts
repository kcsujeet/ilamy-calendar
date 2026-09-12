import type { Page } from '@playwright/test'

/**
 * The instant every test runs at. Wednesday 12 March 2025, mid-morning UTC:
 * mid-week and mid-month, so "today" sits inside the grid rather than on an
 * edge where an off-by-one would go unnoticed.
 */
export const PINNED_NOW = '2025-03-12T09:00:00.000Z'

/** The zone the browser and the calendar both run in unless a test says otherwise. */
export const DEFAULT_TIMEZONE = 'UTC'

export type ViewName = 'day' | 'week' | 'month' | 'year' | 'agenda'

export interface ScenarioOptions {
	scenario: string
	view: ViewName
	orientation?: 'vertical' | 'horizontal'
	timezone?: string
	/** Overrides the date the calendar opens on. Defaults to the pinned instant. */
	date?: string
	/** Plugins to install, e.g. ['agenda']. A view a plugin adds needs this. */
	plugins?: readonly string[]
	/** Any other calendar setting, passed straight through as a query parameter. */
	settings?: Readonly<Record<string, string | number>>
}

/**
 * Opens a scenario with the clock pinned before the app can read it.
 *
 * `page.clock.install()` must run before any other clock call and before
 * navigation, or the app reads the real time during its first render and the
 * pin arrives too late to matter (https://playwright.dev/docs/clock).
 */
export const gotoScenario = async (
	page: Page,
	options: ScenarioOptions
): Promise<void> => {
	await page.clock.install({ time: new Date(PINNED_NOW) })
	await page.clock.setFixedTime(new Date(PINNED_NOW))

	const params = new URLSearchParams({
		scenario: options.scenario,
		view: options.view,
		tz: options.timezone ?? DEFAULT_TIMEZONE,
		date: options.date ?? PINNED_NOW,
	})
	if (options.orientation) {
		params.set('orientation', options.orientation)
	}
	if (options.plugins?.length) {
		params.set('plugins', options.plugins.join(','))
	}
	for (const [key, value] of Object.entries(options.settings ?? {})) {
		params.set(key, String(value))
	}

	await page.goto(`/?${params.toString()}`)
	await page.getByTestId('ilamy-calendar').waitFor()
}
