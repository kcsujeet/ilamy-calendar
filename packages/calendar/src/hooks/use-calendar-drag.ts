import type {
	DragCancelEvent,
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
	SensorDescriptor,
} from '@dnd-kit/core'
import { MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import { useEffect, useRef, useState } from 'react'
import {
	calculateDropTimes,
	type DropCellData,
	getUpdatedEvent,
} from '@/components/drag-and-drop/dnd-utils'
import type { DragPreviewState } from '@/contexts/drag-preview-context'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getDragCursor } from '@/lib/utils/drag-preview'
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
	const pendingGrabRef = useRef<PendingGrab | null>(null)
	const overlayRef = useRef<DragOverlayHandle | null>(null)
	const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)
	useDragCursor(dragPreview)

	const endDrag = () => {
		activeEventRef.current = null
		grabOffsetRef.current = NO_GRAB_OFFSET
		pendingGrabRef.current = null
		setDragPreview(null)
		overlayRef.current?.setActiveEvent(null)
	}

	const onDragStart = (event: DragStartEvent) => {
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

		const nextPreview = getCandidatePlacement(
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
