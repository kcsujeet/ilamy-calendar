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

/**
 * How far past a requested range the cached occurrence window reaches, so
 * the next few navigations and every column inside the view are answered
 * from it rather than by walking the rule again.
 */
const WINDOW_MARGIN_DAYS = 42

/** Converted occurrences kept per series before the memo starts over. */
const MAX_MEMOIZED_OCCURRENCES = 4096

/**
 * What one series has already worked out. rrule walks from DTSTART on every
 * `between()`, so a series that started years ago paid that walk once per
 * grid column. `windowOccurrences` holds the floating-time instants of a
 * `between(windowStart, windowEnd, true)` call, in rrule's iteration order,
 * and every query inside the window is answered by filtering it the way
 * `between()` filters its own walk. `instants` memoizes `fromFloatingDate`,
 * which parses each occurrence's wall-clock time in the calendar's zone.
 */
interface SeriesMemo {
	rruleOptions: RRuleOptions
	start: Dayjs
	floatingUntilMs: number | undefined
	rule: RRule
	windowStartMs: number
	windowEndMs: number
	windowOccurrences: number[]
	instants: Map<number, Dayjs>
}

const seriesMemos = new WeakMap<CalendarEvent, SeriesMemo>()

interface SeriesMemoInput {
	event: CalendarEvent
	/** The event's own rule, compared by identity to tell whether it changed. */
	rrule: RRuleOptions
	/** The rule rrule evaluates: `rrule` with floating DTSTART and UNTIL. */
	ruleOptions: RRuleOptions
	floatingUntil: Date | undefined
}

/** The series' memo, rebuilt when its rule, start or UNTIL has changed. */
const readSeriesMemo = ({
	event,
	rrule,
	ruleOptions,
	floatingUntil,
}: SeriesMemoInput): SeriesMemo => {
	const floatingUntilMs = floatingUntil?.getTime()
	const memo = seriesMemos.get(event)
	const hasSameRule = memo?.rruleOptions === rrule
	const hasSameStart = memo?.start === event.start
	const hasSameUntil = memo?.floatingUntilMs === floatingUntilMs
	if (memo && hasSameRule && hasSameStart && hasSameUntil) {
		return memo
	}

	const freshMemo: SeriesMemo = {
		rruleOptions: rrule,
		start: event.start,
		floatingUntilMs,
		rule: new RRule(ruleOptions),
		windowStartMs: Number.POSITIVE_INFINITY,
		windowEndMs: Number.NEGATIVE_INFINITY,
		windowOccurrences: [],
		instants: new Map(),
	}
	seriesMemos.set(event, freshMemo)
	return freshMemo
}

/**
 * Exactly `memo.rule.between(after, before, true)`. rrule walks in order,
 * skips dates before `after` and stops at the first one after `before`; the
 * window is that same walk over a wider span, so filtering it the same way
 * returns the same dates in the same order.
 */
const getOccurrencesBetween = (
	memo: SeriesMemo,
	after: Date,
	before: Date
): number[] => {
	const afterMs = after.getTime()
	const beforeMs = before.getTime()
	const hasInvalidBound = Number.isNaN(afterMs) || Number.isNaN(beforeMs)
	if (hasInvalidBound) {
		// Let rrule raise the error it always raised.
		return memo.rule.between(after, before, true).map((date) => date.getTime())
	}

	const startsInsideWindow = afterMs >= memo.windowStartMs
	const endsInsideWindow = beforeMs <= memo.windowEndMs
	const isInsideWindow = startsInsideWindow && endsInsideWindow
	if (!isInsideWindow) {
		// Floating dates are UTC instants, so the margin is shifted in UTC
		// (setUTC* setters, https://day.js.org/docs/en/plugin/utc): no DST.
		memo.windowStartMs = dayjs
			.utc(afterMs)
			.subtract(WINDOW_MARGIN_DAYS, 'day')
			.valueOf()
		memo.windowEndMs = dayjs
			.utc(beforeMs)
			.add(WINDOW_MARGIN_DAYS, 'day')
			.valueOf()
		memo.windowOccurrences = memo.rule
			.between(new Date(memo.windowStartMs), new Date(memo.windowEndMs), true)
			.map((date) => date.getTime())
	}

	const occurrences: number[] = []
	for (const occurrenceMs of memo.windowOccurrences) {
		if (occurrenceMs > beforeMs) {
			break
		}
		if (occurrenceMs >= afterMs) {
			occurrences.push(occurrenceMs)
		}
	}
	return occurrences
}

/** `fromFloatingDate(new Date(occurrenceMs), event.start)`, computed once. */
const getOccurrenceInstant = (
	memo: SeriesMemo,
	occurrenceMs: number,
	reference: Dayjs
): Dayjs => {
	const memoized = memo.instants.get(occurrenceMs)
	if (memoized) {
		return memoized
	}
	if (memo.instants.size >= MAX_MEMOIZED_OCCURRENCES) {
		memo.instants.clear()
	}
	const instant = fromFloatingDate(new Date(occurrenceMs), reference)
	memo.instants.set(occurrenceMs, instant)
	return instant
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
		const memo = readSeriesMemo({
			event,
			rrule: event.rrule,
			ruleOptions,
			floatingUntil,
		})

		const parentUid = getEventParentUID(event)
		const overrides = currentEvents.filter((candidate) => {
			const isOverride = Boolean(candidate.recurrenceId)
			const belongsToSeries = getEventParentUID(candidate) === parentUid
			return isOverride && belongsToSeries
		})
		// `isSame` with no unit compares instants, so a set of instants answers
		// the same question without re-parsing every RECURRENCE-ID per occurrence.
		const overriddenInstants = new Set<number>()
		for (const override of overrides) {
			const overriddenOccurrence = safeDate(override.recurrenceId)
			if (overriddenOccurrence) {
				overriddenInstants.add(overriddenOccurrence.valueOf())
			}
		}

		// Calculate event duration to expand search window for events that span the range
		const eventDuration = event.end.diff(event.start)

		// Expand search window backward by event duration to catch events that start before
		// the range but span into it
		const expandedStartDateTime = toFloatingDate(
			startDate.subtract(eventDuration, 'millisecond')
		)
		const endDateTime = toFloatingDate(endDate)

		// Get all occurrences in the expanded range
		const occurrences = getOccurrencesBetween(
			memo,
			expandedStartDateTime,
			endDateTime
		)

		// Convert occurrences to CalendarEvent instances
		const recurringEvents: CalendarEvent[] = occurrences
			.map((occurrence, index) => {
				const occurrenceDate = getOccurrenceInstant(
					memo,
					occurrence,
					event.start
				)
				const hasOverride = overriddenInstants.has(occurrenceDate.valueOf())

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
