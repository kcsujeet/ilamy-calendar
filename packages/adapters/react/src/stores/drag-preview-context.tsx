import type { CalendarEvent } from '@ilamy/types'
import type { ZonedDate } from '@ilamy/utils/temporal'
import { createContext, useContext } from 'react'

/**
 * Candidate placement of the event currently being dragged: where it would
 * land if the pointer were released now.
 */
export interface DragPreviewState {
	event: CalendarEvent
	start: ZonedDate
	end: ZonedDate
	resourceId?: string | number
	allDay: boolean
	isDropAllowed: boolean
}

export const DragPreviewContext = createContext<DragPreviewState | null>(null)

export const useDragPreview = () => useContext(DragPreviewContext)
