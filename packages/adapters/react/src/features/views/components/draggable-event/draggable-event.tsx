import { useDraggable } from '@dnd-kit/core'
import { resolveDurationEditable, resolveStartEditable } from '@ilamy/core'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { isSameInstant } from '@ilamy/utils/temporal'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { memo, useRef } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'
import type { EventSegment } from '@/types/calendar.types'
import type { ResizeEdge } from '@/utils/dnd.utils'
import type { DragSegment } from '@/utils/grab-offset.utils'
import {
	DefaultEventContent,
	type DefaultEventContentProps,
} from './default-event-content'
import { type ResizeGranularity, ResizeHandle } from './resize-handle'

interface DragStateClassInput {
	isDragDisabled: boolean
	disableEventClick: boolean
	isSourceOfDrag: boolean
}

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

interface ResizeEdgesInput {
	segment: EventSegment
	isResizable: boolean
	isResizableFromStart: boolean | undefined
}

const resolveEventBarStyle = (
	event: CalendarEvent,
	style: CSSProperties | undefined
): CSSProperties | undefined => {
	const hasOwnEventColor = Boolean(event.backgroundColor || event.color)
	if (hasOwnEventColor && style?.backgroundColor !== undefined) {
		return { ...style, backgroundColor: undefined }
	}
	return style
}

const getResizeEdges = ({
	segment,
	isResizable,
	isResizableFromStart,
}: ResizeEdgesInput): ResizeEdge[] => {
	const edges: ResizeEdge[] = []
	if (isResizable && segment.isStart && isResizableFromStart) {
		edges.push('start')
	}
	if (isResizable && segment.isEnd) {
		edges.push('end')
	}
	return edges
}

interface DraggableEventProps {
	elementId: string
	className?: string
	style?: CSSProperties
	event: CalendarEvent
	disableDrag?: boolean
	sourceResourceId?: string | number
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
	dragSegment?: DragSegment
	isBeingDragged?: boolean
	resizeGranularity?: ResizeGranularity
}

interface KeyboardInput {
	isMoveBlocked: boolean
	isClickable: boolean
	open: () => void
}

const getKeyboardProps = ({
	isMoveBlocked,
	isClickable,
	open,
}: KeyboardInput) => {
	if (!isClickable) {
		return undefined
	}
	const openOnEnterOrSpace = (keyEvent: KeyboardEvent<HTMLDivElement>) => {
		const isPressedOnBar = keyEvent.target === keyEvent.currentTarget
		const isActivationKey = keyEvent.key === 'Enter' || keyEvent.key === ' '
		if (!(isPressedOnBar && isActivationKey)) {
			return
		}
		keyEvent.preventDefault()
		open()
	}
	const focusableButton = isMoveBlocked
		? { role: 'button', tabIndex: 0 }
		: undefined
	return { ...focusableButton, onKeyDown: openOnEnterOrSpace }
}

interface DraggableBarInput {
	elementId: string
	event: CalendarEvent
	sourceResourceId?: string | number
	dragSegment?: DragSegment
	resizeGranularity?: ResizeGranularity
	isMoveBlocked: boolean
	hasResizeHandles: boolean
}

const useDraggableBar = ({
	elementId,
	event,
	sourceResourceId,
	dragSegment,
	resizeGranularity,
	isMoveBlocked,
	hasResizeHandles,
}: DraggableBarInput) => {
	const barRef = useRef<HTMLElement | null>(null)
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: elementId,
		data: {
			event,
			type: 'calendar-event',
			sourceResourceId,
			dragSegment,
			resizeGranularity,
			getBarRect: () => barRef.current?.getBoundingClientRect(),
		},
		disabled: isMoveBlocked && !hasResizeHandles,
	})

	const registerBar = (node: HTMLElement | null) => {
		barRef.current = node
		setNodeRef(node)
	}

	const dragAttributes = isMoveBlocked ? undefined : attributes
	const barListeners = isMoveBlocked ? undefined : listeners
	const handleListeners = isMoveBlocked ? listeners : undefined

	return {
		registerBar,
		dragProps: { ...dragAttributes, ...barListeners },
		handleListeners,
		isDragging,
	}
}

interface EventBarPresentationInput {
	event: CalendarEvent
	className?: string
	style?: CSSProperties
	isMoveBlocked: boolean
	disableEventClick: boolean
	isSourceOfDrag: boolean
}

