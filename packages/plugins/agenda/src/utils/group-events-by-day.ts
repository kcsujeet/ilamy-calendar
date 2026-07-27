import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import {
	buildDayIndex,
	dayIndexOf,
	daySpanOf,
	getEventBoundsMs,
} from '@ilamy/utils/events'

export interface AgendaDayGroupData {
	/** 'YYYY-MM-DD' for the day. */
	key: string
	/** Start-of-day for the group. */
	date: Dayjs
	/** Events overlapping the day, sorted all-day first then by start. */
	events: CalendarEvent[]
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
	const lastDayMs = range.end.startOf('day').valueOf()
	const firstDay = range.start.startOf('day')

	// Collect the window's days first. Compared numerically rather than with
	// `isSameOrBefore`, which would run another `startOf` per iteration — with a
	// timezone configured each of those costs around 81us.
	const days: Dayjs[] = []
	let cursor = firstDay
	while (cursor.valueOf() <= lastDayMs) {
		days.push(cursor)
		cursor = cursor.add(1, 'day')
	}

	const dayIndex = buildDayIndex(days)
	const buckets: CalendarEvent[][] = days.map(() => [])

	// One pass over the events instead of re-scanning them once per day.
	//
	// The day-span calculation itself is shared — `daySpanOf` — but this cannot
	// delegate wholesale to `bucketEventsByDay`, for two reasons that are easy to
	// miss. Timed events belong only to their start day, even across midnight,
	// which the generic overlap does not express. And for a MALFORMED all-day event
	// (end before start) the agenda's two-clause overlap drops it, whereas
	// `bucketEventsByDay` reproduces the core's three-clause predicate and places
	// it on both its start and end days. Routing all-day events through the generic
	// helper would therefore change agenda behaviour for malformed input.
	for (const event of events) {
		const { startMs, endMs } = getEventBoundsMs(event)

		if (event.allDay) {
			// Undefined span means no overlap, which is also how a malformed all-day
			// event gets dropped — matching the per-day predicate this replaced.
			const span = daySpanOf(dayIndex, startMs, endMs)
			if (!span) {
				continue
			}
			for (let day = span.low; day <= span.high; day++) {
				buckets.at(day)?.push(event)
			}
			continue
		}

		// Timed events appear only under their start day, even across midnight.
		const startDay = dayIndexOf(dayIndex, startMs)
		if (startDay < 0) {
			continue
		}
		buckets.at(startDay)?.push(event)
	}

	const groups: AgendaDayGroupData[] = []
	days.forEach((day, dayPosition) => {
		const dayEvents = buckets.at(dayPosition)
		if (dayEvents === undefined || dayEvents.length === 0) {
			return
		}
		// `startOf('day')` is applied only for days that survive, rather than for
		// every day in the window.
		const dayStart = day.startOf('day')
		groups.push({
			key: dayStart.format('YYYY-MM-DD'),
			date: dayStart,
			events: dayEvents.sort(byAllDayThenStart),
		})
	})
	return groups
}
