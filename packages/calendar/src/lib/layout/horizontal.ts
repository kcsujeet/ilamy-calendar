import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { PositionedEvent } from './geometry'

export interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

interface GridBounds {
	firstDay: Dayjs
	lastDay: Dayjs
	dayCount: number
	gridType: 'day' | 'hour'
}

// --- Phase 1: cluster (partition + sort) ------------------------------------

/** Splits events into multi-unit and single-unit groups, each placement-sorted. */
const partitionAndSortEvents = (
	events: CalendarEvent[],
	gridType: 'day' | 'hour'
): { sortedMultiUnit: CalendarEvent[]; sortedSingleUnit: CalendarEvent[] } => {
	const multiUnitEvents = events.filter(
		(e) => e.end.diff(e.start, gridType) > 0
	)
	const singleUnitEvents = events.filter(
		(e) => e.end.diff(e.start, gridType) === 0
	)

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
	{ firstDay, lastDay, dayCount, gridType }: GridBounds
): {
	startCol: number
	endCol: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
} => {
	const eventStart = dayjs.max(event.start.startOf(gridType), firstDay)
	const adjustedEnd =
		gridType === 'hour' ? event.end.subtract(1, 'minute') : event.end
	const eventEnd = dayjs.min(adjustedEnd.startOf(gridType), lastDay)
	return {
		startCol: Math.max(0, eventStart.diff(firstDay, gridType)),
		endCol: Math.min(dayCount - 1, eventEnd.diff(firstDay, gridType)),
		isTruncatedStart: event.start.startOf(gridType).isBefore(firstDay),
		isTruncatedEnd: event.end.startOf(gridType).isAfter(lastDay),
	}
}

// --- Phase 3: place (occupancy grid) ----------------------------------------

type OccupancyGrid = { taken: boolean }[][]

/** First row where every column from startCol..endCol is free; -1 if none. */
const findAvailableRow = (
	grid: OccupancyGrid,
	startCol: number,
	endCol: number
): number => {
	for (let row = 0; row < grid.length; row++) {
		let canPlace = true
		for (let col = startCol; col <= endCol; col++) {
			if (grid[row][col].taken) {
				canPlace = false
				break
			}
		}
		if (canPlace) return row
	}
	return -1
}

export const layoutHorizontal = ({
	days,
	events,
	dayMaxEvents,
	gridType = 'day',
}: HorizontalLayoutInput): PositionedEvent[] => {
	// For hour-based grids, use actual first/last hours from the days array;
	// for day-based grids, use start/end of day to capture all events.
	const first = days.at(0)
	const last = days.at(-1)
	if (!first || !last) return []

	const bounds: GridBounds = {
		firstDay:
			gridType === 'hour' ? first.startOf('hour') : first.startOf('day'),
		lastDay: gridType === 'hour' ? last.endOf('hour') : last.endOf('day'),
		dayCount: days.length,
		gridType,
	}

	const { sortedMultiUnit, sortedSingleUnit } = partitionAndSortEvents(
		events,
		gridType
	)

	// dayMaxEvents x dayCount occupancy grid.
	const grid: OccupancyGrid = Array.from({ length: dayMaxEvents }, () =>
		Array.from({ length: bounds.dayCount }, () => ({ taken: false }))
	)

	const placedEvents: PositionedEvent[] = []

	const place = (
		row: number,
		startCol: number,
		endCol: number,
		event: CalendarEvent,
		isTruncatedStart: boolean,
		isTruncatedEnd: boolean
	) => {
		for (let col = startCol; col <= endCol; col++) {
			grid[row][col] = { taken: true }
		}
		const spanDays = endCol - startCol + 1
		placedEvents.push({
			event,
			left: (startCol / bounds.dayCount) * 100,
			width: (spanDays / bounds.dayCount) * 100,
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
			place(
				row,
				span.startCol,
				span.endCol,
				event,
				span.isTruncatedStart,
				span.isTruncatedEnd
			)
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
				place(truncRow, tryStart, span.endCol, event, true, span.isTruncatedEnd)
				break
			}
		}
	}

	// Single-unit events fill the remaining gaps.
	for (const event of sortedSingleUnit) {
		const span = computeColumnSpan(event, bounds)
		const col = Math.max(0, Math.min(bounds.dayCount - 1, span.startCol))
		const row = findAvailableRow(grid, col, col)
		if (row !== -1) {
			place(row, col, col, event, false, false)
		}
	}

	return placedEvents
}
