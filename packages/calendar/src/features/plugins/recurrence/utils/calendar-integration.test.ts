import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import { RRule } from 'rrule'
import {
	add,
	parseDate,
	toUtcIso,
	withTime,
	type ZonedDate,
} from '../../../../utils/temporal'
import type { RRuleOptions } from '../types'
import { generateRecurringEvents } from './generate-recurring-events'

const mustUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const utcIso = (iso: string): string => toUtcIso(mustUtc(iso))

// Call wrapper: supplies the always-empty currentEvents and full-range defaults.
const generate = (
	event: CalendarEvent,
	start = '2025-01-06T00:00:00.000Z',
	end = '2025-01-20T23:59:59.999Z'
) =>
	generateRecurringEvents({
		event,
		currentEvents: [],
		startDate: start,
		endDate: end,
		timezone: 'UTC',
	})

// Factory for a daily recurring event starting Jan 6 at the given hour.
const makeDailyEvent = (
	overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id: 'daily-1',
	uid: 'daily-1@ilamy.calendar',
	title: 'Daily Event',
	start: '2025-01-06T09:00:00.000Z',
	end: '2025-01-06T10:00:00.000Z',
	rrule: {
		freq: RRule.DAILY,
		interval: 1,
		dtstart: new Date('2025-01-06T09:00:00.000Z'),
	},
	exdates: [],
	...overrides,
})

// Asserts each generated instance is unmodified (no recurrenceId) and starts
// at the matching ISO time, in order.
const expectInstanceStarts = (result: CalendarEvent[], startISOs: string[]) => {
	expect(result).toHaveLength(startISOs.length)
	expect(result.map((event) => event.recurrenceId)).toEqual(
		startISOs.map(() => undefined)
	)
	expect(result.map((event) => utcIso(event.start))).toEqual(startISOs)
}

describe('generateRecurringEvents - exclusive end at the range boundary', () => {
	it('omits an occurrence that ends exactly at the range start', () => {
		const allDayDaily: CalendarEvent = {
			id: 'all-day-daily',
			uid: 'all-day-daily@ilamy.calendar',
			title: 'All-day daily',
			allDay: true,
			start: '2025-01-06T00:00:00.000Z',
			end: '2025-01-07T00:00:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-06T00:00:00.000Z'),
			},
			exdates: [],
		}

		const result = generate(
			allDayDaily,
			'2025-01-08T00:00:00.000Z',
			'2025-01-09T00:00:00.000Z'
		)

		expect(result.map((e) => utcIso(e.start))).not.toContain(
			'2025-01-07T00:00:00.000Z'
		)
	})

	it('keeps a zero-duration occurrence that starts at the range start', () => {
		const zeroDuration: CalendarEvent = {
			id: 'zero-duration',
			uid: 'zero-duration@ilamy.calendar',
			title: 'Zero duration',
			start: '2025-01-06T09:00:00.000Z',
			end: '2025-01-06T09:00:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-06T09:00:00.000Z'),
			},
			exdates: [],
		}

		const result = generate(
			zeroDuration,
			'2025-01-08T09:00:00.000Z',
			'2025-01-10T09:00:00.000Z'
		)

		expect(result.map((e) => utcIso(e.start))).toContain(
			'2025-01-08T09:00:00.000Z'
		)
	})
})

