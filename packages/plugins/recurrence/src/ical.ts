import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import type { RRuleOptions } from './types'

const formatDate = (date: Dayjs, isAllDay = false): string => {
	if (isAllDay) {
		return date.format('YYYYMMDD')
	}
	return date.utc().format('YYYYMMDD[T]HHmmss[Z]')
}

// RFC 5545 3.3.10: UNTIL "MUST have the same value type as the DTSTART
// property", so an all-day series ends on a DATE. RRule.toString() writes a Date
// `until` as a UTC DATE-TIME, so it is left out of the options and appended here
// as the same calendar day formatDate gives the series' other dates.
const formatRRule = (rruleOptions: RRuleOptions, isAllDay: boolean): string => {
	try {
		const { until, ...optionsWithoutUntil } = rruleOptions
		const hasDateUntil = isAllDay && Boolean(until)
		const options = hasDateUntil ? optionsWithoutUntil : rruleOptions
		const rruleString = new RRule(options).toString()
		const rruleLine =
			rruleString.split('\n').find((line) => line.startsWith('RRULE:')) || ''
		if (hasDateUntil && rruleLine) {
			return `${rruleLine};UNTIL=${formatDate(dayjs(until), true)}`
		}
		return rruleLine
	} catch {
		return ''
	}
}

// RFC 5545 3.8.5.1 (EXDATE) and 3.8.4.4 (RECURRENCE-ID): the value type
// defaults to DATE-TIME, so a series whose DTSTART is a DATE must say so.
const dateParam = (isAllDay: boolean): string => (isAllDay ? ';VALUE=DATE' : '')

/**
 * Returns the recurrence-specific VEVENT property lines for an event: an
 * `RRULE:` line when the event has an rrule, an `EXDATE:` line when it has
 * exdates, and a `RECURRENCE-ID:` line when it is a modified instance.
 */
export const recurrenceICalProperties = (event: CalendarEvent): string[] => {
	const lines: string[] = []

	const rruleLine = event.rrule
		? formatRRule(event.rrule, Boolean(event.allDay))
		: ''
	if (rruleLine) {
		lines.push(rruleLine)
	}

	if (event.exdates?.length) {
		const exdates = event.exdates
			.map((date) => formatDate(dayjs(date), event.allDay))
			.join(',')
		lines.push(`EXDATE${dateParam(Boolean(event.allDay))}:${exdates}`)
	}

	if (event.recurrenceId) {
		const recurrenceId = formatDate(dayjs(event.recurrenceId), event.allDay)
		lines.push(
			`RECURRENCE-ID${dateParam(Boolean(event.allDay))}:${recurrenceId}`
		)
	}

	return lines
}
