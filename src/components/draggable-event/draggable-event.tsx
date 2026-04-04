import { useDraggable } from '@dnd-kit/core'
import type { CSSProperties } from 'react'
import { memo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

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

	// Default event content to render if custom renderEvent is not provided
	const DefaultEventContent = () => {
		const enhancedEvent = event as unknown as {
			isTruncatedStart?: boolean
			isTruncatedEnd?: boolean
		}
		const isTruncatedStart = enhancedEvent.isTruncatedStart
		const isTruncatedEnd = enhancedEvent.isTruncatedEnd

		return (
			<div
				className={cn(
					event.backgroundColor || 'bg-blue-500',
					event.color || 'text-white',
					'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
					getBorderRadiusClass(
						Boolean(isTruncatedStart),
						Boolean(isTruncatedEnd)
					)
				)}
				style={{ backgroundColor: event.backgroundColor, color: event.color }}
			>
				{isTruncatedStart && (
					<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
				)}

				<p
					className={cn(
						'text-[10px] font-semibold sm:text-xs mt-0.5',
						isTruncatedStart && 'pl-1',
						isTruncatedEnd && 'pr-1'
					)}
				>
					{event.title}
				</p>

				{isTruncatedEnd && (
					<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
				)}
			</div>
		)
	}

	return (
		<div
			className={cn(
				'truncate h-full w-full animate-in fade-in zoom-in-95 duration-800 ease-in-out',
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
			onClick={(e) => {
				e.stopPropagation()
				onEventClick(event)
			}}
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
		>
			{renderEvent ? renderEvent(event) : <DefaultEventContent />}
		</div>
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
