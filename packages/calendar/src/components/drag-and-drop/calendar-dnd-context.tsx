import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
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
import { type DropCellData, getUpdatedEvent } from './dnd-utils'
import { EventDragOverlay } from './event-drag-overlay'

interface CalendarDndContextProps {
	children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
	const dragOriginRef = useRef<DropCellData | null>(null)
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

	const handleDragStart = () => {
		dragOriginRef.current = null
	}

	const handleDragOver = (event: DragOverEvent) => {
		if (dragOriginRef.current !== null) {
			return
		}

		const activeData = event.active.data.current
		if (
			activeData?.type !== 'calendar-event' ||
			activeData.useDestinationTime
		) {
			return
		}

		const overData = event.over?.data.current
		if (!overData?.start) {
			return
		}
		if (overData.type !== 'day-cell' && overData.type !== 'time-cell') {
			return
		}

		dragOriginRef.current = overData as unknown as DropCellData
	}

	const handleDragEnd = (event: DragEndEvent) => {
		const dragOrigin = dragOriginRef.current
		dragOriginRef.current = null
		const updatedEvent = getUpdatedEvent(event, dragOrigin)
		if (updatedEvent) {
			const { activeEvent, updates } = updatedEvent
			performEventUpdate(activeEvent, updates)
		}
	}

	const handleDragCancel = () => {
		dragOriginRef.current = null
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
				onDragOver={handleDragOver}
				onDragStart={handleDragStart}
				sensors={sensors}
			>
				{children}
				<EventDragOverlay />
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
