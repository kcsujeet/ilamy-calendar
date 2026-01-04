import { describe, expect, test } from 'bun:test'
import type { WeekDays } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { getViewHours } from './view-hours'

describe('getViewHours', () => {
	const referenceDate = dayjs('2025-01-01T00:00:00.000Z') // A Wednesday

	test('returns 24 hours when hideNonBusinessHours is false', () => {
		const hours = getViewHours({
			referenceDate,
			hideNonBusinessHours: false,
		})
		expect(hours.length).toBe(24)
		expect(hours[0].hour()).toBe(0)
		expect(hours[23].hour()).toBe(23)
	})

	test('returns 24 hours when businessHours is not provided', () => {
		const hours = getViewHours({
			referenceDate,
			hideNonBusinessHours: true,
		})
		expect(hours.length).toBe(24)
	})

	test('filters hours based on simple businessHours', () => {
		const businessHours = {
			startTime: 9,
			endTime: 17,
		}
		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})
		expect(hours.length).toBe(8) // 9, 10, 11, 12, 13, 14, 15, 16
		expect(hours[0].hour()).toBe(9)
		expect(hours[7].hour()).toBe(16)
	})

	test('handles multiple days with different business hours', () => {
		const monday = dayjs('2025-01-06T00:00:00.000Z')
		const tuesday = dayjs('2025-01-07T00:00:00.000Z')
		const businessHours = [
			{ daysOfWeek: ['monday'] as WeekDays[], startTime: 8, endTime: 12 },
			{ daysOfWeek: ['tuesday'] as WeekDays[], startTime: 14, endTime: 18 },
		]

		const hours = getViewHours({
			referenceDate: monday,
			allDates: [monday, tuesday],
			businessHours,
			hideNonBusinessHours: true,
		})

		// Range should be earliest start (8) to latest end (18)
		expect(hours.length).toBe(10) // 8, 9, 10, 11, 12, 13, 14, 15, 16, 17
		expect(hours[0].hour()).toBe(8)
		expect(hours[9].hour()).toBe(17)
	})

	test('falls back to 9-17 if startTime/endTime are missing in config', () => {
		const businessHours = { daysOfWeek: ['wednesday'] as WeekDays[] }
		const hours = getViewHours({
			referenceDate,
			businessHours,
			hideNonBusinessHours: true,
		})
		expect(hours[0].hour()).toBe(9)
		expect(hours[7].hour()).toBe(16)
	})

	test('falls back to global business hours range if no config found for the specific date', () => {
		const sunday = dayjs('2025-01-05T00:00:00.000Z')
		const businessHours = [
			{ daysOfWeek: ['monday'] as WeekDays[], startTime: 10, endTime: 18 },
		]
		const hours = getViewHours({
			referenceDate: sunday,
			businessHours,
			hideNonBusinessHours: true,
		})
		// Should use the 10-18 range from Monday since Sunday has no config
		expect(hours.length).toBe(8)
		expect(hours[0].hour()).toBe(10)
		expect(hours[7].hour()).toBe(17)
	})
})
