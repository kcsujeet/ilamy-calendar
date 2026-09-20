import { useDraggable } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { CSSProperties, ReactNode } from 'react'
import { memo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { EventSegment } from '@/features/calendar/types'
import type { DragSegment } from '@/lib/utils/grab-offset'
import {
	DefaultEventContent,
	type DefaultEventContentProps,
} from './default-event-content'

interface DragStateClassInput {
	isDragDisabled: boolean
	disableEventClick: boolean
	isSourceOfDrag: boolean
}

/**
 * How the bar reads to the pointer: what it offers, and whether it is in flight.
 *
 * The in-flight ghost sits at 0.5, which is a DELIBERATE deviation from
 * FullCalendar's `.fc-event-dragging:not(.fc-event-selected){opacity:.75}`.
 * 0.75 is the right number for FullCalendar's mirror, which carries no outline
 * of its own and so needs the grid around it to stay quiet to be found. This
 * mirror is opaque AND hard-ringed (`DragPreviewCard`), so it wins the
 * hierarchy on its own, and the bar left behind can recede further than the RFC
 * -silent standard suggests. It still has to read as "the event is here, and it
 * is moving" rather than as deleted, which is what rules out going lower.
 */
const getDragStateClasses = ({
	isDragDisabled,
	disableEventClick,
	isSourceOfDrag,
}: DragStateClassInput) => {
	const idleCursor = disableEventClick ? 'cursor-default' : 'cursor-pointer'
	const showAsDragged = isSourceOfDrag && !isDragDisabled
	return {
		cursorClass: isDragDisabled ? idleCursor : 'cursor-grab',
		draggingClass: showAsDragged && 'cursor-grabbing opacity-50 select-none',
	}
}

interface EventContentInput extends DefaultEventContentProps {
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
	segment: EventSegment
}

/** The consumer's renderer when there is one, otherwise the built-in bar. */
const renderEventContent = ({
	renderEvent,
	event,
	segment,
	isTruncatedStart,
	isTruncatedEnd,
}: EventContentInput): ReactNode => {
	if (renderEvent) {
		return renderEvent(event, segment)
	}
	return (
		<DefaultEventContent
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
		/>
	)
}

interface DraggableEventProps {
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
	/**
	 * The span this bar draws, which the grid clipped to its own range. The drop
	 * needs it to read the grab point in the same unit as the rendered rect.
	 */
	dragSegment?: DragSegment
	/**
	 * Whether this event is the one being dragged. Passed by the events layer,
	 * which already reads the drag preview: subscribing here instead would
	 * re-render every bar in the grid on every drag-over tick, through `memo`.
	 */
	isBeingDragged?: boolean
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
	dragSegment,
	isBeingDragged = false,
}: DraggableEventProps) {
	const { onEventClick, renderEvent, disableEventClick, disableDragAndDrop } =
		useSmartCalendarContext()

	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: elementId,
		data: {
			event,
			type: 'calendar-event',
			sourceResourceId,
			dragSegment,
		},
		disabled: disableDrag || disableDragAndDrop,
	})

	// `isDragging` marks the bar under the pointer; `isBeingDragged` also covers
	// this event's other bars (a clipped span, or a second resource row).
	const { cursorClass, draggingClass } = getDragStateClasses({
		isDragDisabled: Boolean(disableDrag || disableDragAndDrop),
		disableEventClick: Boolean(disableEventClick),
		isSourceOfDrag: isDragging || isBeingDragged,
	})

	// The default content reads both of these (border radius, the continuation
	// markers and their padding), so a custom renderer needs them too or it
	// cannot draw the same thing. Stated positively, matching FullCalendar:
	// the flags say what the bar HOLDS, not what was cut off it.
	const segment: EventSegment = {
		isStart: !isTruncatedStart,
		isEnd: !isTruncatedEnd,
	}
	const content = renderEventContent({
		renderEvent,
		event,
		segment,
		isTruncatedStart,
		isTruncatedEnd,
	})

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

/**
 * Compared by value: the events layer rebuilds the segment on every render, so
 * comparing by identity would defeat `memo` for every bar in the grid.
 */
const isSameSegment = (a?: DragSegment, b?: DragSegment): boolean => {
	if (!a || !b) {
		return a === b
	}
	const sameSpan = a.start.isSame(b.start) && a.end.isSame(b.end)
	return sameSpan && a.axis === b.axis
}

/**
 * The props that change what a bar looks like. `style` is left out on purpose:
 * the events layer rebuilds it every render, and the bar reads its placement
 * from the wrapper element rather than from the style object.
 */
const COMPARED_PROPS = [
	'elementId',
	'disableDrag',
	'className',
	'event',
	'isTruncatedStart',
	'isTruncatedEnd',
	'isBeingDragged',
] as const satisfies ReadonlyArray<keyof DraggableEventProps>

export const DraggableEvent = memo(
	DraggableEventUnmemoized,
	(prevProps, nextProps) => {
		const sameProps = COMPARED_PROPS.every(
			(prop) => prevProps[prop] === nextProps[prop]
		)
		return (
			sameProps && isSameSegment(prevProps.dragSegment, nextProps.dragSegment)
		)
	}
)
