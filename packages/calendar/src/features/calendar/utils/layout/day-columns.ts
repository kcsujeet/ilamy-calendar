import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { countAtOrBelow } from './column-search'
import type { ColumnSpan } from './geometry'
import { MS_PER_HOUR } from './wall-clock'

/** Past this, two day starts are not neighbours: a day is 23 to 25 hours long. */
const MAX_ADJACENT_DAY_STARTS_MS = 36 * MS_PER_HOUR

/**
 * Reads the columns of a day grid an event covers, or null when it covers none.
 * Each column's day is measured once here, so placing an event is two binary
 * searches over numbers and builds no Dayjs.
 *
 * `days` holds only the days the grid draws, so hidden days are simply absent
 * and the columns on either side of one are neighbours. An event is clamped to
 * the nearest drawn column, and an end cut that way is truncated. One that
 * lies wholly on hidden days has no column and so draws nothing, as in
 * FullCalendar's `DaySeriesModel.sliceRange` (v7.1.1, `common/DaySeriesModel.ts`
 * lines 60-80).
 *
 * `end` is exclusive (#248), so the last day an event occupies is the one
 * holding the instant before it. A zero-length event occupies its start day.
 *
 * A column's day is the half-open range [dayStart, dayEnd). The first column
 * an event reaches is the first whose day ends after the event starts; the
 * last is the last whose day starts at or before the event's last instant.
 */
export const createDayColumnSpanner = (days: Dayjs[]) => {
	const dayStarts = days.map((day) => day.startOf('day').valueOf())
	// A day ends where the next one starts. Only a column followed by a gap (a
	// hidden day, or the last column) has to ask, and the gap is at least two
	// days, so no real day length (23 to 25 hours) is ever mistaken for one.
	const dayEnds = days.map((day, index) => {
		const thisStart = dayStarts.at(index) ?? 0
		const nextStart = dayStarts.at(index + 1)
		const nextDayStartsRightAfter =
			nextStart !== undefined &&
			nextStart > thisStart &&
			nextStart - thisStart < MAX_ADJACENT_DAY_STARTS_MS
		if (nextDayStartsRightAfter) {
			return nextStart
		}
		return day.add(1, 'day').startOf('day').valueOf()
	})

	return (event: Pick<CalendarEvent, 'start' | 'end'>): ColumnSpan | null => {
		const startMs = event.start.valueOf()
		const endMs = event.end.valueOf()
		const endInstantBeforeEnd = endMs - 1
		const lastInstantMs = Math.max(startMs, endInstantBeforeEnd)

		const startCol = countAtOrBelow(dayEnds, startMs)
		const endCol = countAtOrBelow(dayStarts, lastInstantMs) - 1
		const firstDayStart = dayStarts.at(startCol)
		const lastDayEnd = dayEnds.at(endCol)
		const firstDayEnd = dayEnds.at(startCol)
		const hasColumns =
			startCol <= endCol &&
			firstDayStart !== undefined &&
			firstDayEnd !== undefined &&
			lastDayEnd !== undefined
		if (!hasColumns) {
			return null
		}

		const isTruncatedStart = firstDayStart > startMs
		const isTruncatedEnd = lastDayEnd <= lastInstantMs
		const endsOnLaterDay = endInstantBeforeEnd >= firstDayEnd
		return {
			startCol,
			endCol,
			isTruncatedStart,
			isTruncatedEnd,
			spansMultipleUnits: isTruncatedStart || endsOnLaterDay,
		}
	}
}
