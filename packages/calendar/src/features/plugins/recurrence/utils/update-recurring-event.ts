import type { CalendarEvent, PluginMutationResult } from '@ilamy/calendar'
import { type ByWeekday, RRule, Weekday } from 'rrule'
import {
	add,
	elapsedDiff,
	getFields,
	isAfter,
	now,
	parseDate,
	resolveZone,
	startOf,
	toDate,
	toOffsetIso,
	toUtcIso,
	wallClockDiff,
	withTime,
	type ZonedDate,
} from '../../../../utils/temporal'
import type { RRuleOptions } from '../types'
import { getNthWeekdayOfMonth } from './recurrence-presets'
import {
	countOccurrencesBefore,
	cutSeriesBefore,
	findBaseEventIndex,
	getEventParentUID,
	getOccurrenceStartISO,
} from './series-helpers'

const mustZoned = (value: string | Date | undefined, zone: string): ZonedDate =>
	parseDate(value, zone) ?? now(zone)

const withTimeOfDay = (target: ZonedDate, source: ZonedDate): ZonedDate =>
	withTime(target, {
		hour: source.hour,
		minute: source.minute,
		second: source.second,
		millisecond: source.millisecond,
	})

const isRepeatRemoved = (updates: Partial<CalendarEvent>): boolean =>
	'rrule' in updates && updates.rrule === undefined

interface FollowingSeriesArgs {
	baseEvent: CalendarEvent
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	occurrencesBefore: number
	zone: string
}

const getFollowingSeriesStart = (
	targetEvent: CalendarEvent,
	editedStart: ZonedDate,
	zone: string
): ZonedDate => {
	const originalStart = mustZoned(getOccurrenceStartISO(targetEvent), zone)
	const targetDay = startOf(mustZoned(targetEvent.start, zone), 'day')
	const editedDay = startOf(editedStart, 'day')
	const daysMoved = Math.round(wallClockDiff(editedDay, targetDay, 'day'))
	return withTimeOfDay(add(originalStart, daysMoved, 'day'), editedStart)
}

const toWeekday = (day: ByWeekday): Weekday => {
	if (typeof day === 'number') {
		return new Weekday(day)
	}
	return typeof day === 'string' ? RRule[day] : day
}

const getRRuleWeekdayNumber = (day: ZonedDate): number =>
	(getFields(day).dayOfWeek + 6) % 7

const weekdayOccursOn = (entry: ByWeekday, day: ZonedDate): boolean => {
	const { weekday, n } = toWeekday(entry)
	const isSameWeekday = weekday === getRRuleWeekdayNumber(day)
	const isSameNth =
		n === undefined || n === getNthWeekdayOfMonth(toDate(day), day.timeZoneId)
	return isSameWeekday && isSameNth
}

const moveWeekday = (entry: ByWeekday, to: ZonedDate): Weekday => {
	const { n } = toWeekday(entry)
	let nth: number | undefined
	if (n !== undefined) {
		nth = getNthWeekdayOfMonth(toDate(to), to.timeZoneId)
	}
	return new Weekday(getRRuleWeekdayNumber(to), nth)
}

const moveEntries = <T>(
	entries: T[],
	occursOn: (entry: T, day: ZonedDate) => boolean,
	move: (entry: T) => T,
	{ from, to }: { from: ZonedDate; to: ZonedDate }
): T[] => {
	const namesNewDay = entries.some((entry) => occursOn(entry, to))
	if (namesNewDay) {
		return entries
	}
	return entries.map((entry) => (occursOn(entry, from) ? move(entry) : entry))
}

const toArray = <T>(value: T | T[]): T[] =>
	Array.isArray(value) ? value : [value]

const moveRuleToStart = (
	rule: RRuleOptions,
	days: { from: ZonedDate; to: ZonedDate }
): RRuleOptions => {
	const { to } = days
	const moved = { ...rule }
	if (rule.byweekday != null) {
		moved.byweekday = moveEntries(
			toArray(rule.byweekday),
			weekdayOccursOn,
			(entry) => moveWeekday(entry, to),
			days
		)
	}
	if (rule.bymonthday != null) {
		moved.bymonthday = moveEntries(
			toArray(rule.bymonthday),
			(date, day) => date === day.day,
			() => to.day,
			days
		)
	}
	if (rule.bymonth != null) {
		moved.bymonth = moveEntries(
			toArray(rule.bymonth),
			(month, day) => month === day.month,
			() => to.month,
			days
		)
	}
	return moved
}

