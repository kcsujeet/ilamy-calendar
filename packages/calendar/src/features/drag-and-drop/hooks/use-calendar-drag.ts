import type {
	DragCancelEvent,
	DragEndEvent,
	DragMoveEvent,
	DragStartEvent,
	SensorDescriptor,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { isRangeWithinBusinessHours } from '@ilamy/core'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { MINUTES_PER_HOUR, resolveSnapDuration } from '@ilamy/utils/helpers'
import {
	isSameInstant,
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
} from '@ilamy/utils/temporal'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { DragPreviewState } from '@/stores/drag-preview-context'
import {
	calculateDropTimes,
	calculateResizeTimes,
	type DropCellData,
	getCellSpan,
	getPressedResizeEdge,
	getSnappedOverData,
	getUpdatedEvent,
	isTimeSlotDrop,
	type Pointer,
	type ResizeEdge,
	type ResizeGranularity,
} from '@/utils/dnd.utils'
import { getDragCursor } from '@/utils/drag-preview.utils'
import {
	calculateGrabOffset,
	type DragSegment,
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/utils/grab-offset.utils'

interface DragOverlayHandle {
	setActiveEvent: (event: CalendarEvent | null) => void
}

interface CalendarDrag {
	sensors: SensorDescriptor<Record<string, unknown>>[]
	dragPreview: DragPreviewState | null
	overlayRef: RefObject<DragOverlayHandle | null>
	handlers: {
		onDragStart: (event: DragStartEvent) => void
		onDragMove: (event: DragMoveEvent) => void
		onDragOver: (event: DragMoveEvent) => void
		onDragEnd: (event: DragEndEvent) => void
		onDragCancel: (event: DragCancelEvent) => void
	}
}

interface EventAllowVerdict {
	placement: DragPreviewState
	isAllowed: boolean
}

const isSameDrop = (
	previous: DragPreviewState | null,
	next: DragPreviewState
): boolean => {
	if (!previous) {
		return false
	}
	const sameSpan =
		isSameInstant(previous.start, next.start) &&
		isSameInstant(previous.end, next.end)
	const sameTarget =
		previous.resourceId === next.resourceId && previous.allDay === next.allDay
	const sameValidity = previous.isDropAllowed === next.isDropAllowed
	return sameSpan && sameTarget && sameValidity
}

interface PendingGrab {
	calendarEvent: CalendarEvent
	segment: DragSegment
	activatorEvent: Event
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
		(() => DOMRect | undefined) | undefined
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

interface ResizeGrab {
	edge: ResizeEdge
	granularity: ResizeGranularity
	sourceResourceId?: string | number
}

const readResize = ({
	active,
	activatorEvent,
}: DragStartEvent): {
	calendarEvent: CalendarEvent
	resize: ResizeGrab
} | null => {
	const data = active.data.current
	const edge = getPressedResizeEdge(activatorEvent)
	const granularity = data?.resizeGranularity as ResizeGranularity | undefined
	if (data?.type !== 'calendar-event' || !edge || !granularity) {
		return null
	}
	return {
		calendarEvent: data.event as CalendarEvent,
		resize: { edge, granularity, sourceResourceId: data.sourceResourceId },
	}
}

const getResizePlacement = (
	resizedEvent: CalendarEvent,
	resize: ResizeGrab,
	overData: DropCellData | undefined,
	isClosedOnOwnLane: boolean,
	zone: string
): DragPreviewState => {
	const eventStart = parseDate(resizedEvent.start, zone) ?? now(zone)
	const eventEnd = parseDate(resizedEvent.end, zone) ?? eventStart
	const unchanged: DragPreviewState = {
		event: resizedEvent,
		start: eventStart,
		end: eventEnd,
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

const getCandidatePlacement = (
	activeEvent: CalendarEvent,
	overData: DropCellData | undefined,
	grabOffset: GrabOffset,
	zone: string
): DragPreviewState => {
	const data = overData ?? {}
	if (!data.date) {
		const start = parseDate(activeEvent.start, zone) ?? now(zone)
		const end = parseDate(activeEvent.end, zone) ?? start
		return {
			event: activeEvent,
			start,
			end,
			resourceId: data.resourceId ?? activeEvent.resourceId,
			allDay: Boolean(activeEvent.allDay),
			isDropAllowed: false,
		}
	}
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

const useDragCursor = (dragPreview: DragPreviewState | null) => {
	const cursor = getDragCursor(dragPreview)
	useEffect(() => {
		if (!cursor) {
			return
		}
		const previous = document.body.style.cursor
		document.body.style.cursor = cursor
		return () => {
			document.body.style.cursor = previous
		}
	}, [cursor])
}

type CellSpan = NonNullable<ReturnType<typeof getCellSpan>>

const readPointer = (event: Event): Pointer | undefined => {
	const { clientX, clientY, touches } = event as Partial<
		MouseEvent & TouchEvent
	>
	const point = touches?.item(0) ?? { clientX, clientY }
	if (point.clientX === undefined || point.clientY === undefined) {
		return undefined
	}
	return { x: point.clientX, y: point.clientY }
}

const useLivePointer = () => {
	const pointerRef = useRef<Pointer | undefined>(undefined)
	const stopFollowingRef = useRef<() => void>(() => {})

	const stopFollowing = () => {
		stopFollowingRef.current()
		stopFollowingRef.current = () => {}
		pointerRef.current = undefined
	}

	const follow = (pressedWith: Event) => {
		stopFollowing()
		pointerRef.current = readPointer(pressedWith)
		const onMove = (moved: Event) => {
			pointerRef.current = readPointer(moved) ?? pointerRef.current
		}
		window.addEventListener('pointermove', onMove)
		window.addEventListener('touchmove', onMove)
		stopFollowingRef.current = () => {
			window.removeEventListener('pointermove', onMove)
			window.removeEventListener('touchmove', onMove)
		}
	}

	useEffect(() => () => stopFollowingRef.current(), [])

	return { pointerRef, follow, stopFollowing }
}

const MOUSE_SENSOR_OPTIONS = { activationConstraint: { distance: 2 } }
const TOUCH_SENSOR_OPTIONS = {
	activationConstraint: { delay: 100, tolerance: 5 },
}

const useDragSensors = () => {
	const mouseSensor = useSensor(MouseSensor, MOUSE_SENSOR_OPTIONS)
	const touchSensor = useSensor(TouchSensor, TOUCH_SENSOR_OPTIONS)
	return useSensors(mouseSensor, touchSensor)
}

export const useCalendarDrag = (
	commitDrop: (event: CalendarEvent, updates: Partial<CalendarEvent>) => void
): CalendarDrag => {
	const {
		slotDuration,
		snapDuration,
		eventAllow,
		eventConstraint,
		businessHours,
		getResourceById,
		isCellDisabled,
		timezone,
	} = useSmartCalendarContext((context) => ({
		slotDuration: context.slotDuration,
		snapDuration: context.snapDuration,
		eventAllow: context.eventAllow,
		eventConstraint: context.eventConstraint,
		businessHours: context.businessHours,
		getResourceById: context.getResourceById,
		isCellDisabled: context.isCellDisabled,
		timezone: context.timezone,
	}))
	const zone = resolveZone(timezone)
	const sensors = useDragSensors()
	const activeEventRef = useRef<CalendarEvent>(null)
	const grabOffsetRef = useRef<GrabOffset>(NO_GRAB_OFFSET)
	const resizeRef = useRef<ResizeGrab | null>(null)
	const pendingGrabRef = useRef<PendingGrab | null>(null)
	const overlayRef = useRef<DragOverlayHandle | null>(null)
	const { pointerRef, follow, stopFollowing } = useLivePointer()
	const eventAllowVerdictRef = useRef<EventAllowVerdict | null>(null)
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
	useDragCursor(dragPreview)

	const endDrag = () => {
		stopFollowing()
		activeEventRef.current = null
		grabOffsetRef.current = NO_GRAB_OFFSET
		resizeRef.current = null
		pendingGrabRef.current = null
		eventAllowVerdictRef.current = null
		setDragPreview(null)
		overlayRef.current?.setActiveEvent(null)
	}

	const isAllowedByConstraint = (placement: DragPreviewState): boolean => {
		if (eventConstraint !== 'businessHours') {
			return true
		}
		let targetResource: Resource | undefined
		if (placement.resourceId !== undefined) {
			targetResource = getResourceById?.(placement.resourceId)
		}
		const effectiveHours = targetResource?.businessHours ?? businessHours
		return isRangeWithinBusinessHours({
			start: placement.start,
			end: placement.end,
			allDay: placement.allDay,
			businessHours: effectiveHours,
		})
	}

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
			eventAllow(
				{
					start: toOffsetIso(start),
					end: toOffsetIso(end),
					allDay,
					resourceId,
				},
				draggedEvent
			) ?? true
		eventAllowVerdictRef.current = { placement, isAllowed }
		return isAllowed
	}

	const isClosedByConsumer = (
		lane: Resource | undefined,
		hovered: DropCellData,
		span: CellSpan
	): boolean =>
		Boolean(
			isCellDisabled?.({
				start: toOffsetIso(span.start),
				end: toOffsetIso(span.end),
				resource: lane,
				allDay: hovered.allDay,
			})
		)

	const isClosedOnLane = (
		laneResourceId: string | number | undefined,
		hovered: DropCellData | undefined
	): boolean => {
		const span = hovered ? getCellSpan(hovered) : undefined
		if (!hovered || !span) {
			return false
		}
		let lane: Resource | undefined
		if (laneResourceId !== undefined) {
			lane = getResourceById?.(laneResourceId)
		}
		return isClosedByConsumer(lane, hovered, span)
	}

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
			isClosed,
			zone
		)
		const prevStart = parseDate(resizedEvent.start, zone)
		const prevEnd = parseDate(resizedEvent.end, zone)
		const isUnchanged =
			prevStart !== undefined &&
			prevEnd !== undefined &&
			isSameInstant(placement.start, prevStart) &&
			isSameInstant(placement.end, prevEnd)
		const passesConstraint = isUnchanged || isAllowedByConstraint(placement)
		const passesConsumer =
			isUnchanged || isAllowedByConsumer(resizedEvent, placement)
		const isAllowed =
			placement.isDropAllowed && passesConstraint && passesConsumer
		return { ...placement, isDropAllowed: isAllowed }
	}

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
			grabOffsetRef.current,
			zone
		)
		const isAllowed =
			placement.isDropAllowed &&
			isAllowedByConstraint(placement) &&
			isAllowedByConsumer(draggedEvent, placement)
		return { ...placement, isDropAllowed: isAllowed }
	}

	const onDragStart = (event: DragStartEvent) => {
		follow(event.activatorEvent)
		const resizeGrab = readResize(event)
		if (resizeGrab) {
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

	const getGrabSnapMinutes = (axis: DragSegment['axis']): number => {
		const cellMinutes = axis === 'vertical' ? slotDuration : MINUTES_PER_HOUR
		return resolveSnapDuration(snapDuration, cellMinutes)
	}

	const resolveGrabOffset = (event: DragMoveEvent) => {
		const pending = pendingGrabRef.current
		if (!pending) {
			return
		}
		const initialRect = pending.barRect ?? event.active.rect.current.initial
		if (!initialRect) {
			return
		}
		grabOffsetRef.current = calculateGrabOffset({
			activeEvent: pending.calendarEvent,
			initialRect,
			activatorEvent: pending.activatorEvent,
			segment: pending.segment,
			slotDurationMinutes: getGrabSnapMinutes(pending.segment.axis),
		})
		pendingGrabRef.current = null
	}

	const updatePreview = (event: DragMoveEvent) => {
		resolveGrabOffset(event)
		const activeEvent = activeEventRef.current
		const overData = getSnappedOverData(event.over, pointerRef.current)
		if (!activeEvent || !overData) {
			setDragPreview(null)
			return
		}

		const nextPreview = getAllowedPlacement(activeEvent, overData)
		setDragPreview((prev) =>
			isSameDrop(prev, nextPreview) ? prev : nextPreview
		)
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
		const prevStart = parseDate(resizedEvent.start, zone)
		const prevEnd = parseDate(resizedEvent.end, zone)
		const isChanged =
			!prevStart ||
			!prevEnd ||
			!isSameInstant(placement.start, prevStart) ||
			!isSameInstant(placement.end, prevEnd)
		if (placement.isDropAllowed && isChanged) {
			commitDrop(resizedEvent, {
				start: toOffsetIso(placement.start),
				end: toOffsetIso(placement.end),
			})
		}
	}

	const onDragEnd = (event: DragEndEvent) => {
		const resize = resizeRef.current
		const resizedEvent = activeEventRef.current
		if (resize && resizedEvent) {
			commitResize(
				resizedEvent,
				resize,
				getSnappedOverData(event.over, pointerRef.current)
			)
			endDrag()
			return
		}
		const dropped = getUpdatedEvent(
			event,
			activeEventRef.current,
			grabOffsetRef.current,
			pointerRef.current
		)
		const activeEvent = activeEventRef.current
		const releasedOn = getSnappedOverData(event.over, pointerRef.current)
		let placement: DragPreviewState | null = null
		if (activeEvent) {
			placement = getAllowedPlacement(activeEvent, releasedOn)
		}
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
		handlers: {
			onDragStart,
			onDragMove: updatePreview,
			onDragOver: updatePreview,
			onDragEnd,
			onDragCancel: endDrag,
		},
	}
}
