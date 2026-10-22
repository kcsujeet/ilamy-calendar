import { type CalendarEvent, dayjs } from '@ilamy/calendar'
import type { RRuleOptions } from '@ilamy/calendar-recurrence'

/** A series rule as JSON carries it: the two dates are ISO strings. */
type SeededRule = Omit<RRuleOptions, 'dtstart' | 'until'> & {
	dtstart: string
	until?: string
}

/** A stored row as JSON carries it: ISO strings where the store holds dates. */
type SeededRow = Omit<CalendarEvent, 'start' | 'end' | 'rrule'> & {
	start: string
	end: string
	rrule?: SeededRule
}

/**
 * The events of a `seed=<json>` URL parameter: an array of ordinary stored
 * rows (a series base, its overrides, plain events) with ISO strings in place
 * of dates. A spec states exactly the rows a consumer's database would hold
 * (uid, rrule, exdates, recurrenceId), so a case is a row, not a fixture.
 */
export const readSeededEvents = (seed: string): CalendarEvent[] => {
	const rows: SeededRow[] = JSON.parse(seed)
	return rows.map(({ rrule, ...row }) => ({
		...row,
		start: dayjs(row.start),
		end: dayjs(row.end),
		rrule: rrule && {
			...rrule,
			dtstart: new Date(rrule.dtstart),
			until: rrule.until ? new Date(rrule.until) : undefined,
		},
	}))
}
