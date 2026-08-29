import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { overlapsRange, safeDate } from '@ilamy/utils/helpers'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'
import { fromFloatingDate, toFloatingDate } from './floating-time'
import { getEventParentUID } from './series-helpers'

interface GenerateRecurringEventsProps {
	event: CalendarEvent
	currentEvents: CalendarEvent[]
	startDate: Dayjs
	endDate: Dayjs
}

export const generateRecurringEvents = ({
	event,
	currentEvents,
	startDate,
	endDate,
}: GenerateRecurringEventsProps): CalendarEvent[] => {
	// If not a recurring event, return empty array
	if (!event.rrule) {
		return []
	}

	try {
		// DTSTART and SEARCH WINDOW TRANSFORMATION
		// Transform all dates to "floating time" (UTC with local components)
		// This ensures RRule evaluates "Wednesday" as the user's local Wednesday
		const floatingStart = toFloatingDate(event.start)
		let floatingUntil: Date | undefined
		if (event.rrule.until) {
			floatingUntil = toFloatingDate(dayjs(event.rrule.until))
		}

		const ruleOptions: RRuleOptions = {
			...event.rrule,
			dtstart: floatingStart,
			until: floatingUntil,
		}
		const rule = new RRule(ruleOptions)

		const parentUid = getEventParentUID(event)
		const overrides = currentEvents.filter((candidate) => {
			const isOverride = Boolean(candidate.recurrenceId)
			const belongsToSeries = getEventParentUID(candidate) === parentUid
			return isOverride && belongsToSeries
		})

		// Calculate event duration to expand search window for events that span the range
		const eventDuration = event.end.diff(event.start)

		// Expand search window backward by event duration to catch events that start before
		// the range but span into it
		const expandedStartDateTime = toFloatingDate(
			startDate.subtract(eventDuration, 'millisecond')
		)
		const endDateTime = toFloatingDate(endDate)

		// Get all occurrences in the expanded range
		const occurrences = rule.between(expandedStartDateTime, endDateTime, true)

		// Convert occurrences to CalendarEvent instances
		const recurringEvents: CalendarEvent[] = occurrences
			.map((occurrence, index) => {
				const occurrenceDate = fromFloatingDate(occurrence, event.start)
				const hasOverride = overrides.some((e) =>
					safeDate(e.recurrenceId)?.isSame(occurrenceDate)
				)

				// An overridden occurrence is rendered from the override row itself,
				// which the plugin's transformEvents emits (merged over this base).
				// Emitting a merged copy here as well put the override on the grid
				// twice as soon as it had been moved: the EXDATE below keys off the
				// ORIGINAL occurrence, so it no longer matched the moved copy's start
				// and stopped suppressing it.
				if (hasOverride) {
					return undefined
				}

				// EXDATE removes this occurrence. Keyed off the occurrence, not off
				// the emitted event's start, so it stays correct however the
				// occurrence is later re-timed.
				const occurrenceISO = occurrenceDate.toISOString()
				const isExcluded = event.exdates?.includes(occurrenceISO) ?? false
				if (isExcluded) {
					return undefined
				}

				// Calculate the duration from the original event
				const originalDuration = event.end.diff(event.start)
				const newEndTime = occurrenceDate.add(originalDuration, 'millisecond')
				const recurringEventId = `${event.id}_${index}`
				const parentUID = getEventParentUID(event)

				// Create the recurring event instance
				const recurringEvent: CalendarEvent = {
					...event,
					id: recurringEventId,
					start: occurrenceDate,
					end: newEndTime,
					uid: parentUID, // Same UID as parent for proper grouping
					rrule: undefined, // Instance events don't have RRULE
				}

				return recurringEvent
			})
			.filter((recurringEvent) => recurringEvent !== undefined)
			.filter((recurringEvent) => {
				// The shared predicate, so an occurrence is kept here exactly when the
				// host would keep it. A private copy of it went wrong twice: once by
				// including an occurrence that ENDS at the range start, once by dropping
				// a zero-duration one, which its start is what places (#248).
				const eventSpansRange = overlapsRange(
					recurringEvent,
					startDate,
					endDate
				)

				return eventSpansRange
			})

		return recurringEvents
	} catch (error) {
		// Handle invalid RRULE options
		throw new Error(
			`Invalid RRULE options: ${JSON.stringify(event.rrule)}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}
