import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import { overlapsRange } from '@ilamy/utils/helpers'

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
