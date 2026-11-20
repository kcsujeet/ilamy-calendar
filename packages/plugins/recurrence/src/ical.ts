import type { CalendarEvent } from '@ilamy/calendar'
import {
	formatICalAllDayDate,
	formatICalLocalDateTime,
	formatICalUtcDateTime,
	resolveICalTzid,
} from '@ilamy/utils/ical-format'
import { parseDate } from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import type { RRuleOptions } from './types'

const formatICalDate = (
	value: string | Date,
	isAllDay: boolean,
	eventZone: string | undefined
): string => {
	if (isAllDay) {
		return formatICalAllDayDate(value, eventZone)
	}
	const parsed = parseDate(value, eventZone ?? 'UTC')
	if (!parsed) {
		return ''
	}
	return eventZone
		? formatICalLocalDateTime(parsed)
		: formatICalUtcDateTime(parsed)
}

const formatRRule = (
	rruleOptions: RRuleOptions,
	isAllDay: boolean,
	eventZone: string | undefined
): string => {
	try {
		const { until, ...optionsWithoutUntil } = rruleOptions
		const hasDateUntil = isAllDay && Boolean(until)
		const options = hasDateUntil ? optionsWithoutUntil : rruleOptions
		const rruleString = new RRule(options).toString()
		const rruleLine =
			rruleString.split('\n').find((line) => line.startsWith('RRULE:')) || ''
		if (hasDateUntil && until && rruleLine) {
			return `${rruleLine};UNTIL=${formatICalDate(until, true, eventZone)}`
		}
		return rruleLine
	} catch {
		return ''
	}
}

const buildDateParam = (
	isAllDay: boolean,
	eventZone: string | undefined
): string => {
	if (isAllDay) {
		return ';VALUE=DATE'
	}
	return eventZone ? `;TZID=${eventZone}` : ''
}

export const recurrenceICalProperties = (event: CalendarEvent): string[] => {
	const lines: string[] = []
	const isAllDay = Boolean(event.allDay)
	const eventZone = resolveICalTzid(event.timezone)
	const param = buildDateParam(isAllDay, eventZone)

	const rruleLine = event.rrule
		? formatRRule(event.rrule, isAllDay, eventZone)
		: ''
	if (rruleLine) {
		lines.push(rruleLine)
	}

	if (event.exdates?.length) {
		const exdates = event.exdates
			.map((date) => formatICalDate(date, isAllDay, eventZone))
			.filter(Boolean)
			.join(',')
		if (exdates) {
			lines.push(`EXDATE${param}:${exdates}`)
		}
	}

	if (event.recurrenceId) {
		const recurrenceId = formatICalDate(event.recurrenceId, isAllDay, eventZone)
		if (recurrenceId) {
			lines.push(`RECURRENCE-ID${param}:${recurrenceId}`)
		}
	}

	return lines
}
