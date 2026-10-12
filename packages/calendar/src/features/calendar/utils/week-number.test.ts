import { describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { getWeekNumber } from './week-number'

// Sunday 1 January 2023. The locale's week (Sunday start, the week holding
// 1 January is week 1) calls it week 1; ISO 8601 (Monday start, week 1 holds
// the first Thursday) puts it at the end of the week of 26 December 2022,
// which is week 52.
const newYearsDay2023 = dayjs('2023-01-01T12:00:00.000Z')
const midMarch2023 = dayjs('2023-03-08T12:00:00.000Z')

describe('getWeekNumber', () => {
	test("'local' is the locale's own count, dayjs week()", () => {
		expect(getWeekNumber(newYearsDay2023, 'local')).toBe(1)
		expect(getWeekNumber(midMarch2023, 'local')).toBe(midMarch2023.week())
	})

	test("'ISO' counts Monday-first weeks, week 1 holding the first Thursday", () => {
		expect(getWeekNumber(newYearsDay2023, 'ISO')).toBe(52)
		expect(getWeekNumber(dayjs('2023-01-02T12:00:00.000Z'), 'ISO')).toBe(1)
		expect(getWeekNumber(midMarch2023, 'ISO')).toBe(10)
	})

	test('ISO puts the last days of December in week 1 of the next year', () => {
		expect(getWeekNumber(dayjs('2025-12-29T12:00:00.000Z'), 'ISO')).toBe(1)
	})

	test('a function is called with the date as a Date and its result used', () => {
		const calls: Date[] = []
		const calculation = (date: Date) => {
			calls.push(date)
			return 42
		}

		expect(getWeekNumber(midMarch2023, calculation)).toBe(42)
		expect(calls.map((date) => date.toISOString())).toEqual([
			'2023-03-08T12:00:00.000Z',
		])
	})
})
