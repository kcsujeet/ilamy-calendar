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
import type { CalendarEvent } from '@ilamy/types'
import type React from 'react'
import { useRef } from 'react'
import { EventMutationScopeSlot } from '@/components/calendar-slots'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useScopedEventMutation } from '@/hooks/use-scoped-event-mutation'
import { getUpdatedEvent } from './dnd-utils'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const dragOverlayRef = useRef<{
		setActiveEvent: (event: CalendarEvent | null) => void
	}>(null)

	const { updateEvent, getEventManager, disableDragAndDrop } =
		useSmartCalendarContext((context) => ({
			updateEvent: context.updateEvent,
			getEventManager: context.getEventManager,
			disableDragAndDrop: context.disableDragAndDrop,
		}))

	const { dialogState, openEditDialog, closeDialog, handleConfirm } =
		useScopedEventMutation()

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
		const hasNoUpdates = !updates || Object.keys(updates).length === 0
		if (!event?.id || hasNoUpdates) {
			return
		}

		const owner = getEventManager(event)
		if (owner?.applyEdit) {
			// Owned events route through the owner's scoped mutation flow: prompt
			// for scope (the owner renders the eventMutationScope slot), then apply.
			openEditDialog(event, updates)
		} else {
			updateEvent(event.id, updates)
		}
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
				collisionDetection={pointerWithin}
				onDragCancel={handleDragCancel}
				onDragEnd={handleDragEnd}
				onDragStart={handleDragStart}
				sensors={sensors}
			>
				{children}
				<EventDragOverlay ref={dragOverlayRef} />
			</DndContext>

			{/* Scope dialog for the owned event, provided by the owning plugin */}
			<EventMutationScopeSlot
				dialog={dialogState}
				onCancel={closeDialog}
				onResolve={handleConfirm}
			/>
		</>
	)
}
