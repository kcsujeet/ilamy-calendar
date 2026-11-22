import type {
	CalendarEvent,
	EventDelta,
	EventsChange,
	PluginMutationResult,
} from '@ilamy/types'
import { diffDayAndTime, parseDate, startOf } from '@ilamy/utils/temporal'
import type { Dispatch, SetStateAction } from 'react'

/** Callbacks a mutation is reported through, and the store it replaces. */
export interface MutationCallbacks {
	onEventUpdate?: (event: CalendarEvent) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
	setCurrentEvents: Dispatch<SetStateAction<CalendarEvent[]>>
}

export type ChangeOrigin = Pick<
	EventsChange,
	'action' | 'event' | 'scope' | 'delta' | 'endDelta'
>

type ChangeBody = Omit<EventsChange, 'revert'>

interface RevertContext {
	previousEvents: CalendarEvent[]
	setCurrentEvents: MutationCallbacks['setCurrentEvents']
}

/**
 * Wall-clock delta between two ISO instants in `timezone`
 * (FullCalendar `diffDayAndTime`, `marker.ts:48-58`, v7.1.1).
 */
export const toEventDelta = (
	beforeIso: string,
	afterIso: string,
	timezone?: string
): EventDelta => {
	const before = parseDate(beforeIso, timezone)
	const after = parseDate(afterIso, timezone)
	if (!before || !after) {
		return { days: 0, milliseconds: 0 }
	}
	return diffDayAndTime(before, after)
}

/**
 * How far an update moved an event's start. A timed event that became all-day
 * is measured from the start of its own day (FullCalendar `EventDragging.ts:454`).
 */
export const toUpdateDelta = (
	before: CalendarEvent,
	after: CalendarEvent,
	timezone?: string
): EventDelta => {
	const beforeStart = parseDate(before.start, timezone)
	const afterStart = parseDate(after.start, timezone)
	if (!beforeStart || !afterStart) {
		return { days: 0, milliseconds: 0 }
	}
	const becameAllDay = !before.allDay && Boolean(after.allDay)
	const measuredFrom = becameAllDay ? startOf(beforeStart, 'day') : beforeStart
	return diffDayAndTime(measuredFrom, afterStart)
}

const toRevert = (
	{
		added,
		updated,
		deleted,
	}: Pick<ChangeBody, 'added' | 'updated' | 'deleted'>,
	{ previousEvents, setCurrentEvents }: RevertContext
) => {
	const addedIds = new Set(added.map((row) => row.id))
	const updatedIds = new Set(updated.map((row) => row.id))
	const previousById = new Map(previousEvents.map((row) => [row.id, row]))
	const getPreviousIndex = (row: CalendarEvent) =>
		previousEvents.findIndex((previous) => previous.id === row.id)
	const deletedInOldOrder = deleted.toSorted(
		(first, second) => getPreviousIndex(first) - getPreviousIndex(second)
	)

	let hasReverted = false
	return () => {
		if (hasReverted) {
			return
		}
		hasReverted = true

		setCurrentEvents((current) => {
			const currentIds = new Set(current.map((row) => row.id))
			const restored = current
				.filter((row) => !addedIds.has(row.id))
				.map((row) =>
					updatedIds.has(row.id) ? (previousById.get(row.id) ?? row) : row
				)
			for (const row of deletedInOldOrder) {
				if (currentIds.has(row.id)) {
					continue
				}
				const previousRow = previousById.get(row.id) ?? row
				restored.splice(getPreviousIndex(row), 0, previousRow)
			}
			return restored
		})
	}
}

export const toEventsChange = (
	body: ChangeBody,
	context: RevertContext
): EventsChange => ({ ...body, revert: toRevert(body, context) })

const toRowLists = (action: ChangeOrigin['action'], row: CalendarEvent) => ({
	added: action === 'add' ? [row] : [],
	updated: action === 'update' ? [row] : [],
	deleted: action === 'delete' ? [row] : [],
})

export const toRowChange = (
	origin: ChangeOrigin,
	row: CalendarEvent,
	context: RevertContext
): EventsChange =>
	toEventsChange({ ...origin, ...toRowLists(origin.action, row) }, context)

export const toMutationResult = (
	mutationResult: CalendarEvent[] | PluginMutationResult,
	origin: ChangeOrigin,
	row: CalendarEvent
): PluginMutationResult => {
	const isPlainList = Array.isArray(mutationResult)
	if (!isPlainList) {
		return mutationResult
	}
	const { added, updated, deleted } = toRowLists(origin.action, row)
	return { events: mutationResult, added, updated, deleted }
}

export const dispatchMutationResult = (
	mutationResult: PluginMutationResult,
	origin: ChangeOrigin,
	{
		onEventUpdate,
		onEventAdd,
		onEventDelete,
		onEventsChange,
		setCurrentEvents,
	}: MutationCallbacks,
	previousEvents: CalendarEvent[]
): void => {
	for (const storedEvent of mutationResult.updated) {
		onEventUpdate?.(storedEvent)
	}
	for (const storedEvent of mutationResult.added) {
		onEventAdd?.(storedEvent)
	}
	for (const storedEvent of mutationResult.deleted) {
		onEventDelete?.(storedEvent)
	}
	setCurrentEvents(mutationResult.events)
	const body: ChangeBody = {
		...origin,
		added: mutationResult.added,
		updated: mutationResult.updated,
		deleted: mutationResult.deleted,
	}
	onEventsChange?.(toEventsChange(body, { previousEvents, setCurrentEvents }))
}
