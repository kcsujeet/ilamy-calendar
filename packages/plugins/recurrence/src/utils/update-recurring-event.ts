import type {
	CalendarEvent,
	Dayjs,
	PluginMutationResult,
} from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import type { RRuleOptions } from '../types'
import {
	findBaseEventIndex,
	getEventParentUID,
	getSeriesTerminationDate,
} from './series-helpers'

/**
 * Keeps the calendar day from `target` while applying the time-of-day from `source`.
 * Used to edit recurring series anchors without shifting the series to an instance day.
 */
const withTimeOfDay = (target: Dayjs, source: Dayjs): Dayjs => {
	const timeOfDayMs = source.diff(source.startOf('day'), 'millisecond')
	return target.startOf('day').add(timeOfDayMs, 'millisecond')
}

/**
 * Builds the new base series produced by a "following" edit: a fresh series id/uid
 * anchored at the target (or submitted) start, carrying the submitted updates.
 */
const buildFollowingSeriesEvent = (
	baseEvent: CalendarEvent,
	targetEvent: CalendarEvent,
	updates: Partial<CalendarEvent>
): CalendarEvent => {
	const originalDuration = baseEvent.end.diff(baseEvent.start)
	const newSeriesStartTime = updates.start || targetEvent.start
	const newSeriesEndTime =
		updates.end || newSeriesStartTime.add(originalDuration)
	const newSeriesId = `${baseEvent.id}_following`
	const newSeriesUID = `${newSeriesId}@ilamy.calendar`

	return {
		...baseEvent,
		...updates,
		rrule: {
			...baseEvent.rrule,
			...updates.rrule,
			dtstart: newSeriesStartTime.toDate(),
		} as RRuleOptions,
		id: newSeriesId,
		uid: newSeriesUID,
		start: newSeriesStartTime,
		end: newSeriesEndTime,
		recurrenceId: undefined,
	}
}

/**
 * Predicate factory for the "following" edit: a detached override of the same
 * series whose occurrence falls strictly after the split belongs to the new
 * series' span and must be cascaded out, not orphaned in the store.
 */
const makeIsFollowingOverride = (
	parentUid: string,
	terminationDate: Date
): ((event: CalendarEvent) => boolean) => {
	return (event: CalendarEvent): boolean => {
		const isDetachedOverride = Boolean(event.recurrenceId) && !event.rrule
		const belongsToSeries = getEventParentUID(event) === parentUid
		const isAfterSplit =
			Boolean(event.recurrenceId) &&
			dayjs(event.recurrenceId).isAfter(terminationDate)
		return isDetachedOverride && belongsToSeries && isAfterSplit
	}
}

/**
 * For scope "all": apply the submitted wall-clock time to the base event anchor.
 * This keeps the series anchored to its original date while changing its time.
 */
const applyAllScopeUpdates = (
	baseEvent: CalendarEvent,
	updates: Partial<CalendarEvent>
): { start: Dayjs; end: Dayjs; rrule: RRuleOptions | undefined } => {
	let newStart = baseEvent.start
	// if the start has changed keep the same calendar day but with the new time
	if (updates.start) {
		newStart = withTimeOfDay(baseEvent.start, updates.start)
	}

	let newEnd = baseEvent.end
	// ensure the new end is compute so the duration is preserved
	if (updates.start && updates.end) {
		newEnd = newStart.add(updates.end.diff(updates.start), 'millisecond')
	} else if (updates.start) {
		newEnd = newStart.add(baseEvent.end.diff(baseEvent.start), 'millisecond')
	} else if (updates.end) {
		newEnd = withTimeOfDay(baseEvent.end, updates.end)
	}

	const mergedRrule = updates.rrule ?? baseEvent.rrule
	let newRrule: RRuleOptions | undefined
	if (mergedRrule) {
		newRrule = { ...mergedRrule, dtstart: newStart.toDate() }
	}

	return { start: newStart, end: newEnd, rrule: newRrule }
}

interface UpdateRecurringEventProps {
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: 'this' | 'following' | 'all'
}

interface ScopedUpdateContext {
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	updatedEvents: CalendarEvent[]
	baseEventIndex: number
	baseEvent: CalendarEvent
}

/**
 * The EXDATE key for a "this"-scope edit: a stored override keys by its original
 * occurrence (`recurrenceId`); a generated instance keys by its own start.
 */
const getThisScopeRecurrenceId = (
	targetEvent: CalendarEvent,
	isOverrideEvent: boolean
): string => {
	if (isOverrideEvent && targetEvent.recurrenceId) {
		return targetEvent.recurrenceId
	}
	return targetEvent.start.toISOString()
}

interface ReplaceStoredOverrideArgs {
	updatedEvents: CalendarEvent[]
	targetEvent: CalendarEvent
	detachedOverride: CalendarEvent
	updatedBaseEvent: CalendarEvent
	baseChanged: boolean
}

/**
 * Replaces a stored override in place. The base is reported in `updated` only when
 * it actually changed — a consistent store already exdates the occurrence and
 * carries the uid, so reporting it would fire a redundant no-op onEventUpdate.
 */

const replaceStoredOverride = ({
	updatedEvents,
	targetEvent,
	detachedOverride,
	updatedBaseEvent,
	baseChanged,
}: ReplaceStoredOverrideArgs): PluginMutationResult => {
	const overrideIndex = updatedEvents.findIndex((e) => e.id === targetEvent.id)
	if (overrideIndex === -1) {
		throw new Error('Detached override not found')
	}
	updatedEvents[overrideIndex] = detachedOverride
	return {
		events: updatedEvents,
		updated: baseChanged
			? [updatedBaseEvent, detachedOverride]
			: [detachedOverride],
		added: [],
		deleted: [],
	}
}

