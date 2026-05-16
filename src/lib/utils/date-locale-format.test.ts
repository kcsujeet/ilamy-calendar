import { describe, expect, test } from 'bun:test'
import { formatLocaleDate, formatLocaleDateRange } from './date-locale-format'

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
