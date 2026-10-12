import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { wallClockDiff } from '@ilamy/utils/helpers'
import { getDayColumnSpan } from './day-columns'
import type { HorizontalPositionedEvent } from './geometry'

interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

interface GridBounds {
	unitCount: number
	gridType: 'day' | 'hour'
	columns: Dayjs[]
}

interface ColumnSpan {
	startCol: number
	endCol: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

// --- Phase 1: cluster (partition + sort) ------------------------------------

/** Splits events into multi-unit and single-unit groups, each placement-sorted. */
const partitionAndSortEvents = (
	events: CalendarEvent[],
	gridType: 'day' | 'hour'
): { sortedMultiUnit: CalendarEvent[]; sortedSingleUnit: CalendarEvent[] } => {
	// Spanning is a question about BOUNDARIES, not duration. Classifying by
	// `end.diff(start, unit) > 0` truncates, so anything shorter than a whole unit
	// took the single-column path: an 18:00-to-06:00 event vanished from its
	// second day, and a 09:30-to-10:15 one from its second hour, even though the
	// span math had them right. Comparing the start's unit with the last unit the
	// event OCCUPIES (its exclusive end, stepped back) asks the real question.
	const spansMultipleUnits = (e: CalendarEvent): boolean =>
		e.end
			.subtract(1, 'millisecond')
			.startOf(gridType)
			.isAfter(e.start.startOf(gridType))

	const multiUnitEvents = events.filter(spansMultipleUnits)
	const singleUnitEvents = events.filter((e) => !spansMultipleUnits(e))

	// Multi-unit: by start date, then longer events first.
	const sortedMultiUnit = [...multiUnitEvents].sort((a, b) => {
		const startDiff = a.start.diff(b.start)
		if (startDiff !== 0) {
			return startDiff
		}
		return b.end.diff(b.start) - a.end.diff(a.start)
	})

	// Single-unit: by start time.
	const sortedSingleUnit = [...singleUnitEvents].sort((a, b) =>
		a.start.diff(b.start)
	)

	return { sortedMultiUnit, sortedSingleUnit }
}

// --- Phase 2: geometry ------------------------------------------------------

/**
 * The columns an event overlaps on an hour axis, or null when it overlaps none
 * (its end is exclusive, so touching a column's start does not count). The
 * columns are looked up rather than counted from the first one: a visible-hours
 * window, or a week of them, leaves gaps between days, and an event outside
 * them must produce no segment instead of landing on an edge column
 * (FullCalendar v7.1.1, `timegrid/DayTimeColsSlicer.ts:7-22`).
 *
 * Offsets are clock time, as everywhere else on this axis (#311). On a day the
 * clocks change two columns can carry the same hour; the later one counts, as
 * it did when columns were counted from the first.
 */
const findHourColumnSpan = (
	event: CalendarEvent,
	columns: Dayjs[]
): ColumnSpan | null => {
	const isInstant = event.end.isSame(event.start)
	const overlappingIndexes = columns.flatMap((column, index) => {
		const nextColumn = columns.at(index + 1)
		const isShadowedByNextColumn = nextColumn?.isSame(column) ?? false
		const hoursIntoColumnAtStart = wallClockDiff(event.start, column, 'hour')
		const hoursIntoColumnAtEnd = wallClockDiff(event.end, column, 'hour')
		const startsInsideColumn =
			hoursIntoColumnAtStart >= 0 && hoursIntoColumnAtStart < 1
		const reachesIntoColumn =
			hoursIntoColumnAtStart < 1 && hoursIntoColumnAtEnd > 0
		const overlaps = isInstant ? startsInsideColumn : reachesIntoColumn
		return overlaps && !isShadowedByNextColumn ? [index] : []
	})
	const startCol = overlappingIndexes.at(0)
	const endCol = overlappingIndexes.at(-1)
	const firstColumn = columns.at(0)
	const lastColumn = columns.at(-1)
	if (
		startCol === undefined ||
		endCol === undefined ||
		!firstColumn ||
		!lastColumn
	) {
		return null
	}
	return {
		startCol,
		endCol,
		isTruncatedStart: wallClockDiff(event.start, firstColumn, 'hour') < 0,
		isTruncatedEnd: wallClockDiff(event.end, lastColumn, 'hour') > 1,
	}
}

/** Column span and truncation of an event, clamped to the grid bounds. */
const computeColumnSpan = (
	event: CalendarEvent,
	{ gridType, columns }: GridBounds
): ColumnSpan | null => {
	// Both axes read their columns off `columns` rather than counting from the
	// first one: a hidden day or a visible-hours window leaves gaps, and counting
	// would put every bar past a gap in the wrong column.
	if (gridType === 'hour') {
		return findHourColumnSpan(event, columns)
	}
	return getDayColumnSpan(event, columns)
}

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
	{ columns, gridType }: { columns: Dayjs[]; gridType: 'day' | 'hour' }
): { start: number; end: number } => {
	const wholeColumns = { start: startCol, end: endCol + 1 }
	const startColumn = columns.at(startCol)
	const endColumn = columns.at(endCol)
	const isDayAxis = gridType === 'day'
	if (isDayAxis || !startColumn || !endColumn) {
		return wholeColumns
	}

	const hoursIntoStartColumn = event.start.diff(startColumn, 'hour', true)
	const hoursIntoEndColumn = event.end.diff(endColumn, 'hour', true)
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

	const bounds: GridBounds = {
		unitCount: days.length,
		gridType,
		columns: days,
	}

	const { sortedMultiUnit, sortedSingleUnit } = partitionAndSortEvents(
		events,
		gridType
	)

	// dayMaxEvents x unitCount occupancy grid.
	const grid: OccupancyGrid = Array.from({ length: dayMaxEvents }, () =>
		Array.from({ length: bounds.unitCount }, () => false)
	)

	const placedEvents: HorizontalPositionedEvent[] = []

	const place = ({
		row,
		startCol,
		endCol,
		event,
		isTruncatedStart,
		isTruncatedEnd,
	}: PlaceArgs) => {
		for (let col = startCol; col <= endCol; col++) {
			grid[row][col] = true
		}
		const edges = computeBarEdges(event, startCol, endCol, {
			columns: days,
			gridType,
		})
		const spanUnits = edges.end - edges.start
		placedEvents.push({
			kind: 'horizontal',
			event,
			left: (edges.start / bounds.unitCount) * 100,
			width: (spanUnits / bounds.unitCount) * 100,
			row,
			isTruncatedStart,
			isTruncatedEnd,
		})
	}

	// Multi-unit events claim rows first.
	for (const event of sortedMultiUnit) {
		const span = computeColumnSpan(event, bounds)
		if (!span) continue

		const slot = findMultiUnitSlot(grid, span)
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

	// Single-unit events fill the remaining gaps. computeColumnSpan already
	// clamps the span to the grid, so startCol needs no re-clamping here.
	for (const event of sortedSingleUnit) {
		const span = computeColumnSpan(event, bounds)
		if (!span) continue
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