describe('generateRecurringEvents - Calendar Provider Integration', () => {
	const baseEvent: CalendarEvent = {
		id: 'recurring-1',
		uid: 'recurring-1@ilamy.calendar',
		title: 'Weekly Meeting',
		start: '2025-01-06T09:00:00.000Z',
		end: '2025-01-06T10:00:00.000Z',
		rrule: {
			freq: RRule.WEEKLY,
			interval: 1,
			byweekday: [RRule.MO, RRule.WE, RRule.FR],
			dtstart: new Date('2025-01-06T09:00:00.000Z'),
		},
		exdates: [],
	}

	it('should generate instances with same UID as parent and no recurrenceId', () => {
		const result = generate(baseEvent)

		expect(result).toHaveLength(7)

		result.forEach((instance) => {
			expect(instance.uid).toBe(baseEvent.uid)
			expect(instance.rrule).toBeUndefined()
			expect(instance.recurrenceId).toBeUndefined()
		})

		const firstEvent = result[0]
		expect(firstEvent.id).toBe('recurring-1_0')
		expect(firstEvent.title).toBe('Weekly Meeting')

		const wednesdayEvent = result[1]
		expect(utcIso(wednesdayEvent.start)).toBe('2025-01-08T09:00:00.000Z')

		const fridayEvent = result[2]
		expect(utcIso(fridayEvent.start)).toBe('2025-01-10T09:00:00.000Z')
	})

	it('should generate UID for parent when missing and use same UID for all instances', () => {
		const eventWithoutUID: CalendarEvent = {
			id: 'recurring-2',
			title: 'Daily Standup',
			start: '2025-01-06T09:00:00.000Z',
			end: '2025-01-06T09:30:00.000Z',
			rrule: {
				freq: RRule.WEEKLY,
				interval: 1,
				byweekday: [RRule.MO, RRule.WE, RRule.FR],
				dtstart: new Date('2025-01-06T09:00:00.000Z'),
			},
		}

		const result = generate(eventWithoutUID)

		expect(result).toHaveLength(7)

		const expectedUID = `${eventWithoutUID.id}@ilamy.calendar`
		result.forEach((instance) => {
			expect(instance.uid).toBe(expectedUID)
			expect(instance.rrule).toBeUndefined()
			expect(instance.recurrenceId).toBeUndefined()
		})
	})

	it('should handle EXDATE exclusions correctly', () => {
		const eventWithExdates: CalendarEvent = {
			...baseEvent,
			exdates: ['2025-01-08T09:00:00.000Z'],
		}

		const result = generate(eventWithExdates)

		expect(result).toHaveLength(6)

		const excludedDate = result.find(
			(event) => utcIso(event.start) === '2025-01-08T09:00:00.000Z'
		)
		expect(excludedDate).toBeUndefined()

		const fridayEvent = result.find(
			(event) => utcIso(event.start) === '2025-01-10T09:00:00.000Z'
		)
		expect(fridayEvent).toBeDefined()
	})

	it('should handle daily recurring events', () => {
		const dailyEvent = makeDailyEvent({
			title: 'Daily Standup',
			end: '2025-01-06T09:30:00.000Z',
		})

		const result = generate(
			dailyEvent,
			'2025-01-06T00:00:00.000Z',
			'2025-01-10T23:59:59.999Z'
		)

		expect(result).toHaveLength(5)

		result.forEach((event, index) => {
			const expectedDate = add(
				mustUtc('2025-01-06T00:00:00.000Z'),
				index,
				'day'
			)
			expect(event.recurrenceId).toBeUndefined()
			expect(utcIso(event.start)).toBe(
				toUtcIso(withTime(expectedDate, { hour: 9 }))
			)
			expect(utcIso(event.end)).toBe(
				toUtcIso(withTime(expectedDate, { hour: 9, minute: 30 }))
			)
		})
	})
})

