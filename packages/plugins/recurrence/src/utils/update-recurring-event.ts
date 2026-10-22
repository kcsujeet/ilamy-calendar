import type {
	CalendarEvent,
	Dayjs,
	PluginMutationResult,
} from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { wallClockDiff } from '@ilamy/utils/helpers'
import type { RRuleOptions } from '../types'
import {
	countOccurrencesBefore,
	cutSeriesBefore,
	findBaseEventIndex,
	getEventParentUID,
	getOccurrenceStartISO,
} from './series-helpers'

/**
 * Keeps the calendar day from `target` while applying the time-of-day from `source`.
 * Used to edit recurring series anchors without shifting the series to an instance day.
 *
 * The time of day is the CLOCK time, not the time elapsed since midnight: on a
 * clock-change day 09:30 is 8.5 or 10.5 hours after midnight, which moved the
 * series an hour (the grid reads clock time too since #311).
 */
const withTimeOfDay = (target: Dayjs, source: Dayjs): Dayjs => {
	const targetDay = target.format('YYYY-MM-DD')
	const sourceTime = source.format('HH:mm:ss.SSS')
	// Offset-less, so it is read in the calendar's zone with the offset in
	// force at that clock time.
	const wallClock = `${targetDay}T${sourceTime}`
	return dayjs(wallClock)
}

/**
 * The form reports `rrule: undefined` when the user unticks Repeat. An update
 * that never touched the rule has no `rrule` key at all (a drag, an untouched
 * form), so the key being present is the signal, not its value.
 */
const isRepeatRemoved = (updates: Partial<CalendarEvent>): boolean =>
	'rrule' in updates && updates.rrule === undefined

interface FollowingSeriesArgs {
	baseEvent: CalendarEvent
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	occurrencesBefore: number
}

/**
 * Where the new series of a "following" edit starts. It is anchored on the
 * ORIGINAL day of the occurrence, shifted by the days the form (or the drag)
 * moved it: a moved occurrence edited without changing its day must not start
 * the series on the day it was moved to, which would lose the days between.
 */
const getFollowingSeriesStart = (
	targetEvent: CalendarEvent,
	editedStart: Dayjs
): Dayjs => {
	const originalStart = dayjs(getOccurrenceStartISO(targetEvent))
	const targetDay = targetEvent.start.startOf('day')
	const editedDay = editedStart.startOf('day')
	const daysMoved = wallClockDiff(editedDay, targetDay, 'day')
	return withTimeOfDay(originalStart.add(daysMoved, 'day'), editedStart)
}

/**
 * The rule of the new series. A rule whose COUNT the user left alone keeps the
 * occurrences that were left, so cutting a 7-occurrence series after 3 gives
 * the new one 4, not 7 (RFC 5545 §3.3.10: COUNT is the number of occurrences
 * of the rule). A COUNT the user changed is what they asked for.
 */
const getFollowingRule = ({
	baseEvent,
	updates,
	occurrencesBefore,
	dtstart,
}: FollowingSeriesArgs & { dtstart: Date }): RRuleOptions => {
	const mergedRule = { ...baseEvent.rrule, ...updates.rrule }
	const submittedCount = mergedRule.count
	const isCountUnchanged = submittedCount === baseEvent.rrule?.count
	const count =
		isCountUnchanged && typeof submittedCount === 'number'
			? submittedCount - occurrencesBefore
			: submittedCount
	return { ...mergedRule, count, dtstart } as RRuleOptions
}

/**
 * Builds the new base series produced by a "following" edit: a fresh series id/uid
 * anchored at the edited occurrence, carrying the submitted updates. With Repeat
 * unticked it is one plain event instead.
 */
