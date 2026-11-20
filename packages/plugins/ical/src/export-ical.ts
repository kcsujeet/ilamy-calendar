import type { CalendarEvent } from '@ilamy/calendar'
import {
	formatICalAllDayDate,
	formatICalDateOnly,
	formatICalLocalDateTime,
	formatICalUtcDateTime,
	resolveICalTzid,
} from '@ilamy/utils/ical-format'
import {
	fromFields,
	getTransition,
	now,
	offsetMinutes,
	parseDate,
	subtract,
	type ZonedDate,
} from '@ilamy/utils/temporal'

const CRLF = '\r\n'
const MAX_LINE_OCTETS = 75
const MAX_VTIMEZONE_TRANSITIONS = 20

const utf8Encoder = new TextEncoder()

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
]

const pad2 = (value: number): string => String(value).padStart(2, '0')

// RFC 5545 §3.1: a content line SHOULD NOT exceed 75 octets; a longer one is
// folded by inserting CRLF and one space, and a multi-octet UTF-8 character
// must never be split. The continuation's leading space counts toward its 75.
const foldLine = (line: string): string => {
	const pieces: string[] = []
	let piece = ''
	let pieceOctets = 0
	for (const character of line) {
		const characterOctets = utf8Encoder.encode(character).length
		const maxOctets =
			pieces.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
		if (pieceOctets + characterOctets > maxOctets) {
			pieces.push(piece)
			piece = ''
			pieceOctets = 0
		}
		piece += character
		pieceOctets += characterOctets
	}
	pieces.push(piece)
	return pieces.join(`${CRLF} `)
}

const escapeText = (text: string): string =>
	text
		.replaceAll('\\', '\\\\')
		.replaceAll(';', '\\;')
		.replaceAll(',', '\\,')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '')

const formatOffsetHHMM = (minutes: number): string => {
	const sign = minutes < 0 ? '-' : '+'
	const abs = Math.abs(minutes)
	const hours = Math.floor(abs / 60)
	const mins = abs % 60
	return `${sign}${pad2(hours)}${pad2(mins)}`
}

const getUID = (event: CalendarEvent): string =>
	event.uid || `${event.id}@ilamy.calendar`

/**
 * Builds an RFC 5545 §3.6.5 VTIMEZONE component for `tzid` covering `[minYear - 1, maxYear + 1]`.
 */
const buildVTimezone = (
	tzid: string,
	minYear: number,
	maxYear: number
): string[] => {
	const windowStart = fromFields({ year: minYear - 1, month: 1, day: 1 }, tzid)
	const endYear = maxYear + 1
	const subcomponents: string[] = []
	let cursor: ZonedDate | null = windowStart

	for (let step = 0; step < MAX_VTIMEZONE_TRANSITIONS; step++) {
		const transition = getTransition(cursor, 'next')
		if (!transition || transition.year > endYear) {
			break
		}
		const before = subtract(transition, 1, 'second')
		const offsetFrom = offsetMinutes(before)
		const offsetTo = offsetMinutes(transition)
		const kind = offsetTo > offsetFrom ? 'DAYLIGHT' : 'STANDARD'
		subcomponents.push(
			`BEGIN:${kind}`,
			`DTSTART:${formatICalLocalDateTime(transition)}`,
			`TZOFFSETFROM:${formatOffsetHHMM(offsetFrom)}`,
			`TZOFFSETTO:${formatOffsetHHMM(offsetTo)}`,
			`END:${kind}`
		)
		cursor = transition
	}

	if (subcomponents.length === 0) {
		const sample = fromFields({ year: minYear, month: 1, day: 1 }, tzid)
		const fixedOffset = formatOffsetHHMM(offsetMinutes(sample))
		subcomponents.push(
			'BEGIN:STANDARD',
			'DTSTART:19700101T000000',
			`TZOFFSETFROM:${fixedOffset}`,
			`TZOFFSETTO:${fixedOffset}`,
			'END:STANDARD'
		)
	}

	return ['BEGIN:VTIMEZONE', `TZID:${tzid}`, ...subcomponents, 'END:VTIMEZONE']
}

export type CollectFn = (point: string, event: CalendarEvent) => unknown[]

export interface ExportICalendarOptions {
	/** `X-WR-CALNAME` / description label. Defaults to `'ilamy Calendar'`. */
	calendarName?: string
	/**
	 * Calendar IANA timezone (e.g. `'America/New_York'`). When set (or when an
	 * event specifies `event.timezone`), timed events emit `DTSTART;TZID=` /
	 * `DTEND;TZID=` paired with RFC 5545 §3.6.5 `VTIMEZONE` definitions.
	 */
	timezone?: string
}

const normalizeOptions = (
	options?: ExportICalendarOptions | string
): ExportICalendarOptions => {
	if (typeof options === 'string') {
		return { calendarName: options }
	}
	return options ?? {}
}

