import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { safeDate } from '@ilamy/utils/helpers'
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
				const existingOverride = overrides.find((e) =>
					safeDate(e.recurrenceId)?.isSame(occurrenceDate)
				)

				// If there's an override, use it
				if (existingOverride) {
					return { ...event, ...existingOverride }
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
			.filter((recurringEvent) => {
				// Filter out EXDATE exclusions
				const eventStartISO = recurringEvent.start.toISOString()
				const isExcluded = event.exdates?.includes(eventStartISO) ?? false
				if (isExcluded) {
					return false
				}

				// Filter to only include events that span through the original requested date range
				// An event spans the range if: event_start < range_end AND event_end > range_start
				// Use isSameOrBefore/isSameOrAfter to include boundary cases
				const eventSpansRange =
					recurringEvent.start.isSameOrBefore(endDate) &&
					recurringEvent.end.isSameOrAfter(startDate)

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
