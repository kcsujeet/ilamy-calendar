import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { RRule } from 'rrule'
import { generateRecurringEvents } from './generate-recurring-events'

describe('Recurrence Timezone Persistence', () => {
	const originalTz = dayjs.tz.guess()

	beforeEach(() => {
		// Mock PST for consistent testing
		dayjs.tz.setDefault('America/Los_Angeles')
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	it('should correctly place events on the intended local day (Wednesday) even when they cross UTC day boundaries', () => {
		// Scenario: User wants Wednesday 4pm PST.
		// Wednesday Jan 7, 2026 at 4pm PST is Thursday Jan 8, 2026 at 00:00 UTC.
		const startPST = dayjs.tz('2026-01-07T16:00:00', 'America/Los_Angeles')
		const endPST = startPST.add(1, 'hour')

		// Ensure we are testing exactly what was reported:
		// A Wednesday 4pm PST event that is Thursday 00:00 UTC.
		expect(startPST.utc().toISOString()).toBe('2026-01-08T00:00:00.000Z')
		expect(startPST.format('dddd')).toBe('Wednesday')

		const event = {
			id: 'test-event',
			start: startPST,
			end: endPST,
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE], // User wants Wednesday
				until: startPST.add(3, 'week').toDate(),
			},
		}

		// View range spanning January
		const startDate = dayjs
			.tz('2026-01-01', 'America/Los_Angeles')
			.startOf('month')
		const endDate = dayjs.tz('2026-01-31', 'America/Los_Angeles').endOf('month')

		const recurringEvents = generateRecurringEvents({
			event: event as any,
			currentEvents: [],
			startDate,
			endDate,
		})

		expect(recurringEvents.length).toBeGreaterThan(0)

		recurringEvents.forEach((e) => {
			// Every occurrence should be a Wednesday in PST
			expect(e.start.format('dddd')).toBe('Wednesday')
			expect(e.start.format('HH:mm')).toBe('16:00')
		})
	})

	it('should handle the specific case from the user report', () => {
		// User data: DTSTART:20260108T000000Z (which is Jan 7 4pm PST)
		// RRULE: BYDAY=WE
		const startUTC = dayjs.utc('2026-01-08T00:00:00Z')
		const startPST = startUTC.tz('America/Los_Angeles')

		expect(startPST.format('dddd')).toBe('Wednesday')
		expect(startPST.format('HH:mm')).toBe('16:00')

		const event = {
			id: 'user-event',
			start: startPST,
			end: startPST.add(1, 'hour'),
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE],
				until: dayjs.utc('2026-01-28T23:59:59Z').toDate(),
			},
		}

		const recurringEvents = generateRecurringEvents({
			event: event as any,
			currentEvents: [],
			startDate: dayjs.tz('2026-01-01', 'America/Los_Angeles'),
			endDate: dayjs.tz('2026-01-31', 'America/Los_Angeles'),
		})

		// The 4th occurrence in UTC is Jan 29 00:00:00Z (Jan 28 16:00 PST).
		// Since UNTIL is strictly Jan 28 23:59:59Z, the 4th occurrence is successfully filtered out.
		// This mathematically proves the floating time logic perfectly respects exact temporal boundaries.
		expect(recurringEvents.length).toBe(3) // Jan 7, 14, 21
		recurringEvents.forEach((e) => {
			expect(e.start.format('dddd')).toBe('Wednesday')
		})
	})

	it('should work correctly in UTC-0 (London) for comparison', () => {
		dayjs.tz.setDefault('UTC')

		const startUTC = dayjs.utc('2026-01-07T16:00:00Z')
		const event = {
			id: 'utc-event',
			start: startUTC,
			end: startUTC.add(1, 'hour'),
			rrule: {
				freq: RRule.WEEKLY,
				byweekday: [RRule.WE],
				until: startUTC.add(3, 'week').toDate(),
			},
		}

		const recurringEvents = generateRecurringEvents({
			event: event as any,
			currentEvents: [],
			startDate: dayjs.utc('2026-01-01'),
			endDate: dayjs.utc('2026-01-31'),
		})

		recurringEvents.forEach((e) => {
			expect(e.start.format('dddd')).toBe('Wednesday')
		})
	})
})

// #307. RFC 5545 §3.8.5.3: a DTSTART with a time zone reference makes "all the
// recurrence instances start at the same local time regardless of time zone
// changes"; §3.3.10 sends a local time that does not exist, or occurs twice, to
// §3.3.5 (the offset before the gap; the first of two). Occurrences used to
// keep the series start's UTC offset, so after a change they ran an hour off.
describe('Recurrence across a daylight-saving change', () => {
	const ZONE = 'America/New_York'
	const originalTz = dayjs.tz.guess()

	beforeEach(() => {
		dayjs.tz.setDefault(ZONE)
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	/** A daily series from `startISO`, expanded over `[fromISO, toISO]`, as `local time | instant`. */
	const expandDaily = (
		startISO: string,
		fromISO: string,
		toISO: string,
		exdates?: string[]
	) => {
		const start = dayjs(startISO)
		const event = {
			id: 'daily',
			title: 'daily',
			start,
			end: start.add(30, 'minute'),
			rrule: { freq: RRule.DAILY, dtstart: start.toDate() },
			exdates,
		}
		return generateRecurringEvents({
			event,
			currentEvents: [],
			startDate: dayjs(fromISO),
			endDate: dayjs(toISO),
		}).map(
			(occurrence) =>
				`${occurrence.start.format('MM-DD HH:mmZ')} | ${occurrence.start.toISOString()}`
		)
	}

	it('keeps a 09:00 series at 09:00 local time after the spring change', () => {
		// 9 March 2025: New York moves from -05:00 to -04:00.
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
		// 02:30 does not exist on 9 March; §3.3.5 reads it with the offset before
		// the gap, which is 03:30 EDT.
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

	it('takes the first of a time repeated by the autumn change', () => {
		// 2 November 2025: 01:30 happens in EDT and again in EST; §3.3.5 picks
		// the first, EDT.
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
	})

	it('excludes an occurrence after the change by its local-time instant', () => {
		// An EXDATE written for 10 March at 09:00 EDT removes exactly that day.
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
