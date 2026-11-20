import type { CalendarEvent } from '@ilamy/calendar'
import {
	add,
	dayKey,
	endOf,
	isSameOrBefore,
	overlapsRange,
	parseDate,
	startOf,
	toEpochMs,
	type ZonedDate,
} from '@ilamy/utils/temporal'

export interface AgendaDayGroupData {
	/** 'YYYY-MM-DD' for the day. */
	key: string
	/** Start-of-day for the group. */
	date: ZonedDate
	/** Events overlapping the day, sorted all-day first then by start. */
	events: CalendarEvent[]
}

interface ParsedAgendaEvent {
	event: CalendarEvent
	start: ZonedDate
	end: ZonedDate
	startMs: number
}

const byAllDayThenStart = (
	a: ParsedAgendaEvent,
	b: ParsedAgendaEvent
): number => {
	const aRank = a.event.allDay ? 0 : 1
	const bRank = b.event.allDay ? 0 : 1
	if (aRank !== bRank) {
		return aRank - bRank
	}
	return a.startMs - b.startMs
}

export const groupEventsByDay = (
	events: CalendarEvent[],
	range: { start: ZonedDate; end: ZonedDate }
): AgendaDayGroupData[] => {
	const zone = range.start.timeZoneId
	const parsedEvents: ParsedAgendaEvent[] = []
	for (const event of events) {
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (start && end) {
			parsedEvents.push({ event, start, end, startMs: toEpochMs(start) })
		}
	}

	const groups: AgendaDayGroupData[] = []
	const lastDay = startOf(range.end, 'day')
	let cursor = startOf(range.start, 'day')

	while (isSameOrBefore(cursor, lastDay, 'day')) {
		const dayStart = startOf(cursor, 'day')
		const dayEnd = endOf(cursor, 'day')
		const dayEvents = parsedEvents
			.filter((entry) => overlapsRange(entry, dayStart, dayEnd))
			.sort(byAllDayThenStart)
			.map((entry) => entry.event)
		if (dayEvents.length > 0) {
			groups.push({
				key: dayKey(cursor),
				date: dayStart,
				events: dayEvents,
			})
		}
		cursor = startOf(add(cursor, 1, 'day'), 'day')
	}
	return groups
}
