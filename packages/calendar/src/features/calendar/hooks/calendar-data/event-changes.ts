import type {
	CalendarEvent,
	EventsChange,
	PluginMutationResult,
} from '@ilamy/types'

/** The callbacks a mutation is reported through, and the store it replaces. */
export interface MutationCallbacks {
	onEventUpdate?: (event: CalendarEvent) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
}

/** The user action a change came from: what was done, to which event, in which scope. */
export type ChangeOrigin = Pick<EventsChange, 'action' | 'event' | 'scope'>

/** The change for an action that touched one stored row. */
export const rowChange = (
	origin: ChangeOrigin,
	row: CalendarEvent
): EventsChange => ({
	...origin,
	added: origin.action === 'add' ? [row] : [],
	updated: origin.action === 'update' ? [row] : [],
	deleted: origin.action === 'delete' ? [row] : [],
})

/**
 * A plugin's `applyEdit` / `applyDelete` returns either the next event list or
 * a structured result. A plain list says only that `row` changed, so it is
 * read as that one row, updated or deleted by the action. The array is the
 * only non-object member, so it is the discriminant.
 */
export const toMutationResult = (
	result: CalendarEvent[] | PluginMutationResult,
	origin: ChangeOrigin,
	row: CalendarEvent
): PluginMutationResult => {
	const isPlainList = Array.isArray(result)
	if (!isPlainList) {
		return result
	}
	const { added, updated, deleted } = rowChange(origin, row)
	return { events: result, added, updated, deleted }
}

/**
 * Reports a mutation: the per-row callbacks once per stored row that changed,
 * then the store, then the whole action once through `onEventsChange` (#309).
 */
export const dispatchMutationResult = (
	result: PluginMutationResult,
	origin: ChangeOrigin,
	{
		onEventUpdate,
		onEventAdd,
		onEventDelete,
		onEventsChange,
		setCurrentEvents,
	}: MutationCallbacks
): void => {
	for (const storedEvent of result.updated) {
		onEventUpdate?.(storedEvent)
	}
	for (const storedEvent of result.added) {
		onEventAdd?.(storedEvent)
	}
	for (const storedEvent of result.deleted) {
		onEventDelete?.(storedEvent)
	}
	setCurrentEvents(result.events)
	onEventsChange?.({
		...origin,
		added: result.added,
		updated: result.updated,
		deleted: result.deleted,
	})
}
