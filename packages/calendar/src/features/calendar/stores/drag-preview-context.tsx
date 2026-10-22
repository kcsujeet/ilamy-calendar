import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { createContext, useContext } from 'react'

/**
 * The candidate placement of the event currently being dragged: where it would
 * land if the pointer were released now. `CalendarDndContext` recomputes it on
 * every drag-over; the grids read it to paint the snapped mirror and to
 * highlight the cells the candidate covers.
 */
export interface DragPreviewState {
	event: CalendarEvent
	start: Dayjs
	end: Dayjs
	resourceId?: string | number
	allDay: boolean
	/**
	 * Whether releasing here would actually move the event. False over a cell
	 * that refuses drops, or when the consumer's `eventAllow` vetoes the
	 * placement. A refused placement is not drawn (no mirror, no drop tint): the
	 * not-allowed cursor is the only signal and the release commits nothing,
	 * as FullCalendar nulls the mutation for an invalid placement
	 * (interaction-plugin/interactions/EventDragging.ts:193-198, v7.1.1).
	 */
	isDropAllowed: boolean
}

export const DragPreviewContext = createContext<DragPreviewState | null>(null)

export const useDragPreview = () => useContext(DragPreviewContext)
