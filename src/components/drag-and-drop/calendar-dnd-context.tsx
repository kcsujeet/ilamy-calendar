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
import {
	type EventMutationScopeSlotContext,
	SLOT_EVENT_MUTATION_SCOPE,
} from '@/components/calendar-slots'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { getUpdatedEvent } from './dnd-utils'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

const CLOSED_DIALOG = {
	isOpen: false,
	event: null,
	updates: null,
} as const

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const activeEventRef = useRef<CalendarEvent>(null)
	const dragOverlayRef = useRef<{
		setActiveEvent: (event: CalendarEvent | null) => void
	}>(null)

	const {
		updateEvent,
		updateRecurringEvent,
		getEventManager,
		disableDragAndDrop,
	} = useSmartCalendarContext((context) => ({
		updateEvent: context.updateEvent,
		updateRecurringEvent: context.updateRecurringEvent,
		getEventManager: context.getEventManager,
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
		if (!event?.id || !updates || Object.keys(updates).length === 0) {
			return
		}

		const owner = getEventManager(event)
		if (owner?.applyEdit) {
			// Owned events route through the owner's scoped mutation flow: prompt
			// for scope (the owner renders the eventMutationScope slot), then apply.
			setRecurringDialog({ isOpen: true, event, updates })
		} else {
			updateEvent(event.id, updates)
		}
	}

	// Handle recurring event dialog confirmation
	const handleRecurringEventConfirm = (scope: unknown) => {
		if (!recurringDialog.event || !recurringDialog.updates) {
			setRecurringDialog(CLOSED_DIALOG)
			return
		}

		try {
			updateRecurringEvent(recurringDialog.event, recurringDialog.updates, {
				scope: scope as never,
				eventDate: recurringDialog.event.start,
			})
		} catch {
			// Silently handle error and reset dialog state
		} finally {
			setRecurringDialog(CLOSED_DIALOG)
		}
	}

	// Handle recurring event dialog close
	const handleRecurringEventClose = () => {
		setRecurringDialog(CLOSED_DIALOG)
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
			{recurringDialog.isOpen &&
				recurringDialog.event &&
				getEventManager(recurringDialog.event)?.renderSlot?.(
					SLOT_EVENT_MUTATION_SCOPE,
					{
						event: recurringDialog.event,
						operation: 'edit',
						resolve: handleRecurringEventConfirm,
						cancel: handleRecurringEventClose,
					} satisfies EventMutationScopeSlotContext
				)}
		</>
	)
}
