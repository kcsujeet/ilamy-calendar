import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { createDayColumnSpanner } from './day-columns'
import type { ColumnSpan, HorizontalPositionedEvent } from './geometry'
import { createHourColumnSpanner } from './hour-columns'
import { MS_PER_HOUR } from './wall-clock'

interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

// --- Phase 1: cluster (sort) -------------------------------------------------

interface SpannedEvent {
	event: CalendarEvent
	span: ColumnSpan
}

/** By start, then longer events first. */
const sortByStartAndDuration = (spanned: SpannedEvent[]): SpannedEvent[] =>
	spanned.toSorted((a, b) => {
		const startDiff = a.event.start.valueOf() - b.event.start.valueOf()
		if (startDiff !== 0) {
			return startDiff
		}
		const aLength = a.event.end.valueOf() - a.event.start.valueOf()
		const bLength = b.event.end.valueOf() - b.event.start.valueOf()
		return bLength - aLength
	})

/** Single-unit: by start time. */
const sortSingleUnit = (spanned: SpannedEvent[]): SpannedEvent[] =>
	spanned.toSorted((a, b) => a.event.start.valueOf() - b.event.start.valueOf())

// --- Phase 2: geometry ------------------------------------------------------

/**
 * Where a bar starts and ends, in columns. A day axis draws whole days, as a
 * month row does. An hour axis draws the event's exact times, as FullCalendar's
 * timeline does (`computeMsSlotCoverage` adds the remainder within a slot):
 * drawing whole hours made a 10:27-12:27 event look three hours long.
 *
 * Each end is measured inside its own column. An event with no length keeps its
 * whole column rather than vanishing.
 */
const computeBarEdges = (
	event: CalendarEvent,
	startCol: number,
	endCol: number,
	columnInstants: number[] | null
): { start: number; end: number } => {
	const wholeColumns = { start: startCol, end: endCol + 1 }
	const startColumnInstant = columnInstants?.at(startCol)
	const endColumnInstant = columnInstants?.at(endCol)
	if (startColumnInstant === undefined || endColumnInstant === undefined) {
		return wholeColumns
	}

	const hoursIntoStartColumn =
		(event.start.valueOf() - startColumnInstant) / MS_PER_HOUR
	const hoursIntoEndColumn =
		(event.end.valueOf() - endColumnInstant) / MS_PER_HOUR
	const startOffset = Math.min(Math.max(hoursIntoStartColumn, 0), 1)
	const endOffset = Math.min(Math.max(hoursIntoEndColumn, 0), 1)
	const start = startCol + startOffset
	const end = endCol + endOffset

	const hasLength = end > start
	return hasLength ? { start, end } : wholeColumns
}

// --- Phase 3: place (occupancy grid) ----------------------------------------

type OccupancyGrid = boolean[][]

/** First row where every column from startCol..endCol is free; -1 if none. */
const findAvailableRow = (
	grid: OccupancyGrid,
	startCol: number,
	endCol: number
): number => {
	for (let row = 0; row < grid.length; row++) {
		let canPlace = true
		for (let col = startCol; col <= endCol; col++) {
			if (grid[row][col]) {
				canPlace = false
				break
			}
		}
		if (canPlace) return row
	}
	return -1
}

/** Where a multi-unit bar landed: its row and the column it starts in. */
interface MultiUnitSlot {
	row: number
	startCol: number
	isTruncatedStart: boolean
}

/**
 * Row for a multi-unit span: from its own start if a row is free there, else
 * truncated to start on a later day. Null when no start has a free row.
 */
export const findMultiUnitSlot = (
	grid: OccupancyGrid,
	span: ColumnSpan
): MultiUnitSlot | null => {
	const row = findAvailableRow(grid, span.startCol, span.endCol)
	if (row !== -1) {
		return {
			row,
			startCol: span.startCol,
			isTruncatedStart: span.isTruncatedStart,
		}
	}
	for (let tryStart = span.startCol + 1; tryStart <= span.endCol; tryStart++) {
		const truncatedRow = findAvailableRow(grid, tryStart, span.endCol)
		if (truncatedRow !== -1) {
			return { row: truncatedRow, startCol: tryStart, isTruncatedStart: true }
		}
	}
	return null
}

interface HourRange {
	start: number
	end: number
}

