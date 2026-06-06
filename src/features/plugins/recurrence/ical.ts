import type { CalendarEvent, Dayjs } from '@ilamy/calendar'
import { dayjs } from '@ilamy/calendar'
import { RRule } from 'rrule'

const formatDate = (date: Dayjs, isAllDay = false): string => {
	return isAllDay
		? date.format('YYYYMMDD')
		: date.utc().format('YYYYMMDD[T]HHmmss[Z]')
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

/**
 * Returns the recurrence-specific VEVENT property lines for an event: an
 * `RRULE:` line when the event has an rrule, an `EXDATE:` line when it has
 * exdates, and a `RECURRENCE-ID:` line when it is a modified instance.
 */
export const recurrenceICalProperties = (event: CalendarEvent): string[] => {
	const lines: string[] = []

	if (event.rrule) {
		const rrule = formatRRule(event.rrule)
		if (rrule) {
			lines.push(rrule)
		}
	}

	if (event.exdates?.length) {
		const exdates = event.exdates
			.map((date) => formatDate(dayjs(date), event.allDay))
			.join(',')
		lines.push(`EXDATE:${exdates}`)
	}

	if (event.recurrenceId) {
		const recurrenceId = formatDate(dayjs(event.recurrenceId), event.allDay)
		lines.push(`RECURRENCE-ID:${recurrenceId}`)
	}

	return lines
}
