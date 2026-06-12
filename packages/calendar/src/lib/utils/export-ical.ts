import type { CalendarEvent } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'

const CRLF = '\r\n'

const UTC_VTIMEZONE = [
	'BEGIN:VTIMEZONE',
	'TZID:UTC',
	'BEGIN:STANDARD',
	'DTSTART:19700101T000000',
	'TZNAME:UTC',
	'TZOFFSETFROM:+0000',
	'TZOFFSETTO:+0000',
	'END:STANDARD',
	'END:VTIMEZONE',
].join(CRLF)

const escapeText = (text: string): string => {
	return text
		.replaceAll('\\', '\\\\')
		.replaceAll(';', '\\;')
		.replaceAll(',', '\\,')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '')
}

const formatDate = (date: Dayjs, isAllDay = false): string => {
	if (isAllDay) {
		return date.format('YYYYMMDD')
	}
	return date.utc().format('YYYYMMDD[T]HHmmss[Z]')
}

const getUID = (event: CalendarEvent): string => {
	return event.uid || `${event.id}@ilamy.calendar`
}

type CollectFn = (point: string, event: CalendarEvent) => unknown[]

const convertEventToVEvent = (
	event: CalendarEvent,
	collect: CollectFn
): string => {
	const timestamp = dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')
	const dateParam = event.allDay ? ';VALUE=DATE' : ''

	const coreLines = [
		'BEGIN:VEVENT',
		`UID:${getUID(event)}`,
		`DTSTART${dateParam}:${formatDate(event.start, event.allDay)}`,
		`DTEND${dateParam}:${formatDate(event.end, event.allDay)}`,
		`SUMMARY:${escapeText(event.title)}`,
		event.description && `DESCRIPTION:${escapeText(event.description)}`,
		event.location && `LOCATION:${escapeText(event.location)}`,
	].filter(Boolean)

	const extra = collect('ical:vevent-properties', event).filter(
		(line): line is string => typeof line === 'string'
	)

	const trailingLines = [
		`DTSTAMP:${timestamp}`,
		`CREATED:${timestamp}`,
		`LAST-MODIFIED:${timestamp}`,
		'STATUS:CONFIRMED',
		'SEQUENCE:0',
		'TRANSP:OPAQUE',
		'END:VEVENT',
	]

	return [...coreLines, ...extra, ...trailingLines].join(CRLF)
}

export const exportToICalendar = (
	events: CalendarEvent[],
	collect: CollectFn,
	calendarName = 'ilamy Calendar'
): string => {
	const name = escapeText(calendarName)
	const veventStrings = events.map((event) =>
		convertEventToVEvent(event, collect)
	)

	return [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//ilamy//ilamy Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${name}`,
		`X-WR-CALDESC:Exported from ${name}`,
		UTC_VTIMEZONE,
		...veventStrings,
		'END:VCALENDAR',
	].join(CRLF)
}

export const downloadICalendar = (
	events: CalendarEvent[],
	collect: CollectFn,
	filename = 'calendar.ics',
	calendarName = 'ilamy Calendar'
): void => {
	const blob = new Blob([exportToICalendar(events, collect, calendarName)], {
		type: 'text/calendar;charset=utf-8',
	})
	const url = URL.createObjectURL(blob)
	let normalizedFilename = filename
	if (!filename.endsWith('.ics')) {
		normalizedFilename = `${filename}.ics`
	}

	const link = document.createElement('a')
	link.href = url
	link.download = normalizedFilename

	document.body.append(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}
