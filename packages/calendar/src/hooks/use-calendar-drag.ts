import type {
	DragCancelEvent,
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
	SensorDescriptor,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import { useRef, useState } from 'react'
import {
	calculateDropTimes,
	type DropCellData,
	getUpdatedEvent,
} from '@/components/drag-and-drop/dnd-utils'
import type { DragPreviewState } from '@/contexts/drag-preview-context'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	calculateGrabOffset,
	type DragSegment,
	type GrabOffset,
	NO_GRAB_OFFSET,
} from '@/lib/utils/grab-offset'

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
	return sameSpan && sameTarget
}

/**
 * What a drag start says: which event, and how far into it the pointer grabbed.
 * Only a bar drawn by a grid reports the span it covers; without one (the "all
 * events" dialog) the event is grabbed at its start.
 */
const readGrab = (
	{ active, activatorEvent }: DragStartEvent,
	slotDurationMinutes: number
): { calendarEvent: CalendarEvent; grabOffset: GrabOffset } | null => {
	if (active.data.current?.type !== 'calendar-event') {
		return null
	}

	const calendarEvent = active.data.current.event as CalendarEvent
	const segment = active.data.current.dragSegment as DragSegment | undefined
	if (!segment) {
		return { calendarEvent, grabOffset: NO_GRAB_OFFSET }
	}

	return {
		calendarEvent,
		grabOffset: calculateGrabOffset({
			activeEvent: calendarEvent,
			initialRect: active.rect.current.initial,
			activatorEvent,
			segment,
			slotDurationMinutes,
		}),
	}
}

/** Where the dragged event would land, given the cell under the pointer. */
const candidateFor = (
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
	}
}

/** Small movement thresholds, so a drag starts without feeling sticky. */
const useDragSensors = () => {
	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: { distance: 2 },
	})
	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: { delay: 100, tolerance: 5 },
	})
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
	const slotDuration = useSmartCalendarContext(
		(context) => context.slotDuration
	)
	const sensors = useDragSensors()
	const activeEventRef = useRef<CalendarEvent>(null)
	const grabOffsetRef = useRef<GrabOffset>(NO_GRAB_OFFSET)
	const overlayRef = useRef<DragOverlayHandle | null>(null)
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)

	const endDrag = () => {
		activeEventRef.current = null
		grabOffsetRef.current = NO_GRAB_OFFSET
		setDragPreview(null)
		overlayRef.current?.setActiveEvent(null)
	}

	const onDragStart = (event: DragStartEvent) => {
		const grabbed = readGrab(event, slotDuration)
		if (!grabbed) {
			return
		}
		overlayRef.current?.setActiveEvent(grabbed.calendarEvent)
		activeEventRef.current = grabbed.calendarEvent
		grabOffsetRef.current = grabbed.grabOffset
	}

	const onDragOver = (event: DragOverEvent) => {
		const activeEvent = activeEventRef.current
		if (!activeEvent || !event.over) {
			setDragPreview(null)
			return
		}

		const nextPreview = candidateFor(
			activeEvent,
			event.over.data.current,
			grabOffsetRef.current
		)

		setDragPreview((prev) => {
			if (isSameDrop(prev, nextPreview)) {
				return prev
			}
			return nextPreview
		})
	}

	const onDragEnd = (event: DragEndEvent) => {
		const dropped = getUpdatedEvent(
			event,
			activeEventRef.current,
			grabOffsetRef.current
		)
		if (dropped) {
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
