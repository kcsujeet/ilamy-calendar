import type {
	CalendarEvent,
	EventDelta,
	EventsChange,
	PluginMutationResult,
} from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { wallClockDiff } from '@ilamy/utils/helpers'

/** The callbacks a mutation is reported through, and the store it replaces. */
export interface MutationCallbacks {
	onEventUpdate?: (event: CalendarEvent) => void
	onEventAdd?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
}

/** The user action a change came from: what was done, to which event, in which scope, how far it moved. */
export type ChangeOrigin = Pick<
	EventsChange,
	'action' | 'event' | 'scope' | 'delta'
>

/** A change before its `revert` is attached. */
type ChangeBody = Omit<EventsChange, 'revert'>

/** What `revert` needs: the store's rows before the action, and the store. */
interface RevertContext {
	previousEvents: CalendarEvent[]
	setCurrentEvents: MutationCallbacks['setCurrentEvents']
}

const MILLISECONDS_PER_MINUTE = 60_000

/**
 * The date as the calendar's zone reads it, from its instant. A dayjs date
 * keeps the UTC offset it was built with through `.hour()` and `.add()`, so a
 * start dropped in the hour the clocks skip carries the offset of the hour
 * before and reads 02:30 for the instant that is 01:30. Re-zoning from the
 * instant leaves no offset to be stale.
 */
const inCalendarZone = (date: Dayjs): Dayjs => dayjs(date.valueOf()).tz()

/** The time of day on the wall clock, in milliseconds. */
const wallClockTimeOfDay = (date: Dayjs): number => {
	const midnight = date.startOf('day')
	const minutes = wallClockDiff(date, midnight, 'minute')
	return Math.round(minutes * MILLISECONDS_PER_MINUTE)
}

/**
 * How far `after` is from `before`, the way FullCalendar's `diffDayAndTime`
 * counts it: the difference of the two calendar days, plus the difference of
 * the two wall-clock times. The wall clock, not elapsed time, so a move across
 * a clock change keeps the event at the same time of day.
 */
export const toEventDelta = (before: Dayjs, after: Dayjs): EventDelta => {
	const beforeInZone = inCalendarZone(before)
	const afterInZone = inCalendarZone(after)
	const beforeDay = beforeInZone.startOf('day')
	const afterDay = afterInZone.startOf('day')
	return {
		days: wallClockDiff(afterDay, beforeDay, 'day'),
		milliseconds:
			wallClockTimeOfDay(afterInZone) - wallClockTimeOfDay(beforeInZone),
	}
}

/**
 * How far an update moved the event's start. A timed event that became all-day
 * is measured from the start of its own day, as FullCalendar does for a drag
 * onto the all-day row (EventDragging.ts:454, v7.1.1): a 10:00 event dropped on
 * the next day's all-day row moved one day, not one day less ten hours.
 */
export const toUpdateDelta = (
	before: CalendarEvent,
	after: CalendarEvent
): EventDelta => {
	const becameAllDay = !before.allDay && Boolean(after.allDay)
	const measuredFrom = becameAllDay ? before.start.startOf('day') : before.start
	return toEventDelta(measuredFrom, after.start)
}

/**
 * Undoes an action in the store: drops the rows it added, puts the previous
 * version back over the rows it updated, and re-inserts the rows it deleted
 * where they were. Rows other actions changed since are left alone.
 */
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

/** Attaches the `revert` that undoes the change's rows. */
export const toEventsChange = (
	body: ChangeBody,
	context: RevertContext
): EventsChange => ({ ...body, revert: toRevert(body, context) })

/** The rows an action that touched one stored row put in each list. */
const toRowLists = (action: ChangeOrigin['action'], row: CalendarEvent) => ({
	added: action === 'add' ? [row] : [],
	updated: action === 'update' ? [row] : [],
	deleted: action === 'delete' ? [row] : [],
})

/** The change for an action that touched one stored row, with its `revert`. */
export const toRowChange = (
	origin: ChangeOrigin,
	row: CalendarEvent,
	context: RevertContext
): EventsChange =>
	toEventsChange({ ...origin, ...toRowLists(origin.action, row) }, context)

/**
 * A plugin's `applyEdit` / `applyDelete` returns either the next event list or
 * a structured result. A plain list says only that `row` changed, so it is
 * read as that one row, updated or deleted by the action. The array is the
 * only non-object member, so it is the discriminant.
 */
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

/**
 * Reports a mutation: the per-row callbacks once per stored row that changed,
 * then the store, then the whole action once through `onEventsChange` (#309).
 * `previousEvents` are the store's rows before the action, which `revert` restores.
 */
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
