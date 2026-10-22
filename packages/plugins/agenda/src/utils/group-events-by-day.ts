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
 * Every event repeats under each day it covers, timed or all-day: the agenda
 * docs say so (docs/agenda-view.md) and FullCalendar's list view slices each
 * event across its days (ListView.tsx eventRangeToSegs). The shared predicate
 * keeps the end exclusive, so an event ending at midnight is not on the next
 * day, and keeps the agenda and the grid from disagreeing about which days an
 * event covers. A private copy of it drifted once already (#248).
 */
const appearsOnDay = (
	event: CalendarEvent,
	dayStart: Dayjs,
	dayEnd: Dayjs
): boolean => overlapsRange(event, dayStart, dayEnd)

const byAllDayThenStart = (a: CalendarEvent, b: CalendarEvent): number => {
	const aRank = a.allDay ? 0 : 1
	const bRank = b.allDay ? 0 : 1
	if (aRank !== bRank) {
		return aRank - bRank
	}
	return a.start.valueOf() - b.start.valueOf()
}

/**
 * Groups events by calendar day across `range`, dropping empty days. An event
 * repeats under each day it spans (clamped to the window).
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
