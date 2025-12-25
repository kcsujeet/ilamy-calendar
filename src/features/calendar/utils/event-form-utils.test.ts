import { describe, expect, test } from 'bun:test'
import type { BusinessHours } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import {
	buildDateTime,
	buildEndDateTime,
	getTimeConstraints,
} from './event-form-utils'

describe('event-form-utils', () => {
	const testDate = new Date('2025-01-15T00:00:00.000Z') // Wednesday

	describe('buildDateTime', () => {
		test('combines date and time correctly', () => {
			const result = buildDateTime(testDate, '14:30', false)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 14:30')
		})

		test('sets time to 00:00 if isAllDay is true', () => {
			const result = buildDateTime(testDate, '14:30', true)
			expect(result.format('YYYY-MM-DD HH:mm')).toBe('2025-01-15 00:00')
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
	})
})
