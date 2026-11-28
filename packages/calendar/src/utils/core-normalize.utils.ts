import type {
	CalendarEvent,
	CalendarEventInput,
	PublicDateInput,
} from '../types/calendar.types'
import {
	parseDate,
	resolveZone,
	toOffsetIso,
	withZone,
	type ZonedDate,
} from './temporal'

/**
 * Parses a public date input (`string | Date`) into a `ZonedDate` anchored in
 * `eventZone ?? calendarZone`, then displayed in `calendarZone`.
 *
 * When an event declares its own `timezone` (RFC 5545 `TZID` / Google Calendar
 * `timeZone`, #314), an offset-less wall-clock string is anchored in the event's
 * zone before converting to the calendar's display zone, preserving wall-clock
 * intent across future IANA rule changes.
 */
export const resolveEventDate = (
	input: PublicDateInput,
	calendarTimezone?: string,
	eventTimezone?: string
): ZonedDate | undefined => {
	const displayZone = resolveZone(calendarTimezone)
	const anchorZone = eventTimezone ?? displayZone
	const anchored = parseDate(input, anchorZone)
	if (!anchored) {
		return undefined
	}
	if (anchored.timeZoneId === displayZone) {
		return anchored
	}
	return withZone(anchored, displayZone)
}

/** Normalizes a single public event input into a canonical `CalendarEvent`. */
export const normalizeEvent = (
	event: CalendarEventInput,
	calendarTimezone?: string
): CalendarEvent => {
	const startZoned = resolveEventDate(
		event.start,
		calendarTimezone,
		event.timezone
	)
	const endZoned = resolveEventDate(event.end, calendarTimezone, event.timezone)

	return {
		...event,
		start: startZoned ? toOffsetIso(startZoned) : String(event.start),
		end: endZoned ? toOffsetIso(endZoned) : String(event.end),
	}
}

/** Normalizes an array of public event inputs into canonical ISO `CalendarEvent[]`. */
export const normalizeEvents = (
	events: CalendarEventInput[] | undefined,
	calendarTimezone?: string
): CalendarEvent[] => {
	if (!events?.length) {
		return []
	}
	return events.map((event) => normalizeEvent(event, calendarTimezone))
}
