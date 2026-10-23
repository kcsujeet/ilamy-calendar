import { describe, expect, test } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import 'dayjs/locale/ar.js'
import 'dayjs/locale/de.js'
import 'dayjs/locale/fr.js'
import 'dayjs/locale/ja.js'
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
})

// dayjs `week()` and `diff()` read a zone whose offset is 0 as a UTC-flagged
// instance and then diff through the MACHINE's zone, so a week number came out
// an hour short in the months after a clock change. The numbers below are US
// weeks (Sunday start, week 1 holds 1 January: 29 Dec 2024 to 4 Jan 2025).
describe('getWeekNumber across clock changes', () => {
	const SUNDAYS_2025 = [
		['2025-03-30T00:00:00.000', 14],
		['2025-04-06T00:00:00.000', 15],
		['2025-04-13T00:00:00.000', 16],
		['2025-09-28T00:00:00.000', 40],
		['2025-10-05T00:00:00.000', 41],
		['2025-10-26T00:00:00.000', 44],
	] as const

	const runOnMachineIn = (machineZone: string, script: string): string => {
		const child = Bun.spawnSync(['bun', '-e', script], {
			env: { ...process.env, TZ: machineZone },
		})
		return child.stdout.toString().trim()
	}

	const weekNumbersOn = (machineZone: string, calendarZone: string) =>
		runOnMachineIn(
			machineZone,
			`
			import dayjs from '@ilamy/utils/dayjs'
			import { getWeekNumber } from '${import.meta.dir}/week-number.ts'
			const zone = '${calendarZone}'
			if (zone) dayjs.tz.setDefault(zone)
			const sundays = ${JSON.stringify(SUNDAYS_2025.map(([date]) => date))}
			console.log(sundays.map((s) => getWeekNumber(dayjs(s), 'local')).join(','))
		`
		)

	const expectedWeeks = SUNDAYS_2025.map(([, week]) => week).join(',')

	// The calendar in London on machines whose own offset is 0 or is not.
	test.each(['UTC', 'America/Pago_Pago', 'Europe/London', 'America/New_York'])(
		"'local' counts the weeks of a London calendar right (machine %s)",
		(machineZone) => {
			expect(weekNumbersOn(machineZone, 'Europe/London')).toBe(expectedWeeks)
		}
	)

	// No `timezone` prop: the machine's zone is the calendar's.
	test.each(['Europe/London', 'Europe/Lisbon', 'America/New_York'])(
		"'local' counts the weeks of a calendar with no zone right (machine %s)",
		(machineZone) => {
			expect(weekNumbersOn(machineZone, '')).toBe(expectedWeeks)
		}
	)

	test('week 1 holds 1 January, so the last days of December can already be week 1', () => {
		expect(getWeekNumber(dayjs('2024-12-29T12:00:00.000Z'), 'local')).toBe(1)
		expect(getWeekNumber(dayjs('2024-12-28T12:00:00.000Z'), 'local')).toBe(52)
	})
})

// On a UTC machine with no calendar zone dayjs `week()` is right, so it is the
// reference for the locales' own week starts and year starts (de and fr start
// on Monday and count the week holding 4 January, ar starts on Saturday).
describe('getWeekNumber in other locales', () => {
	const everyDayOf2025To2026 = Array.from({ length: 730 }, (_, index) =>
		dayjs(`2025-01-01T12:00:00.000Z`).add(index, 'day')
	)

	test.each(['en', 'de', 'fr', 'ar', 'ja'])(
		"'local' agrees with dayjs week() for every day of 2025 and 2026 (%s)",
		(locale) => {
			const days = everyDayOf2025To2026.map((day) => day.locale(locale))
			expect(days.map((day) => getWeekNumber(day, 'local'))).toEqual(
				days.map((day) => day.week())
			)
		}
	)
})
