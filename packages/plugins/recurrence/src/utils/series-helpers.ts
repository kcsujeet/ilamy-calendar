import type { CalendarEvent } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'
import { toFloatingDate } from './floating-time'

export const isRecurringEvent = (event: CalendarEvent): boolean => {
	return Boolean(event.rrule || event.recurrenceId || event.uid)
}

/**
 * Consistently derives a parent UID from an event.
 * Uses the explicit `uid` if available, otherwise falls back to `${id}@ilamy.calendar`.
 */
export const getEventParentUID = (event: CalendarEvent): string => {
	return event.uid || `${event.id}@ilamy.calendar`
}

/**
 * Finds the base recurring event (the one with rrule and no recurrenceId)
 * that shares the same parent UID as the target event.
 * Throws if not found — callers assume the series exists.
 */
export const findBaseEventIndex = (
	events: CalendarEvent[],
	targetEvent: CalendarEvent
): number => {
	const targetUid = getEventParentUID(targetEvent)
	const index = events.findIndex((candidate) => {
		const belongsToSeries = getEventParentUID(candidate) === targetUid
		const isBaseSeries = Boolean(candidate.rrule) && !candidate.recurrenceId
		return belongsToSeries && isBaseSeries
	})
	if (index === -1) {
		throw new Error('Base recurring event not found')
	}
	return index
}

/**
 * RFC 5545 RECURRENCE-ID: for detached overrides, the original occurrence
 * start is stored on recurrenceId; generated instances use their start.
 */
export const getOccurrenceStartISO = (event: CalendarEvent): string =>
	event.recurrenceId ?? event.start.toISOString()

/**
 * How many occurrences the series has strictly before `occurrenceStartISO`.
 * EXDATEd ones count: COUNT is applied before EXDATE removes anything
 * (RFC 5545 §3.3.10, §3.8.5.3). Zero means the occurrence is the series' first.
 */
export const countOccurrencesBefore = (
	baseEvent: CalendarEvent,
	occurrenceStartISO: string
): number => {
	const { rrule } = baseEvent
	if (!rrule) {
		return 0
	}
	// Floating time, as `generateRecurringEvents` evaluates the rule.
	const floatingStart = toFloatingDate(baseEvent.start)
	const floatingUntil = rrule.until
		? toFloatingDate(dayjs(rrule.until))
		: undefined
	const rule = new RRule({
		...rrule,
		dtstart: floatingStart,
		until: floatingUntil,
	})
	const floatingOccurrence = toFloatingDate(dayjs(occurrenceStartISO))
	// `between` includes its lower bound, so start one millisecond early to count DTSTART.
	const beforeDtstart = new Date(floatingStart.getTime() - 1)
	return rule.between(beforeDtstart, floatingOccurrence, false).length
}

/**
 * Cuts a series so it ends the day before one of its occurrences, for the
 * "following" scope of edit and delete. The occurrence is named by its ORIGINAL
 * start, so a moved occurrence cuts where it came from, not where it now is.
 *
 * - UNTIL replaces COUNT: "The UNTIL or COUNT rule parts ... MUST NOT occur in
 *   the same 'recur'" (RFC 5545 §3.3.10).
 * - EXDATEs after the cut go, they exclude nothing any more.
 * - `isFollowingOverride` matches the detached overrides of the series that
 *   fall after the cut: they no longer belong to it, so the caller removes and
 *   reports them (#315).
 */
export const cutSeriesBefore = (
	baseEvent: CalendarEvent,
	occurrenceStartISO: string
): {
	terminatedEvent: CalendarEvent
	isFollowingOverride: (event: CalendarEvent) => boolean
} => {
	const terminationDate = dayjs(occurrenceStartISO)
		.subtract(1, 'day')
		.endOf('day')
		.toDate()
	const keptExdates = (baseEvent.exdates ?? []).filter(
		(iso) => !dayjs(iso).isAfter(terminationDate)
	)
	const terminatedEvent: CalendarEvent = {
		...baseEvent,
		exdates: keptExdates,
		rrule: {
			...baseEvent.rrule,
			count: undefined,
			until: terminationDate,
		} as RRuleOptions,
	}

	const parentUid = getEventParentUID(baseEvent)
	const isFollowingOverride = (event: CalendarEvent): boolean => {
		const isDetachedOverride = Boolean(event.recurrenceId) && !event.rrule
		const belongsToSeries = getEventParentUID(event) === parentUid
		const isAfterCut = dayjs(event.recurrenceId).isAfter(terminationDate)
		return isDetachedOverride && belongsToSeries && isAfterCut
	}
	return { terminatedEvent, isFollowingOverride }
}

/**
 * Appends the target occurrence's start to the base event's EXDATE list,
 * excluding that single occurrence from the series. Shared by the "this" scope
 * of both edit and delete.
 */
export const addExdateToBaseEvent = (
	baseEvent: CalendarEvent,
	targetEvent: CalendarEvent
): { baseEvent: CalendarEvent; targetEventStartISO: string } => {
	const targetEventStartISO = getOccurrenceStartISO(targetEvent)
	const existingExdates = baseEvent.exdates || []
	const updatedExdates = existingExdates.includes(targetEventStartISO)
		? existingExdates
		: [...existingExdates, targetEventStartISO]
	return {
		baseEvent: { ...baseEvent, exdates: updatedExdates },
		targetEventStartISO,
	}
}
