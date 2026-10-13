import type {
	DragCancelEvent,
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
	SensorDescriptor,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { useEffect, useRef, useState } from 'react'
import {
	calculateDropTimes,
	calculateResizeTimes,
	type DropCellData,
	getCellSpan,
	getUpdatedEvent,
	isTimeSlotDrop,
	type ResizeEdge,
} from '@/features/calendar/components/drag-and-drop/dnd-utils'
import type { ResizeGranularity } from '@/features/calendar/components/draggable-event/resize-handle'
import {
	isOutsideBusinessHours,
	isPaddingDay,
} from '@/features/calendar/hooks/use-is-cell-unavailable'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { DragPreviewState } from '@/features/calendar/stores/drag-preview-context'
import { getDragCursor } from '@/features/calendar/utils/drag-preview'
import {
	calculateGrabOffset,
	type DragSegment,
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/features/calendar/utils/grab-offset'

/** The overlay the drag chip renders into, imperatively driven by the drag. */
interface DragOverlayHandle {
	setActiveEvent: (event: CalendarEvent | null) => void
}

interface CalendarDrag {
	sensors: SensorDescriptor<Record<string, unknown>>[]
	dragPreview: DragPreviewState | null
	overlayRef: React.RefObject<DragOverlayHandle | null>
	handlers: {
		onDragStart: (event: DragStartEvent) => void
		onDragOver: (event: DragOverEvent) => void
		onDragEnd: (event: DragEndEvent) => void
		onDragCancel: (event: DragCancelEvent) => void
	}
}

/** The consumer's answer for the last placement it was asked about. */
interface EventAllowVerdict {
	placement: DragPreviewState
	isAllowed: boolean
}

/**
 * Whether two candidate placements describe the same drop. The preview is
 * recomputed on every drag-over tick, so without this the provider re-renders
 * the whole grid for a pointer move inside one cell.
 */
const isSameDrop = (
	previous: DragPreviewState | null,
	next: DragPreviewState
): boolean => {
	if (!previous) {
		return false
	}
	const sameSpan =
		previous.start.isSame(next.start) && previous.end.isSame(next.end)
	const sameTarget =
		previous.resourceId === next.resourceId && previous.allDay === next.allDay
	// Validity is part of the identity: crossing from an open day to a closed one
	// can leave the span untouched, and skipping the update there would strand
	// the not-allowed cursor on the wrong half of the drag.
	const sameValidity = previous.isDropAllowed === next.isDropAllowed
	return sameSpan && sameTarget && sameValidity
}

/**
 * What a drag start says: which event, and how far into it the pointer grabbed.
 * Only a bar drawn by a grid reports the span it covers; without one (the "all
 * events" dialog) the event is grabbed at its start.
 */
/** Everything the grab needs except the rect, which does not exist yet. */
interface PendingGrab {
	calendarEvent: CalendarEvent
	segment: DragSegment
	activatorEvent: Event
	/**
	 * The bar's box as it was when the pointer went down. Measured then, not
	 * later: the pointer coordinate is from that instant, and pairing it with a
	 * rect read after a scroll or reflow computes the grab against geometry the
	 * pointer never saw.
	 */
	barRect?: DOMRect
}

const readGrab = ({
	active,
	activatorEvent,
}: DragStartEvent): {
	calendarEvent: CalendarEvent
	pending: PendingGrab | null
} | null => {
	if (active.data.current?.type !== 'calendar-event') {
		return null
	}

	const calendarEvent = active.data.current.event as CalendarEvent
	const segment = active.data.current.dragSegment as DragSegment | undefined
	if (!segment) {
		return { calendarEvent, pending: null }
	}

	const getBarRect = active.data.current.getBarRect as
		| (() => DOMRect | undefined)
		| undefined

	return {
		calendarEvent,
		pending: {
			calendarEvent,
			segment,
			activatorEvent,
			barRect: getBarRect?.(),
		},
	}
}

/** Which edge of which event a resize handle was grabbed on, and where it was drawn. */
interface ResizeGrab {
	edge: ResizeEdge
	granularity: ResizeGranularity
	/** The resource lane the handle's bar was drawn in; a resize never leaves it. */
	sourceResourceId?: string | number
}

const readResize = ({
	active,
}: DragStartEvent): {
	calendarEvent: CalendarEvent
	resize: ResizeGrab
} | null => {
	const data = active.data.current
	if (data?.type !== 'calendar-event-resize') {
		return null
	}
	const { edge, granularity, sourceResourceId } = data
	return {
		calendarEvent: data.event as CalendarEvent,
		resize: { edge, granularity, sourceResourceId },
	}
}

/**
 * Where the resized event would land, given the cell under the pointer. A
 * resize that makes no span, or hovers a cell of the other component (the
 * all-day row against the time grid), leaves the event as it was: nothing to
 * commit and nothing to refuse, as FullCalendar confines a resize to the
 * component it started in (`interaction.ts:44-48`, v7.1.1).
 */
const getResizePlacement = (
	resizedEvent: CalendarEvent,
	resize: ResizeGrab,
	overData: DropCellData | undefined,
	isClosedOnOwnLane: boolean
): DragPreviewState => {
	const unchanged: DragPreviewState = {
		event: resizedEvent,
		start: resizedEvent.start,
		end: resizedEvent.end,
		resourceId: resize.sourceResourceId ?? resizedEvent.resourceId,
		allDay: Boolean(resizedEvent.allDay),
		isDropAllowed: true,
	}
	if (!overData) {
		return unchanged
	}
	const isSlotBar = resize.granularity === 'slot'
	const isOverOtherComponent = isTimeSlotDrop(overData) !== isSlotBar
	if (isOverOtherComponent) {
		return unchanged
	}
	const resized = calculateResizeTimes(resizedEvent, overData, resize.edge)
	if (!resized) {
		return unchanged
	}
	return { ...unchanged, ...resized, isDropAllowed: !isClosedOnOwnLane }
}

/** Where the dragged event would land, given the cell under the pointer. */
const getCandidatePlacement = (
	activeEvent: CalendarEvent,
	overData: DropCellData | undefined,
	grabOffset: GrabOffset
): DragPreviewState => {
	const data = overData ?? {}
	const { start, end, allDay } = calculateDropTimes(
		activeEvent,
		data,
		grabOffset
	)
	return {
		event: activeEvent,
		start,
		end,
		resourceId: data.resourceId ?? activeEvent.resourceId,
		allDay,
		isDropAllowed: !data.disabled,
	}
}

/**
 * Wears the drag's cursor for the whole page while one is in flight, so the
 * refusal is visible wherever the pointer happens to be rather than only over
 * the cell it is refusing. FullCalendar does the same thing by toggling
 * `fc-not-allowed` on `document.body`; this sets the style directly because
 * the library ships no CSS of its own.
 */
const useDragCursor = (dragPreview: DragPreviewState | null) => {
	const cursor = getDragCursor(dragPreview)
	useEffect(() => {
		if (!cursor) {
			return
		}
		const previous = document.body.style.cursor
		document.body.style.cursor = cursor
		// Restores on drop, on cancel, and on unmount mid-drag — leaving a
		// `not-allowed` cursor behind on the whole page would outlive the drag.
		return () => {
			document.body.style.cursor = previous
		}
	}, [cursor])
}

type CellSpan = NonNullable<ReturnType<typeof getCellSpan>>

/*
 * Module constants, not inline literals: dnd-kit's useSensor memoizes on the
 * options object's identity, so a fresh literal made a new sensor list on every
 * render. That rebuilt dnd-kit's internal context, which re-rendered every
 * droppable cell and draggable event whenever this hook's component rendered.
 */
const MOUSE_SENSOR_OPTIONS = { activationConstraint: { distance: 2 } }
const TOUCH_SENSOR_OPTIONS = {
	activationConstraint: { delay: 100, tolerance: 5 },
}

/** Small movement thresholds, so a drag starts without feeling sticky. */
const useDragSensors = () => {
	const mouseSensor = useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS)
	const touchSensor = useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS)
	return useSensors(mouseSensor, touchSensor)
}

