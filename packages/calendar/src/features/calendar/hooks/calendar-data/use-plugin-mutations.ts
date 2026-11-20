import type { CalendarEvent } from '@ilamy/types'
import { useCallback, useMemo } from 'react'
import type { PluginRuntime } from '@/lib/plugins/types'
import {
	type ChangeOrigin,
	dispatchMutationResult,
	type MutationCallbacks,
	toEventDelta,
	toMutationResult,
	toUpdateDelta,
} from './event-changes'

interface PluginMutationsParams extends MutationCallbacks {
	currentEvents: CalendarEvent[]
	pluginRuntime: PluginRuntime
	timezone?: string
}

export interface PluginMutations {
	applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
}

export const usePluginMutations = ({
	currentEvents,
	pluginRuntime,
	setCurrentEvents,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onEventsChange,
	timezone,
}: PluginMutationsParams): PluginMutations => {
	const callbacks: MutationCallbacks = useMemo(
		() => ({
			setCurrentEvents,
			onEventAdd,
			onEventUpdate,
			onEventDelete,
			onEventsChange,
		}),
		[setCurrentEvents, onEventAdd, onEventUpdate, onEventDelete, onEventsChange]
	)

	const applyScopedEdit = useCallback(
		(event: CalendarEvent, updates: Partial<CalendarEvent>, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyEdit) {
				return
			}
			const editResult = manager.applyEdit({
				event,
				updates,
				currentEvents,
				scope,
				timezone,
			})
			const updatedEvent = { ...event, ...updates }
			const isPlainList = Array.isArray(editResult)
			const appliedUpdates = isPlainList ? undefined : editResult.appliedUpdates
			const storedEvent = { ...event, ...(appliedUpdates ?? updates) }
			const delta = toUpdateDelta(event, storedEvent, timezone)
			const endDelta = toEventDelta(event.end, storedEvent.end, timezone)
			const origin: ChangeOrigin = {
				action: 'update',
				event,
				scope,
				delta,
				endDelta,
			}
			const mutationResult = toMutationResult(editResult, origin, updatedEvent)
			dispatchMutationResult(mutationResult, origin, callbacks, currentEvents)
		},
		[currentEvents, pluginRuntime, callbacks, timezone]
	)

	const applyScopedDelete = useCallback(
		(event: CalendarEvent, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyDelete) {
				return
			}
			const deleteResult = manager.applyDelete({
				event,
				currentEvents,
				scope,
				timezone,
			})
			const origin: ChangeOrigin = { action: 'delete', event, scope }
			const mutationResult = toMutationResult(deleteResult, origin, event)
			dispatchMutationResult(mutationResult, origin, callbacks, currentEvents)
		},
		[currentEvents, pluginRuntime, callbacks, timezone]
	)

	return { applyScopedEdit, applyScopedDelete }
}
