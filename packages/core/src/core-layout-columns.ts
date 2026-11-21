import {
	add,
	isAfter,
	offsetMinutes,
	startOf,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type { ColumnSpan } from './core-layout-geometry'

export const MS_PER_HOUR = 3_600_000
const MAX_ADJACENT_DAY_STARTS_MS = 36 * MS_PER_HOUR

/** Wall-clock reading as UTC epoch milliseconds (no offset left to shift). */
export const wallClockMs = (date: ZonedDate): number =>
	Date.UTC(
		date.year,
		date.month - 1,
		date.day,
		date.hour,
		date.minute,
		date.second,
		date.millisecond
	)

const partitionPoint = (
	ascending: number[],
	isLeft: (entry: number) => boolean
): number => {
	let low = 0
	let high = ascending.length
	while (low < high) {
		const middle = (low + high) >>> 1
		if (isLeft(ascending.at(middle) ?? Number.NaN)) {
			low = middle + 1
		} else {
			high = middle
		}
	}
	return low
}

/** Index of the first element in `ascending` at or above `value`. */
export const countBelow = (ascending: number[], value: number): number =>
	partitionPoint(ascending, (entry) => entry < value)

/** Index of the first element in `ascending` strictly above `value`. */
export const countAtOrBelow = (ascending: number[], value: number): number =>
	partitionPoint(ascending, (entry) => entry <= value)

export interface ZonedBounds {
	start: ZonedDate
	end: ZonedDate
}

/**
 * Maps an event's zoned `[start, end)` to the indices of `days` it covers, or
 * `null` when it covers none (FullCalendar `DaySeriesModel.sliceRange`, v7.1.1;
 * exclusive `end` per RFC 5545 DTEND).
 */
export const createDayColumnSpanner = (days: ZonedDate[]) => {
	const dayStarts = days.map((day) => startOf(day, 'day').epochMilliseconds)
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
		return startOf(add(day, 1, 'day'), 'day').epochMilliseconds
	})

	return (bounds: ZonedBounds): ColumnSpan | null => {
		const startMs = bounds.start.epochMilliseconds
		const endMs = bounds.end.epochMilliseconds
		const endInstantBeforeEnd = endMs - 1
		const lastInstantMs = Math.max(startMs, endInstantBeforeEnd)

		const startCol = countAtOrBelow(dayEnds, startMs)
		const endCol = countAtOrBelow(dayStarts, lastInstantMs) - 1
		const firstDayStart = dayStarts.at(startCol)
		const firstDayEnd = dayEnds.at(startCol)
		const lastDayEnd = dayEnds.at(endCol)
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

const spansMultipleHours = (
	bounds: ZonedBounds,
	startClock: number,
	endClock: number
): boolean => {
	const sharesOffset = offsetMinutes(bounds.start) === offsetMinutes(bounds.end)
	if (!sharesOffset) {
		const lastHour = startOf(add(bounds.end, -1, 'millisecond'), 'hour')
		return isAfter(lastHour, startOf(bounds.start, 'hour'))
	}
	const startHour = Math.floor(startClock / MS_PER_HOUR)
	const lastHour = Math.floor((endClock - 1) / MS_PER_HOUR)
	return lastHour > startHour
}

const lastUnshadowedDownTo = (
	isShadowedByNext: boolean[],
	from: number,
	floor: number
): number => {
	let column = from
	while (column >= floor && isShadowedByNext.at(column)) {
		column--
	}
	return column
}

const firstUnshadowedUpTo = (
	isShadowedByNext: boolean[],
	from: number,
	ceiling: number
): number => {
	let column = from
	while (column <= ceiling && isShadowedByNext.at(column)) {
		column++
	}
	return column
}

/**
 * Maps an event's zoned `[start, end)` to the indices of hour `columns` it
 * overlaps, or `null` when it overlaps none (FullCalendar v7.1.1
 * `timegrid/DayTimeColsSlicer.ts:7-22`).
 */
export const createHourColumnSpanner = (columns: ZonedDate[]) => {
	const clocks = columns.map(wallClockMs)
	const instants = columns.map((column) => column.epochMilliseconds)
	const isShadowedByNext = instants.map(
		(instant, index) => instant === instants.at(index + 1)
	)
	const firstClock = clocks.at(0)
	const lastClock = clocks.at(-1)

	return (bounds: ZonedBounds): ColumnSpan | null => {
		if (firstClock === undefined || lastClock === undefined) {
			return null
		}
		const startMs = bounds.start.epochMilliseconds
		const endMs = bounds.end.epochMilliseconds
		const startClock = wallClockMs(bounds.start)
		const endClock = wallClockMs(bounds.end)
		const isInstant = endMs === startMs

		const firstOverlapping = countAtOrBelow(clocks, startClock - MS_PER_HOUR)
		let endOfOverlapping = countBelow(clocks, endClock)
		if (isInstant) {
			endOfOverlapping = countAtOrBelow(clocks, startClock)
		}
		if (firstOverlapping >= endOfOverlapping) {
			return null
		}

		const endCol = lastUnshadowedDownTo(
			isShadowedByNext,
			endOfOverlapping - 1,
			firstOverlapping
		)
		const startCol = firstUnshadowedUpTo(
			isShadowedByNext,
			firstOverlapping,
			endCol
		)
		if (startCol > endCol) {
			return null
		}

		return {
			startCol,
			endCol,
			isTruncatedStart: startClock < firstClock,
			isTruncatedEnd: endClock - lastClock > MS_PER_HOUR,
			spansMultipleUnits: spansMultipleHours(bounds, startClock, endClock),
		}
	}
}