/** Hour rows reserve the same half-open ranges that their bars draw. */
const findHourSlot = (
	rows: HourRange[][],
	{ event, span }: SpannedEvent,
	columnInstants: number[]
): MultiUnitSlot | null => {
	for (let startCol = span.startCol; startCol <= span.endCol; startCol++) {
		const edges = computeBarEdges(event, startCol, span.endCol, columnInstants)
		const row = rows.findIndex((ranges) =>
			ranges.every((range) => {
				const endsBefore = edges.end <= range.start
				const startsAfter = edges.start >= range.end
				return endsBefore || startsAfter
			})
		)
		const hasAvailableRow = row !== -1
		if (hasAvailableRow) {
			const startsLater = startCol > span.startCol
			const isTruncatedStart = span.isTruncatedStart || startsLater
			return { row, startCol, isTruncatedStart }
		}
	}
	return null
}

interface PlaceArgs {
	row: number
	startCol: number
	endCol: number
	event: CalendarEvent
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

export const layoutHorizontal = ({
	days,
	events,
	dayMaxEvents,
	gridType = 'day',
}: HorizontalLayoutInput): HorizontalPositionedEvent[] => {
	if (days.length === 0) return []

	const unitCount = days.length
	// Both axes read their columns off `days` rather than counting from the
	// first one: a hidden day or a visible-hours window leaves gaps, and counting
	// would put every bar past a gap in the wrong column.
	const isHourAxis = gridType === 'hour'
	const spanOf = isHourAxis
		? createHourColumnSpanner(days)
		: createDayColumnSpanner(days)
	const columnInstants = isHourAxis ? days.map((day) => day.valueOf()) : null

	// An event with no column draws nothing, in either group.
	const spannedEvents = events.flatMap((event) => {
		const span = spanOf(event)
		return span ? [{ event, span }] : []
	})
	// Spanning is a question about BOUNDARIES, not duration: anything shorter than
	// a whole unit used to take the single-column path, so an 18:00-to-06:00 event
	// vanished from its second day. `spansMultipleUnits` compares the start's unit
	// with the last unit the event OCCUPIES (its exclusive end, stepped back).
	const primaryEvents = isHourAxis
		? spannedEvents
		: spannedEvents.filter(({ span }) => span.spansMultipleUnits)
	const sortedPrimaryEvents = sortByStartAndDuration(primaryEvents)
	const singleDayEvents = isHourAxis
		? []
		: spannedEvents.filter(({ span }) => !span.spansMultipleUnits)
	const sortedSingleUnit = sortSingleUnit(singleDayEvents)

	const dayRowCount = isHourAxis ? 0 : dayMaxEvents
	const grid: OccupancyGrid = Array.from({ length: dayRowCount }, () =>
		Array.from({ length: unitCount }, () => false)
	)
	const hourRowCount = isHourAxis ? dayMaxEvents : 0
	const hourRows: HourRange[][] = Array.from({ length: hourRowCount }, () => [])
	const placedEvents: HorizontalPositionedEvent[] = []

	const place = ({
		row,
		startCol,
		endCol,
		event,
		isTruncatedStart,
		isTruncatedEnd,
	}: PlaceArgs) => {
		const edges = computeBarEdges(event, startCol, endCol, columnInstants)
		if (isHourAxis) {
			hourRows[row].push(edges)
		} else {
			for (let col = startCol; col <= endCol; col++) {
				grid[row][col] = true
			}
		}
		const spanUnits = edges.end - edges.start
		placedEvents.push({
			kind: 'horizontal',
			event,
			startCol,
			endCol,
			left: (edges.start / unitCount) * 100,
			width: (spanUnits / unitCount) * 100,
			row,
			isTruncatedStart,
			isTruncatedEnd,
		})
	}

	// Day-spanning events claim rows first; hour events all compete by start time.
	for (const { event, span } of sortedPrimaryEvents) {
		const slot = columnInstants
			? findHourSlot(hourRows, { event, span }, columnInstants)
			: findMultiUnitSlot(grid, span)
		if (!slot) continue
		place({
			row: slot.row,
			startCol: slot.startCol,
			endCol: span.endCol,
			event,
			isTruncatedStart: slot.isTruncatedStart,
			isTruncatedEnd: span.isTruncatedEnd,
		})
	}

	// Single-unit events fill the remaining gaps. The span is already clamped to
	// the grid, so startCol needs no re-clamping here.
	for (const { event, span } of sortedSingleUnit) {
		const col = span.startCol
		const row = findAvailableRow(grid, col, col)
		if (row !== -1) {
			place({
				row,
				startCol: col,
				endCol: col,
				event,
				isTruncatedStart: false,
				isTruncatedEnd: false,
			})
		}
	}

	return placedEvents
}
