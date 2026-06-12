import type { CalendarEvent } from '@ilamy/types'

/** Placement fields shared by both layout strategies. */
interface PositionedEventBase {
	event: CalendarEvent
	/** Horizontal placement, percent of the grid axis. */
	left: number
	width: number
}

/** `layoutVertical` (day/week time grid): pixel-percentage placement. */
export interface VerticalPositionedEvent extends PositionedEventBase {
	kind: 'vertical'
	/** Vertical placement, percent of the visible range. */
	top: number
	height: number
	zIndex?: number
}

/**
 * `layoutHorizontal` (month / all-day row): abstract row placement — the
 * renderer derives pixels from `row`.
 */
export interface HorizontalPositionedEvent extends PositionedEventBase {
	kind: 'horizontal'
	/** Stacking row index. */
	row: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}