/**
 * One drag, from grab to drop: what is being dragged, how far into it the user
 * grabbed, and where it would land right now. The candidate placement is state
 * because the grids paint it; the rest are refs because only the handlers read
 * them, and a re-render per pointer move would cost the whole grid.
 */
export const useCalendarDrag = (
	commitDrop: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void
): CalendarDrag => {
	const {
		slotDuration,
		eventAllow,
		businessHours,
		getResourceById,
		isCellDisabled,
		view,
		currentDate,
	} = useSmartCalendarContext((context) => ({
		slotDuration: context.slotDuration,
		eventAllow: context.eventAllow,
		businessHours: context.businessHours,
		getResourceById: context.getResourceById,
		isCellDisabled: context.isCellDisabled,
		view: context.view,
		currentDate: context.currentDate,
	}))
	const sensors = useDragSensors()
	const activeEventRef = useRef<CalendarEvent>(null)
	const grabOffsetRef = useRef<GrabOffset>(NO_GRAB_OFFSET)
	const resizeRef = useRef<ResizeGrab | null>(null)
	const pendingGrabRef = useRef<PendingGrab | null>(null)
	const overlayRef = useRef<DragOverlayHandle | null>(null)
	const eventAllowVerdictRef = useRef<EventAllowVerdict | null>(null)
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
	useDragCursor(dragPreview)

	const endDrag = () => {
		activeEventRef.current = null
		grabOffsetRef.current = NO_GRAB_OFFSET
		resizeRef.current = null
		pendingGrabRef.current = null
		eventAllowVerdictRef.current = null
		setDragPreview(null)
		overlayRef.current?.setActiveEvent(null)
	}

	/**
	 * The consumer's veto on a placement, asked once per distinct placement: the
	 * answer is kept while the pointer stays in it, so a consumer's predicate
	 * runs neither on every pointer move nor again on release.
	 */
	const isAllowedByConsumer = (
		draggedEvent: CalendarEvent,
		placement: DragPreviewState
	): boolean => {
		if (!eventAllow) {
			return true
		}
		const lastVerdict = eventAllowVerdictRef.current
		if (lastVerdict && isSameDrop(lastVerdict.placement, placement)) {
			return lastVerdict.isAllowed
		}
		const { start, end, allDay, resourceId } = placement
		const isAllowed =
			eventAllow({ start, end, allDay, resourceId }, draggedEvent) ?? true
		eventAllowVerdictRef.current = { placement, isAllowed }
		return isAllowed
	}

	/**
	 * Where the dragged event would land on `overData`, and whether that is
	 * allowed: the cell must accept drops and the consumer must not veto it.
	 */
	const getAllowedPlacement = (
		draggedEvent: CalendarEvent,
		overData: DropCellData | undefined
	): DragPreviewState => {
		const resize = resizeRef.current
		if (resize) {
			return getAllowedResizePlacement(draggedEvent, resize, overData)
		}
		const placement = getCandidatePlacement(
			draggedEvent,
			overData,
			grabOffsetRef.current
		)
		const isAllowed =
			placement.isDropAllowed && isAllowedByConsumer(draggedEvent, placement)
		return { ...placement, isDropAllowed: isAllowed }
	}

	const isClosedByBusinessHours = (
		lane: Resource | undefined,
		hovered: DropCellData,
		span: CellSpan
	): boolean => {
		const gridType = isTimeSlotDrop(hovered) ? 'hour' : 'day'
		return isOutsideBusinessHours({
			day: span.start,
			gridType,
			slotDurationMinutes: span.end.diff(span.start, 'minute'),
			businessHours: lane?.businessHours ?? businessHours,
		})
	}

	const isClosedByConsumer = (
		lane: Resource | undefined,
		hovered: DropCellData,
		span: CellSpan
	): boolean =>
		Boolean(
			isCellDisabled?.({ ...span, resource: lane, allDay: hovered.allDay })
		)

	/**
	 * Whether the hovered time is closed on the lane the resize started in, which
	 * is where the event stays: business hours of that lane's resource, the
	 * month's padding days, and the consumer's `isCellDisabled`. The hovered
	 * cell's own `disabled` is about ITS lane, which a resize never moves to.
	 */
	const isClosedOnLane = (
		laneResourceId: string | number | undefined,
		hovered: DropCellData | undefined
	): boolean => {
		const span = hovered ? getCellSpan(hovered) : undefined
		if (!hovered || !span) {
			return false
		}
		const lane =
			laneResourceId === undefined
				? undefined
				: getResourceById?.(laneResourceId)
		const isPadding = isPaddingDay(span.start, view, currentDate)
		return (
			isClosedByBusinessHours(lane, hovered, span) ||
			isPadding ||
			isClosedByConsumer(lane, hovered, span)
		)
	}

	/**
	 * Like `getAllowedPlacement`, for a resize. A resize that changes nothing is
	 * not a placement anyone can refuse, so the consumer is not asked about it.
	 */
	const getAllowedResizePlacement = (
		resizedEvent: CalendarEvent,
		resize: ResizeGrab,
		overData: DropCellData | undefined
	): DragPreviewState => {
		const laneId = resize.sourceResourceId ?? resizedEvent.resourceId
		const isClosed = isClosedOnLane(laneId, overData)
		const placement = getResizePlacement(
			resizedEvent,
			resize,
			overData,
			isClosed
		)
		const isUnchanged =
			placement.start.isSame(resizedEvent.start) &&
			placement.end.isSame(resizedEvent.end)
		const isAllowed =
			placement.isDropAllowed &&
			(isUnchanged || isAllowedByConsumer(resizedEvent, placement))
		return { ...placement, isDropAllowed: isAllowed }
	}

	const onDragStart = (event: DragStartEvent) => {
		const resizeGrab = readResize(event)
		if (resizeGrab) {
			// No chip for a resize: the snapped preview in the grid is the feedback.
			activeEventRef.current = resizeGrab.calendarEvent
			resizeRef.current = resizeGrab.resize
			return
		}
		const grabbed = readGrab(event)
		if (!grabbed) {
			return
		}
		overlayRef.current?.setActiveEvent(grabbed.calendarEvent)
		activeEventRef.current = grabbed.calendarEvent
		grabOffsetRef.current = NO_GRAB_OFFSET
		pendingGrabRef.current = grabbed.pending
	}

	/**
	 * Measures the grab as soon as there is a rect to measure it against.
	 *
	 * The RECT is captured at drag start, where the pointer coordinate also comes
	 * from, so the two describe the same instant. Only the arithmetic waits: it
	 * runs here because this is the first moment the offset is needed, and
	 * because dnd-kit's own `active.rect.current.initial` (the fallback) is
	 * still null at drag start.
	 */
	const resolveGrabOffset = (event: DragOverEvent) => {
		const pending = pendingGrabRef.current
		if (!pending) {
			return
		}
		// The bar's own box first: dnd-kit measures a time-grid bar as its label.
		const initialRect = pending.barRect ?? event.active.rect.current.initial
		if (!initialRect) {
			return
		}
		grabOffsetRef.current = calculateGrabOffset({
			activeEvent: pending.calendarEvent,
			initialRect,
			activatorEvent: pending.activatorEvent,
			segment: pending.segment,
			slotDurationMinutes: slotDuration,
		})
		pendingGrabRef.current = null
	}

	const onDragOver = (event: DragOverEvent) => {
		resolveGrabOffset(event)
		const activeEvent = activeEventRef.current
		if (!activeEvent || !event.over) {
			setDragPreview(null)
			return
		}

		const nextPreview = getAllowedPlacement(
			activeEvent,
			event.over.data.current
		)

		setDragPreview((prev) => {
			if (isSameDrop(prev, nextPreview)) {
				return prev
			}
			return nextPreview
		})
	}

	const commitResize = (
		resizedEvent: CalendarEvent,
		resize: ResizeGrab,
		releasedOn: DropCellData | undefined
	) => {
		const placement = getAllowedResizePlacement(
			resizedEvent,
			resize,
			releasedOn
		)
		const { start, end } = placement
		const isChanged =
			!start.isSame(resizedEvent.start) || !end.isSame(resizedEvent.end)
		if (placement.isDropAllowed && isChanged) {
			commitDrop(resizedEvent, { start, end })
		}
	}

	const onDragEnd = (event: DragEndEvent) => {
		const resize = resizeRef.current
		const resizedEvent = activeEventRef.current
		if (resize && resizedEvent) {
			commitResize(resizedEvent, resize, event.over?.data.current)
			endDrag()
			return
		}
		const dropped = getUpdatedEvent(
			event,
			activeEventRef.current,
			grabOffsetRef.current
		)
		// Decided from the release itself, not from the last hover: dnd-kit fires
		// drag-over from an effect, so a fast release can arrive before it.
		const activeEvent = activeEventRef.current
		const releasedOn = event.over?.data.current
		const placement = activeEvent
			? getAllowedPlacement(activeEvent, releasedOn)
			: null
		const isRefused = placement?.isDropAllowed === false
		if (dropped && !isRefused) {
			commitDrop(dropped.activeEvent, dropped.updates)
		}
		endDrag()
	}

	return {
		sensors,
		dragPreview,
		overlayRef,
		handlers: { onDragStart, onDragOver, onDragEnd, onDragCancel: endDrag },
	}
}
