import { parseDate, type ZonedDate } from '@ilamy/utils/temporal'
import {
	createDayColumnSpanner,
	createHourColumnSpanner,
	MS_PER_HOUR,
	type ZonedBounds,
} from './core-layout-columns'
import type {
	ColumnSpan,
	HorizontalCellLayout,
	HorizontalPositionedEvent,
} from './core-layout-geometry'
import type { CalendarEvent } from './core-types'

export interface HorizontalLayoutInput {
	days: ZonedDate[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

export interface HorizontalLayoutResult {
	positionedEvents: HorizontalPositionedEvent[]
	columnLayouts: HorizontalCellLayout[]
}

interface SpannedEvent {
	event: CalendarEvent
	bounds: ZonedBounds
	span: ColumnSpan
}

interface ColumnRange {
	start: number
	end: number
}

const MINIMUM_BAR_COLUMNS = 0.4

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
		const startDiff =
			a.bounds.start.epochMilliseconds - b.bounds.start.epochMilliseconds
		if (startDiff !== 0) {
			return startDiff
		}
		const aLength =
			a.bounds.end.epochMilliseconds - a.bounds.start.epochMilliseconds
		const bLength =
			b.bounds.end.epochMilliseconds - b.bounds.start.epochMilliseconds
		return bLength - aLength
	})

const computeBarEdges = (
	bounds: ZonedBounds,
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

	const msIntoStartColumn = bounds.start.epochMilliseconds - startColumnInstant
	const msIntoEndColumn = bounds.end.epochMilliseconds - endColumnInstant
	const startOffset = Math.min(Math.max(msIntoStartColumn, 0), MS_PER_HOUR)
	const endOffset = Math.min(Math.max(msIntoEndColumn, 0), MS_PER_HOUR)
	const startMs = startCol * MS_PER_HOUR + startOffset
	const endMs = endCol * MS_PER_HOUR + endOffset
	if (endMs <= startMs) return wholeColumns

	const minimumEndMs = startMs + MINIMUM_BAR_COLUMNS * MS_PER_HOUR
	const gridEndMs = columnInstants.length * MS_PER_HOUR
	const displayedEndMs = Math.min(Math.max(endMs, minimumEndMs), gridEndMs)
	return { start: startMs / MS_PER_HOUR, end: displayedEndMs / MS_PER_HOUR }
}

const rangesOverlap = (a: ColumnRange, b: ColumnRange): boolean =>
	a.start < b.end && b.start < a.end

const findFreeRow = (rows: ColumnRange[][], edges: ColumnRange): number =>
	rows.findIndex((row) => !row.some((taken) => rangesOverlap(taken, edges)))

interface RowSlot {
	row: number
	startCol: number
	isTruncatedStart: boolean
	edges: ColumnRange
}

const findRowSlot = (
	rows: ColumnRange[][],
	{ bounds, span }: SpannedEvent,
	columnInstants: number[] | null
): RowSlot | null => {
	for (let startCol = span.startCol; startCol <= span.endCol; startCol++) {
		const edges = computeBarEdges(bounds, startCol, span.endCol, columnInstants)
		const row = findFreeRow(rows, edges)
		if (row !== -1) {
			const startsLater = startCol > span.startCol
			const isTruncatedStart = span.isTruncatedStart || startsLater
			return { row, startCol, isTruncatedStart, edges }
		}
	}
	return null
}

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

/** Positions events across a horizontal day or hour grid row. */
export const layoutHorizontal = ({
	days,
	events,
	dayMaxEvents,
	gridType = 'day',
}: HorizontalLayoutInput): HorizontalLayoutResult => {
	const unitCount = days.length
	const zone = days.at(0)?.timeZoneId
	const isHourAxis = gridType === 'hour'
	const spanOf = isHourAxis
		? createHourColumnSpanner(days)
		: createDayColumnSpanner(days)
	const columnInstants = isHourAxis
		? days.map((day) => day.epochMilliseconds)
		: null

	const spannedEvents: SpannedEvent[] = []
	for (const event of events) {
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (!start || !end) continue
		const bounds: ZonedBounds = { start, end }
		const span = spanOf(bounds)
		if (span) {
			spannedEvents.push({ event, bounds, span })
		}
	}

	const columnLayouts = listEventsPerColumn(unitCount, spannedEvents)
	const rows: ColumnRange[][] = Array.from({ length: dayMaxEvents }, () => [])
	const positionedEvents: HorizontalPositionedEvent[] = []

	for (const spanned of sortForPlacement(spannedEvents, isHourAxis)) {
		const { event, span } = spanned
		const slot = findRowSlot(rows, spanned, columnInstants)
		const firstDrawnCol = slot ? slot.startCol : span.endCol + 1
		countHiddenIn(columnLayouts, span.startCol, firstDrawnCol)
		if (!slot) continue

		const { row, edges } = slot
		rows.at(row)?.push(edges)
		reserveRowUnder(columnLayouts, edges, row)

		const spanUnits = edges.end - edges.start
		positionedEvents.push({
			kind: 'horizontal',
			event,
			left: (edges.start / unitCount) * 100,
			width: (spanUnits / unitCount) * 100,
			row,
			isTruncatedStart: slot.isTruncatedStart,
			isTruncatedEnd: span.isTruncatedEnd,
		})
	}

	return { positionedEvents, columnLayouts }
}