type ZoneYearSpan = Map<string, { min: number; max: number }>

const recordZoneYears = (
	zoneYears: ZoneYearSpan,
	tzid: string,
	startYear: number,
	endYear: number
): void => {
	const existing = zoneYears.get(tzid)
	const min = Math.min(startYear, endYear)
	const max = Math.max(startYear, endYear)
	if (!existing) {
		zoneYears.set(tzid, { min, max })
		return
	}
	existing.min = Math.min(existing.min, min)
	existing.max = Math.max(existing.max, max)
}

const buildEventDateLines = (
	event: CalendarEvent,
	eventZone: string | undefined,
	zoneYears: ZoneYearSpan
): [string, string] => {
	const parseZone = eventZone ?? 'UTC'
	const start = parseDate(event.start, parseZone) ?? now('UTC')
	const end = parseDate(event.end, parseZone) ?? start

	if (event.allDay) {
		const startDate =
			formatICalAllDayDate(event.start, eventZone) || formatICalDateOnly(start)
		const endDate =
			formatICalAllDayDate(event.end, eventZone) || formatICalDateOnly(end)
		return [`DTSTART;VALUE=DATE:${startDate}`, `DTEND;VALUE=DATE:${endDate}`]
	}

	if (eventZone) {
		recordZoneYears(zoneYears, eventZone, start.year, end.year)
		return [
			`DTSTART;TZID=${eventZone}:${formatICalLocalDateTime(start)}`,
			`DTEND;TZID=${eventZone}:${formatICalLocalDateTime(end)}`,
		]
	}

	return [
		`DTSTART:${formatICalUtcDateTime(start)}`,
		`DTEND:${formatICalUtcDateTime(end)}`,
	]
}

const buildOptionalMetadataLines = (event: CalendarEvent): string[] => {
	const lines: string[] = []
	if (event.description) {
		lines.push(`DESCRIPTION:${escapeText(event.description)}`)
	}
	if (event.location) {
		lines.push(`LOCATION:${escapeText(event.location)}`)
	}
	return lines
}

const convertEventToVEvent = (
	event: CalendarEvent,
	collect: CollectFn,
	calendarTimezone: string | undefined,
	zoneYears: ZoneYearSpan,
	timestamp: string
): string[] => {
	const eventZone = resolveICalTzid(event.timezone ?? calendarTimezone)
	const [dtStartLine, dtEndLine] = buildEventDateLines(
		event,
		eventZone,
		zoneYears
	)
	const extra = collect('ical:vevent-properties', event).filter(
		(line): line is string => typeof line === 'string'
	)

	return [
		'BEGIN:VEVENT',
		`UID:${getUID(event)}`,
		dtStartLine,
		dtEndLine,
		`SUMMARY:${escapeText(event.title)}`,
		...buildOptionalMetadataLines(event),
		...extra,
		`DTSTAMP:${timestamp}`,
		`CREATED:${timestamp}`,
		`LAST-MODIFIED:${timestamp}`,
		'STATUS:CONFIRMED',
		'SEQUENCE:0',
		'TRANSP:OPAQUE',
		'END:VEVENT',
	]
}

const noCollect: CollectFn = () => []

/**
 * Serializes `events` to an RFC 5545 iCalendar (`.ics`) string with CRLF line
 * endings, 75-octet UTF-8 safe folding, and `VTIMEZONE` + `TZID` support.
 */
export const exportToICalendar = (
	events: CalendarEvent[],
	collect: CollectFn = noCollect,
	options?: ExportICalendarOptions | string
): string => {
	const { calendarName = 'ilamy Calendar', timezone } =
		normalizeOptions(options)
	const name = escapeText(calendarName)
	const timestamp = formatICalUtcDateTime(now('UTC'))
	const zoneYears: ZoneYearSpan = new Map()

	const veventLines = events.flatMap((event) =>
		convertEventToVEvent(event, collect, timezone, zoneYears, timestamp)
	)

	const vtimezoneLines =
		zoneYears.size === 0
			? UTC_VTIMEZONE
			: [...zoneYears.entries()]
					.sort(([a], [b]) => a.localeCompare(b))
					.flatMap(([tzid, span]) => buildVTimezone(tzid, span.min, span.max))

	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//ilamy//ilamy Calendar//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${name}`,
		`X-WR-CALDESC:Exported from ${name}`,
		...vtimezoneLines,
		...veventLines,
		'END:VCALENDAR',
	]

	// RFC 5545 §3.4: the object ends with CRLF after "END:VCALENDAR".
	return `${lines.map(foldLine).join(CRLF)}${CRLF}`
}

/** Triggers a browser `.ics` file download for `events`. */
export const downloadICalendar = (
	events: CalendarEvent[],
	collect: CollectFn = noCollect,
	filename = 'calendar.ics',
	options?: ExportICalendarOptions | string
): void => {
	const blob = new Blob([exportToICalendar(events, collect, options)], {
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
