import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import { RRule } from 'rrule'
import {
	add,
	endOf,
	parseDate,
	subtract,
	toDate,
	toUtcIso,
	type ZonedDate,
} from '../../../../utils/temporal'
import {
	countOccurrencesBefore,
	cutSeriesBefore,
	getOccurrenceStartISO,
} from './series-helpers'

const mustUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const dailyISO = (day: number): string =>
	toUtcIso(add(mustUtc('2025-03-09T09:00:00.000Z'), day, 'day'))

const makeDailySeries = (
	overrides: Partial<CalendarEvent> = {},
	rule: Partial<NonNullable<CalendarEvent['rrule']>> = {}
): CalendarEvent => ({
	id: 'S',
	uid: 'S',
	title: 'Stand-up',
	start: dailyISO(0),
	end: toUtcIso(add(mustUtc(dailyISO(0)), 30, 'minute')),
	rrule: {
		freq: RRule.DAILY,
		count: 7,
		dtstart: new Date(dailyISO(0)),
		...rule,
	},
	...overrides,
})

describe('countOccurrencesBefore', () => {
	it('is zero for the first occurrence', () => {
		expect(countOccurrencesBefore(makeDailySeries(), dailyISO(0), 'UTC')).toBe(
			0
		)
	})

	it('counts the occurrences strictly before the one asked about', () => {
		expect(countOccurrencesBefore(makeDailySeries(), dailyISO(3), 'UTC')).toBe(
			3
		)
	})

	it('counts excluded occurrences (COUNT is applied before EXDATE)', () => {
		const series = makeDailySeries({ exdates: [dailyISO(1)] })
		expect(countOccurrencesBefore(series, dailyISO(3), 'UTC')).toBe(3)
	})

	it('follows the rule, not the calendar days', () => {
		const everyOtherDay = makeDailySeries({}, { interval: 2 })
		expect(countOccurrencesBefore(everyOtherDay, dailyISO(6), 'UTC')).toBe(3)
	})

	it('is zero for an event with no rule', () => {
		const plain = makeDailySeries({ rrule: undefined })
		expect(countOccurrencesBefore(plain, dailyISO(3), 'UTC')).toBe(0)
	})
})

describe('cutSeriesBefore', () => {
	it('ends the series at the end of the day before the occurrence', () => {
		const { terminatedEvent } = cutSeriesBefore(
			makeDailySeries(),
			dailyISO(3),
			'UTC'
		)
		const endOfDayBefore = toDate(
			endOf(subtract(mustUtc(dailyISO(3)), 1, 'day'), 'day')
		)
		expect(terminatedEvent.rrule?.until).toEqual(endOfDayBefore)
	})

	it('drops COUNT, which MUST NOT occur with UNTIL (RFC 5545 §3.3.10)', () => {
		const { terminatedEvent } = cutSeriesBefore(
			makeDailySeries(),
			dailyISO(3),
			'UTC'
		)
		expect(terminatedEvent.rrule?.count).toBeUndefined()
	})

	it('keeps only the exdates before the cut', () => {
		const series = makeDailySeries({ exdates: [dailyISO(1), dailyISO(5)] })
		const { terminatedEvent } = cutSeriesBefore(series, dailyISO(3), 'UTC')
		expect(terminatedEvent.exdates).toEqual([dailyISO(1)])
	})

	it('recognises the detached overrides of the series after the cut', () => {
		const { isFollowingOverride } = cutSeriesBefore(
			makeDailySeries(),
			dailyISO(3),
			'UTC'
		)
		const override = (uid: string, occurrence: number): CalendarEvent => ({
			...makeDailySeries(),
			id: `${uid}-${occurrence}`,
			uid,
			rrule: undefined,
			recurrenceId: dailyISO(occurrence),
		})
		expect(isFollowingOverride(override('S', 4))).toBe(true)
		expect(isFollowingOverride(override('S', 1))).toBe(false)
		expect(isFollowingOverride(override('other', 4))).toBe(false)
		expect(isFollowingOverride(makeDailySeries())).toBe(false)
	})
})

describe('getOccurrenceStartISO', () => {
	it('is the RECURRENCE-ID of an override, not where it was moved to', () => {
		const moved = makeDailySeries({
			rrule: undefined,
			start: dailyISO(5),
			recurrenceId: dailyISO(2),
		})
		expect(getOccurrenceStartISO(moved)).toBe(dailyISO(2))
	})

	it('is the start of a generated instance', () => {
		const instance = makeDailySeries({ rrule: undefined })
		expect(getOccurrenceStartISO(instance)).toBe(dailyISO(0))
	})
})
