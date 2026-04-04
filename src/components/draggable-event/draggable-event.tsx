import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import { memo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { EventContent } from '@/components/event-content'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

function DraggableEventUnmemoized({
	elementId,
	event,
	className,
	style,
	disableDrag = false,
}: {
	elementId: string
	className?: string
	style?: CSSProperties
	event: CalendarEvent
	disableDrag?: boolean
}) {
	const { onEventClick, renderEvent, disableEventClick, disableDragAndDrop } =
		useSmartCalendarContext()

	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: elementId,
		data: {
			event,
			type: 'calendar-event',
		},
		disabled: disableDrag || disableDragAndDrop,
	})

	return (
		<AnimatedSection
			className={cn(
				'truncate h-full w-full',
				disableDrag || disableDragAndDrop
					? disableEventClick
						? 'cursor-default'
						: 'cursor-pointer'
					: 'cursor-grab',
				isDragging &&
					!(disableDrag || disableDragAndDrop) &&
					'cursor-grabbing shadow-lg',
				className
			)}
			layout={true}
			layoutId={elementId}
			onClick={(e) => {
				e.stopPropagation()
				onEventClick(event)
			}}
			ref={setNodeRef}
			style={style}
			transitionKey={elementId}
			{...attributes}
			{...listeners}
		>
			<EventContent event={event} renderEvent={renderEvent} />
		</AnimatedSection>
	)
}

export const DraggableEvent = memo(
	DraggableEventUnmemoized,
	(prevProps, nextProps) => {
		return (
			prevProps.elementId === nextProps.elementId &&
			prevProps.disableDrag === nextProps.disableDrag &&
			prevProps.className === nextProps.className &&
			prevProps.event === nextProps.event
		)
	}
)
