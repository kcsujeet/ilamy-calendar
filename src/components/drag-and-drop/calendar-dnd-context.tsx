import type {
	DragCancelEvent,
	DragEndEvent,
	DragStartEvent,
} from '@dnd-kit/core'
import {
	DndContext,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core'
import type React from 'react'
import { useRef, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import { RecurrenceEditDialog } from '@/features/recurrence/components/recurrence-edit-dialog'
import type { RecurrenceEditScope } from '@/features/recurrence/types'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

const findDropCellFromPointer = (
	x: number,
	y: number
): {
	type: string
	date: Dayjs
	hour?: number
	minute?: number
	resourceId?: string
	allDay?: boolean
} | null => {
	const elements = document.elementsFromPoint(x, y)
	const cell = elements.find(
		(el) => el instanceof HTMLElement && el.hasAttribute('data-droppable-cell')
	) as HTMLElement | undefined

	if (!cell || cell.getAttribute('data-drop-disabled') === 'true') {
		return null
	}

	const dateStr = cell.getAttribute('data-date')
	if (!dateStr) return null

	const hourAttr = cell.getAttribute('data-hour')
	const minuteAttr = cell.getAttribute('data-minute')
	const resourceId = cell.getAttribute('data-resource-id') ?? undefined
	const allDay = cell.getAttribute('data-allday') === 'true'
	const type = cell.getAttribute('data-cell-type') || 'day-cell'

	return {
		type,
		date: dayjs(dateStr),
		hour: hourAttr !== null ? Number(hourAttr) : undefined,
		minute: minuteAttr !== null ? Number(minuteAttr) : undefined,
		resourceId,
		allDay,
	}
}

const getUpdatedEventFromDrop = (
	dropData: NonNullable<ReturnType<typeof findDropCellFromPointer>>,
	activeEvent: CalendarEvent
) => {
	const isTimeCell = dropData.type === 'time-cell'
	const { resourceId, allDay, date } = dropData

	let newStart: Dayjs
	if (isTimeCell) {
		newStart = date.hour(dropData.hour ?? 0).minute(dropData.minute ?? 0)
	} else {
		newStart = date
	}

	const eventDuration = activeEvent.end.diff(activeEvent.start, 'second')
	let newEnd = newStart.add(eventDuration, 'second')

	if (newEnd.isSame(newEnd.startOf('day'))) {
		newEnd = newEnd.subtract(1, 'day').endOf('day')
	}

	return {
		activeEvent,
		updates: {
			start: newStart,
			end: newEnd,
			resourceId,
			allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
		},
	}
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const dragOverlayRef = useRef<{
		setActiveEvent: (event: CalendarEvent | null) => void
	}>(null)
	const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

	const { updateEvent, updateRecurringEvent, disableDragAndDrop } =
		useSmartCalendarContext((context) => ({
			updateEvent: context.updateEvent,
			updateRecurringEvent: context.updateRecurringEvent,
			disableDragAndDrop: context.disableDragAndDrop,
		}))

	const [recurringDialog, setRecurringDialog] = useState<{
		isOpen: boolean
		event: CalendarEvent | null
		updates: Partial<CalendarEvent> | null
	}>({
		isOpen: false,
		event: null,
		updates: null,
	})

	// Configure sensors with reduced activation constraints for easier dragging
	const mouseSensor = useSensor(MouseSensor, {
		activationConstraint: {
			distance: 2,
		},
	})

	const touchSensor = useSensor(TouchSensor, {
		activationConstraint: {
			delay: 100,
			tolerance: 5,
		},
	})

	const sensors = useSensors(mouseSensor, touchSensor)

	// Helper function to perform the actual event update
	const performEventUpdate = (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>
	) => {
		if (!event || !event.id) {
			return
		}

		if (!updates || Object.keys(updates).length === 0) {
			return
		}

		if (isRecurringEvent(event)) {
			setRecurringDialog({
				isOpen: true,
				event,
				updates,
			})
		} else {
			updateEvent(event.id, updates)
		}
	}

	// Handle recurring event dialog confirmation
	const handleRecurringEventConfirm = (scope: RecurrenceEditScope) => {
		if (!recurringDialog.event || !recurringDialog.updates) {
			setRecurringDialog({ isOpen: false, event: null, updates: null })
			return
		}

		try {
			updateRecurringEvent(recurringDialog.event, recurringDialog.updates, {
				scope,
				eventDate: recurringDialog.event.start,
			})
		} catch {
			// Silently handle error and reset dialog state
		} finally {
			setRecurringDialog({ isOpen: false, event: null, updates: null })
		}
	}

	const handleRecurringEventClose = () => {
		setRecurringDialog({ isOpen: false, event: null, updates: null })
	}

	const pointerHandler = useRef((e: PointerEvent) => {
		pointerRef.current.x = e.clientX
		pointerRef.current.y = e.clientY
	})

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event

		if (active.data.current?.type === 'calendar-event') {
			dragOverlayRef.current?.setActiveEvent(active.data.current.event)
			activeEventRef.current = active.data.current.event
		}

		window.addEventListener('pointermove', pointerHandler.current, {
			passive: true,
		})
	}

	const cleanupDrag = () => {
		window.removeEventListener('pointermove', pointerHandler.current)
	}

	const handleDragEnd = (_event: DragEndEvent) => {
		cleanupDrag()

		if (activeEventRef.current) {
			// Use pointer position + DOM query to find drop target
			const { x, y } = pointerRef.current
			const dropData = findDropCellFromPointer(x, y)

			if (dropData) {
				const result = getUpdatedEventFromDrop(dropData, activeEventRef.current)
				performEventUpdate(result.activeEvent, result.updates)
			}
		}

		activeEventRef.current = null
		dragOverlayRef.current?.setActiveEvent(null)
	}

	const handleDragCancel = (_event: DragCancelEvent) => {
		cleanupDrag()
		activeEventRef.current = null
	}

	// If drag and drop is disabled, just return children without DndContext
	if (disableDragAndDrop) {
		return children as React.ReactElement
	}

	return (
		<>
			<DndContext
				onDragCancel={handleDragCancel}
				onDragEnd={handleDragEnd}
				onDragStart={handleDragStart}
				sensors={sensors}
			>
				{children}
				<EventDragOverlay ref={dragOverlayRef} />
			</DndContext>

			{/* Recurring event edit dialog */}
			<RecurrenceEditDialog
				eventTitle={recurringDialog.event?.title || ''}
				isOpen={recurringDialog.isOpen}
				onClose={handleRecurringEventClose}
				onConfirm={handleRecurringEventConfirm}
				operationType="edit"
			/>
		</>
	)
}
