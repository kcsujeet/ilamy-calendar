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
	/**
	 * How many grid units this bar covers — days in a day grid, hours in an
	 * hour one. `width` says the same thing as a percentage of the row, which
	 * is what CSS needs; this is what anyone laying out the bar's *contents*
	 * needs, since a share of the bar is only meaningful against a unit count.
	 */
	spanUnits: number
}
