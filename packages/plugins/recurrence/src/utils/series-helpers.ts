import type { CalendarEvent } from '@ilamy/calendar'
import {
	endOf,
	isAfter,
	now,
	parseDate,
	resolveZone,
	subtract,
	toDate,
	toUtcIso,
} from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'
import { toFloatingDate } from './floating-time'

export const isRecurringEvent = (event: CalendarEvent): boolean =>
	Boolean(event.rrule || event.recurrenceId || event.uid)

export const getEventParentUID = (event: CalendarEvent): string =>
	event.uid || `${event.id}@ilamy.calendar`

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
 * start is stored on `recurrenceId`; generated instances use their start in UTC ISO.
 */
export const getOccurrenceStartISO = (event: CalendarEvent): string => {
	if (event.recurrenceId) {
		return event.recurrenceId
	}
	const parsed = parseDate(event.start, event.timezone)
	return parsed ? toUtcIso(parsed) : event.start
}

export const countOccurrencesBefore = (
	baseEvent: CalendarEvent,
	occurrenceStartISO: string,
	timezone?: string
): number => {
	const { rrule } = baseEvent
	if (!rrule) {
		return 0
	}
	const zone = baseEvent.timezone ?? resolveZone(timezone)
	const baseStart = parseDate(baseEvent.start, zone)
	const occurrenceStart = parseDate(occurrenceStartISO, zone)
	if (!(baseStart && occurrenceStart)) {
		return 0
	}
	const floatingStart = toFloatingDate(baseStart)
	const parsedUntil = rrule.until ? parseDate(rrule.until, zone) : undefined
	const floatingUntil = parsedUntil ? toFloatingDate(parsedUntil) : undefined
	const rule = new RRule({
		...rrule,
		dtstart: floatingStart,
		until: floatingUntil,
	})
	const floatingOccurrence = toFloatingDate(occurrenceStart)
	const beforeDtstart = new Date(floatingStart.getTime() - 1)
	return rule.between(beforeDtstart, floatingOccurrence, false).length
}

export const cutSeriesBefore = (
	baseEvent: CalendarEvent,
	occurrenceStartISO: string,
	timezone?: string
): {
	terminatedEvent: CalendarEvent
	isFollowingOverride: (event: CalendarEvent) => boolean
} => {
	const zone = baseEvent.timezone ?? resolveZone(timezone)
	const occurrenceStart = parseDate(occurrenceStartISO, zone) ?? now(zone)
	const terminationZoned = endOf(subtract(occurrenceStart, 1, 'day'), 'day')
	const terminationDate = toDate(terminationZoned)
	const keptExdates = (baseEvent.exdates ?? []).filter((iso) => {
		const parsed = parseDate(iso, zone)
		return parsed ? !isAfter(parsed, terminationZoned) : true
	})
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
		let parsedRecurrenceId: ReturnType<typeof parseDate>
		if (event.recurrenceId) {
			parsedRecurrenceId = parseDate(event.recurrenceId, zone)
		}
		const isAfterCut = Boolean(
			parsedRecurrenceId && isAfter(parsedRecurrenceId, terminationZoned)
		)
		return isDetachedOverride && belongsToSeries && isAfterCut
	}
	return { terminatedEvent, isFollowingOverride }
}

export const addExdateToBaseEvent = (
	baseEvent: CalendarEvent,
	targetEvent: CalendarEvent
): { baseEvent: CalendarEvent; targetEventStartISO: string } => {
	const targetEventStartISO = getOccurrenceStartISO(targetEvent)
	const existingExdates = baseEvent.exdates || []
	let updatedExdates = existingExdates
	if (!existingExdates.includes(targetEventStartISO)) {
		updatedExdates = [...existingExdates, targetEventStartISO]
	}
	return {
		baseEvent: { ...baseEvent, exdates: updatedExdates },
		targetEventStartISO,
	}
}