describe('Monthly and Complex Patterns', () => {
	it('should handle monthly recurring events', () => {
		const monthlyEvent: CalendarEvent = {
			id: 'monthly-1',
			uid: 'monthly-1@ilamy.calendar',
			title: 'Monthly Review',
			start: '2025-01-06T14:00:00.000Z',
			end: '2025-01-06T15:00:00.000Z',
			rrule: {
				freq: RRule.MONTHLY,
				interval: 1,
				dtstart: new Date('2025-01-06T14:00:00.000Z'),
			},
			exdates: [],
		}

		const result = generate(
			monthlyEvent,
			'2025-01-01T00:00:00.000Z',
			'2025-04-30T23:59:59.999Z'
		)

		expect(result).toHaveLength(4)

		expect(result[0].recurrenceId).toBeUndefined()
		expect(utcIso(result[0].start)).toBe('2025-01-06T14:00:00.000Z')

		expect(result[1].recurrenceId).toBeUndefined()
		expect(utcIso(result[1].start)).toBe('2025-02-06T14:00:00.000Z')

		expect(result[2].recurrenceId).toBeUndefined()
		expect(utcIso(result[2].start)).toBe('2025-03-06T14:00:00.000Z')

		expect(result[3].recurrenceId).toBeUndefined()
		expect(utcIso(result[3].start)).toBe('2025-04-06T14:00:00.000Z')
	})

	it('should handle COUNT limits in RRULE', () => {
		const limitedEvent = makeDailyEvent({
			id: 'limited-1',
			uid: 'limited-1@ilamy.calendar',
			title: 'Limited Series',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				count: 3,
				dtstart: new Date('2025-01-06T09:00:00.000Z'),
			},
		})

		const result = generate(limitedEvent)

		expectInstanceStarts(result, [
			'2025-01-06T09:00:00.000Z',
			'2025-01-07T09:00:00.000Z',
			'2025-01-08T09:00:00.000Z',
		])
	})

	it('should handle UNTIL limits in RRULE', () => {
		const untilEvent = makeDailyEvent({
			id: 'until-1',
			uid: 'until-1@ilamy.calendar',
			title: 'Until Series',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				until: new Date('2025-01-08T09:00:00.000Z'),
				dtstart: new Date('2025-01-06T09:00:00.000Z'),
			},
		})

		const result = generate(untilEvent)

		expectInstanceStarts(result, [
			'2025-01-06T09:00:00.000Z',
			'2025-01-07T09:00:00.000Z',
			'2025-01-08T09:00:00.000Z',
		])
	})

	it('should include events that span through the date range even if they start before it', () => {
		const longDurationEvent = makeDailyEvent({
			id: 'long-duration-1',
			uid: 'long-duration-1@ilamy.calendar',
			title: 'Long Meeting',
			start: '2025-01-06T08:00:00.000Z',
			end: '2025-01-06T12:00:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-06T08:00:00.000Z'),
			},
		})

		const result = generate(
			longDurationEvent,
			'2025-01-07T10:00:00.000Z',
			'2025-01-07T14:00:00.000Z'
		)

		expect(result).toHaveLength(1)
		expect(utcIso(result[0].start)).toBe('2025-01-07T08:00:00.000Z')
		expect(utcIso(result[0].end)).toBe('2025-01-07T12:00:00.000Z')
	})

	it('should not include events that end before the date range starts', () => {
		const shortEvent = makeDailyEvent({
			id: 'short-1',
			uid: 'short-1@ilamy.calendar',
			title: 'Short Meeting',
			start: '2025-01-06T08:00:00.000Z',
			end: '2025-01-06T09:00:00.000Z',
			rrule: {
				freq: RRule.DAILY,
				interval: 1,
				dtstart: new Date('2025-01-06T08:00:00.000Z'),
			},
		})

		const result = generate(
			shortEvent,
			'2025-01-07T10:00:00.000Z',
			'2025-01-07T14:00:00.000Z'
		)

		expect(result).toHaveLength(0)
	})

	it('should return empty array for events without RRULE', () => {
		const nonRecurringEvent: CalendarEvent = {
			id: 'single-1',
			uid: 'single-1@ilamy.calendar',
			title: 'Single Event',
			start: '2025-01-06T09:00:00.000Z',
			end: '2025-01-06T10:00:00.000Z',
			exdates: [],
		}

		const result = generate(nonRecurringEvent)
		expect(result).toHaveLength(0)
	})

	it('should handle invalid RRULE options gracefully', () => {
		const malformedEvent: CalendarEvent = {
			id: 'malformed-1',
			uid: 'malformed-1@ilamy.calendar',
			title: 'Invalid RRULE',
			start: '2025-01-06T09:00:00.000Z',
			end: '2025-01-06T10:00:00.000Z',
			rrule: {
				freq: 'INVALID_FREQUENCY',
			} as unknown as RRuleOptions,
			exdates: [],
		}

		expect(() => {
			generate(malformedEvent)
		}).toThrow()
	})
})
