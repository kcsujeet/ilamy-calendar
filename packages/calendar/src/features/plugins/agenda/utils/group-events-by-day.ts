import type { CalendarEvent } from '@ilamy/calendar'
import { type AgendaEventEntry, buildAgendaViewModel } from '../../../../index'
import {
	startOf,
	wallClockDiff,
	type ZonedDate,
} from '../../../../utils/temporal'

export interface AgendaDayGroupData {
	/** 'YYYY-MM-DD' for the day. */
	key: string
	/** Start-of-day for the group. */
	date: ZonedDate
	/** Events overlapping the day, sorted all-day first then by start. */
	events: CalendarEvent[]
	/** Precomputed agenda entries for each overlapping event. */
	entries: AgendaEventEntry[]
}

export const groupEventsByDay = (
	events: CalendarEvent[],
	range: { start: ZonedDate; end: ZonedDate }
): AgendaDayGroupData[] => {
	const dayCount =
		Math.round(
			wallClockDiff(
				startOf(range.end, 'day'),
				startOf(range.start, 'day'),
				'day'
			)
		) + 1
	if (dayCount <= 0) return []
	const { groups } = buildAgendaViewModel({
		currentDate: range.start,
		events,
		window: dayCount,
		timezone: range.start.timeZoneId,
	})
	return groups.map((group) => ({
		key: group.key,
		date: group.date,
		events: group.entries.map((entry) => entry.event),
		entries: group.entries,
	}))
}
