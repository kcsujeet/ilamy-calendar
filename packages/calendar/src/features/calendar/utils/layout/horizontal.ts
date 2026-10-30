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

/** A half-open interval in columns: whole days or fractional hours. */
interface Range {
	start: number
	end: number
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
	columnInstants: number[] | null
): Range => {
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

// --- Phase 3: place (shared row ranges) -------------------------------------

const overlaps = (a: Range, b: Range): boolean => {
	const startsBeforeEnd = a.start < b.end
	const endsAfterStart = b.start < a.end
	return startsBeforeEnd && endsAfterStart
}

/** First row with no overlapping range; -1 if every row is taken. */
const findFreeRow = (rows: Range[][], edges: Range): number =>
	rows.findIndex((row) => {
		const hasOverlap = row.some((taken) => overlaps(taken, edges))
		return !hasOverlap
	})

/** The selected row, visible start column and edges used to reserve it. */
interface MultiUnitSlot {
	row: number
	startCol: number
	isTruncatedStart: boolean
	edges: Range
}

/**
 * Row for either axis: from its own start if a row is free there, else
 * truncated to start on a later column. Null when no start has a free row.
 */
export const findMultiUnitSlot = (
	rows: Range[][],
	{ event, span }: SpannedEvent,
	columnInstants: number[] | null
): MultiUnitSlot | null => {
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

interface PlaceArgs {
	row: number
	startCol: number
	endCol: number
	event: CalendarEvent
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
	edges: Range
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

	const rows: Range[][] = Array.from({ length: dayMaxEvents }, () => [])
	const placedEvents: HorizontalPositionedEvent[] = []

	const place = ({
		row,
		startCol,
		endCol,
		event,
		isTruncatedStart,
		isTruncatedEnd,
		edges,
	}: PlaceArgs) => {
		rows.at(row)?.push(edges)
		const spanUnits = edges.end - edges.start
		const left = (edges.start / unitCount) * 100
		const width = (spanUnits / unitCount) * 100
		placedEvents.push({
			kind: 'horizontal',
			event,
			startCol,
			endCol,
			left,
			width,
			row,
			isTruncatedStart,
			isTruncatedEnd,
		})
	}

	// Day-spanning events claim rows first; hour events all compete by start time.
	for (const { event, span } of sortedPrimaryEvents) {
		const spanned = { event, span }
		const slot = findMultiUnitSlot(rows, spanned, columnInstants)
		if (!slot) continue
		place({
			row: slot.row,
			startCol: slot.startCol,
			endCol: span.endCol,
			event,
			isTruncatedStart: slot.isTruncatedStart,
			isTruncatedEnd: span.isTruncatedEnd,
			edges: slot.edges,
		})
	}

	// Single-unit events fill the remaining gaps. The span is already clamped to
	// the grid, so startCol needs no re-clamping here.
	for (const { event, span } of sortedSingleUnit) {
		const col = span.startCol
		const edges = computeBarEdges(event, col, col, columnInstants)
		const row = findFreeRow(rows, edges)
		const hasAvailableRow = row !== -1
		if (hasAvailableRow) {
			place({
				row,
				startCol: col,
				endCol: col,
				event,
				isTruncatedStart: false,
				isTruncatedEnd: false,
				edges,
			})
		}
	}

	return placedEvents
}
