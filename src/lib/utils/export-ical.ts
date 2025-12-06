import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'

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

const formatDate = (date: dayjs.Dayjs, isAllDay = false): string => {
	return isAllDay
		? date.format('YYYYMMDD')
		: date.utc().format('YYYYMMDD[T]HHmmss[Z]')
}

const getUID = (event: CalendarEvent): string => {
	return event.uid || `${event.id}@ilamy.calendar`
}

const formatRRule = (rruleOptions: unknown): string => {
	try {
		const rruleString = new RRule(
			rruleOptions as ConstructorParameters<typeof RRule>[0]
		).toString()
		return (
			rruleString.split('\n').find((line) => line.startsWith('RRULE:')) || ''
		)
	} catch {
		return ''
	}
}

const convertEventToVEvent = (event: CalendarEvent): string => {
	const timestamp = dayjs().utc().format('YYYYMMDD[T]HHmmss[Z]')
	const dateParam = event.allDay ? ';VALUE=DATE' : ''
	const rrule = event.rrule ? formatRRule(event.rrule) : ''

	const exdates = event.exdates?.length
		? event.exdates.map((d) => formatDate(dayjs(d), event.allDay)).join(',')
		: null

	const recurrenceId = event.recurrenceId
		? formatDate(dayjs(event.recurrenceId), event.allDay)
		: null

	const lines = [
		'BEGIN:VEVENT',
		`UID:${getUID(event)}`,
		`DTSTART${dateParam}:${formatDate(event.start, event.allDay)}`,
		`DTEND${dateParam}:${formatDate(event.end, event.allDay)}`,
		`SUMMARY:${escapeText(event.title)}`,
		event.description && `DESCRIPTION:${escapeText(event.description)}`,
		event.location && `LOCATION:${escapeText(event.location)}`,
		rrule,
		exdates && `EXDATE:${exdates}`,
		recurrenceId && `RECURRENCE-ID:${recurrenceId}`,
		`DTSTAMP:${timestamp}`,
		`CREATED:${timestamp}`,
		`LAST-MODIFIED:${timestamp}`,
		'STATUS:CONFIRMED',
		'SEQUENCE:0',
		'TRANSP:OPAQUE',
		'END:VEVENT',
	]

	return lines.filter(Boolean).join(CRLF)
}

const filterEvents = (events: CalendarEvent[]): CalendarEvent[] => {
	const seenUIDs = new Set<string>()

	return events.filter((event) => {
		const uid = getUID(event)
		const isBaseRecurring = event.rrule && !event.recurrenceId
		const isModifiedInstance = event.recurrenceId && !event.rrule

		if (isBaseRecurring) {
			seenUIDs.add(uid)
			return true
		}
		if (isModifiedInstance) {
			return true
		}
		return !event.rrule && !event.recurrenceId && !seenUIDs.has(uid)
	})
}

export const exportToICalendar = (
	events: CalendarEvent[],
	calendarName = 'ilamy Calendar'
): string => {
	const name = escapeText(calendarName)
	const veventStrings = filterEvents(events).map(convertEventToVEvent)

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
	filename = 'calendar.ics',
	calendarName = 'ilamy Calendar'
): void => {
	const blob = new Blob([exportToICalendar(events, calendarName)], {
		type: 'text/calendar;charset=utf-8',
	})
	const url = URL.createObjectURL(blob)
	const normalizedFilename = filename.endsWith('.ics')
		? filename
		: `${filename}.ics`

	const link = document.createElement('a')
	link.href = url
	link.download = normalizedFilename

	document.body.append(link)
	link.click()
	link.remove()
	URL.revokeObjectURL(url)
}
