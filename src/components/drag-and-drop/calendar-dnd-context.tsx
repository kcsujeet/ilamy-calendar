import type {
	DragCancelEvent,
	DragEndEvent,
	DragStartEvent,
} from '@dnd-kit/core'
import {
	DndContext,
	MouseSensor,
	pointerWithin,
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
import { getUpdatedEvent } from './dnd-utils'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const dragOverlayRef = useRef<{
		setActiveEvent: (event: CalendarEvent) => void
	}>(null)

	const { updateEvent, updateRecurringEvent, disableDragAndDrop } =
		useSmartCalendarContext((context) => ({
			updateEvent: context.updateEvent,
			updateRecurringEvent: context.updateRecurringEvent,
			disableDragAndDrop: context.disableDragAndDrop,
		}))

	// State for recurring event dialog
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
		// Require minimal movement before activating
		activationConstraint: {
			distance: 2,
		},
	})

	const touchSensor = useSensor(TouchSensor, {
		// Reduce delay for touch devices
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
		// Validate inputs
		if (!event || !event.id) {
			return
		}

		if (!updates || Object.keys(updates).length === 0) {
			return
		}

		if (isRecurringEvent(event)) {
			// Show dialog for recurring events
			setRecurringDialog({
				isOpen: true,
				event,
				updates,
			})
		} else {
			// Directly update regular events
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

	// Handle recurring event dialog close
	const handleRecurringEventClose = () => {
		setRecurringDialog({ isOpen: false, event: null, updates: null })
	}

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event

		// Set the active event based on the event data
		if (active.data.current?.type === 'calendar-event') {
			dragOverlayRef.current?.setActiveEvent(active.data.current.event)
			activeEventRef.current = active.data.current.event
		}
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const updatedEvent = getUpdatedEvent(event, activeEventRef.current)
		if (updatedEvent) {
			const { activeEvent, updates } = updatedEvent
			performEventUpdate(activeEvent, updates)
		}

		// Clear the active event reference
		activeEventRef.current = null
		dragOverlayRef.current?.setActiveEvent(null)
	}

	const handleDragCancel = (_event: DragCancelEvent) => {
		activeEventRef.current = null
	}

	// If drag and drop is disabled, just return children without DndContext
	if (disableDragAndDrop) {
		return children as React.ReactElement
	}

	return (
		<>
			<DndContext
				sensors={sensors}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
				collisionDetection={pointerWithin}
			>
				{children}
				<EventDragOverlay ref={dragOverlayRef} />
			</DndContext>

			{/* Recurring event edit dialog */}
			<RecurrenceEditDialog
				isOpen={recurringDialog.isOpen}
				onClose={handleRecurringEventClose}
				onConfirm={handleRecurringEventConfirm}
				operationType="edit"
				eventTitle={recurringDialog.event?.title || ''}
			/>
		</>
	)
}
