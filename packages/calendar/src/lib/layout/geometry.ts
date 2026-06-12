import type { CalendarEvent } from '@/components/types'

/**
 * The single layout contract. The layout strategy determines which placement
 * group is set:
 * - `layoutVertical` (day/week time grid) fills `top`/`height`/`zIndex`.
 * - `layoutHorizontal` (month / all-day row) fills `row` + truncation flags
 *   and emits NO pixel fields — the renderer derives pixels from `row`.
 */
export interface PositionedEvent {
	event: CalendarEvent
	/** Horizontal placement, percent of the grid axis (both strategies). */
	left: number
	width: number
	/** Vertical strategy: vertical placement, percent of the visible range. */
	top?: number
	height?: number
	zIndex?: number
	/** Horizontal strategy: stacking row index; the renderer derives pixels. */
	row?: number
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
}
