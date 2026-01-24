import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components'
import type { RRuleOptions } from '@/features/recurrence/types'
import dayjs from '@/lib/configs/dayjs-config'
import { omitKeys, safeDate } from '@/lib/utils'

export const isRecurringEvent = (event: CalendarEvent): boolean => {
	return Boolean(event.rrule || event.recurrenceId || event.uid)
}

interface GenerateRecurringEventsProps {
	event: CalendarEvent
	currentEvents: CalendarEvent[]
	startDate: dayjs.Dayjs
	endDate: dayjs.Dayjs
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
		// Create rule from RRuleOptions ensuring dtstart is always provided
		// If dtstart is missing from the RRULE, use the event's start time as fallback
		const ruleOptions: RRuleOptions = {
			...event.rrule,
			dtstart: event.rrule.dtstart || event.start.toDate(),
		}
		const rule = new RRule(ruleOptions)

		const overrides = currentEvents.filter(
			(e) => e.recurrenceId && e.uid === event.uid
		)

		// Calculate event duration to expand search window for events that span the range
		const eventDuration = event.end.diff(event.start)

		// Expand search window backward by event duration to catch events that start before
		// the range but span into it
		const expandedStartDateTime = startDate
			.subtract(eventDuration, 'millisecond')
			.toDate()
		const endDateTime = endDate.toDate()

		// Get all occurrences in the expanded range
		const occurrences = rule.between(expandedStartDateTime, endDateTime, true)

