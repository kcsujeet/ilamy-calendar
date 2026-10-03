import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { wallClockDiff } from '@ilamy/utils/helpers'
import type { HorizontalPositionedEvent } from './geometry'

interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

interface GridBounds {
	firstUnit: Dayjs
	lastUnit: Dayjs
	unitCount: number
	gridType: 'day' | 'hour'
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

/** Column span and truncation of an event, clamped to the grid bounds. */
const computeColumnSpan = (
	event: CalendarEvent,
	{ firstUnit, lastUnit, unitCount, gridType }: GridBounds
): {
	startCol: number
	endCol: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
} => {
	const eventStart = dayjs.max(event.start.startOf(gridType), firstUnit)
	// `end` is exclusive at every granularity: an event ending at midnight stops
	// as that day begins, so it must not claim the day's column, exactly as one
	// ending on the hour does not claim that hour's row (#248). The step back is a
	// MILLISECOND, dayjs's smallest unit, so it lands on the last instant the
	// event occupies and nothing else. A coarser step silently swallows anything
	// ending inside it: at a minute, an event running 30 seconds into the next day
	// lost that day entirely.
	const adjustedEnd = event.end.subtract(1, 'millisecond')
	const eventEnd = dayjs.min(adjustedEnd.startOf(gridType), lastUnit)
	// Clock time, not elapsed time: columns are labelled by clock hour, so on a
	// day the clocks change, elapsed time put 09:00 in the 8 or 10 AM column (#311).
	const unitsToStart = Math.trunc(
		wallClockDiff(eventStart, firstUnit, gridType)
	)
	const unitsToEnd = Math.trunc(wallClockDiff(eventEnd, firstUnit, gridType))
	return {
		startCol: Math.max(0, unitsToStart),
		endCol: Math.min(unitCount - 1, unitsToEnd),
		isTruncatedStart: event.start.startOf(gridType).isBefore(firstUnit),
		// Read off the SAME exclusive end as the span above. Using the raw `end`
		// here would disagree with it at the grid's edge, drawing the overrun
		// indicator on an event that ends exactly where the grid does.
		isTruncatedEnd: adjustedEnd.startOf(gridType).isAfter(lastUnit),
	}
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
	// For hour-based grids, use actual first/last hours from the days array;
	// for day-based grids, use start/end of day to capture all events.
	const first = days.at(0)
	const last = days.at(-1)
	if (!first || !last) return []

	const bounds: GridBounds = {
		firstUnit:
			gridType === 'hour' ? first.startOf('hour') : first.startOf('day'),
		lastUnit: gridType === 'hour' ? last.endOf('hour') : last.endOf('day'),
		unitCount: days.length,
		gridType,
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

		// First try: place from the original start position.
		const row = findAvailableRow(grid, span.startCol, span.endCol)
		if (row !== -1) {
			place({ row, event, ...span })
			continue
		}

		// Fallback: try truncated versions starting from later days.
		for (
			let tryStart = span.startCol + 1;
			tryStart <= span.endCol;
			tryStart++
		) {
			const truncRow = findAvailableRow(grid, tryStart, span.endCol)
			if (truncRow !== -1) {
				place({
					row: truncRow,
					startCol: tryStart,
					endCol: span.endCol,
					event,
					isTruncatedStart: true,
					isTruncatedEnd: span.isTruncatedEnd,
				})
				break
			}
		}
	}

	// Single-unit events fill the remaining gaps. computeColumnSpan already
	// clamps the span to the grid, so startCol needs no re-clamping here.
	for (const event of sortedSingleUnit) {
		const span = computeColumnSpan(event, bounds)
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
