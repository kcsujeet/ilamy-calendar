import { DragOverlay, useDndContext } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import type React from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DraggableEventPresentation } from '@/components/draggable-event/draggable-event'

interface EventDragOverlayData {
	type?: string
	event?: CalendarEvent
	presentation?: {
		className?: string
		style?: CSSProperties
		isTruncatedStart?: boolean
		isTruncatedEnd?: boolean
	}
}

export const EventDragOverlay: React.FC = () => {
	const { active } = useDndContext()
	const activeData = active?.data.current as EventDragOverlayData | undefined
	let dragOverlay: EventDragOverlayData | undefined
	if (activeData?.type === 'calendar-event') {
		dragOverlay = activeData
	}

	if (typeof document === 'undefined') {
		return null
	}

	const { event, presentation } = dragOverlay ?? {}
	return createPortal(
		<DragOverlay dropAnimation={null}>
			{event && (
				<DraggableEventPresentation
					animation="none"
					className={presentation?.className}
					elementId={`drag-overlay-${event.id}`}
					event={event}
					isTruncatedEnd={presentation?.isTruncatedEnd}
					isTruncatedStart={presentation?.isTruncatedStart}
					style={presentation?.style}
				/>
			)}
		</DragOverlay>,
		document.body
	)
}
