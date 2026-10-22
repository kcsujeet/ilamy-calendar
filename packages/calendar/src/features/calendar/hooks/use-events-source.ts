import type { CalendarEvent } from '@ilamy/types'
import { useMemo } from 'react'
import type { RangeFetcher } from '@/features/calendar/hooks/calendar-data/use-range-fetcher'
import type {
	EventsFetcher,
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import { normalizeEvents } from '@/features/calendar/utils/normalize'

/** The consumer's `events` function, answering in the calendar's own rows. */
const normalizeFetcher =
	(fetcher: EventsFetcher): RangeFetcher<CalendarEvent> =>
	async (info, options) =>
		normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(
			await fetcher(info, options)
		)

/**
 * Splits the `events` prop into the calendar's rows (an array) or its fetcher
 * (a function); the other is undefined.
 */
export const useEventsSource = (events: IlamyCalendarProps['events']) => {
	const eventsFetcher =
		typeof events === 'function' ? normalizeFetcher(events) : undefined
	const eventsArray = typeof events === 'function' ? undefined : events
	// Stable reference while `events` is unchanged. Without this, a fresh array on
	// every render makes CalendarProvider re-sync (use-event-store) and discard
	// in-memory edits (recurring overrides/EXDATEs, drags) on any re-render (#197).
	const normalizedEvents = useMemo(
		() => normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(eventsArray),
		[eventsArray]
	)
	return { normalizedEvents, eventsFetcher }
}
