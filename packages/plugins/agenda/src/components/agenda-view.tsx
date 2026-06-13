import { useIlamyCalendarContext } from '@ilamy/calendar'
import { type AgendaWindow, windowRange } from '../utils/agenda-window'
import { groupEventsByDay } from '../utils/group-events-by-day'
import { AgendaDayGroup } from './agenda-day-group'

interface AgendaViewProps {
	window: AgendaWindow
}

/**
 * Renders the agenda: a chronological, day-grouped list of the windowed events,
 * skipping empty days. Fetches its own window via `getEventsForDateRange` (like
 * the year view) so it is independent of the active view's range.
 */
export const AgendaView = ({ window }: AgendaViewProps) => {
	const { currentDate, getEventsForDateRange, t, openEventForm, timeFormat } =
		useIlamyCalendarContext()

	const range = windowRange(currentDate, window)
	const events = getEventsForDateRange(range.start, range.end)
	const groups = groupEventsByDay(events, range)

	if (groups.length === 0) {
		return (
			<div
				className="text-muted-foreground p-4 text-sm"
				data-testid="agenda-empty"
			>
				{t('agendaNoEvents')}
			</div>
		)
	}

	return (
		<div className="flex flex-col" data-testid="agenda-view">
			{groups.map((group) => (
				<AgendaDayGroup
					group={group}
					key={group.key}
					onEventClick={openEventForm}
					t={t}
					timeFormat={timeFormat}
				/>
			))}
		</div>
	)
}
