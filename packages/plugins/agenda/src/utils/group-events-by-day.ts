import type { CalendarEvent, Dayjs } from '@ilamy/calendar'

export interface AgendaDayGroupData {
	/** 'YYYY-MM-DD' for the day. */
	key: string
	/** Start-of-day for the group. */
	date: Dayjs
	/** Events overlapping the day, sorted all-day first then by start. */
	events: CalendarEvent[]
}

const overlapsDay = (
	event: CalendarEvent,
	dayStart: Dayjs,
	dayEnd: Dayjs
): boolean =>
	event.start.isSameOrBefore(dayEnd) && event.end.isSameOrAfter(dayStart)

const byAllDayThenStart = (a: CalendarEvent, b: CalendarEvent): number => {
	const aRank = a.allDay ? 0 : 1
	const bRank = b.allDay ? 0 : 1
	if (aRank !== bRank) {
		return aRank - bRank
	}
	return a.start.valueOf() - b.start.valueOf()
}

/**
 * Groups events by calendar day across `range`, dropping empty days. A multi-day
 * event is repeated under each day it overlaps within the window (clamped to it),
 * matching the agenda's per-day scanning model.
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
			.filter((event) => overlapsDay(event, dayStart, dayEnd))
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
