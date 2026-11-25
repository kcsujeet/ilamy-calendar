import type { CalendarEvent, StyleRecord } from '../../types/calendar.types'

interface PositionedEventBase {
	event: CalendarEvent
	/** Horizontal placement, percent of the grid axis. */
	left: number
	width: number
}

/** `layoutVertical` (day/week time grid): percentage placement. */
export interface VerticalPositionedEvent extends PositionedEventBase {
	kind: 'vertical'
	top: number
	height: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
	zIndex?: number
}

/** The columns of a grid axis an event covers. */
export interface ColumnSpan {
	startCol: number
	endCol: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
	spansMultipleUnits: boolean
}

/** `layoutHorizontal` (month / all-day row): row-based placement. */
export interface HorizontalPositionedEvent extends PositionedEventBase {
	kind: 'horizontal'
	row: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

/** Per-cell events and row occupancy metadata. */
export interface HorizontalCellLayout {
	events: CalendarEvent[]
	rowCount: number
	hiddenCount: number
}

/** Structural inline positioning for a horizontal bar (CSS-library-agnostic). */
export const getHorizontalBarStyle = (
	positioned: HorizontalPositionedEvent,
	top: number,
	eventHeight: number
): StyleRecord => ({
	left: `calc(${positioned.left}% + var(--spacing, 0.25rem) * 0.25)`,
	width: `calc(${positioned.width}% - var(--spacing, 0.25rem) * 1)`,
	top: `${top}px`,
	height: `${eventHeight}px`,
})

/** Structural inline positioning for a vertical bar (CSS-library-agnostic). */
export const getVerticalBarStyle = (
	positioned: VerticalPositionedEvent
): StyleRecord => ({
	left: `${positioned.left}%`,
	width: `calc(${positioned.width}% - var(--spacing, 0.25rem) * 2)`,
	top: `${positioned.top}%`,
	height: `${positioned.height}%`,
})
