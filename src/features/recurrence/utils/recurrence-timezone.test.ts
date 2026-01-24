import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { RRule } from 'rrule'
import dayjs from '@/lib/configs/dayjs-config'
import { generateRecurringEvents } from './recurrence-handler'

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

		expect(recurringEvents.length).toBe(4) // Jan 7, 14, 21, 28
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
