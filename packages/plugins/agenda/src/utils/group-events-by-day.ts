import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import {
	buildDayIndex,
	dayIndexOf,
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
	const lastIndex = days.length - 1
	const gridStart = dayIndex.dayStarts.at(0)
	if (gridStart === undefined) {
		return []
	}

	// One pass over the events instead of re-scanning them once per day. The
	// membership rules are the agenda's own, not the generic range overlap, so
	// this cannot use `bucketEventsByDay`: all-day events land on every day they
	// span, timed events only on their start day.
	for (const event of events) {
		const { startMs, endMs } = getEventBoundsMs(event)
		if (event.allDay) {
			// Equivalent to `start <= dayEnd && end >= dayStart` per day, so an
			// all-day event whose end precedes its start yields an empty range and
			// is dropped, exactly as the per-day predicate dropped it.
			if (endMs < gridStart || startMs > dayIndex.gridEnd) {
				continue
			}
			const low = Math.max(0, dayIndexOf(dayIndex, startMs))
			const high = Math.min(lastIndex, dayIndexOf(dayIndex, endMs))
			for (let day = low; day <= high; day++) {
				buckets.at(day)?.push(event)
			}
			continue
		}
		if (startMs < gridStart || startMs > dayIndex.gridEnd) {
			continue
		}
		buckets.at(dayIndexOf(dayIndex, startMs))?.push(event)
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
