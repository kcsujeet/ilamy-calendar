import type { CalendarEvent } from '@ilamy/types'
import { useCallback, useMemo } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import {
	type ChangeOrigin,
	dispatchMutationResult,
	type MutationCallbacks,
	toMutationResult,
} from './event-changes'

interface PluginMutationsParams extends MutationCallbacks {
	currentEvents: CalendarEvent[]
	pluginRuntime: PluginRuntime
}

export interface PluginMutations {
	applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
}

/**
 * Edit and delete for an event a plugin manages (a recurring series): the
 * plugin works out which stored rows the chosen scope touches, and the result
 * is reported like any other mutation.
 */
export const usePluginMutations = ({
	currentEvents,
	pluginRuntime,
	setCurrentEvents,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
	onEventsChange,
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
			})
			const origin: ChangeOrigin = { action: 'update', event, scope }
			const updatedEvent = { ...event, ...updates }
			const mutationResult = toMutationResult(editResult, origin, updatedEvent)
			dispatchMutationResult(mutationResult, origin, callbacks)
		},
		[currentEvents, pluginRuntime, callbacks]
	)

	const applyScopedDelete = useCallback(
		(event: CalendarEvent, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyDelete) {
				return
			}
			const deleteResult = manager.applyDelete({ event, currentEvents, scope })
			const origin: ChangeOrigin = { action: 'delete', event, scope }
			const mutationResult = toMutationResult(deleteResult, origin, event)
			dispatchMutationResult(mutationResult, origin, callbacks)
		},
		[currentEvents, pluginRuntime, callbacks]
	)

	return { applyScopedEdit, applyScopedDelete }
}
