import { normalizeEvents } from '@ilamy/core'
import type { CalendarEvent } from '@ilamy/types'
import { useMemo } from 'react'
import type { RangeFetcher } from '@/hooks/calendar-data/use-range-fetcher'
import type { EventsFetcher, IlamyCalendarProps } from '@/types/calendar.types'

const normalizeFetcher =
	(fetcher: EventsFetcher, timezone?: string): RangeFetcher<CalendarEvent> =>
	async (info, options) =>
		normalizeEvents(await fetcher(info, options), timezone)

/**
 * Splits the `events` prop into normalized canonical ISO `CalendarEvent[]` or
 * a normalizing `RangeFetcher`, anchored in `timezone`.
 */
export const useEventsSource = (
	events: IlamyCalendarProps['events'],
	timezone?: string
) => {
	const eventsFetcher = useMemo(() => {
		if (typeof events === 'function') {
			return normalizeFetcher(events, timezone)
		}
		return undefined
	}, [events, timezone])
	const eventsArray = typeof events === 'function' ? undefined : events
	const normalizedEvents = useMemo(
		() => normalizeEvents(eventsArray, timezone),
		[eventsArray, timezone]
	)
	return { normalizedEvents, eventsFetcher }
}
