import type { CalendarEvent, PluginMutationResult } from '@ilamy/calendar'
import type { RRuleOptions } from '../types'
import {
	addExdateToBaseEvent,
	findBaseEventIndex,
	getEventParentUID,
	getOccurrenceStartISO,
	getSeriesTerminationDate,
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
 * Scope "following": terminate the series with UNTIL set before the target date,
 * keeping the last pre-target occurrence.
 */
const deleteFollowingScope = ({
	targetEvent,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedDeleteContext): PluginMutationResult => {
	const terminatedEvent = {
		...baseEvent,
		rrule: {
			...baseEvent.rrule,
			until: getSeriesTerminationDate(targetEvent),
		} as RRuleOptions,
	}
	updatedEvents[baseEventIndex] = terminatedEvent
	return {
		events: updatedEvents,
		updated: [terminatedEvent],
		added: [],
		deleted: [],
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
