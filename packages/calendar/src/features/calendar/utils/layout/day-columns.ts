import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'

export interface DayColumnSpan {
	startCol: number
	endCol: number
	/** The event starts before its first column (off the grid, or on a hidden day). */
	isTruncatedStart: boolean
	/** The event ends after its last column (off the grid, or on a hidden day). */
	isTruncatedEnd: boolean
}

/**
 * The columns of a day grid an event covers, or null when it covers none.
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
 */
export const getDayColumnSpan = (
	event: Pick<CalendarEvent, 'start' | 'end'>,
	days: Dayjs[]
): DayColumnSpan | null => {
	const firstDay = event.start.startOf('day').valueOf()
	const lastInstant = event.end.subtract(1, 'millisecond')
	const lastDay = Math.max(firstDay, lastInstant.startOf('day').valueOf())
	const columnDays = days.map((day) => day.startOf('day').valueOf())

	const startCol = columnDays.findIndex((columnDay) => columnDay >= firstDay)
	const endCol = columnDays.findLastIndex((columnDay) => columnDay <= lastDay)
	const firstColumnDay = columnDays.at(startCol)
	const lastColumnDay = columnDays.at(endCol)
	const hasColumns =
		startCol !== -1 &&
		endCol !== -1 &&
		startCol <= endCol &&
		firstColumnDay !== undefined &&
		lastColumnDay !== undefined
	if (!hasColumns) {
		return null
	}

	return {
		startCol,
		endCol,
		isTruncatedStart: firstColumnDay > firstDay,
		isTruncatedEnd: lastColumnDay < lastDay,
	}
}
