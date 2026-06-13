import { useIlamyCalendarContext } from '@ilamy/calendar'

/**
 * Renders the agenda: a chronological, day-grouped list of the windowed events,
 * skipping empty days. Reads the windowed `events` from the public context.
 * (Stub — grouping and rows land in later tasks.)
 */
export const AgendaView = () => {
	const { events } = useIlamyCalendarContext()
	return <div data-testid="agenda-view">{events.length}</div>
}
