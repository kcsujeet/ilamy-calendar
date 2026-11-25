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
	timezone?: string
}

interface ScopedDeleteContext {
	targetEvent: CalendarEvent
	updatedEvents: CalendarEvent[]
	baseEventIndex: number
	baseEvent: CalendarEvent
	timezone?: string
}

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

	const droppedOverride = updatedEvents.find(isThisOccurrenceOverride)
	const events = updatedEvents.filter((e) => !isThisOccurrenceOverride(e))

	return {
		events,
		updated: droppedOverride ? [] : [updatedBaseEvent],
		added: [],
		deleted: droppedOverride ? [droppedOverride] : [],
	}
}

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

const deleteFollowingScope = (
	context: ScopedDeleteContext
): PluginMutationResult => {
	const { targetEvent, updatedEvents, baseEventIndex, baseEvent, timezone } =
		context
	const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
	const isFirstOccurrence =
		countOccurrencesBefore(baseEvent, occurrenceStartISO, timezone) === 0
	if (isFirstOccurrence) {
		return deleteAllScope(context)
	}

	const { terminatedEvent, isFollowingOverride } = cutSeriesBefore(
		baseEvent,
		occurrenceStartISO,
		timezone
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
	timezone,
}: DeleteRecurringEventProps): PluginMutationResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]
	if (!baseEvent) {
		throw new Error('Base recurring event not found')
	}

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
		timezone,
	})
}