/**
 * Scope "this": EXDATE on base + a detached override for this occurrence.
 * A generated instance adds a new override row; a stored override updates in place.
 */
const updateThisScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
	const seriesUid = getEventParentUID(baseEvent)
	const isOverrideEvent = Boolean(
		targetEvent.recurrenceId && !targetEvent.rrule
	)
	const recurrenceId = getThisScopeRecurrenceId(targetEvent, isOverrideEvent)

	const existingExdates = baseEvent.exdates || []
	const nextExdates = existingExdates.includes(recurrenceId)
		? existingExdates
		: [...existingExdates, recurrenceId]
	const baseChanged =
		nextExdates !== existingExdates || baseEvent.uid !== seriesUid

	const updatedBaseEvent: CalendarEvent = {
		...baseEvent,
		exdates: nextExdates,
		uid: seriesUid,
	}
	updatedEvents[baseEventIndex] = updatedBaseEvent

	const detachedOverride: CalendarEvent = {
		...targetEvent,
		...updates,
		recurrenceId,
		rrule: undefined,
		uid: seriesUid,
	}

	if (isOverrideEvent) {
		return replaceStoredOverride({
			updatedEvents,
			targetEvent,
			detachedOverride,
			updatedBaseEvent,
			baseChanged,
		})
	}

	const modifiedEvent: CalendarEvent = {
		...detachedOverride,
		id: `${baseEvent.id}_modified_${Date.now()}`,
	}
	updatedEvents.push(modifiedEvent)
	return {
		events: updatedEvents,
		updated: [updatedBaseEvent],
		added: [modifiedEvent],
		deleted: [],
	}
}

/**
 * Scope "following": terminate the original series with UNTIL before the target
 * date and create a new series from the target. Detached overrides of the series
 * whose occurrence falls after the split are cascaded out (reported in `deleted`).
 */
const updateFollowingScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
	const terminationDate = getSeriesTerminationDate(targetEvent)
	const parentUid = getEventParentUID(baseEvent)
	const isFollowingOverride = makeIsFollowingOverride(
		parentUid,
		terminationDate
	)

	// Update original series with UNTIL to end before target date. Drop the
	// exdates that now sit beyond UNTIL (the cascaded overrides' occurrences).
	const cleanedExdates = (baseEvent.exdates ?? []).filter(
		(iso) => !dayjs(iso).isAfter(terminationDate)
	)
	const terminatedEvent = {
		...baseEvent,
		exdates: cleanedExdates,
		rrule: {
			...baseEvent.rrule,
			until: terminationDate,
		} as RRuleOptions,
	}
	updatedEvents[baseEventIndex] = terminatedEvent

	const newSeriesEvent = buildFollowingSeriesEvent(
		baseEvent,
		targetEvent,
		updates
	)
	updatedEvents.push(newSeriesEvent)

	// The new series carries an rrule, so it is never matched as a following
	// override; filter after the push so only the orphaned overrides drop out.
	const followingOverrides = updatedEvents.filter(isFollowingOverride)
	const events = updatedEvents.filter((e) => !isFollowingOverride(e))
	return {
		events,
		updated: [terminatedEvent],
		added: [newSeriesEvent],
		deleted: followingOverrides,
	}
}

/**
 * Scope "all": reset the base recurring event (Google-Calendar behavior). Anchor
 * dates change but the series day is kept; detached overrides are dropped and
 * exceptions cleared, so previously split/deleted occurrences return.
 */
const updateAllScope = ({
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
	const seriesUid = getEventParentUID(baseEvent)
	const anchored = applyAllScopeUpdates(baseEvent, updates)
	const updatedBaseEvent: CalendarEvent = {
		...baseEvent,
		...updates,
		start: anchored.start,
		end: anchored.end,
		rrule: anchored.rrule,
		exdates: undefined,
		uid: seriesUid,
	}
	updatedEvents[baseEventIndex] = updatedBaseEvent

	const isDetachedOverrideOfSeries = (e: CalendarEvent): boolean => {
		const isDetachedOverride = Boolean(e.recurrenceId) && !e.rrule
		const belongsToSeries = getEventParentUID(e) === seriesUid
		return isDetachedOverride && belongsToSeries
	}
	const events = updatedEvents.filter((e) => !isDetachedOverrideOfSeries(e))
	const deletedOverrides = updatedEvents.filter(isDetachedOverrideOfSeries)
	return {
		events,
		updated: [updatedBaseEvent],
		added: [],
		deleted: deletedOverrides,
	}
}

const scopedUpdateHandlers: Record<
	UpdateRecurringEventProps['scope'],
	(context: ScopedUpdateContext) => PluginMutationResult
> = {
	this: updateThisScope,
	following: updateFollowingScope,
	all: updateAllScope,
}

export const updateRecurringEvent = ({
	targetEvent,
	updates,
	currentEvents,
	scope,
}: UpdateRecurringEventProps): PluginMutationResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]

	const handler = scopedUpdateHandlers[scope]
	if (!handler) {
		throw new Error(
			`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
		)
	}

	return handler({
		targetEvent,
		updates,
		updatedEvents,
		baseEventIndex,
		baseEvent,
	})
}