const useEventBarPresentation = ({
	event,
	className,
	style,
	isMoveBlocked,
	disableEventClick,
	isSourceOfDrag,
}: EventBarPresentationInput) => {
	const { cursorClass, draggingClass } = getDragStateClasses({
		isDragDisabled: isMoveBlocked,
		disableEventClick,
		isSourceOfDrag,
	})
	const eventBarSlot = useSlotProps('eventBar', {
		structuralClassName: cn(
			'group/event relative align-top overflow-clip text-ellipsis whitespace-nowrap h-full w-full',
			cursorClass,
			draggingClass
		),
		extraClassName: className,
		style,
	})
	const resolvedStyle = resolveEventBarStyle(event, eventBarSlot.style)
	const hasCustomColor = Boolean(event.backgroundColor || event.color)

	return {
		className: eventBarSlot.className,
		style: resolvedStyle,
		customColorAttr: hasCustomColor ? ('true' as const) : undefined,
	}
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
	resizeGranularity,
}: DraggableEventProps) {
	const {
		onEventClick,
		renderEvent,
		disableEventClick,
		editable,
		eventStartEditable,
		eventDurationEditable,
		eventResizableFromStart,
	} = useSmartCalendarContext()
	const editFlags = {
		editable,
		eventStartEditable,
		eventDurationEditable,
	}
	const isStartEditable = resolveStartEditable(event, editFlags)
	const isDurationEditable = resolveDurationEditable(event, editFlags)
	const isMoveBlocked = disableDrag || !isStartEditable

	const segment: EventSegment = {
		isStart: !isTruncatedStart,
		isEnd: !isTruncatedEnd,
	}
	const isResizable = isDurationEditable && resizeGranularity !== undefined
	const resizeEdges = getResizeEdges({
		segment,
		isResizable,
		isResizableFromStart: eventResizableFromStart,
	})
	const { registerBar, dragProps, handleListeners, isDragging } =
		useDraggableBar({
			elementId,
			event,
			sourceResourceId,
			dragSegment,
			resizeGranularity,
			isMoveBlocked,
			hasResizeHandles: resizeEdges.length > 0,
		})

	const bar = useEventBarPresentation({
		event,
		className,
		style,
		isMoveBlocked,
		disableEventClick: Boolean(disableEventClick),
		isSourceOfDrag: isDragging || isBeingDragged,
	})

	const keyboardProps = getKeyboardProps({
		isMoveBlocked,
		isClickable: !disableEventClick,
		open: () => onEventClick(event),
	})

	const content = renderEventContent({
		renderEvent,
		event,
		segment,
		isTruncatedStart,
		isTruncatedEnd,
	})

	return (
		<AnimatedSection
			className={bar.className}
			data-custom-color={bar.customColorAttr}
			data-ilamy-slot="event-bar"
			onClick={(e) => {
				e.stopPropagation()
				onEventClick(event)
			}}
			ref={registerBar}
			style={bar.style}
			transitionKey={elementId}
			{...keyboardProps}
			{...dragProps}
		>
			{content}
			{resizeEdges.map((edge) => (
				<ResizeHandle edge={edge} key={edge} listeners={handleListeners} />
			))}
		</AnimatedSection>
	)
}

const isSameSegment = (a?: DragSegment, b?: DragSegment): boolean => {
	if (!a || !b) {
		return a === b
	}
	const sameSpan =
		isSameInstant(a.start, b.start) && isSameInstant(a.end, b.end)
	return sameSpan && a.axis === b.axis && a.hiddenDays === b.hiddenDays
}

const isSameStyle = (a?: CSSProperties, b?: CSSProperties): boolean => {
	if (!a || !b) {
		return a === b
	}
	const keys = new Set([...Object.keys(a), ...Object.keys(b)])
	return [...keys].every(
		(key) => a[key as keyof CSSProperties] === b[key as keyof CSSProperties]
	)
}

const COMPARED_PROPS = [
	'elementId',
	'disableDrag',
	'className',
	'event',
	'isTruncatedStart',
	'isTruncatedEnd',
	'isBeingDragged',
	'resizeGranularity',
] as const satisfies ReadonlyArray<keyof DraggableEventProps>

export const DraggableEvent = memo(
	DraggableEventUnmemoized,
	(prevProps, nextProps) => {
		const sameProps = COMPARED_PROPS.every(
			(prop) => prevProps[prop] === nextProps[prop]
		)
		const sameSegment = isSameSegment(
			prevProps.dragSegment,
			nextProps.dragSegment
		)
		const sameStyle = isSameStyle(prevProps.style, nextProps.style)
		return sameProps && sameSegment && sameStyle
	}
)
