import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components'
import type { RRuleOptions } from '@/features/recurrence/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { omitKeys, safeDate } from '@/lib/utils'

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
	// Detached overrides (scope: "this") are stored with recurrenceId but behave
	// as standalone events for CRUD — use updateEvent/deleteEvent, not scope dialogs.
	if (event.recurrenceId && !event.rrule) {
		return false
	}
	return Boolean(event.rrule || event.uid)
}

/**
 * Consistently derives a parent UID from an event.
 * Uses the explicit `uid` if available, otherwise falls back to `${id}@ilamy.calendar`.
 */
const getEventParentUID = (event: CalendarEvent): string => {
	return event.uid || `${event.id}@ilamy.calendar`
}

/**
 * Derives the base series event id from a generated instance or detached override id.
 */
const getSeriesParentIdFromEventId = (eventId: string): string | null => {
	const modifiedMarker = '_modified_'
	const modifiedIndex = eventId.indexOf(modifiedMarker)
	if (modifiedIndex !== -1) {
		return eventId.slice(0, modifiedIndex)
	}
	const instanceMatch = eventId.match(/^(.+)_(\d+)$/)
	if (instanceMatch) {
		return instanceMatch[1]
	}
	return null
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
	let index = events.findIndex(
		(e) => getEventParentUID(e) === targetUid && e.rrule && !e.recurrenceId
	)

	if (index === -1) {
		const parentIdFromTargetId = getSeriesParentIdFromEventId(
			String(targetEvent.id)
		)
		if (parentIdFromTargetId) {
			index = events.findIndex(
				(e) => e.id === parentIdFromTargetId && e.rrule && !e.recurrenceId
			)
		}
	}

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
 * True when a generated occurrence is already represented by EXDATE or a detached
 * override in storage. Uses calendar-day matching so a series time change (scope
 * "all") does not leave EXDATE/recurrenceId at the old instant while RRule emits
 * a new time on the same day.
 */
const isOccurrenceExcludedFromSeries = (
	occurrenceDate: Dayjs,
	event: CalendarEvent,
	overrides: CalendarEvent[]
): boolean => {
	const excludedByExdate = event.exdates?.some((ex) => {
		const excludedAt = safeDate(ex)
		if (!excludedAt) {
			return false
		}
		return (
			excludedAt.isSame(occurrenceDate) ||
			excludedAt.isSame(occurrenceDate, 'day')
		)
	})
	if (excludedByExdate) {
		return true
	}

	return overrides.some((override) => {
		const recurrenceAt = safeDate(override.recurrenceId)
		if (recurrenceAt?.isSame(occurrenceDate)) {
			return true
		}
		if (recurrenceAt?.isSame(occurrenceDate, 'day')) {
			return true
		}
		return override.start.isSame(occurrenceDate, 'day')
	})
}

/**
 * For scope "all": apply the delta between the edited instance and the submitted
 * start/end to the base event anchor — avoids shifting the whole series to the
 * instance's calendar day when the form is opened on e.g. Friday of a Mon–Fri rule.
 */
const applyAllScopeUpdates = (
	baseEvent: CalendarEvent,
	targetEvent: CalendarEvent,
	updates: Partial<CalendarEvent>
): { start: Dayjs; end: Dayjs; rrule: RRuleOptions | undefined } => {
	const baseStart = baseEvent.start
	const baseEnd = baseEvent.end

	if (!updates.start) {
		const rrule = updates.rrule ?? baseEvent.rrule
		const syncedRrule = rrule
			? ({
					...rrule,
					dtstart: rrule.dtstart ?? baseStart.toDate(),
				} as RRuleOptions)
			: undefined
		return { start: baseStart, end: baseEnd, rrule: syncedRrule }
	}

	const deltaMs = updates.start.diff(targetEvent.start)
	const newStart = baseStart.add(deltaMs, 'millisecond')
	const updatedEndAnchor =
		updates.end ?? updates.start.add(baseEnd.diff(baseStart))
	const endDeltaMs = updatedEndAnchor.diff(updates.start)
	const newEnd = newStart.add(endDeltaMs, 'millisecond')

	const mergedRrule = updates.rrule ?? baseEvent.rrule
	const syncedRrule = mergedRrule
		? ({ ...mergedRrule, dtstart: newStart.toDate() } as RRuleOptions)
		: undefined

	return { start: newStart, end: newEnd, rrule: syncedRrule }
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
		const floatingUntil = event.rrule.until
			? toFloatingDate(dayjs(event.rrule.until))
			: undefined

		const ruleOptions: RRuleOptions = {
			...event.rrule,
			dtstart: floatingStart,
			until: floatingUntil,
		}
		const rule = new RRule(ruleOptions)

		const parentUid = getEventParentUID(event)
		const overrides = currentEvents.filter(
			(e) => e.recurrenceId && getEventParentUID(e) === parentUid
		)

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

				// EXDATE + detached overrides are rendered from currentEvents — skip slot.
				if (isOccurrenceExcludedFromSeries(occurrenceDate, event, overrides)) {
					return null
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
			.filter((recurringEvent): recurringEvent is CalendarEvent => {
				if (recurringEvent === null) {
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

/** Stored events changed by `updateRecurringEvent` — for persistence callbacks. */
export interface RecurringUpdateResult {
	events: CalendarEvent[]
	/** Existing rows to persist via `onEventUpdate` (e.g. base + EXDATE). */
	updated: CalendarEvent[]
	/** New rows to persist via `onEventAdd` (e.g. detached override, split series). */
	added: CalendarEvent[]
}

export const updateRecurringEvent = ({
	targetEvent,
	updates,
	currentEvents,
	scope,
}: UpdateRecurringEventProps): RecurringUpdateResult => {
	const updatedEvents = [...currentEvents]
	const baseEventIndex = findBaseEventIndex(updatedEvents, targetEvent)
	const baseEvent = updatedEvents[baseEventIndex]

	switch (scope) {
		case 'this': {
			// "This event only" - Add EXDATE to base event and create standalone modified event
			const targetEventStartISO = targetEvent.start.toISOString()
			const existingExdates = baseEvent.exdates || []
			const updatedExdates = [...existingExdates, targetEventStartISO]
			const seriesUid = baseEvent.uid ?? `${baseEvent.id}@ilamy.calendar`

			const updatedBaseEvent = baseEvent.uid
				? { ...baseEvent, exdates: updatedExdates }
				: { ...baseEvent, exdates: updatedExdates, uid: seriesUid }
			updatedEvents[baseEventIndex] = updatedBaseEvent

			// Create standalone modified event with recurrenceId
			const modifiedEventId = `${baseEvent.id}_modified_${Date.now()}`
			const modifiedEvent: CalendarEvent = {
				// @ts-expect-error TODO: fix the types
				...omitKeys(targetEvent, ['width', 'height', 'top', 'left', 'right']),
				...updates,
				id: modifiedEventId,
				recurrenceId: targetEventStartISO, // This marks it as a modified instance
				uid: seriesUid, // Same series uid as parent (existing or newly assigned)
				rrule: undefined, // Standalone events don't have RRULE
			} as CalendarEvent
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
			const anchored = applyAllScopeUpdates(baseEvent, targetEvent, updates)
			const {
				start: _start,
				end: _end,
				rrule: _rrule,
				...nonDateUpdates
			} = updates
			const updatedBaseEvent = {
				...baseEvent,
				...nonDateUpdates,
				start: anchored.start,
				end: anchored.end,
				rrule: anchored.rrule,
			}
			updatedEvents[baseEventIndex] = updatedBaseEvent

			const parentUid = getEventParentUID(baseEvent)
			const updatedOverrides: CalendarEvent[] = []
			for (let index = 0; index < updatedEvents.length; index += 1) {
				const storedEvent = updatedEvents[index]
				if (
					storedEvent.recurrenceId &&
					!storedEvent.rrule &&
					getEventParentUID(storedEvent) === parentUid
				) {
					const updatedOverride: CalendarEvent = {
						...storedEvent,
						...nonDateUpdates,
						id: storedEvent.id,
						start: storedEvent.start,
						end: storedEvent.end,
						recurrenceId: storedEvent.recurrenceId,
						uid: storedEvent.uid,
						rrule: undefined,
					}
					updatedEvents[index] = updatedOverride
					updatedOverrides.push(updatedOverride)
				}
			}

			return {
				events: updatedEvents,
				updated: [updatedBaseEvent, ...updatedOverrides],
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
