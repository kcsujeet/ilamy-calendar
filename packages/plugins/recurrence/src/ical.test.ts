import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import {
	parseDate,
	resolveZone,
	toDate,
	toOffsetIso,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { RRule, rrulestr } from 'rrule'
import { recurrenceICalProperties } from './ical'

const localDay = (day: string, time = '00:00:00.000'): ZonedDate => {
	const parsed = parseDate(`${day}T${time}`, resolveZone())
	if (!parsed) {
		throw new Error(`Invalid test date: ${day}T${time}`)
	}
	return parsed
}

const timedSeries = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
	id: 'series',
	title: 'Stand-up',
	start: '2025-03-10T09:00:00.000Z',
	end: '2025-03-10T09:30:00.000Z',
	rrule: {
		freq: RRule.WEEKLY,
		dtstart: new Date('2025-03-10T09:00:00.000Z'),
	},
	...extra,
})

const allDaySeries = (extra: Partial<CalendarEvent> = {}): CalendarEvent =>
	timedSeries({
		allDay: true,
		start: toOffsetIso(localDay('2025-03-10')),
		end: toOffsetIso(localDay('2025-03-11')),
		rrule: {
			freq: RRule.WEEKLY,
			dtstart: toDate(localDay('2025-03-10')),
		},
		...extra,
	})

describe('recurrenceICalProperties', () => {
	describe('UNTIL has the value type of DTSTART (RFC 5545 3.3.10)', () => {
		it('is a DATE for an all-day series', () => {
			const event = allDaySeries({
				rrule: {
					freq: RRule.WEEKLY,
					dtstart: toDate(localDay('2025-03-10')),
					until: toDate(localDay('2025-03-23', '23:59:59.999')),
				},
			})
			expect(recurrenceICalProperties(event)).toEqual([
				'RRULE:FREQ=WEEKLY;UNTIL=20250323',
			])
		})

		it('stays a UTC DATE-TIME for a timed series', () => {
			const event = timedSeries({
				rrule: {
					freq: RRule.WEEKLY,
					dtstart: new Date('2025-03-10T09:00:00.000Z'),
					until: new Date('2025-03-23T23:59:59.000Z'),
				},
			})
			expect(recurrenceICalProperties(event)).toEqual([
				'RRULE:FREQ=WEEKLY;UNTIL=20250323T235959Z',
			])
		})

		it('keeps the other parts of an all-day rule', () => {
			const event = allDaySeries({
				rrule: {
					freq: RRule.WEEKLY,
					interval: 2,
					byweekday: [RRule.MO],
					dtstart: toDate(localDay('2025-03-10')),
					until: toDate(localDay('2025-03-23', '23:59:59.999')),
				},
			})
			const [line] = recurrenceICalProperties(event)
			const parts = line.replace('RRULE:', '').split(';').sort()
			expect(parts).toEqual([
				'BYDAY=MO',
				'FREQ=WEEKLY',
				'INTERVAL=2',
				'UNTIL=20250323',
			])
		})

		it('writes no UNTIL when the all-day rule has none', () => {
			const event = allDaySeries({
				rrule: {
					freq: RRule.WEEKLY,
					count: 3,
					dtstart: toDate(localDay('2025-03-10')),
				},
			})
			expect(recurrenceICalProperties(event)).toEqual([
				'RRULE:FREQ=WEEKLY;COUNT=3',
			])
		})

		it('is read back by an independent parser with the same last day', () => {
			const event = allDaySeries({
				rrule: {
					freq: RRule.DAILY,
					dtstart: toDate(localDay('2025-03-10')),
					until: toDate(localDay('2025-03-12', '23:59:59.999')),
				},
			})
			const [line] = recurrenceICalProperties(event)
			const parsed = rrulestr(`DTSTART:20250310T000000Z\n${line}`)
			const days = parsed.all().map((date) => date.toISOString().slice(0, 10))
			expect(days).toEqual(['2025-03-10', '2025-03-11', '2025-03-12'])
		})
	})

	describe('all-day exceptions carry VALUE=DATE (3.8.5.1, 3.8.4.4)', () => {
		it('writes EXDATE as DATE values', () => {
			const event = allDaySeries({
				exdates: [
					toUtcIso(localDay('2025-03-17')),
					toUtcIso(localDay('2025-03-24')),
				],
			})
			expect(recurrenceICalProperties(event)).toContain(
				'EXDATE;VALUE=DATE:20250317,20250324'
			)
		})

		it('writes RECURRENCE-ID as a DATE value', () => {
			const event = allDaySeries({
				rrule: undefined,
				recurrenceId: toUtcIso(localDay('2025-03-17')),
			})
			expect(recurrenceICalProperties(event)).toEqual([
				'RECURRENCE-ID;VALUE=DATE:20250317',
			])
		})

		it('leaves a timed series with UTC DATE-TIME values and no VALUE parameter', () => {
			const event = timedSeries({
				exdates: ['2025-03-17T09:00:00.000Z'],
				recurrenceId: '2025-03-24T09:00:00.000Z',
			})
			const lines = recurrenceICalProperties(event)
			expect(lines).toContain('EXDATE:20250317T090000Z')
			expect(lines).toContain('RECURRENCE-ID:20250324T090000Z')
		})

		it('emits TZID parameter on EXDATE and RECURRENCE-ID when event.timezone is set (#314)', () => {
			const event = timedSeries({
				timezone: 'America/New_York',
				start: '2025-03-10T09:00:00-04:00',
				end: '2025-03-10T09:30:00-04:00',
				exdates: ['2025-03-17T13:00:00.000Z'],
				recurrenceId: '2025-03-24T13:00:00.000Z',
			})
			const lines = recurrenceICalProperties(event)
			expect(lines).toContain('EXDATE;TZID=America/New_York:20250317T090000')
			expect(lines).toContain(
				'RECURRENCE-ID;TZID=America/New_York:20250324T090000'
			)
		})
	})
})
