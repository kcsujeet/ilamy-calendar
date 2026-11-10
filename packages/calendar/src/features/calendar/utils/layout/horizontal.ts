import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { createDayColumnSpanner } from './day-columns'
import type {
	ColumnSpan,
	HorizontalCellLayout,
	HorizontalPositionedEvent,
} from './geometry'
import { createHourColumnSpanner } from './hour-columns'
import { MS_PER_HOUR } from './wall-clock'

interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

interface HorizontalLayoutResult {
	positionedEvents: HorizontalPositionedEvent[]
	columnLayouts: HorizontalCellLayout[]
}

// --- Phase 1: cluster (sort) -------------------------------------------------

interface SpannedEvent {
	event: CalendarEvent
	span: ColumnSpan
}

/**
 * The order events claim rows in: by start, then longer first. On a day axis
 * a day-spanning event goes before every single-day one, so a long bar keeps
 * one row across the days it covers.
 */
const sortForPlacement = (
	spanned: SpannedEvent[],
	isHourAxis: boolean
): SpannedEvent[] =>
	spanned.toSorted((a, b) => {
		const aSpanningRank = isHourAxis || a.span.spansMultipleUnits ? 0 : 1
		const bSpanningRank = isHourAxis || b.span.spansMultipleUnits ? 0 : 1
		const spanningDiff = aSpanningRank - bSpanningRank
		if (spanningDiff !== 0) {
			return spanningDiff
		}
		const startDiff = a.event.start.valueOf() - b.event.start.valueOf()
		if (startDiff !== 0) {
			return startDiff
		}
		const aLength = a.event.end.valueOf() - a.event.start.valueOf()
		const bLength = b.event.end.valueOf() - b.event.start.valueOf()
		return bLength - aLength
	})

// --- Phase 2: geometry ------------------------------------------------------

/** A half-open interval in columns: whole days or fractional hours. */
interface ColumnRange {
	start: number
	end: number
}

/**
 * The shortest bar an hour axis draws, as a share of one column: 24 minutes.
 * A share, not pixels, so it grows and shrinks with the column and the row a
 * bar is packed into is the row it is drawn in at any column width. 0.4 of
 * the narrowest hour column (`w-20`, 80px) is the 32px the CSS minimum it
 * replaces used to give; FullCalendar's timeline has the same idea in pixels
 * (`eventMinWidth`).
 */
const MINIMUM_BAR_COLUMNS = 0.4

/**
 * Where a bar starts and ends, in columns. A day axis draws whole days, as a
 * month row does. An hour axis draws the event's exact times, as FullCalendar's
 * timeline does (`computeMsSlotCoverage` adds the remainder within a slot):
 * drawing whole hours made a 10:27-12:27 event look three hours long.
 *
 * Short bars reserve their minimum displayed length for both packing and
 * drawing. Each end is measured inside its own column; a zero-length event
 * keeps its whole column rather than vanishing.
 */
const computeBarEdges = (
	event: CalendarEvent,
	startCol: number,
	endCol: number,
	columnInstants: number[] | null
): ColumnRange => {
	const wholeColumns = { start: startCol, end: endCol + 1 }
	if (!columnInstants) return wholeColumns
	const startColumnInstant = columnInstants.at(startCol)
	const endColumnInstant = columnInstants.at(endCol)
	if (startColumnInstant === undefined || endColumnInstant === undefined) {
		return wholeColumns
	}

	const msIntoStartColumn = event.start.valueOf() - startColumnInstant
	const msIntoEndColumn = event.end.valueOf() - endColumnInstant
	const startOffset = Math.min(Math.max(msIntoStartColumn, 0), MS_PER_HOUR)
	const endOffset = Math.min(Math.max(msIntoEndColumn, 0), MS_PER_HOUR)
	// Add the minimum before converting to columns so touching edges use the
	// same division, without floating-point addition making them overlap.
	const startMs = startCol * MS_PER_HOUR + startOffset
	const endMs = endCol * MS_PER_HOUR + endOffset
	const hasLength = endMs > startMs
	if (!hasLength) return wholeColumns

	const minimumEndMs = startMs + MINIMUM_BAR_COLUMNS * MS_PER_HOUR
	const gridEndMs = columnInstants.length * MS_PER_HOUR
	const displayedEndMs = Math.min(Math.max(endMs, minimumEndMs), gridEndMs)
	const start = startMs / MS_PER_HOUR
	const end = displayedEndMs / MS_PER_HOUR
	return { start, end }
}

// --- Phase 3: place (shared row ranges) -------------------------------------

const overlaps = (a: ColumnRange, b: ColumnRange): boolean => {
	const startsBeforeEnd = a.start < b.end
	const endsAfterStart = b.start < a.end
	return startsBeforeEnd && endsAfterStart
}

/** First row with no overlapping range; -1 if every row is taken. */
const findFreeRow = (rows: ColumnRange[][], edges: ColumnRange): number =>
	rows.findIndex((row) => {
		const hasOverlap = row.some((taken) => overlaps(taken, edges))
		return !hasOverlap
	})

