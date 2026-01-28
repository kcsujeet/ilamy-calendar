import { describe, expect, it } from 'bun:test'
import type { BusinessHours } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { isBusinessHour } from './business-hours'

describe('isBusinessHour', () => {
	const monday = dayjs('2025-01-06T00:00:00.000Z') // Monday
	const sunday = dayjs('2025-01-05T00:00:00.000Z') // Sunday

	it('should return true when businessHours is undefined', () => {
		expect(isBusinessHour({ date: monday, hour: 10, minute: 0 })).toBe(true)
	})

	it('should respect custom businessHours object', () => {
		const config: BusinessHours = {
			daysOfWeek: ['monday'], // Monday only
			startTime: 10,
			endTime: 14,
		}
		expect(
			isBusinessHour({
				date: monday,
				hour: 11,
				minute: 0,
				businessHours: config,
			})
		).toBe(true)
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: monday,
				hour: 14,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: sunday,
				hour: 11,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
	})

	it('should handle minutes correctly', () => {
		// Note: With integer hours, we can't specify 9:30 start time in config anymore
		// But we can test if 9:30 falls within 9-17 range
		const config: BusinessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		expect(
			isBusinessHour({
				date: monday,
				hour: 8,
				minute: 59,
				businessHours: config,
			})
		).toBe(false) // 8:59 -> false
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 0,
				businessHours: config,
			})
		).toBe(true) // 9:00 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 9,
				minute: 30,
				businessHours: config,
			})
		).toBe(true) // 9:30 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 16,
				minute: 59,
				businessHours: config,
			})
		).toBe(true) // 16:59 -> true
		expect(
			isBusinessHour({
				date: monday,
				hour: 17,
				minute: 0,
				businessHours: config,
			})
		).toBe(false) // 17:00 -> false
	})

	it('should work correctly regardless of firstDayOfWeek setting', () => {
		// This test verifies that isBusinessHour relies on the absolute date,
		// not on any relative week index.
		// We simulate this by checking a Sunday and a Monday.
		// Sunday is day 0, Monday is day 1 in dayjs.

		const sundayDate = dayjs('2025-01-05T00:00:00.000Z') // Sunday
		const mondayDate = dayjs('2025-01-06T00:00:00.000Z') // Monday

		const config: BusinessHours = {
			daysOfWeek: ['monday'], // Only Monday is business day
			startTime: 9,
			endTime: 17,
		}

		expect(
			isBusinessHour({
				date: sundayDate,
				hour: 10,
				minute: 0,
				businessHours: config,
			})
		).toBe(false)
		expect(
			isBusinessHour({
				date: mondayDate,
				hour: 10,
				minute: 0,
				businessHours: config,
			})
		).toBe(true)

		// Even if we had a config that included Sunday
		const sundayConfig: BusinessHours = {
			daysOfWeek: ['sunday'],
			startTime: 9,
			endTime: 17,
		}
		expect(
			isBusinessHour({
				date: sundayDate,
				hour: 10,
				minute: 0,
				businessHours: sundayConfig,
			})
		).toBe(true)
		expect(
			isBusinessHour({
				date: mondayDate,
				hour: 10,
				minute: 0,
				businessHours: sundayConfig,
			})
		).toBe(false)
	})

	it('should check only day if hour is undefined', () => {
		const config: BusinessHours = {
			daysOfWeek: ['monday'],
			startTime: 9,
			endTime: 17,
		}

		// Monday is a business day -> true
		expect(isBusinessHour({ date: monday, businessHours: config })).toBe(true)

		// Sunday is not a business day -> false
		expect(isBusinessHour({ date: sunday, businessHours: config })).toBe(false)
	})

	describe('Array of BusinessHours', () => {
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const tuesday = dayjs('2025-01-07T00:00:00.000Z')
		const wednesday = dayjs('2025-01-08T00:00:00.000Z')
		const thursday = dayjs('2025-01-09T00:00:00.000Z')
		const friday = dayjs('2025-01-10T00:00:00.000Z')
		const saturday = dayjs('2025-01-11T00:00:00.000Z')
		const sunday = dayjs('2025-01-05T00:00:00.000Z')

		it('should handle array with different hours for different days', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday', 'wednesday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday', 'thursday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Monday: 9-17
			expect(
				isBusinessHour({
					date: monday,
					hour: 9,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: monday,
					hour: 17,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: monday,
					hour: 8,
					minute: 59,
					businessHours: configs,
				})
			).toBe(false)

			// Tuesday: 10-18
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 10,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 9,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 17,
					minute: 30,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 18,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)

			// Wednesday: 9-17
			expect(
				isBusinessHour({
					date: wednesday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Thursday: 10-18
			expect(
				isBusinessHour({
					date: thursday,
					hour: 16,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Friday: 9-17
			expect(
				isBusinessHour({
					date: friday,
					hour: 14,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
		})

		it('should return false for days not in any config', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday', 'wednesday', 'friday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday', 'thursday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Saturday and Sunday not in any config
			expect(
				isBusinessHour({
					date: saturday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
			expect(
				isBusinessHour({
					date: sunday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should check only day if hour is undefined with array', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 9,
					endTime: 17,
				},
				{
					daysOfWeek: ['tuesday'],
					startTime: 10,
					endTime: 18,
				},
			]

			// Monday is a business day
			expect(isBusinessHour({ date: monday, businessHours: configs })).toBe(
				true
			)

			// Tuesday is a business day
			expect(isBusinessHour({ date: tuesday, businessHours: configs })).toBe(
				true
			)

			// Sunday is not a business day
			expect(isBusinessHour({ date: sunday, businessHours: configs })).toBe(
				false
			)
		})

		it('should handle empty array', () => {
			const configs: BusinessHours[] = []

			// Empty array means no business hours configured
			expect(
				isBusinessHour({
					date: monday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should work with single-element array', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday'],
					startTime: 9,
					endTime: 17,
				},
			]

			expect(
				isBusinessHour({
					date: monday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 12,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})

		it('should handle multiple overlapping or separate rules for the same day', () => {
			const configs: BusinessHours[] = [
				{
					daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
					startTime: 10,
					endTime: 12,
				},
				{
					daysOfWeek: ['tuesday'],
					startTime: 14,
					endTime: 16,
				},
			]

			// Tuesday 11:00 should be true (Rule 1)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 11,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Tuesday 15:00 should be true (Rule 2)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 15,
					minute: 0,
					businessHours: configs,
				})
			).toBe(true)

			// Tuesday 13:00 should be false (Gap between rules)
			expect(
				isBusinessHour({
					date: tuesday,
					hour: 13,
					minute: 0,
					businessHours: configs,
				})
			).toBe(false)
		})
	})
})