const getFollowingRule = ({
	baseEvent,
	targetEvent,
	updates,
	occurrencesBefore,
	dtstart,
	zone,
}: FollowingSeriesArgs & { dtstart: ZonedDate }): RRuleOptions => {
	const originalStart = mustZoned(getOccurrenceStartISO(targetEvent), zone)
	const mergedRule = moveRuleToStart(
		{ ...baseEvent.rrule, ...updates.rrule } as RRuleOptions,
		{ from: originalStart, to: dtstart }
	)
	const submittedCount = mergedRule.count
	const isCountUnchanged = submittedCount === baseEvent.rrule?.count
	let count = submittedCount
	if (isCountUnchanged && typeof submittedCount === 'number') {
		count = submittedCount - occurrencesBefore
	}
	return { ...mergedRule, count, dtstart: toDate(dtstart) } as RRuleOptions
}

const buildFollowingSeriesEvent = (
	args: FollowingSeriesArgs
): CalendarEvent => {
	const { baseEvent, targetEvent, updates, zone } = args
	const baseStart = mustZoned(baseEvent.start, zone)
	const baseEnd = mustZoned(baseEvent.end, zone)
	const editedStart = mustZoned(updates.start ?? targetEvent.start, zone)
	const newSeriesStart = getFollowingSeriesStart(targetEvent, editedStart, zone)
	let durationMs = elapsedDiff(baseEnd, baseStart, 'millisecond')
	if (updates.end) {
		durationMs = elapsedDiff(
			mustZoned(updates.end, zone),
			editedStart,
			'millisecond'
		)
	}
	const newSeriesEnd = add(newSeriesStart, durationMs, 'millisecond')
	const newSeriesId = `${baseEvent.id}_following`
	const newEvent: CalendarEvent = {
		...baseEvent,
		...updates,
		id: newSeriesId,
		start: toOffsetIso(newSeriesStart),
		end: toOffsetIso(newSeriesEnd),
		recurrenceId: undefined,
	}

	if (isRepeatRemoved(updates)) {
		return { ...newEvent, rrule: undefined, uid: undefined, exdates: undefined }
	}

	const originalStart = mustZoned(getOccurrenceStartISO(targetEvent), zone)
	const carriedExdates = (baseEvent.exdates ?? [])
		.filter((iso) => {
			const parsed = parseDate(iso, zone)
			return Boolean(parsed && isAfter(parsed, originalStart))
		})
		.map((iso) => toUtcIso(withTimeOfDay(mustZoned(iso, zone), editedStart)))
	return {
		...newEvent,
		rrule: getFollowingRule({ ...args, dtstart: newSeriesStart }),
		uid: `${newSeriesId}@ilamy.calendar`,
		exdates: carriedExdates,
	}
}

const applyAllScopeUpdates = (
	baseEvent: CalendarEvent,
	updates: Partial<CalendarEvent>,
	zone: string
): { start: ZonedDate; end: ZonedDate; rrule: RRuleOptions | undefined } => {
	const baseStart = mustZoned(baseEvent.start, zone)
	const baseEnd = mustZoned(baseEvent.end, zone)
	let newStart = baseStart
	if (updates.start) {
		newStart = withTimeOfDay(baseStart, mustZoned(updates.start, zone))
	}

	let newEnd = baseEnd
	if (updates.start && updates.end) {
		const durationMs = elapsedDiff(
			mustZoned(updates.end, zone),
			mustZoned(updates.start, zone),
			'millisecond'
		)
		newEnd = add(newStart, durationMs, 'millisecond')
	} else if (updates.start) {
		const durationMs = elapsedDiff(baseEnd, baseStart, 'millisecond')
		newEnd = add(newStart, durationMs, 'millisecond')
	} else if (updates.end) {
		newEnd = withTimeOfDay(baseEnd, mustZoned(updates.end, zone))
	}

	let mergedRrule = updates.rrule ?? baseEvent.rrule
	if (isRepeatRemoved(updates)) {
		mergedRrule = undefined
	}
	let newRrule: RRuleOptions | undefined
	if (mergedRrule) {
		newRrule = { ...mergedRrule, dtstart: toDate(newStart) }
	}

	return { start: newStart, end: newEnd, rrule: newRrule }
}

