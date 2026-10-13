import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { countAtOrBelow, countBelow } from './column-search'
import type { ColumnSpan } from './geometry'
import { MS_PER_HOUR, wallClockMs } from './wall-clock'

/**
 * Whether an event's first and last occupied instants (its exclusive end,
 * stepped back) fall in different clock hours. Spanning is a question about
 * BOUNDARIES, not duration: a 09:30-10:15 event spans two hours, a 09:00-10:00
 * one does not.
 *
 * Both are read off the wall clock. That holds while no clock change lies
 * between them (the start and the end share an offset); an event across one
 * asks dayjs, which is exact and rare.
 */
const spansMultipleHours = (
	event: Pick<CalendarEvent, 'start' | 'end'>,
	startClock: number,
	endClock: number
): boolean => {
	const sharesOffset = event.start.utcOffset() === event.end.utcOffset()
	if (!sharesOffset) {
		const lastHour = event.end.subtract(1, 'millisecond').startOf('hour')
		return lastHour.isAfter(event.start.startOf('hour'))
	}
	const startHour = Math.floor(startClock / MS_PER_HOUR)
	const lastHour = Math.floor((endClock - 1) / MS_PER_HOUR)
	return lastHour > startHour
}

/**
 * Reads the columns of an hour axis an event overlaps, or null when it
 * overlaps none (its end is exclusive, so touching a column's start does not
 * count). Each column is measured once here, so placing an event is binary
 * searches over numbers and builds no Dayjs.
 *
 * The columns are looked up rather than counted from the first one: a
 * visible-hours window, or a week of them, leaves gaps between days, and an
 * event outside them must produce no segment instead of landing on an edge
 * column (FullCalendar v7.1.1, `timegrid/DayTimeColsSlicer.ts:7-22`).
 *
 * Offsets are clock time, as everywhere else on this axis (#311). On a day the
 * clocks change two columns can carry the same hour; the later one counts.
 *
 * A column holds the clock range [clock, clock + 1 hour). The columns run in
 * clock order, so those an event overlaps are one run of them: from the first
 * whose hour ends after the event starts, up to the last one starting before
 * it ends (an instant event: at or before it starts).
 */
export const createHourColumnSpanner = (columns: Dayjs[]) => {
	const clocks = columns.map(wallClockMs)
	const instants = columns.map((column) => column.valueOf())
	const isShadowedByNext = instants.map(
		(instant, index) => instant === instants.at(index + 1)
	)
	const firstClock = clocks.at(0)
	const lastClock = clocks.at(-1)

	return (event: Pick<CalendarEvent, 'start' | 'end'>): ColumnSpan | null => {
		if (firstClock === undefined || lastClock === undefined) {
			return null
		}
		const startMs = event.start.valueOf()
		const endMs = event.end.valueOf()
		const startClock = wallClockMs(event.start)
		const endClock = wallClockMs(event.end)
		const isInstant = endMs === startMs

		const firstOverlapping = countAtOrBelow(clocks, startClock - MS_PER_HOUR)
		const endOfOverlapping = isInstant
			? countAtOrBelow(clocks, startClock)
			: countBelow(clocks, endClock)
		if (firstOverlapping >= endOfOverlapping) {
			return null
		}

		// The later of two columns sharing an instant counts, so a shadowed one is
		// skipped from either end. Its twin usually overlaps too, but not always:
		// Havana's missing midnight leaves "00:00" labelled an hour past the
		// 23:00 it shares an instant with, and then nothing is left to draw on.
		let endCol = endOfOverlapping - 1
		while (endCol >= firstOverlapping && isShadowedByNext.at(endCol)) {
			endCol--
		}
		let startCol = firstOverlapping
		while (startCol <= endCol && isShadowedByNext.at(startCol)) {
			startCol++
		}
		if (startCol > endCol) {
			return null
		}

		return {
			startCol,
			endCol,
			isTruncatedStart: startClock < firstClock,
			isTruncatedEnd: endClock - lastClock > MS_PER_HOUR,
			spansMultipleUnits: spansMultipleHours(event, startClock, endClock),
		}
	}
}
