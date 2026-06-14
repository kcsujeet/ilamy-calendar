import { useIlamyCalendarContext } from '@ilamy/calendar'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
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
	const { currentDate, getEventsForDateRange, t, firstDayOfWeek } =
		useIlamyCalendarContext()

	const range = windowRange(currentDate, window, firstDayOfWeek)
	const events = getEventsForDateRange(range.start, range.end)
	const groups = groupEventsByDay(events, range)

	// An empty window (common for short windows like a day agenda) centers the
	// message in the available space rather than pinning it to the corner.
	if (groups.length === 0) {
		return (
			<div
				className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm"
				data-testid="agenda-empty"
			>
				{t('agendaNoEvents')}
			</div>
		)
	}

	// A sparse list flows from the top and scrolls when it overflows; the empty
	// space below a short list reads as a normal list (like an inbox), not broken.
	return (
		<ScrollArea className="h-full" data-testid="agenda-view">
			<div className="flex flex-col">
				{groups.map((group) => (
					<AgendaDayGroup group={group} key={group.key} />
				))}
			</div>
		</ScrollArea>
	)
}