const buildFollowingSeriesEvent = (
	args: FollowingSeriesArgs
): CalendarEvent => {
	const { baseEvent, targetEvent, updates } = args
	const editedStart = updates.start ?? targetEvent.start
	const newSeriesStart = getFollowingSeriesStart(targetEvent, editedStart)
	const duration = updates.end
		? updates.end.diff(editedStart)
		: baseEvent.end.diff(baseEvent.start)
	const newSeriesEnd = newSeriesStart.add(duration, 'millisecond')
	const newSeriesId = `${baseEvent.id}_following`
	const newEvent = {
		...baseEvent,
		...updates,
		id: newSeriesId,
		start: newSeriesStart,
		end: newSeriesEnd,
		recurrenceId: undefined,
	}

	if (isRepeatRemoved(updates)) {
		return { ...newEvent, rrule: undefined, uid: undefined, exdates: undefined }
	}

	// The exdates after the original occurrence carry over. Its own is not one
	// of them: a moved occurrence's slot is where the new series begins. They
	// follow the series to its new time of day, because an EXDATE must match the
	// instance's start DATE-TIME exactly (RFC 5545 section 3.8.5.1); left at the
	// old time they match nothing and the deleted days come back.
	const originalStart = dayjs(getOccurrenceStartISO(targetEvent))
	const carriedExdates = (baseEvent.exdates ?? [])
		.filter((iso) => dayjs(iso).isAfter(originalStart))
		.map((iso) => withTimeOfDay(dayjs(iso), editedStart).toISOString())
	return {
		...newEvent,
		rrule: getFollowingRule({ ...args, dtstart: newSeriesStart.toDate() }),
		uid: `${newSeriesId}@ilamy.calendar`,
		exdates: carriedExdates,
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

	const mergedRrule = isRepeatRemoved(updates)
		? undefined
		: (updates.rrule ?? baseEvent.rrule)
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
 * The result of an edit that replaces a series' base row with `replacement`:
 * the series' detached overrides go with it, reported in `deleted`.
 */
const replaceSeriesBase = (
	updatedEvents: CalendarEvent[],
	seriesUid: string,
	replacement: CalendarEvent
): PluginMutationResult => {
	const isDetachedOverrideOfSeries = (e: CalendarEvent): boolean => {
		const isDetachedOverride = Boolean(e.recurrenceId) && !e.rrule
		const belongsToSeries = getEventParentUID(e) === seriesUid
		return isDetachedOverride && belongsToSeries
	}
	return {
		events: updatedEvents.filter((e) => !isDetachedOverrideOfSeries(e)),
		updated: [replacement],
		added: [],
		deleted: updatedEvents.filter(isDetachedOverrideOfSeries),
	}
}

/**
 * Scope "following": cut the original series before the target's ORIGINAL
 * occurrence (see `cutSeriesBefore`) and create a new series from it. Detached
 * overrides of the series that fall after the cut are cascaded out (reported
 * in `deleted`). On the series' first occurrence there is nothing to keep, so
 * the new series replaces the base, like scope "all" (a series that ended
 * before it started would be left behind otherwise).
 */
const updateFollowingScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
	const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
	const occurrencesBefore = countOccurrencesBefore(
		baseEvent,
		occurrenceStartISO
	)
	const newSeriesEvent = buildFollowingSeriesEvent({
		baseEvent,
		targetEvent,
		updates,
		occurrencesBefore,
	})
	const isFirstOccurrence = occurrencesBefore === 0

	if (isFirstOccurrence) {
		const seriesUid = getEventParentUID(baseEvent)
		const staysSeries = Boolean(newSeriesEvent.rrule)
		const replacement: CalendarEvent = {
			...newSeriesEvent,
			id: baseEvent.id,
			uid: staysSeries ? seriesUid : undefined,
		}
		updatedEvents[baseEventIndex] = replacement
		return replaceSeriesBase(updatedEvents, seriesUid, replacement)
	}

	const { terminatedEvent, isFollowingOverride } = cutSeriesBefore(
		baseEvent,
		occurrenceStartISO
	)
	updatedEvents[baseEventIndex] = terminatedEvent
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
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
}: ScopedUpdateContext): PluginMutationResult => {
	const seriesUid = getEventParentUID(baseEvent)
	const anchored = applyAllScopeUpdates(baseEvent, updates)
	const staysSeries = Boolean(anchored.rrule)
	const updatedBaseEvent: CalendarEvent = {
		...baseEvent,
		...updates,
		start: anchored.start,
		end: anchored.end,
		rrule: anchored.rrule,
		exdates: undefined,
		uid: staysSeries ? seriesUid : undefined,
	}
	updatedEvents[baseEventIndex] = updatedBaseEvent

	// What was stored is the time of day, on the day the occurrence was shown:
	// the series keeps its own day, so a drop on another day moved nothing.
	const appliedStart = withTimeOfDay(targetEvent.start, anchored.start)
	const appliedEnd = appliedStart.add(anchored.end.diff(anchored.start))
	return {
		...replaceSeriesBase(updatedEvents, seriesUid, updatedBaseEvent),
		appliedUpdates: { start: appliedStart, end: appliedEnd },
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
