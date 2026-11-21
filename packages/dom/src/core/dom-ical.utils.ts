import { now, parseDate, type ZonedDate } from '@ilamy/core'
import {
	formatICalAllDayDate,
	formatICalLocalDateTime,
	formatICalUtcDateTime,
	resolveICalTzid,
} from '@ilamy/utils/ical-format'
import { RRule } from 'rrule'
import type { DomCalendarEvent } from '../dom-calendar.types'
import { toFloatingUtcDate } from './dom-events.utils'

const escapeICalText = (value: string): string =>
	value
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\r?\n/g, '\\n')

const formatVEventDateLines = (
	event: DomCalendarEvent,
	start: ZonedDate,
	end: ZonedDate,
	eventZone: string
): string[] => {
	if (event.allDay) {
		return [
			`DTSTART;VALUE=DATE:${formatICalAllDayDate(event.start, eventZone)}`,
			`DTEND;VALUE=DATE:${formatICalAllDayDate(event.end, eventZone)}`,
		]
	}
	const tzid = resolveICalTzid(eventZone)
	if (tzid) {
		return [
			`DTSTART;TZID=${tzid}:${formatICalLocalDateTime(start)}`,
			`DTEND;TZID=${tzid}:${formatICalLocalDateTime(end)}`,
		]
	}
	return [
		`DTSTART:${formatICalUtcDateTime(start)}`,
		`DTEND:${formatICalUtcDateTime(end)}`,
	]
}

const buildVEventLines = (
	event: DomCalendarEvent,
	timezone: string,
	dtstamp: string
): string[] => {
	const eventZone = event.timezone ?? timezone
	const start = parseDate(event.start, eventZone)
	const end = parseDate(event.end, eventZone)
	if (!start || !end) return []

	const lines = [
		'BEGIN:VEVENT',
		`UID:${event.uid ?? String(event.id)}@ilamy.dev`,
		`DTSTAMP:${dtstamp}`,
		...formatVEventDateLines(event, start, end, eventZone),
		`SUMMARY:${escapeICalText(event.title)}`,
	]
	if (event.description) {
		lines.push(`DESCRIPTION:${escapeICalText(event.description)}`)
	}
	if (event.location) {
		lines.push(`LOCATION:${escapeICalText(event.location)}`)
	}
	if (event.rrule) {
		const ruleStr = new RRule({
			...event.rrule,
			dtstart: toFloatingUtcDate(start),
		})
			.toString()
			.split('\n')
			.find((line) => line.startsWith('RRULE:'))
		if (ruleStr) lines.push(ruleStr)
	}
	lines.push('END:VEVENT')
	return lines
}

export const generateDomIcal = (
	events: DomCalendarEvent[],
	timezone: string
): string => {
	const dtstamp = formatICalUtcDateTime(now('UTC'))
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//ilamy//Calendar 4.0//EN',
		'CALSCALE:GREGORIAN',
	]
	for (const event of events) {
		lines.push(...buildVEventLines(event, timezone, dtstamp))
	}
	lines.push('END:VCALENDAR')
	return lines.join('\r\n')
}
