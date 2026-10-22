import { type CalendarEvent, IlamyCalendar } from '@ilamy/calendar'
import { recurrencePlugin } from '@ilamy/calendar/plugins/recurrence'
import {
	Profiler,
	type ProfilerOnRenderCallback,
	useMemo,
	useState,
} from 'react'
import { type Plan, plans } from './plan'
import { buildEvents, buildResources, OPEN_DATE } from './scenarios'

/*
 * Uses only props that exist in v3.2.1 (events, resources, initialView,
 * initialDate, orientation, slotDuration, timezone, plugins, onEventUpdate), so
 * this exact app runs against the baseline build.
 */

const recordCommit: ProfilerOnRenderCallback = (
	_id,
	_phase,
	actualDuration
) => {
	window.__perf.commits += 1
	window.__perf.actualMs += actualDuration
}

export const App = () => {
	const scenarioId = new URLSearchParams(window.location.search).get('s')
	const plan = plans.find((candidate) => candidate.id === scenarioId)
	if (!plan) {
		return <p data-testid="perf-error">Unknown scenario: {scenarioId}</p>
	}
	return <ScenarioCalendar plan={plan} />
}

/** The calendar for one scenario; its own component so its hooks never follow a return. */
const ScenarioCalendar = ({ plan }: { plan: Plan }) => {
	const resources = useMemo(() => buildResources(plan), [plan])
	const [events, setEvents] = useState<CalendarEvent[]>(() => buildEvents(plan))
	const plugins = useMemo(
		() => (plan.plugins?.includes('recurrence') ? [recurrencePlugin()] : []),
		[plan]
	)

	// A consumer that owns its events persists a drop, as the e2e harness does.
	const handleUpdate = (updated: CalendarEvent) => {
		setEvents((current) =>
			current.map((event) => (event.id === updated.id ? updated : event))
		)
	}

	return (
		<div style={{ height: '100vh', width: '100vw' }}>
			<Profiler id="calendar" onRender={recordCommit}>
				<IlamyCalendar
					events={events}
					initialDate={OPEN_DATE}
					initialView={plan.view}
					onEventUpdate={handleUpdate}
					orientation={plan.orientation}
					plugins={plugins}
					resources={resources}
					slotDuration={plan.slotDuration}
					timezone="UTC"
				/>
			</Profiler>
		</div>
	)
}
