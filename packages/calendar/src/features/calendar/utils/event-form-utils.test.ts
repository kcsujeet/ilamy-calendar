import { describe, expect, test } from 'bun:test'
import type { BusinessHours } from '@ilamy/types'
import {
	buildDateTime,
	buildEndDateTime,
	getTimeConstraints,
} from './event-form-utils'

describe('event-form-utils', () => {
	const testDate = new Date('2025-01-15T00:00:00.000Z') // Wednesday

	/**
	 * The form's `start` is seeded from the calendar's `currentDate`, which comes
	 * from `dayjs()` and so carries the seconds and milliseconds of page load,
	 * while an End Date picked from the calendar arrives clean. Every case above
	 * passes an already-clean date, which is why #248 went unnoticed: the builders
	 * only set hour and minute, so that residue survived into stored events.
	 */
	const dirtyDate = new Date('2025-01-15T10:44:32.123Z')

	describe('buildDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildDateTime(testDate, '14:30', false)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 14:30')
		})

		test('sets time to 00:00 if isAllDay is true', () => {
			const result = buildDateTime(testDate, '14:30', true)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 00:00')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildDateTime(dirtyDate, '14:30', false)
			expect(result.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe(
				'2025-01-15 14:30:00.000'
			)
		})

		test('drops seconds and milliseconds for an all-day start', () => {
			const result = buildDateTime(dirtyDate, '14:30', true)
			expect(result.format('HH:mm:ss.SSS')).toBe('00:00:00.000')
		})
	})

	describe('buildEndDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildEndDateTime(testDate, '15:45', false)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 15:45')
		})

		test('sets time to 23:59 if isAllDay is true', () => {
			const result = buildEndDateTime(testDate, '15:45', true)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 23:59')
		})

		test('drops seconds and milliseconds carried by the date', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', false)
			expect(result.format('YYYY-MM-DD HH:mm:ss.SSS')).toBe(
				'2025-01-15 15:45:00.000'
			)
		})

		test('drops seconds and milliseconds for an all-day end', () => {
			const result = buildEndDateTime(dirtyDate, '15:45', true)
			expect(result.format('HH:mm:ss.SSS')).toBe('23:59:00.000')
		})
	})

	/**
	 * #248. The residue made a midnight-to-next-midnight event 23:59:27 long
	 * instead of 24h, and `layoutHorizontal` classifies a multi-day event with
	 * `end.diff(start, 'day') > 0`, which dayjs truncates to 0 below 24h. The
	 * event then rendered on one day instead of two, depending on the second the
	 * page happened to load. Asserted as a DURATION rather than a column count so
	 * this stays independent of the inclusive-versus-exclusive end question.
	 */
	describe('midnight to midnight (#248)', () => {
		test('is exactly 24h even when the start date carries residue', () => {
			const start = buildDateTime(dirtyDate, '00:00', false)
			const end = buildEndDateTime(
				new Date('2025-01-16T00:00:00.000Z'),
				'00:00',
				false
			)

			expect(end.diff(start, 'second')).toBe(86_400)
			expect(end.diff(start, 'day')).toBe(1)
		})
	})

	describe('getTimeConstraints', () => {
		test('returns full day range when no businessHours provided', () => {
			const result = getTimeConstraints(testDate, undefined)
			expect(result).toEqual({ min: '00:00', max: '23:59' })
		})

		test('returns configured business hours for matching day', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours)
			// endTime 17 -> maxTime 16:45
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		test('returns full day range when day does not match business hours', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['monday'], // Not Wednesday
				startTime: 9,
				endTime: 17,
			}
			const result = getTimeConstraints(testDate, businessHours)
			expect(result).toEqual({ min: '00:00', max: '23:59' })
		})

		test('handles array of business hours', () => {
			const businessHours: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 8,
					endTime: 12,
				},
				{
					daysOfWeek: ['wednesday'],
					startTime: 10,
					endTime: 18,
				},
			]
			const result = getTimeConstraints(testDate, businessHours)
			// Should match Wednesday config: 10:00 to 18:00 (max 17:45)
			expect(result).toEqual({ min: '10:00', max: '17:45' })
		})

		test('uses default start/end times if not provided in config', () => {
			const businessHours: BusinessHours = {
				daysOfWeek: ['wednesday'],
				// defaults: start 9, end 17
			}
			const result = getTimeConstraints(testDate, businessHours)
			expect(result).toEqual({ min: '09:00', max: '16:45' })
		})

		test('handles multiple rules for the same day (split shifts)', () => {
			const businessHours: BusinessHours[] = [
				{
					daysOfWeek: ['wednesday'],
					startTime: 10,
					endTime: 12,
				},
				{
					daysOfWeek: ['wednesday'],
					startTime: 14,
					endTime: 16,
				},
			]
			const result = getTimeConstraints(testDate, businessHours)
			// Should take earliest start (10) and latest end (16 -> max 15:45)
			expect(result).toEqual({ min: '10:00', max: '15:45' })
		})
	})
})
