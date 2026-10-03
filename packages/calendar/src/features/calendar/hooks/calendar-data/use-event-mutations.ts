import type { CalendarEvent } from '@ilamy/types'
import { useCallback } from 'react'
import {
	type ChangeOrigin,
	type MutationCallbacks,
	rowChange,
} from './event-changes'

interface EventMutationsParams extends MutationCallbacks {
	currentEvents: CalendarEvent[]
}

export interface EventMutations {
	addEvent: (event: CalendarEvent) => void
	updateEvent: (
		eventId: string | number,
		updates: Partial<CalendarEvent>
	) => void
	deleteEvent: (eventId: string | number) => void
}

/**
 * Add, update and delete for one stored row, each reported through its
 * per-row callback and then once through `onEventsChange`.
 */
export const useEventMutations = ({
	currentEvents,
	setCurrentEvents,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onEventsChange,
}: EventMutationsParams): EventMutations => {
	const addEvent = useCallback(
		(event: CalendarEvent) => {
			setCurrentEvents((prev) => [...prev, event])
			onEventAdd?.(event)
			onEventsChange?.(rowChange({ action: 'add', event }, event))
		},
		[setCurrentEvents, onEventAdd, onEventsChange]
	)

	const updateEvent = useCallback(
		(eventId: string | number, updates: Partial<CalendarEvent>) => {
			const eventToUpdate = currentEvents.find((event) => event.id === eventId)
			if (!eventToUpdate) {
				return
			}

			const newEvent = { ...eventToUpdate, ...updates }
			setCurrentEvents((prev) =>
				prev.map((event) => (event.id === eventId ? newEvent : event))
			)
			onEventUpdate?.(newEvent)
			const origin: ChangeOrigin = { action: 'update', event: eventToUpdate }
			onEventsChange?.(rowChange(origin, newEvent))
		},
		[currentEvents, setCurrentEvents, onEventUpdate, onEventsChange]
	)

	const deleteEvent = useCallback(
		(eventId: string | number) => {
			const eventToDelete = currentEvents.find((e) => e.id === eventId)
			if (!eventToDelete) {
				return
			}

			setCurrentEvents((prev) => prev.filter((e) => e.id !== eventId))
			onEventDelete?.(eventToDelete)
			const origin: ChangeOrigin = { action: 'delete', event: eventToDelete }
			onEventsChange?.(rowChange(origin, eventToDelete))
		},
		[currentEvents, setCurrentEvents, onEventDelete, onEventsChange]
	)

	return { addEvent, updateEvent, deleteEvent }
}
