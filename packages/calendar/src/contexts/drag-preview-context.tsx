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
}

export const DragPreviewContext = createContext<DragPreviewState | null>(null)

export const useDragPreview = () => useContext(DragPreviewContext)
