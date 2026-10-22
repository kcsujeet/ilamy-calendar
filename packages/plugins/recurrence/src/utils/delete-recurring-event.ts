import type { CalendarEvent, PluginMutationResult } from '@ilamy/calendar'
import {
	addExdateToBaseEvent,
	countOccurrencesBefore,
	cutSeriesBefore,
	findBaseEventIndex,
	getEventParentUID,
	getOccurrenceStartISO,
} from './series-helpers'

interface DeleteRecurringEventProps {
	targetEvent: CalendarEvent
	currentEvents: CalendarEvent[]
	scope: 'this' | 'following' | 'all'
}

interface ScopedDeleteContext {
	targetEvent: CalendarEvent
	updatedEvents: CalendarEvent[]
	baseEventIndex: number
	baseEvent: CalendarEvent
}

/**
 * Scope "this": EXDATE the occurrence on the base and drop any detached override
 * for it. Persistence callbacks are mutually exclusive — report `deleted` when a
 * stored override is removed, otherwise report `updated` with the new EXDATE.
 */
const deleteThisScope = ({
	targetEvent,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedDeleteContext): PluginMutationResult => {
	const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
	const parentUid = getEventParentUID(baseEvent)
	const { baseEvent: updatedBaseEvent } = addExdateToBaseEvent(
		baseEvent,
		targetEvent
	)
	updatedEvents[baseEventIndex] = updatedBaseEvent

	const isThisOccurrenceOverride = (e: CalendarEvent): boolean => {
		const isDetachedOverride = Boolean(e.recurrenceId)
		const belongsToSeries = getEventParentUID(e) === parentUid
		const isThisOccurrence = e.recurrenceId === occurrenceStartISO
		return isDetachedOverride && belongsToSeries && isThisOccurrence
	}

	// Capture the dropped override before filtering so it can be reported as a
	// real stored deletion rather than silently vanishing from `events`.
	const droppedOverride = updatedEvents.find(isThisOccurrenceOverride)
	const events = updatedEvents.filter((e) => !isThisOccurrenceOverride(e))

	return {
		events,
		updated: droppedOverride ? [] : [updatedBaseEvent],
		added: [],
		deleted: droppedOverride ? [droppedOverride] : [],
	}
}

/**
 * Scope "all": remove the entire series (base + every detached override sharing
 * the parent uid), reporting all removed rows in `deleted`.
 */
const deleteAllScope = ({
	targetEvent,
	updatedEvents,
}: ScopedDeleteContext): PluginMutationResult => {
	const targetUid = getEventParentUID(targetEvent)
	const deletedSeries = updatedEvents.filter(
		(e) => getEventParentUID(e) === targetUid
	)
	const eventsWithoutTargetSeries = updatedEvents.filter(
		(e) => getEventParentUID(e) !== targetUid
	)
	return {
		events: eventsWithoutTargetSeries,
		updated: [],
		added: [],
		deleted: deletedSeries,
	}
}

/**
 * Scope "following": cut the series before the target's ORIGINAL occurrence
 * (see `cutSeriesBefore`), keeping the last pre-target occurrence. Moved
 * occurrences after the cut go with the series, as they do for "edit this and
 * following"; left behind, they stayed drawn (#315). On the series' first
 * occurrence nothing is kept, so the whole series is removed: cut instead, it
 * would end before it started (RFC 5545 §3.8.5.3: DTSTART is the first
 * instance).
 */
const deleteFollowingScope = (
	context: ScopedDeleteContext
): PluginMutationResult => {
	const { targetEvent, updatedEvents, baseEventIndex, baseEvent } = context
	const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
	const isFirstOccurrence =
		countOccurrencesBefore(baseEvent, occurrenceStartISO) === 0
	if (isFirstOccurrence) {
		return deleteAllScope(context)
	}

	const { terminatedEvent, isFollowingOverride } = cutSeriesBefore(
		baseEvent,
		occurrenceStartISO
	)
	updatedEvents[baseEventIndex] = terminatedEvent
	const followingOverrides = updatedEvents.filter(isFollowingOverride)
	const events = updatedEvents.filter((e) => !isFollowingOverride(e))
	return {
		events,
		updated: [terminatedEvent],
		added: [],
		deleted: followingOverrides,
	}
}

const scopedDeleteHandlers: Record<
	DeleteRecurringEventProps['scope'],
	(context: ScopedDeleteContext) => PluginMutationResult
> = {
	this: deleteThisScope,
	following: deleteFollowingScope,
	all: deleteAllScope,
}

export const deleteRecurringEvent = ({
	targetEvent,
	currentEvents,
	scope,
}: DeleteRecurringEventProps): PluginMutationResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]

	const handler = scopedDeleteHandlers[scope]
	if (!handler) {
		throw new Error(
			`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
		)
	}

	return handler({
		targetEvent,
		updatedEvents,
		baseEventIndex,
		baseEvent,
	})
}