interface UpdateRecurringEventProps {
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: 'this' | 'following' | 'all'
	timezone?: string
}

interface ScopedUpdateContext {
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	updatedEvents: CalendarEvent[]
	baseEventIndex: number
	baseEvent: CalendarEvent
	zone: string
}

const getThisScopeRecurrenceId = (
	targetEvent: CalendarEvent,
	isOverrideEvent: boolean,
	zone: string
): string => {
	if (isOverrideEvent && targetEvent.recurrenceId) {
		return targetEvent.recurrenceId
	}
	return toUtcIso(mustZoned(targetEvent.start, zone))
}

interface ReplaceStoredOverrideArgs {
	updatedEvents: CalendarEvent[]
	targetEvent: CalendarEvent
	detachedOverride: CalendarEvent
	updatedBaseEvent: CalendarEvent
	baseChanged: boolean
}

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
	let updated = [detachedOverride]
	if (baseChanged) {
		updated = [updatedBaseEvent, detachedOverride]
	}
	return {
		events: updatedEvents,
		updated,
		added: [],
		deleted: [],
	}
}

const updateThisScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
	zone,
}: ScopedUpdateContext): PluginMutationResult => {
	const seriesUid = getEventParentUID(baseEvent)
	const isOverrideEvent = Boolean(
		targetEvent.recurrenceId && !targetEvent.rrule
	)
	const recurrenceId = getThisScopeRecurrenceId(
		targetEvent,
		isOverrideEvent,
		zone
	)

	const existingExdates = baseEvent.exdates || []
	let nextExdates = existingExdates
	if (!existingExdates.includes(recurrenceId)) {
		nextExdates = [...existingExdates, recurrenceId]
	}
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

const updateFollowingScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
	zone,
}: ScopedUpdateContext): PluginMutationResult => {
	const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
	const occurrencesBefore = countOccurrencesBefore(
		baseEvent,
		occurrenceStartISO,
		zone
	)
	const newSeriesEvent = buildFollowingSeriesEvent({
		baseEvent,
		targetEvent,
		updates,
		occurrencesBefore,
		zone,
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
		occurrenceStartISO,
		zone
	)
	updatedEvents[baseEventIndex] = terminatedEvent
	updatedEvents.push(newSeriesEvent)

	const followingOverrides = updatedEvents.filter(isFollowingOverride)
	const events = updatedEvents.filter((e) => !isFollowingOverride(e))
	return {
		events,
		updated: [terminatedEvent],
		added: [newSeriesEvent],
		deleted: followingOverrides,
	}
}

const updateAllScope = ({
	targetEvent,
	updates,
	updatedEvents,
	baseEventIndex,
	baseEvent,
	zone,
}: ScopedUpdateContext): PluginMutationResult => {
	const seriesUid = getEventParentUID(baseEvent)
	const anchored = applyAllScopeUpdates(baseEvent, updates, zone)
	const staysSeries = Boolean(anchored.rrule)
	const updatedBaseEvent: CalendarEvent = {
		...baseEvent,
		...updates,
		id: baseEvent.id,
		start: toOffsetIso(anchored.start),
		end: toOffsetIso(anchored.end),
		rrule: anchored.rrule,
		exdates: undefined,
		uid: staysSeries ? seriesUid : undefined,
	}
	updatedEvents[baseEventIndex] = updatedBaseEvent

	const targetStart = mustZoned(targetEvent.start, zone)
	const appliedStart = withTimeOfDay(targetStart, anchored.start)
	const durationMs = elapsedDiff(anchored.end, anchored.start, 'millisecond')
	const appliedEnd = add(appliedStart, durationMs, 'millisecond')
	return {
		...replaceSeriesBase(updatedEvents, seriesUid, updatedBaseEvent),
		appliedUpdates: {
			start: toOffsetIso(appliedStart),
			end: toOffsetIso(appliedEnd),
		},
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
	timezone,
}: UpdateRecurringEventProps): PluginMutationResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]
	if (!baseEvent) {
		throw new Error('Base recurring event not found')
	}

	const handler = scopedUpdateHandlers[scope]
	if (!handler) {
		throw new Error(
			`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
		)
	}

	const zone = baseEvent.timezone ?? resolveZone(timezone)
	return handler({
		targetEvent,
		updates,
		updatedEvents,
		baseEventIndex,
		baseEvent,
		zone,
	})
}
