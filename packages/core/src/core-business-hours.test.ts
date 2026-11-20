import { describe, expect, it } from 'bun:test'
import { parseDate } from '@ilamy/utils/temporal'
import {
	isBusinessDay,
	isBusinessHour,
	isRangeWithinBusinessHours,
} from './core-business-hours'
import {
	resolveDurationEditable,
	resolveStartEditable,
} from './core-editability'

const at = (iso: string, tz = 'UTC') => {
	const d = parseDate(iso, tz)
	if (!d) throw new Error(`Invalid date: ${iso}`)
	return d
}

describe('core business hours (v4.0 FullCalendar defaults)', () => {
	it('defaults omitted daysOfWeek on a single object to Monday-Friday', () => {
		const mon = at('2026-03-02T10:00:00Z') // Monday
		const sat = at('2026-03-07T10:00:00Z') // Saturday
		const sun = at('2026-03-08T10:00:00Z') // Sunday
		const bh = { startTime: 9, endTime: 17 }

		expect(isBusinessDay(mon, bh)).toBe(true)
		expect(isBusinessDay(sat, bh)).toBe(false)
		expect(isBusinessDay(sun, bh)).toBe(false)
	})

	it('ignores an array entry whose daysOfWeek is omitted', () => {
		const mon = at('2026-03-02T10:00:00Z')
		const tue = at('2026-03-03T10:00:00Z')
		const bh = [
			{ startTime: 9, endTime: 17 }, // omitted daysOfWeek -> ignored
			{ daysOfWeek: ['tuesday' as const], startTime: 10, endTime: 14 },
		]

		expect(isBusinessDay(mon, bh)).toBe(false)
		expect(isBusinessDay(tue, bh)).toBe(true)
		expect(isBusinessHour({ date: tue, hour: 9, businessHours: bh })).toBe(
			false
		)
		expect(isBusinessHour({ date: tue, hour: 10, businessHours: bh })).toBe(
			true
		)
	})

	it('checks whole-range containment in isRangeWithinBusinessHours', () => {
		const bh = { startTime: 9, endTime: 17 } // Mon-Fri 9:00-17:00

		// Fully inside 9-17 on Monday -> true
		expect(
			isRangeWithinBusinessHours({
				start: at('2026-03-02T10:00:00Z'),
				end: at('2026-03-02T12:00:00Z'),
				businessHours: bh,
			})
		).toBe(true)

		// Starts at 16:00, ends at 18:00 (past 17:00) -> false
		expect(
			isRangeWithinBusinessHours({
				start: at('2026-03-02T16:00:00Z'),
				end: at('2026-03-02T18:00:00Z'),
				businessHours: bh,
			})
		).toBe(false)

		// On Saturday -> false
		expect(
			isRangeWithinBusinessHours({
				start: at('2026-03-07T10:00:00Z'),
				end: at('2026-03-07T11:00:00Z'),
				businessHours: bh,
			})
		).toBe(false)

		// All-day Monday -> true; all-day Fri-Sun -> false
		expect(
			isRangeWithinBusinessHours({
				start: at('2026-03-02T00:00:00Z'),
				end: at('2026-03-03T00:00:00Z'),
				allDay: true,
				businessHours: bh,
			})
		).toBe(true)
		expect(
			isRangeWithinBusinessHours({
				start: at('2026-03-06T00:00:00Z'),
				end: at('2026-03-08T00:00:00Z'),
				allDay: true,
				businessHours: bh,
			})
		).toBe(false)
	})
})

describe('core editability (v4.0 default false)', () => {
	it('defaults editable to false when unset', () => {
		expect(resolveStartEditable({}, {})).toBe(false)
		expect(resolveDurationEditable({}, {})).toBe(false)
	})

	it('respects calendar editable and per-event overrides', () => {
		expect(resolveStartEditable({}, { editable: true })).toBe(true)
		expect(resolveStartEditable({ editable: false }, { editable: true })).toBe(
			false
		)
		expect(
			resolveStartEditable({ startEditable: true }, { editable: false })
		).toBe(true)
		expect(
			resolveDurationEditable({ durationEditable: true }, { editable: false })
		).toBe(true)
	})
})
