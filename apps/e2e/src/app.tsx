import { IlamyCalendar } from '@ilamy/calendar'
import type React from 'react'
import { ConfigError, readUrlConfig } from './harness-config'
import {
	isScenarioName,
	PINNED_NOW,
	type Scenario,
	scenarios,
	type ViewName,
} from './scenarios'

const VIEWS: readonly ViewName[] = ['day', 'week', 'month', 'year', 'agenda']

const isViewName = (value: string): value is ViewName =>
	VIEWS.includes(value as ViewName)

type Orientation = 'vertical' | 'horizontal'

const isOrientation = (value: string): value is Orientation =>
	value === 'vertical' || value === 'horizontal'

/**
 * The harness reads its entire configuration from the URL, so a test — or an
 * agent — reaches any state by navigating rather than by clicking through
 * setup. When setup is clicks, a failure is ambiguous: it could be the setup
 * that broke rather than the thing under test.
 *
 * A scenario supplies the events; every setting is a query parameter. There are
 * far more combinations of settings than anyone would write fixtures for, and
 * this way none have to be written.
 *
 * Unknown values fail loudly. A silent fallback to a default would make a typo
 * look like a passing test of a screen nobody asked for, which is exactly how
 * the view harnesses in #270 went wrong.
 */
export const App = () => {
	const params = new URLSearchParams(window.location.search)

	const scenarioName = params.get('scenario') ?? 'basic'
	const viewName = params.get('view') ?? 'month'
	const orientation = params.get('orientation')
	const timezone = params.get('tz') ?? 'UTC'
	const date = params.get('date') ?? PINNED_NOW

	if (!isScenarioName(scenarioName)) {
		return <Problem>Unknown scenario: {scenarioName}</Problem>
	}
	if (!isViewName(viewName)) {
		return <Problem>Unknown view: {viewName}</Problem>
	}
	if (orientation !== null && !isOrientation(orientation)) {
		return <Problem>Unknown orientation: {orientation}</Problem>
	}

	// Widened from the `as const` literal so optional keys are readable here.
	const scenario: Scenario = scenarios[scenarioName]

	let urlConfig: ReturnType<typeof readUrlConfig>
	try {
		urlConfig = readUrlConfig(params)
	} catch (error) {
		if (error instanceof ConfigError) {
			return <Problem>{error.message}</Problem>
		}
		throw error
	}

	// The URL wins over the scenario's own settings, so a fixture can be pushed
	// into a configuration it was not written for without editing it.
	const { height, ...calendarConfig } = { ...scenario.config, ...urlConfig }
	const resources = scenario.resources ? [...scenario.resources] : undefined

	return (
		<div
			data-testid="harness"
			style={{ height: height ?? '100vh', width: '100vw' }}
		>
			<IlamyCalendar
				{...calendarConfig}
				events={[...scenario.events]}
				initialDate={date}
				initialView={viewName}
				orientation={orientation ?? undefined}
				resources={resources}
				timezone={timezone}
			/>
		</div>
	)
}

/** Renders the mistake rather than a plausible-looking wrong screen. */
const Problem = ({ children }: { children: React.ReactNode }) => (
	<div
		data-testid="harness-error"
		style={{ padding: 16, fontFamily: 'monospace' }}
	>
		{children}
	</div>
)
