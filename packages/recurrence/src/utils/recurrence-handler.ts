import type {
	CalendarEvent,
	Dayjs,
	PluginMutationResult,
} from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { safeDate } from '@ilamy/utils/helpers'
import { RRule } from 'rrule'
import type { RRuleOptions } from '../types'

/**
 * Converts a Dayjs object to a "Floating Time" Date representation.
 * In Floating Time, we use a UTC Date object but set its UTC components
 * to match the local components of the user's date.
 *
 * This is essential for RRule evaluation because it ensures that a rule
 * like "Every Wednesday" refers to the user's local Wednesday, even if
 * that time falls on a Thursday in actual UTC.
 */
const toFloatingDate = (d: Dayjs): Date => {
	return new Date(
		Date.UTC(
			d.year(),
			d.month(),
			d.date(),
			d.hour(),
			d.minute(),
			d.second(),
			d.millisecond()
		)
	)
}

/**
 * Converts a "Floating Time" Date back to a Dayjs object in the original context.
 * It takes the YMDHMS components from the UTC Date and applies them to the
 * reference Dayjs object (preserving its timezone/locale).
 */
const fromFloatingDate = (date: Date, reference: Dayjs): Dayjs => {
	return reference
		.year(date.getUTCFullYear())
		.month(date.getUTCMonth())
		.date(date.getUTCDate())
		.hour(date.getUTCHours())
		.minute(date.getUTCMinutes())
		.second(date.getUTCSeconds())
		.millisecond(date.getUTCMilliseconds())
}

export const isRecurringEvent = (event: CalendarEvent): boolean => {
	return Boolean(event.rrule || event.recurrenceId || event.uid)
}

/**
 * Consistently derives a parent UID from an event.
 * Uses the explicit `uid` if available, otherwise falls back to `${id}@ilamy.calendar`.
 */
const getEventParentUID = (event: CalendarEvent): string => {
	return event.uid || `${event.id}@ilamy.calendar`
}

/**
 * Finds the base recurring event (the one with rrule and no recurrenceId)
 * that shares the same parent UID as the target event.
 * Throws if not found — callers assume the series exists.
 */
const findBaseEventIndex = (
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
const getSeriesTerminationDate = (targetEvent: CalendarEvent): Date =>
	targetEvent.start.subtract(1, 'day').endOf('day').toDate()

/**
 * Keeps the calendar day from `target` while applying the time-of-day from `source`.
 * Used to edit recurring series anchors without shifting the series to an instance day.
 */
const withTimeOfDay = (target: Dayjs, source: Dayjs): Dayjs => {
	const timeOfDayMs = source.diff(source.startOf('day'), 'millisecond')
	return target.startOf('day').add(timeOfDayMs, 'millisecond')
}

/**
 * RFC 5545 RECURRENCE-ID: for detached overrides, the original occurrence
 * start is stored on recurrenceId; generated instances use their start.
 */
const getOccurrenceStartISO = (event: CalendarEvent): string =>
	event.recurrenceId ?? event.start.toISOString()

/**
 * Appends the target occurrence's start to the base event's EXDATE list,
 * excluding that single occurrence from the series. Shared by the "this" scope
 * of both edit and delete.
 */
const addExdateToBaseEvent = (
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
}: UpdateRecurringEventProps): PluginMutationResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]

	switch (scope) {
		case 'this': {
			// "This event only" - EXDATE on base + detached override for this occurrence.
			// Generated instance: add a new override row. Stored override: update in place.
			const seriesUid = getEventParentUID(baseEvent)
			const isOverrideEvent = Boolean(
				targetEvent.recurrenceId && !targetEvent.rrule
			)
			// A stored override keys its EXDATE by the original occurrence
			// (`recurrenceId`); a generated instance keys by its own start.
			let recurrenceId = targetEvent.start.toISOString()
			if (isOverrideEvent && targetEvent.recurrenceId) {
				recurrenceId = targetEvent.recurrenceId
			}

			const existingExdates = baseEvent.exdates || []
			const nextExdates = existingExdates.includes(recurrenceId)
				? existingExdates
				: [...existingExdates, recurrenceId]

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
				const overrideIndex = updatedEvents.findIndex(
					(e) => e.id === targetEvent.id
				)
				if (overrideIndex === -1) {
					throw new Error('Detached override not found')
				}
				updatedEvents[overrideIndex] = detachedOverride
				return {
					events: updatedEvents,
					updated: [updatedBaseEvent, detachedOverride],
					added: [],
				}
			}

			const modifiedEventId = `${baseEvent.id}_modified_${Date.now()}`
			const modifiedEvent: CalendarEvent = {
				...detachedOverride,
				id: modifiedEventId,
			}
			updatedEvents.push(modifiedEvent)
			return {
				events: updatedEvents,
				updated: [updatedBaseEvent],
				added: [modifiedEvent],
			}
		}

		case 'following': {
			// "This and following" - Terminate original series and create new series
			const terminationDate = getSeriesTerminationDate(targetEvent)

			// Update original series with UNTIL to end before target date
			const terminatedEvent = {
				...baseEvent,
				rrule: {
					...baseEvent.rrule,
					until: terminationDate,
				} as RRuleOptions,
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
				} as RRuleOptions,
				id: newSeriesId,
				uid: newSeriesUID, // New UID for new series
				start: newSeriesStartTime,
				end: newSeriesEndTime,
				recurrenceId: undefined, // This is a new base event, not an instance
			}
			updatedEvents.push(newSeriesEvent)
			return {
				events: updatedEvents,
				updated: [terminatedEvent],
				added: [newSeriesEvent],
			}
		}

		case 'all': {
			// "All events" - Update the base recurring event (anchor dates, not instance day)
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
			// Google-Calendar behavior: an "all" edit resets the series — drop detached
			// overrides and clear exceptions (previously split/deleted occurrences return).
			const events = updatedEvents.filter((e) => !isDetachedOverrideOfSeries(e))
			return {
				events,
				updated: [updatedBaseEvent],
				added: [],
			}
		}

		default:
			throw new Error(
				`Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
			)
	}
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
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]

	switch (scope) {
		case 'this': {
			// "This event only" - Add EXDATE and drop any detached override for this occurrence
			const occurrenceStartISO = getOccurrenceStartISO(targetEvent)
			const { baseEvent: updatedBaseEvent } = addExdateToBaseEvent(
				baseEvent,
				targetEvent
			)
			updatedEvents[baseEventIndex] = updatedBaseEvent

			const parentUid = getEventParentUID(baseEvent)
			return updatedEvents.filter((event) => {
				const isDetachedOverride =
					Boolean(event.recurrenceId) && getEventParentUID(event) === parentUid
				if (!isDetachedOverride) {
					return true
				}
				return event.recurrenceId !== occurrenceStartISO
			})
		}

		case 'following': {
			// "This and following" - Terminate series with UNTIL before target date
			const terminatedEvent = {
				...baseEvent,
				rrule: {
					...baseEvent.rrule,
					until: getSeriesTerminationDate(targetEvent),
				} as RRuleOptions,
			}
			updatedEvents[baseEventIndex] = terminatedEvent
			break
		}

		case 'all': {
			// "All events" - Remove the entire recurring series
			const targetUid = getEventParentUID(targetEvent)
			const eventsWithoutTargetSeries = updatedEvents.filter(
				(e) => getEventParentUID(e) !== targetUid
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
