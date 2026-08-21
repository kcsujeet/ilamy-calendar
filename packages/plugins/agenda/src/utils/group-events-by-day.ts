import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import {
	isBetweenInclusive,
	isSameOrBefore,
	overlapsRange,
} from '@ilamy/utils/helpers'

export interface AgendaDayGroupData {
	/** 'YYYY-MM-DD' for the day. */
	key: string
	/** Start-of-day for the group. */
	date: Dayjs
	/** Events overlapping the day, sorted all-day first then by start. */
	events: CalendarEvent[]
}

/**
 * All-day events repeat under each day they span (matching Google's Schedule
 * view); a timed event appears once, under its start day, even if it crosses
 * midnight.
 */
const appearsOnDay = (
	event: CalendarEvent,
	dayStart: Dayjs,
	dayEnd: Dayjs
): boolean => {
	if (event.allDay) {
		// The shared predicate, so the agenda and the grid cannot disagree about
		// which days an event covers. A private copy of it drifted once already
		// (#248), listing a one-day event under two days.
		return overlapsRange(event, dayStart, dayEnd)
	}
	return isBetweenInclusive(event.start, dayStart, dayEnd)
}

const byAllDayThenStart = (a: CalendarEvent, b: CalendarEvent): number => {
	const aRank = a.allDay ? 0 : 1
	const bRank = b.allDay ? 0 : 1
	if (aRank !== bRank) {
		return aRank - bRank
	}
	return a.start.valueOf() - b.start.valueOf()
}

/**
 * Groups events by calendar day across `range`, dropping empty days. All-day
 * events repeat under each day they span (clamped to the window); timed events
 * appear once under their start day. Matches the agenda's per-day scanning model.
 */
export const groupEventsByDay = (
	events: CalendarEvent[],
	range: { start: Dayjs; end: Dayjs }
): AgendaDayGroupData[] => {
	const groups: AgendaDayGroupData[] = []
	const lastDay = range.end.startOf('day')
	let cursor = range.start.startOf('day')

	while (isSameOrBefore(cursor, lastDay)) {
		const dayStart = cursor
		const dayEnd = cursor.endOf('day')
		const dayEvents = events
			.filter((event) => appearsOnDay(event, dayStart, dayEnd))
			.sort(byAllDayThenStart)
		if (dayEvents.length > 0) {
			groups.push({
				key: cursor.format('YYYY-MM-DD'),
				date: dayStart,
				events: dayEvents,
			})
		}
		// `add(1, 'day')` holds the wall clock at 00:00 but carries the previous
		// UTC offset across a DST transition, so the following day arrives an hour
		// away from true local midnight and events in that hour fall into the
		// wrong bucket. Re-normalizing is what keeps the cursor on real midnights.
		cursor = cursor.add(1, 'day').startOf('day')
	}
	return groups
}
