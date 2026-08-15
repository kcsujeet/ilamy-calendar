import type { CalendarEvent, Dayjs } from '@ilamy/calendar'

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
		// The same three cases the core's `eventOverlapsRange` uses, so the agenda
		// and the grid never disagree: `start` is inclusive, `end` is exclusive
		// (#248). Testing the end alone dropped a zero-duration event, whose start
		// is what places it; testing it loosely listed a one-day event under the
		// following day as well.
		const startsInDay =
			event.start.isSameOrAfter(dayStart) && event.start.isSameOrBefore(dayEnd)
		const endsInDay =
			event.end.isAfter(dayStart) && event.end.isSameOrBefore(dayEnd)
		const spansDay = event.start.isBefore(dayStart) && event.end.isAfter(dayEnd)
		return startsInDay || endsInDay || spansDay
	}
	return (
		event.start.isSameOrAfter(dayStart) && event.start.isSameOrBefore(dayEnd)
	)
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

	while (cursor.isSameOrBefore(lastDay)) {
		const dayStart = cursor.startOf('day')
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
		cursor = cursor.add(1, 'day')
	}
	return groups
}
