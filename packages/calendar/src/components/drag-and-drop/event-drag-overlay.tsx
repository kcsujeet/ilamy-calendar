import { DragOverlay } from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { useImperativeHandle, useState } from 'react'

interface EventDragOverlayProps {
	ref: React.Ref<{ setActiveEvent: (event: CalendarEvent) => void }>
}

export const EventDragOverlay: React.FC<EventDragOverlayProps> = ({ ref }) => {
	const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

	useImperativeHandle(ref, () => ({
		setActiveEvent,
	}))

	return (
		<DragOverlay modifiers={[snapCenterToCursor]}>
			{activeEvent && (
				<div
					className={cn(
						'cursor-grab truncate rounded bg-amber-200 p-2 text-[10px] shadow-lg sm:text-xs w-20',
						activeEvent.backgroundColor || 'bg-blue-500',
						activeEvent.color || 'text-white'
					)}
				>
					{activeEvent?.title}
				</div>
			)}
		</DragOverlay>
	)
}
