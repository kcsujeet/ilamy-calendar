import {
	type CalendarEvent,
	IlamyCalendar,
	type IlamyPlugin,
	type Resource,
} from '@ilamy/calendar'
import { agendaPlugin } from '@ilamy/calendar-agenda'
import { dragToCreatePlugin } from '@ilamy/calendar-drag-to-create'
import { recurrencePlugin } from '@ilamy/calendar-recurrence'
import type React from 'react'
import { useState } from 'react'
import { ConfigError, readUrlConfig } from './harness-config'
import {
	isScenarioName,
	PINNED_NOW,
	type Scenario,
	scenarios,
	type ViewName,
} from './scenarios'

const VIEWS: readonly ViewName[] = ['day', 'week', 'month', 'year', 'agenda']

/*
 * Plugins are opt-in per URL rather than always on. `agenda` adds a view, and a
 * view that is only present sometimes is exactly the kind of thing that should
 * be stated in the URL rather than assumed: `?view=agenda` without
 * `&plugins=agenda` renders nothing, and the harness says so.
 */
const PLUGINS = {
	agenda: agendaPlugin,
	recurrence: recurrencePlugin,
	'drag-to-create': dragToCreatePlugin,
} as const

type PluginName = keyof typeof PLUGINS

const isPluginName = (value: string): value is PluginName =>
	Object.hasOwn(PLUGINS, value)

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
	const requested = params.get('plugins')
	const pluginNames = requested ? requested.split(',').filter(Boolean) : []
	const unknownPlugin = pluginNames.find((name) => !isPluginName(name))
	if (unknownPlugin !== undefined) {
		return <Problem>Unknown plugin: {unknownPlugin}</Problem>
	}
	const plugins: IlamyPlugin[] = pluginNames
		.filter(isPluginName)
		.map((name) => PLUGINS[name]())

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
		<Harness
			config={calendarConfig}
			date={date}
			height={height}
			orientation={orientation ?? undefined}
			plugins={plugins}
			resources={resources}
			scenario={scenario}
			timezone={timezone}
			view={viewName}
		/>
	)
}

interface HarnessProps {
	config: Omit<ReturnType<typeof readUrlConfig>, 'height'>
	date: string
	height?: string
	orientation?: Orientation
	plugins: IlamyPlugin[]
	resources?: Resource[]
	scenario: Scenario
	timezone: string
	view: ViewName
}

/**
 * Holds the events so mutations stick, and publishes what the calendar reports
 * back as JSON.
 *
 * A drag cannot be asserted from the DOM alone: in the month grid the bars live
 * in an overlay positioned over the cells rather than inside them, so "is this
 * event in Thursday's cell" has no element to ask. Reading the state the
 * calendar hands its consumer is both easier to assert and closer to what a
 * consumer actually depends on.
 */
const Harness: React.FC<HarnessProps> = ({
	config,
	date,
	height,
	orientation,
	plugins,
	resources,
	scenario,
	timezone,
	view,
}) => {
	const [events, setEvents] = useState<CalendarEvent[]>(() => [
		...scenario.events,
	])

	const handleUpdate = (updated: CalendarEvent) => {
		setEvents((current) =>
			current.map((event) => (event.id === updated.id ? updated : event))
		)
	}

	const published = events.map((event) => ({
		id: event.id,
		title: event.title,
		start: event.start.toISOString(),
		end: event.end.toISOString(),
		resourceId: event.resourceId ?? null,
	}))

	return (
		<div
			data-testid="harness"
			style={{ height: height ?? '100vh', width: '100vw' }}
		>
			<IlamyCalendar
				{...config}
				events={events}
				initialDate={date}
				initialView={view}
				onEventUpdate={handleUpdate}
				orientation={orientation}
				plugins={plugins}
				resources={resources}
				timezone={timezone}
			/>
			{/* Read by the specs, invisible to a screenshot. */}
			<script data-testid="event-state" type="application/json">
				{JSON.stringify(published)}
			</script>
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
