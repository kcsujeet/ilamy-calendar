import type { CalendarEvent } from '@ilamy/types'
import type { CSSProperties } from 'react'

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
	/**
	 * Whether the visible range cut this event. A column shows a fixed span of
	 * hours or days, so an event reaching past either edge is drawn clipped,
	 * exactly as a month row clips a bar that outruns the week.
	 */
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
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

/**
 * Where a horizontal bar sits. The real bar and the drag mirror both read this,
 * so the mirror cannot land anywhere the bar would not: they were two identical
 * copies of these four declarations, which is exactly the drift
 * `.agents/rules/change-impact.md` warns about.
 */
export const getHorizontalBarStyle = (
	positioned: HorizontalPositionedEvent,
	top: number,
	eventHeight: number
): CSSProperties => ({
	left: `calc(${positioned.left}% + var(--spacing) * 0.25)`,
	width: `calc(${positioned.width}% - var(--spacing) * 1)`,
	top: `${top}px`,
	height: `${eventHeight}px`,
})

/** Where a vertical bar sits. Shared by the bar and its mirror, as above. */
export const getVerticalBarStyle = (
	positioned: VerticalPositionedEvent
): CSSProperties => ({
	left: `${positioned.left}%`,
	width: `calc(${positioned.width}% - var(--spacing) * 2)`,
	top: `${positioned.top}%`,
	height: `${positioned.height}%`,
})
