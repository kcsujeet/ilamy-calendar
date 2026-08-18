import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { overlapsRange, safeDate } from '@ilamy/utils/helpers'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'
import { fromFloatingDate, toFloatingDate } from './floating-time'
import { getEventParentUID, getOccurrenceStartISO } from './series-helpers'

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

		const recurringEvents: CalendarEvent[] = []
		for (const [index, occurrence] of occurrences.entries()) {
			const occurrenceDate = fromFloatingDate(occurrence, event.start)
			const existingOverride = overrides.find((candidate) =>
				safeDate(candidate.recurrenceId)?.isSame(occurrenceDate)
			)

			let recurringEvent: CalendarEvent = {
				...event,
				id: `${event.id}_${index}`,
				start: occurrenceDate,
				end: occurrenceDate.add(eventDuration, 'millisecond'),
				uid: parentUid,
				rrule: undefined,
			}
			if (existingOverride) {
				recurringEvent = { ...event, ...existingOverride }
			}

			// Detached overrides are excluded by their original occurrence, not
			// their potentially moved start time.
			const eventStartISO = getOccurrenceStartISO(recurringEvent)
			const isExcluded = event.exdates?.includes(eventStartISO) ?? false
			if (isExcluded) {
				continue
			}

			// The shared predicate, so an occurrence is kept here exactly when the
			// host would keep it. A private copy of it went wrong twice: once by
			// including an occurrence that ENDS at the range start, once by dropping
			// a zero-duration one, which its start is what places (#248).
			if (overlapsRange(recurringEvent, startDate, endDate)) {
				recurringEvents.push(recurringEvent)
			}
		}

		return recurringEvents
	} catch (error) {
		// Handle invalid RRULE options
		throw new Error(
			`Invalid RRULE options: ${JSON.stringify(event.rrule)}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
		)
	}
}
