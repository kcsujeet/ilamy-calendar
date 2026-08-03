import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import {
	buildDayIndex,
	collectDaysBetween,
	type DayIndex,
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
 * Day positions an all-day event occupies: every day it spans, clamped to the
 * window.
 *
 * An empty result means no overlap. That is also how a MALFORMED all-day event
 * (end before start) gets dropped, matching the per-day predicate this replaced.
 */
const getAllDayPositions = (
	startMs: number,
	endMs: number,
	dayIndex: DayIndex
): number[] => {
	const span = daySpanOf(dayIndex, startMs, endMs)
	if (!span) {
		return []
	}
	const positions: number[] = []
	for (let dayPosition = span.low; dayPosition <= span.high; dayPosition++) {
		positions.push(dayPosition)
	}
	return positions
}

/**
 * Day position a timed event occupies: its start day only, even when the event
 * crosses midnight. Empty when the start falls outside the window.
 */
const getTimedPositions = (startMs: number, dayIndex: DayIndex): number[] => {
	const startDay = dayIndexOf(dayIndex, startMs)
	return startDay < 0 ? [] : [startDay]
}

/**
 * Day positions an event occupies under the agenda's membership rules.
 *
 * Deliberately NOT delegated wholesale to `bucketEventsByDay`, for two reasons
 * that are easy to miss:
 *
 * - Timed events belong only to their start day, even across midnight, which a
 *   range overlap does not express.
 * - For a malformed all-day event the agenda's two-clause overlap drops it,
 *   whereas `bucketEventsByDay` reproduces the core's three-clause predicate and
 *   places it on both its start and end days.
 *
 * Routing all-day events through the generic helper would therefore change
 * agenda behaviour for malformed input. The day-span calculation itself IS
 * shared, via `daySpanOf`.
 */
const getEventDayPositions = (
	event: CalendarEvent,
	dayIndex: DayIndex
): number[] => {
	const { startMs, endMs } = getEventBoundsMs(event)
	return event.allDay
		? getAllDayPositions(startMs, endMs, dayIndex)
		: getTimedPositions(startMs, dayIndex)
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
	const days = collectDaysBetween(range.start, range.end)
	const dayIndex = buildDayIndex(days)
	const buckets: CalendarEvent[][] = days.map(() => [])

	// One pass over the events instead of re-scanning them once per day. Each
	// event's day positions come from a named rule, so the loop stays flat.
	for (const event of events) {
		for (const dayPosition of getEventDayPositions(event, dayIndex)) {
			buckets.at(dayPosition)?.push(event)
		}
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
