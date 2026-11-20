import { afterEach, describe, expect, it, setSystemTime } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import {
	add,
	endOf,
	formatDate,
	getOffsetString,
	parseDate,
	startOf,
	toDate,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { RRule } from 'rrule'
import { generateRecurringEvents } from './generate-recurring-events'

const mustParse = (iso: string, zone: string): ZonedDate => {
	const parsed = parseDate(iso, zone)
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso} in ${zone}`)
	}
	return parsed
}

const pad2 = (value: number): string => String(value).padStart(2, '0')
const weekdayName = (date: ZonedDate): string =>
	formatDate(date, { weekday: 'long' }, 'en-US')
const hhmm = (date: ZonedDate): string =>
	`${pad2(date.hour)}:${pad2(date.minute)}`

describe('Recurrence Timezone Persistence', () => {
	it('should correctly place events on the intended local day (Wednesday) even when they cross UTC day boundaries', () => {
		const zone = 'America/Los_Angeles'
		const startPST = mustParse('2026-01-07T16:00:00', zone)
		const endPST = add(startPST, 1, 'hour')

		expect(toUtcIso(startPST)).toBe('2026-01-08T00:00:00.000Z')
		expect(weekdayName(startPST)).toBe('Wednesday')

		const event: CalendarEvent = {
			id: 'test-event',
			title: 'Wednesday Sync',
			start: toOffsetIso(startPST),
			end: toOffsetIso(endPST),
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE],
				dtstart: toDate(startPST),
				until: toDate(add(startPST, 3, 'week')),
			},
		}

		const startDate = startOf(mustParse('2026-01-01', zone), 'month')
		const endDate = endOf(mustParse('2026-01-31', zone), 'month')

		const recurringEvents = generateRecurringEvents({
			event,
			currentEvents: [],
			startDate,
			endDate,
			timezone: zone,
		})

		expect(recurringEvents.length).toBeGreaterThan(0)

		recurringEvents.forEach((e) => {
			const parsed = mustParse(e.start, zone)
			expect(weekdayName(parsed)).toBe('Wednesday')
			expect(hhmm(parsed)).toBe('16:00')
		})
	})

	it('should handle the specific case from the user report', () => {
		const zone = 'America/Los_Angeles'
		const startPST = mustParse('2026-01-08T00:00:00Z', zone)

		expect(weekdayName(startPST)).toBe('Wednesday')
		expect(hhmm(startPST)).toBe('16:00')

		const event: CalendarEvent = {
			id: 'user-event',
			title: 'User Event',
			start: toOffsetIso(startPST),
			end: toOffsetIso(add(startPST, 1, 'hour')),
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE],
				dtstart: toDate(startPST),
				until: new Date('2026-01-28T23:59:59Z'),
			},
		}

		const recurringEvents = generateRecurringEvents({
			event,
			currentEvents: [],
			startDate: mustParse('2026-01-01', zone),
			endDate: mustParse('2026-01-31', zone),
			timezone: zone,
		})

		expect(recurringEvents.length).toBe(3)
		recurringEvents.forEach((e) => {
			expect(weekdayName(mustParse(e.start, zone))).toBe('Wednesday')
		})
	})

	it('should work correctly in UTC-0 (London) for comparison', () => {
		const startUTC = mustParse('2026-01-07T16:00:00Z', 'UTC')
		const event: CalendarEvent = {
			id: 'utc-event',
			title: 'UTC Event',
			start: toOffsetIso(startUTC),
			end: toOffsetIso(add(startUTC, 1, 'hour')),
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE],
				dtstart: toDate(startUTC),
				until: toDate(add(startUTC, 3, 'week')),
			},
		}

		const recurringEvents = generateRecurringEvents({
			event,
			currentEvents: [],
			startDate: mustParse('2026-01-01', 'UTC'),
			endDate: mustParse('2026-01-31', 'UTC'),
			timezone: 'UTC',
		})

		recurringEvents.forEach((e) => {
			expect(weekdayName(mustParse(e.start, 'UTC'))).toBe('Wednesday')
		})
	})

	it('expands events in independent zones concurrently without global state (#314)', () => {
		const nySeries: CalendarEvent = {
			id: 'ny',
			title: 'NY 09:00',
			timezone: 'America/New_York',
			start: '2025-03-08T09:00:00-05:00',
			end: '2025-03-08T09:30:00-05:00',
			rrule: { freq: RRule.DAILY, dtstart: new Date('2025-03-08T14:00:00Z') },
		}
		const tokyoSeries: CalendarEvent = {
			id: 'tokyo',
			title: 'Tokyo 09:00',
			timezone: 'Asia/Tokyo',
			start: '2025-03-08T09:00:00+09:00',
			end: '2025-03-08T09:30:00+09:00',
			rrule: { freq: RRule.DAILY, dtstart: new Date('2025-03-08T00:00:00Z') },
		}

		const nyOccurrences = generateRecurringEvents({
			event: nySeries,
			currentEvents: [],
			startDate: '2025-03-08T00:00:00Z',
			endDate: '2025-03-10T23:59:59Z',
			timezone: 'UTC',
		})
		const tokyoOccurrences = generateRecurringEvents({
			event: tokyoSeries,
			currentEvents: [],
			startDate: '2025-03-08T00:00:00Z',
			endDate: '2025-03-10T23:59:59Z',
			timezone: 'UTC',
		})

		// NY springs forward on March 9: 09:00 stays 09:00 local (-05:00 -> -04:00)
		expect(nyOccurrences.map((e) => e.start)).toEqual([
			'2025-03-08T09:00:00-05:00',
			'2025-03-09T09:00:00-04:00',
			'2025-03-10T09:00:00-04:00',
		])
		// Tokyo stays fixed +09:00 (09:00+09:00 = 00:00Z)
		expect(tokyoOccurrences.map((e) => e.start)).toEqual([
			'2025-03-08T09:00:00+09:00',
			'2025-03-09T09:00:00+09:00',
			'2025-03-10T09:00:00+09:00',
		])
	})
})

describe('Recurrence across a daylight-saving change', () => {
	const ZONE = 'America/New_York'

	afterEach(() => {
		setSystemTime()
	})

	const expandDaily = (
		startISO: string,
		fromISO: string,
		toISO: string,
		exdates?: string[]
	) => {
		const start = mustParse(startISO, ZONE)
		const event: CalendarEvent = {
			id: 'daily',
			title: 'daily',
			start: toOffsetIso(start),
			end: toOffsetIso(add(start, 30, 'minute')),
			rrule: { freq: RRule.DAILY, dtstart: toDate(start) },
			exdates,
		}
		return generateRecurringEvents({
			event,
			currentEvents: [],
			startDate: fromISO,
			endDate: toISO,
			timezone: ZONE,
		}).map((occurrence) => {
			const parsed = mustParse(occurrence.start, ZONE)
			const mmdd = `${pad2(parsed.month)}-${pad2(parsed.day)}`
			return `${mmdd} ${hhmm(parsed)}${getOffsetString(parsed)} | ${toUtcIso(parsed)}`
		})
	}

	it('keeps a 09:00 series at 09:00 local time after the spring change', () => {
		const occurrences = expandDaily(
			'2025-03-07T14:00:00.000Z',
			'2025-03-07T00:00:00.000Z',
			'2025-03-10T23:59:59.999Z'
		)
		expect(occurrences).toEqual([
			'03-07 09:00-05:00 | 2025-03-07T14:00:00.000Z',
			'03-08 09:00-05:00 | 2025-03-08T14:00:00.000Z',
			'03-09 09:00-04:00 | 2025-03-09T13:00:00.000Z',
			'03-10 09:00-04:00 | 2025-03-10T13:00:00.000Z',
		])
	})

	it('moves a time skipped by the spring change forward by the gap', () => {
		const occurrences = expandDaily(
			'2025-03-08T07:30:00.000Z',
			'2025-03-08T00:00:00.000Z',
			'2025-03-10T23:59:59.999Z'
		)
		expect(occurrences).toEqual([
			'03-08 02:30-05:00 | 2025-03-08T07:30:00.000Z',
			'03-09 03:30-04:00 | 2025-03-09T07:30:00.000Z',
			'03-10 02:30-04:00 | 2025-03-10T06:30:00.000Z',
		])
	})

	it.each([
		['summer', '2026-07-01T12:00:00.000Z'],
		['winter', '2026-01-15T12:00:00.000Z'],
	])(
		'takes the first of a time repeated by the autumn change, run in %s',
		(_season, today) => {
			setSystemTime(new Date(today))
			const occurrences = expandDaily(
				'2025-11-01T05:30:00.000Z',
				'2025-11-01T00:00:00.000Z',
				'2025-11-03T23:59:59.999Z'
			)
			expect(occurrences).toEqual([
				'11-01 01:30-04:00 | 2025-11-01T05:30:00.000Z',
				'11-02 01:30-04:00 | 2025-11-02T05:30:00.000Z',
				'11-03 01:30-05:00 | 2025-11-03T06:30:00.000Z',
			])
		}
	)

	it('excludes an occurrence after the change by its local-time instant', () => {
		const occurrences = expandDaily(
			'2025-03-07T14:00:00.000Z',
			'2025-03-09T00:00:00.000Z',
			'2025-03-11T23:59:59.999Z',
			['2025-03-10T13:00:00.000Z']
		)
		expect(occurrences).toEqual([
			'03-09 09:00-04:00 | 2025-03-09T13:00:00.000Z',
			'03-11 09:00-04:00 | 2025-03-11T13:00:00.000Z',
		])
	})
})
