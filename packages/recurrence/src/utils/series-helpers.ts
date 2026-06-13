import type { CalendarEvent } from '@ilamy/calendar'

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
 * For the "following" scope: the UNTIL date that terminates the original
 * series is the end of the day BEFORE the target event's start. This keeps
 * the last pre-target occurrence in the terminated series.
 */
export const getSeriesTerminationDate = (targetEvent: CalendarEvent): Date =>
	targetEvent.start.subtract(1, 'day').endOf('day').toDate()

/**
 * RFC 5545 RECURRENCE-ID: for detached overrides, the original occurrence
 * start is stored on recurrenceId; generated instances use their start.
 */
export const getOccurrenceStartISO = (event: CalendarEvent): string =>
	event.recurrenceId ?? event.start.toISOString()

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
