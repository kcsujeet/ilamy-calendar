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
	 * that refuses drops: the mirror is still drawn, because the candidate is
	 * still where the pointer says, and the release simply commits nothing.
	 * FullCalendar draws its mirror over an invalid area too and signals the
	 * refusal with the cursor (`fc-not-allowed` on the body) rather than by
	 * hiding it.
	 */
	isDropAllowed: boolean
}

export const DragPreviewContext = createContext<DragPreviewState | null>(null)

export const useDragPreview = () => useContext(DragPreviewContext)
