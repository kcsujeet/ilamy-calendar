import { describe, expect, test } from 'bun:test'
import {
	formatLocaleDate,
	formatLocaleDateRange,
	formatLocaleMonth,
	formatLocaleWeekday,
	formatLocaleWeekdayInitial,
	getOnTheDaySelectionLabel,
	getOrderedWeekdayInitials,
} from './date-locale-format'

describe('formatLocaleDate', () => {
	test('formats weekday, short month, and day for fr', () => {
		const label = formatLocaleDate(new Date(2025, 4, 5), 'fr', {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
		})
		expect(label).toContain('lundi')
		expect(label).toContain('5')
		expect(label).toContain('mai')
	})

	test('formats day-view header with long weekday, month, day, and year for fr-FR', () => {
		const label = formatLocaleDate(new Date(2025, 4, 15), 'fr-FR', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		})
		expect(label).toContain('jeudi')
		expect(label).toContain('15')
		expect(label).toContain('mai')
		expect(label).toContain('2025')
	})

	test('formats long month name for year view', () => {
		const label = formatLocaleDate(new Date(2025, 0, 1), 'fr-FR', {
			month: 'long',
		})
		expect(label).toMatch(/janvier/i)
	})
})

describe('formatLocaleDateRange', () => {
	test('formats a week span for en-US', () => {
		const start = new Date(2025, 4, 5)
		const end = new Date(2025, 4, 11)
		const label = formatLocaleDateRange(start, end, 'en-US', {
			month: 'short',
			day: 'numeric',
		})
		expect(label).toMatch(/May/)
		expect(label).toMatch(/5/)
		expect(label).toMatch(/11/)
	})
})

describe('formatLocaleWeekday', () => {
	test('formats short weekday for en-US', () => {
		expect(formatLocaleWeekday(1, 'en-US', 'short')).toMatch(/Mon/i)
	})
})

describe('getOrderedWeekdayInitials', () => {
	test('starts on Monday when firstDayOfWeek is 1', () => {
		const initials = getOrderedWeekdayInitials(1, 'en-US')
		expect(initials[0]).toBe('M')
		expect(initials[6]).toBe('S')
	})

	test('formats French narrow initial for Sunday', () => {
		expect(formatLocaleWeekdayInitial(0, 'fr-FR')).toBe('D')
	})
})

describe('formatLocaleMonth', () => {
	test('formats long month for en-US', () => {
		expect(formatLocaleMonth(5, 'en-US')).toMatch(/May/i)
	})
})

describe('getOnTheDaySelectionLabel', () => {
	const t = (key: string) => key

	test('returns translation for abstract day types', () => {
		expect(getOnTheDaySelectionLabel('DAY', 'en-US', t)).toBe('recurrenceDay')
	})

	test('returns locale weekday for MO', () => {
		expect(getOnTheDaySelectionLabel('MO', 'en-US', t)).toMatch(/Mon/i)
	})
})