/** The selected row, visible start column and edges used to reserve it. */
interface RowSlot {
	row: number
	startCol: number
	isTruncatedStart: boolean
	edges: ColumnRange
}

/**
 * Row for an event on either axis: from its own start if a row is free there,
 * else truncated to start on a later column. Null when no start has a free row.
 */
export const findRowSlot = (
	rows: ColumnRange[][],
	{ event, span }: SpannedEvent,
	columnInstants: number[] | null
): RowSlot | null => {
	for (let startCol = span.startCol; startCol <= span.endCol; startCol++) {
		const edges = computeBarEdges(event, startCol, span.endCol, columnInstants)
		const row = findFreeRow(rows, edges)
		const hasAvailableRow = row !== -1
		if (hasAvailableRow) {
			const startsLater = startCol > span.startCol
			const isTruncatedStart = span.isTruncatedStart || startsLater
			return { row, startCol, isTruncatedStart, edges }
		}
	}
	return null
}

// --- Phase 4: what each cell shows -------------------------------------------

/**
 * One layout per column, each listing the events whose span covers it: the
 * same span the bar is placed with, so a cell and the bars over it cannot
 * disagree.
 */
const listEventsPerColumn = (
	columnCount: number,
	spannedEvents: SpannedEvent[]
): HorizontalCellLayout[] => {
	const columnLayouts = Array.from(
		{ length: columnCount },
		(): HorizontalCellLayout => ({ events: [], rowCount: 0, hiddenCount: 0 })
	)
	for (const { event, span } of spannedEvents) {
		for (let col = span.startCol; col <= span.endCol; col++) {
			columnLayouts.at(col)?.events.push(event)
		}
	}
	return columnLayouts
}

/** Counts an event as hidden in each column from `fromCol` up to, not including, `beforeCol`. */
const countHiddenIn = (
	columnLayouts: HorizontalCellLayout[],
	fromCol: number,
	beforeCol: number
) => {
	for (let col = fromCol; col < beforeCol; col++) {
		const cell = columnLayouts.at(col)
		if (cell) cell.hiddenCount += 1
	}
}

/**
 * Reserves a bar's row in every column it is drawn over. A bar widened to the
 * minimum can reach into the next column, which then needs the row's height
 * though the event is not in its cell.
 */
const reserveRowUnder = (
	columnLayouts: HorizontalCellLayout[],
	edges: ColumnRange,
	row: number
) => {
	const requiredRows = row + 1
	const firstCoveredCol = Math.floor(edges.start)
	const lastCoveredCol = Math.ceil(edges.end) - 1
	for (let col = firstCoveredCol; col <= lastCoveredCol; col++) {
		const cell = columnLayouts.at(col)
		if (cell) cell.rowCount = Math.max(cell.rowCount, requiredRows)
	}
}

export const layoutHorizontal = ({
	days,
	events,
	dayMaxEvents,
	gridType = 'day',
}: HorizontalLayoutInput): HorizontalLayoutResult => {
	const unitCount = days.length
	// Both axes read their columns off `days` rather than counting from the
	// first one: a hidden day or a visible-hours window leaves gaps, and counting
	// would put every bar past a gap in the wrong column.
	const isHourAxis = gridType === 'hour'
	const spanOf = isHourAxis
		? createHourColumnSpanner(days)
		: createDayColumnSpanner(days)
	const columnInstants = isHourAxis ? days.map((day) => day.valueOf()) : null

	// An event with no column draws nothing and is in no cell.
	const spannedEvents = events.flatMap((event) => {
		const span = spanOf(event)
		return span ? [{ event, span }] : []
	})

	const columnLayouts = listEventsPerColumn(unitCount, spannedEvents)
	const rows: ColumnRange[][] = Array.from({ length: dayMaxEvents }, () => [])
	const positionedEvents: HorizontalPositionedEvent[] = []

	for (const spanned of sortForPlacement(spannedEvents, isHourAxis)) {
		const { event, span } = spanned
		const slot = findRowSlot(rows, spanned, columnInstants)

		// Hidden wherever the event has no bar: every column when no row is
		// free, else the columns before a bar that starts late.
		const firstDrawnCol = slot ? slot.startCol : span.endCol + 1
		countHiddenIn(columnLayouts, span.startCol, firstDrawnCol)
		if (!slot) continue

		const { row, edges } = slot
		rows.at(row)?.push(edges)
		reserveRowUnder(columnLayouts, edges, row)

		const spanUnits = edges.end - edges.start
		const left = (edges.start / unitCount) * 100
		const width = (spanUnits / unitCount) * 100
		positionedEvents.push({
			kind: 'horizontal',
			event,
			left,
			width,
			row,
			isTruncatedStart: slot.isTruncatedStart,
			isTruncatedEnd: span.isTruncatedEnd,
		})
	}

	return { positionedEvents, columnLayouts }
}