		// Convert occurrences to CalendarEvent instances
		const recurringEvents: CalendarEvent[] = occurrences
			.map((occurrence, index) => {
				const occurrenceDate = dayjs(occurrence)
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
				const parentUID = event.uid || `${event.id}@ilamy.calendar`

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
				const hasExdates = event.exdates && event.exdates.length > 0
				if (hasExdates) {
					const eventStartISO = recurringEvent.start.toISOString()
					const isExcluded = event.exdates.includes(eventStartISO)
					if (isExcluded) {
						return false
					}
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

interface UpdateRecurringEventProps {
	targetEvent: CalendarEvent
	updates: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: 'this' | 'following' | 'all'
}

export const updateRecurringEvent = ({
	targetEvent,
	updates,
	currentEvents,
	scope,
}: UpdateRecurringEventProps): CalendarEvent[] => {
	const updatedEvents = [...currentEvents]

	// Find the base recurring event
	const baseEventIndex = updatedEvents.findIndex((e) => {
		const parentUid = e.uid || `${e.id}@ilamy.calendar`
		return parentUid === targetEvent.uid && e.rrule && !e.recurrenceId
	})

	if (baseEventIndex === -1) {
		throw new Error('Base recurring event not found')
	}

	const baseEvent = updatedEvents[baseEventIndex]

	switch (scope) {
		case 'this': {
			// "This event only" - Add EXDATE to base event and create standalone modified event
			const targetEventStartISO = targetEvent.start.toISOString()
			const existingExdates = baseEvent.exdates || []
			const updatedExdates = [...existingExdates, targetEventStartISO]

			const updatedBaseEvent = {
				...baseEvent,
				exdates: updatedExdates,
			}
			updatedEvents[baseEventIndex] = updatedBaseEvent

			// Create standalone modified event with recurrenceId
			const modifiedEventId = `${targetEvent.id}_modified_${Date.now()}`
			const modifiedEvent: CalendarEvent = {
				// @ts-expect-error TODO: fix the types
				...omitKeys(targetEvent, ['width', 'height', 'top', 'left', 'right']),
				...updates,
				id: modifiedEventId,
				recurrenceId: targetEventStartISO, // This marks it as a modified instance
				uid: baseEvent.uid || `${baseEvent.id}@ilamy.calendar`, // Keep same UID as base event (iCalendar standard)
				rrule: undefined, // Standalone events don't have RRULE
			} as CalendarEvent
			updatedEvents.push(modifiedEvent)
			break
		}

		case 'following': {
			// "This and following" - Terminate original series and create new series

			// Calculate the termination date: day before target with end of day time
			// This ensures the last occurrence before target is included in the terminated series
			const dayBeforeTarget = targetEvent.start.subtract(1, 'day')
			const terminationDate = dayBeforeTarget.endOf('day').toDate()

			// Update original series with UNTIL to end before target date
			const terminatedEvent = {
				...baseEvent,
				rrule: {
					...baseEvent.rrule,
					until: terminationDate,
				},
			}
			updatedEvents[baseEventIndex] = terminatedEvent

			// Create new series starting from target date
			const originalDuration = baseEvent.end.diff(baseEvent.start)
			const newSeriesStartTime = updates.start || targetEvent.start
			const newSeriesEndTime =
				updates.end || newSeriesStartTime.add(originalDuration)
			const newSeriesId = `${baseEvent.id}_following`
			const newSeriesUID = `${newSeriesId}@ilamy.calendar`

			const newSeriesEvent: CalendarEvent = {
				...baseEvent,
				...updates,
				rrule: {
					...baseEvent.rrule,
					...updates.rrule,
					dtstart: newSeriesStartTime.toDate(),
				},
				id: newSeriesId,
				uid: newSeriesUID, // New UID for new series
				start: newSeriesStartTime,
				end: newSeriesEndTime,
				recurrenceId: undefined, // This is a new base event, not an instance
			}
			updatedEvents.push(newSeriesEvent)
			break
		}

		case 'all': {
			// "All events" - Update the base recurring event
			const updatedBaseEvent = {
				...baseEvent,
				...updates,
			}
			updatedEvents[baseEventIndex] = updatedBaseEvent
			break
		}

		default:
			throw new Error(
				`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
			)
	}

	return updatedEvents
}

interface DeleteRecurringEventProps {
	targetEvent: CalendarEvent
	currentEvents: CalendarEvent[]
	scope: 'this' | 'following' | 'all'
}

export const deleteRecurringEvent = ({
	targetEvent,
	currentEvents,
	scope,
}: DeleteRecurringEventProps): CalendarEvent[] => {
	const updatedEvents = [...currentEvents]

	// Find the base recurring event
	const baseEventIndex = updatedEvents.findIndex((e) => {
		const parentUid = e.uid || `${e.id}@ilamy.calendar`
		return parentUid === targetEvent.uid && e.rrule && !e.recurrenceId
	})

	if (baseEventIndex === -1) {
		throw new Error('Base recurring event not found')
	}

	const baseEvent = updatedEvents[baseEventIndex]

	switch (scope) {
		case 'this': {
			// "This event only" - Add EXDATE to exclude this occurrence
			const targetEventStartISO = targetEvent.start.toISOString()
			const existingExdates = baseEvent.exdates || []
			const updatedExdates = [...existingExdates, targetEventStartISO]

			const updatedBaseEvent = { ...baseEvent, exdates: updatedExdates }
			updatedEvents[baseEventIndex] = updatedBaseEvent
			break
		}

		case 'following': {
			// "This and following" - Terminate series with UNTIL before target date

			// Calculate the termination date: day before target with end of day time
			// This ensures the last occurrence before target is included in the terminated series
			const dayBeforeTarget = targetEvent.start.subtract(1, 'day')
			const terminationDate = dayBeforeTarget.endOf('day').toDate()

			const terminatedEvent = {
				...baseEvent,
				rrule: {
					...baseEvent.rrule,
					until: terminationDate,
				},
			}
			updatedEvents[baseEventIndex] = terminatedEvent
			break
		}

		case 'all': {
			// "All events" - Remove the entire recurring series
			const eventsWithoutTargetSeries = updatedEvents.filter(
				(e) => e.uid !== targetEvent.uid
			)
			return eventsWithoutTargetSeries
		}

		default:
			throw new Error(
				`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
			)
	}

	return updatedEvents
}
