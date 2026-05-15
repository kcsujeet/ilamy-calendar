import { describe, expect, test } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import { formatDayViewHeaderDate, isDayFirstLocale } from './date-locale-format'

describe('isDayFirstLocale', () => {
	test('returns true for fr-FR (day before month)', () => {
		expect(isDayFirstLocale('fr-FR', new Date(2025, 4, 15))).toBe(true)
	})

	test('returns false for en-US (month before day)', () => {
		expect(isDayFirstLocale('en-US', new Date(2025, 4, 15))).toBe(false)
	})
})

describe('formatDayViewHeaderDate', () => {
	const date = dayjs('2025-05-15T12:00:00.000Z')

	test('uses day-first order when locale is day-first', () => {
		expect(
			formatDayViewHeaderDate({
				date,
				weekdayLabel: 'jeudi',
				monthLabel: 'mai',
				isDayFirst: true,
			})
		).toBe('jeudi 15 mai 2025')
	})

	test('uses month-first order when locale is month-first', () => {
		expect(
			formatDayViewHeaderDate({
				date,
				weekdayLabel: 'Thursday',
				monthLabel: 'May',
				isDayFirst: false,
			})
		).toBe('Thursday, May 15, 2025')
	})
})
