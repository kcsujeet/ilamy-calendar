import { useDraggable } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { CSSProperties } from 'react'
import { memo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { EventSegment } from '@/features/calendar/types'

const getBorderRadiusClass = (
	isTruncatedStart: boolean,
	isTruncatedEnd: boolean
) => {
	if (isTruncatedStart && isTruncatedEnd) {
		return 'rounded-none'
	}
	if (isTruncatedStart) {
		return 'rounded-r-md rounded-l-none'
	}
	if (isTruncatedEnd) {
		return 'rounded-l-md rounded-r-none'
	}
	return 'rounded-md'
}

function DraggableEventUnmemoized({
	elementId,
	event,
	className,
	style,
	disableDrag = false,
	isTruncatedStart = false,
	isTruncatedEnd = false,
	sourceResourceId,
}: {
	elementId: string
	className?: string
	style?: CSSProperties
	event: CalendarEvent
	disableDrag?: boolean
	/**
	 * The resource row this instance is rendered in. A cross-resource event is
	 * rendered once per resource, so the drop needs to know which one the drag
	 * started from in order to swap that one for the target.
	 */
	sourceResourceId?: string | number
	/** Set by the events layer when the visible range cut this bar. */
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
}) {
	const { onEventClick, renderEvent, disableEventClick, disableDragAndDrop } =
		useSmartCalendarContext()

	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: elementId,
		data: {
			event,
			type: 'calendar-event',
			sourceResourceId,
		},
		disabled: disableDrag || disableDragAndDrop,
	})

	// Default event content to render if custom renderEvent is not provided
	const DefaultEventContent = () => {
		return (
			<div
				className={cn(
					event.backgroundColor || 'bg-blue-500',
					event.color || 'text-white',
					'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
					getBorderRadiusClass(isTruncatedStart, isTruncatedEnd)
				)}
				style={{ backgroundColor: event.backgroundColor, color: event.color }}
			>
				{/* Left continuation indicator */}
				{isTruncatedStart && (
					<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
				)}

				{/* Event title */}
				<p
					className={cn(
						'text-[10px] font-semibold sm:text-xs mt-0.5',
						// Add slight padding to avoid overlap with indicators
						isTruncatedStart && 'pl-1',
						isTruncatedEnd && 'pr-1'
					)}
				>
					{event.title}
				</p>

				{/* Right continuation indicator */}
				{isTruncatedEnd && (
					<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
				)}
			</div>
		)
	}

	const isDragDisabled = disableDrag || disableDragAndDrop
	const idleCursorClass = disableEventClick
		? 'cursor-default'
		: 'cursor-pointer'
	const cursorClass = isDragDisabled ? idleCursorClass : 'cursor-grab'
	const draggingClass =
		isDragging && !isDragDisabled && 'cursor-grabbing shadow-lg'

	// The default content reads both of these (border radius, the continuation
	// markers and their padding), so a custom renderer needs them too or it
	// cannot draw the same thing. Stated positively, matching FullCalendar:
	// the flags say what the bar HOLDS, not what was cut off it.
	const segment: EventSegment = {
		isStart: !isTruncatedStart,
		isEnd: !isTruncatedEnd,
	}
	const content = renderEvent ? (
		renderEvent(event, segment)
	) : (
		<DefaultEventContent />
	)

	return (
		<AnimatedSection
			className={cn(
				'truncate h-full w-full',
				cursorClass,
				draggingClass,
				className
			)}
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
			{content}
		</AnimatedSection>
	)
}

export const DraggableEvent = memo(
	DraggableEventUnmemoized,
	(prevProps, nextProps) => {
		// Compare the essential props to prevent unnecessary re-renders
		return (
			prevProps.elementId === nextProps.elementId &&
			prevProps.disableDrag === nextProps.disableDrag &&
			prevProps.className === nextProps.className &&
			prevProps.event === nextProps.event &&
			prevProps.isTruncatedStart === nextProps.isTruncatedStart &&
			prevProps.isTruncatedEnd === nextProps.isTruncatedEnd
		)
	}
)
