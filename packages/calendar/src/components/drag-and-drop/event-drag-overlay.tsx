import { DragOverlay } from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { useImperativeHandle, useState } from 'react'
import { useDragPreview } from '@/contexts/drag-preview-context'

interface EventDragOverlayProps {
	ref: React.Ref<{ setActiveEvent: (event: CalendarEvent | null) => void }>
}

export const EventDragOverlay: React.FC<EventDragOverlayProps> = ({ ref }) => {
	const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
	const dragPreview = useDragPreview()

	useImperativeHandle(ref, () => ({
		setActiveEvent,
	}))

	// When dragging over valid calendar cells, the in-grid mirror preview
	// renders snapped to the grid columns/cells (matching FullCalendar and Google Calendar).
	// Only render an overlay badge when dragging off-grid or before hovering any droppable.
	if (dragPreview) {
		return null
	}

	return (
		<DragOverlay modifiers={[snapCenterToCursor]}>
			{activeEvent && (
				<div
					className={cn(
						'cursor-grabbing truncate rounded-md px-3 py-1.5 text-xs font-medium shadow-xl opacity-80',
						activeEvent.backgroundColor || 'bg-blue-500',
						activeEvent.color || 'text-white'
					)}
					style={{
						backgroundColor: activeEvent.backgroundColor,
						color: activeEvent.color,
					}}
				>
					{activeEvent.title}
				</div>
			)}
		</DragOverlay>
	)
}
