import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/lib/constants'

export interface PositionedEvent extends CalendarEvent {
	left: number // Left position in percentage
	width: number // Width in percentage
	top: number // Top position in percentage
	height: number // Height in percentage
	position: number // Position in the row (0 for first, 1 for second, etc.)
	isTruncatedStart: boolean // Whether the event is truncated at the start
	isTruncatedEnd: boolean // Whether the event is truncated at the end
}

interface GetPositionedEventsProps {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	dayNumberHeight?: number
	gridType?: 'day' | 'hour' // Future use for different grid types
	eventSpacing?: number // Custom vertical spacing between events (defaults to GAP_BETWEEN_ELEMENTS)
	eventBarHeight?: number // Custom height for event bars in pixels (defaults to EVENT_BAR_HEIGHT)
}

export const getPositionedEvents = ({
	days,
	events,
	dayMaxEvents,
	dayNumberHeight = DAY_NUMBER_HEIGHT,
	gridType = 'day',
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	eventBarHeight = EVENT_BAR_HEIGHT,
}: GetPositionedEventsProps) => {
	// For hour-based grids, use actual first/last hours from days array
	// For day-based grids, use start/end of day to capture all events
	const first = days.at(0)
	const last = days.at(-1)
	if (!first || !last) return []

	const firstDay =
		gridType === 'hour' ? first.startOf('hour') : first.startOf('day')
	const lastDay = gridType === 'hour' ? last.endOf('hour') : last.endOf('day')
	const dayCount = days.length

	// Separate multi-day and single-day events
	const multiDayEvents = events.filter((e) => e.end.diff(e.start, gridType) > 0)
	const singleDayEvents = events.filter(
		(e) => e.end.diff(e.start, gridType) === 0
	)

	// Sort multi-day events by start date, then by duration
	const sortedMultiDay = [...multiDayEvents].sort((a, b) => {
		const startDiff = a.start.diff(b.start)
		if (startDiff !== 0) {
			return startDiff
		}
		return b.end.diff(b.start) - a.end.diff(a.start) // Longer events first
	})

	// Sort single-day events by start time
	const sortedSingleDay = [...singleDayEvents].sort((a, b) =>
		a.start.diff(b.start)
	)

	// Create dayCount x dayMaxEvents grid with flags
	const grid: { taken: boolean; event: CalendarEvent | null }[][] = Array.from(
		{ length: dayMaxEvents },
		() =>
			Array.from({ length: dayCount }, () => ({ taken: false, event: null }))
	)

	const processedEvents: PositionedEvent[] = []

	// Find the first row where every column from startCol..endCol is free; -1 if none.
	const findAvailableRow = (startCol: number, endCol: number): number => {
		for (let row = 0; row < dayMaxEvents; row++) {
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

	const place = (
		row: number,
		startCol: number,
		endCol: number,
		event: CalendarEvent,
		isTruncatedStart: boolean,
		isTruncatedEnd: boolean
	) => {
		for (let col = startCol; col <= endCol; col++) {
			grid[row][col] = { taken: true, event }
		}
		const spanDays = endCol - startCol + 1
		processedEvents.push({
			left: (startCol / dayCount) * 100,
			width: (spanDays / dayCount) * 100,
			top:
				dayNumberHeight + eventSpacing + row * (eventBarHeight + eventSpacing),
			height: eventBarHeight,
			position: row,
			...event,
			isTruncatedStart,
			isTruncatedEnd,
		} as PositionedEvent)
	}

	// Step 1: Assign positions to multi-day events first
	for (const event of sortedMultiDay) {
		const eventStart = dayjs.max(event.start.startOf(gridType), firstDay)
		const adjustedEnd =
			gridType === 'hour' ? event.end.subtract(1, 'minute') : event.end
		const eventEnd = dayjs.min(adjustedEnd.startOf(gridType), lastDay)
		const startCol = Math.max(0, eventStart.diff(firstDay, gridType))
		const endCol = Math.min(dayCount - 1, eventEnd.diff(firstDay, gridType))

		const isTruncatedStart = event.start.startOf(gridType).isBefore(firstDay)
		const isTruncatedEnd = event.end.startOf(gridType).isAfter(lastDay)

		// First try: place from original start position
		const row = findAvailableRow(startCol, endCol)
		if (row !== -1) {
			place(row, startCol, endCol, event, isTruncatedStart, isTruncatedEnd)
			continue
		}

		// Fallback: try truncated versions starting from later days
		for (let tryStart = startCol + 1; tryStart <= endCol; tryStart++) {
			const truncRow = findAvailableRow(tryStart, endCol)
			if (truncRow !== -1) {
				place(truncRow, tryStart, endCol, event, true, isTruncatedEnd)
				break
			}
		}
	}

	// Step 2: Fill gaps with single-day events
	for (const event of sortedSingleDay) {
		const eventStart = dayjs.max(event.start.startOf(gridType), firstDay)
		const col = Math.max(
			0,
			Math.min(dayCount - 1, eventStart.diff(firstDay, gridType))
		)
		const row = findAvailableRow(col, col)
		if (row !== -1) {
			place(row, col, col, event, false, false)
		}
	}

	return processedEvents
}
