import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import 'dayjs/locale/ar.js'
import 'dayjs/locale/de.js'
import 'dayjs/locale/fr.js'
import {
	getDayHours,
	getMonthDays,
	getMonthWeeks,
	getWeekDays,
	isToday,
	skipHiddenDays,
	withOwnOffset,
	withoutHiddenDays,
} from './date-utils'

describe('isToday', () => {
	it('should return true when the date is today', () => {
		expect(isToday(dayjs())).toBe(true)
	})

	it('should return false when the date is yesterday', () => {
		expect(isToday(dayjs().subtract(1, 'day'))).toBe(false)
	})

	it('should return false when the date is tomorrow', () => {
		expect(isToday(dayjs().add(1, 'day'))).toBe(false)
	})

	it('should return true for different times on today', () => {
		expect(isToday(dayjs().hour(0).minute(0))).toBe(true)
		expect(isToday(dayjs().hour(23).minute(59))).toBe(true)
	})

	/**
	 * "Today" is the calendar day in the CONFIGURED zone, not the machine's.
	 * Pinned because this compares day keys rather than calling
	 * `isSame(now, 'day')`, and a key built in the wrong zone would answer for
	 * the wrong day whenever the two zones straddle midnight.
	 */
	describe('with a configured timezone', () => {
		afterEach(() => {
			dayjs.tz.setDefault()
		})

		it('answers for the calendar day in the configured zone', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			expect(isToday(dayjs())).toBe(true)
			expect(isToday(dayjs().subtract(1, 'day'))).toBe(false)
			expect(isToday(dayjs().add(1, 'day'))).toBe(false)
		})

		it('holds at both edges of the zone-local day', () => {
			dayjs.tz.setDefault('Pacific/Kiritimati')
			const todayThere = dayjs()
			expect(isToday(todayThere.startOf('day'))).toBe(true)
			expect(isToday(todayThere.endOf('day'))).toBe(true)
			expect(
				isToday(todayThere.startOf('day').subtract(1, 'millisecond'))
			).toBe(false)
		})
	})
})

describe('getDayHours', () => {
	it('should return exactly 24 hours by default', () => {
		const hours = getDayHours()
		expect(hours).toHaveLength(24)
	})

	it('should return hours with sequential .hour() values 0-23', () => {
		const hours = getDayHours()
		hours.forEach((h, i) => {
			expect(h.hour()).toBe(i)
		})
	})

	it('should return hours on the reference date', () => {
		const referenceDate = dayjs('2025-06-15T00:00:00.000Z')
		const hours = getDayHours({ referenceDate })

		expect(hours).toHaveLength(24)
		hours.forEach((h, i) => {
			expect(h.hour()).toBe(i)
			expect(h.format('YYYY-MM-DD')).toBe('2025-06-15')
		})
	})

	it('should produce unique timestamps (each entry is a distinct moment)', () => {
		const hours = getDayHours()

		const timestamps = hours.map((h) => h.valueOf())
		const uniqueTimestamps = new Set(timestamps)
		expect(uniqueTimestamps.size).toBe(24)
	})

	it('should respect custom length', () => {
		const hours = getDayHours({ length: 12 })
		expect(hours).toHaveLength(12)
		hours.forEach((h, i) => {
			expect(h.hour()).toBe(i)
		})
	})
})

/**
 * Rows are built from a wall-clock string in the calendar's zone, so each row
 * carries the offset of ITS hour. Run under TZ=America/New_York (and
 * America/Vancouver) as well: the `.hour(i)` setter used to give a row after a
 * clock change the offset of the start of the day, which only shows when the
 * machine's own clocks change that day.
 */
describe('getDayHours on a day the clocks change', () => {
	const originalTz = dayjs.tz.guess()

	beforeEach(() => {
		dayjs.tz.setDefault('America/New_York')
	})

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	const rowsFor = (zone: string, dayISO: string) =>
		getDayHours({
			referenceDate: dayjs(`${dayISO}T17:00:00.000Z`).tz(zone),
		})

	it('keeps 24 rows labelled by clock hour on the autumn change day', () => {
		const rows = rowsFor('America/New_York', '2025-11-02')
		expect(rows.map((row) => Number(row.format('HH')))).toEqual(
			Array.from({ length: 24 }, (_, i) => i)
		)
	})

	it('keeps the spring change day as it was: 24 rows, 2 AM shown as 3 AM', () => {
		const rows = rowsFor('America/New_York', '2025-03-09')
		const laterHours = Array.from({ length: 20 }, (_, i) => i + 4)
		expect(rows.map((row) => Number(row.format('HH')))).toEqual([
			0,
			1,
			3,
			3,
			...laterHours,
		])
	})

	it('puts the 9 AM row at 9 AM local on both change days', () => {
		const springRow = rowsFor('America/New_York', '2025-03-09').at(9)
		const autumnRow = rowsFor('America/New_York', '2025-11-02').at(9)
		expect(springRow?.toISOString()).toBe('2025-03-09T13:00:00.000Z')
		expect(autumnRow?.toISOString()).toBe('2025-11-02T14:00:00.000Z')
	})

	// Cross-zone: with TZ=America/New_York the machine changes its clocks at a
	// different instant from the calendar's zone on the same date.
	it('anchors rows in the calendar zone, not the machine zone', () => {
		dayjs.tz.setDefault('America/Vancouver')
		const rows = rowsFor('America/Vancouver', '2025-03-09')
		expect(rows.at(1)?.toISOString()).toBe('2025-03-09T09:00:00.000Z')
		expect(rows.at(9)?.toISOString()).toBe('2025-03-09T16:00:00.000Z')
	})

	it('with no timezone set, builds rows on the machine clock', () => {
		dayjs.tz.setDefault(undefined)
		const rows = getDayHours({ referenceDate: dayjs('2025-03-09T12:00:00') })
		expect(rows.at(9)?.toISOString()).toBe(
			dayjs('2025-03-09T09:00:00').toISOString()
		)
		expect(rows.map((row) => row.format('YYYY-MM-DD'))).toEqual(
			Array.from({ length: 24 }, () => '2025-03-09')
		)
	})
})

describe('getWeekDays', () => {
	describe('Sunday as first day of week (0)', () => {
		const firstDayOfWeek = 0

		it('should return week starting from Sunday when current date is Sunday', () => {
			const currentDate = dayjs('2025-10-12T00:00:00.000Z') // Sunday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-12')
			expect(weekDays[0].day()).toBe(0) // Sunday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-18')
			expect(weekDays[6].day()).toBe(6) // Saturday
		})

		it('should return week starting from Sunday when current date is Monday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-12')
			expect(weekDays[0].day()).toBe(0) // Sunday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-18')
			expect(weekDays[6].day()).toBe(6) // Saturday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Sunday when current date is Saturday', () => {
			const currentDate = dayjs('2025-10-18T00:00:00.000Z') // Saturday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-12')
			expect(weekDays[0].day()).toBe(0) // Sunday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-18')
			expect(weekDays[6].day()).toBe(6) // Saturday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Monday as first day of week (1)', () => {
		const firstDayOfWeek = 1

		it('should return week starting from Monday when current date is Monday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-13')
			expect(weekDays[0].day()).toBe(1) // Monday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-19')
			expect(weekDays[6].day()).toBe(0) // Sunday
		})

		it('should return week starting from Monday when current date is Sunday', () => {
			const currentDate = dayjs('2025-10-12T00:00:00.000Z') // Sunday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-06')
			expect(weekDays[0].day()).toBe(1) // Monday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-12')
			expect(weekDays[6].day()).toBe(0) // Sunday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Monday when current date is Wednesday', () => {
			const currentDate = dayjs('2025-10-15T00:00:00.000Z') // Wednesday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-13')
			expect(weekDays[0].day()).toBe(1) // Monday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-19')
			expect(weekDays[6].day()).toBe(0) // Sunday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Wednesday as first day of week (3)', () => {
		const firstDayOfWeek = 3

		it('should return week starting from Wednesday when current date is Wednesday', () => {
			const currentDate = dayjs('2025-10-15T00:00:00.000Z') // Wednesday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-15')
			expect(weekDays[0].day()).toBe(3) // Wednesday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-21')
			expect(weekDays[6].day()).toBe(2) // Tuesday
		})

		it('should return week starting from Wednesday when current date is Monday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-08')
			expect(weekDays[0].day()).toBe(3) // Wednesday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-14')
			expect(weekDays[6].day()).toBe(2) // Tuesday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Wednesday when current date is Tuesday', () => {
			const currentDate = dayjs('2025-10-14T00:00:00.000Z') // Tuesday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-08')
			expect(weekDays[0].day()).toBe(3) // Wednesday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-14')
			expect(weekDays[6].day()).toBe(2) // Tuesday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Wednesday when current date is Thursday', () => {
			const currentDate = dayjs('2025-10-16T00:00:00.000Z') // Thursday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-15')
			expect(weekDays[0].day()).toBe(3) // Wednesday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-21')
			expect(weekDays[6].day()).toBe(2) // Tuesday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Friday as first day of week (5)', () => {
		const firstDayOfWeek = 5

		it('should return week starting from Friday when current date is Friday', () => {
			const currentDate = dayjs('2025-10-17T00:00:00.000Z') // Friday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-17')
			expect(weekDays[0].day()).toBe(5) // Friday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-23')
			expect(weekDays[6].day()).toBe(4) // Thursday
		})

		it('should return week starting from Friday when current date is Monday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-10')
			expect(weekDays[0].day()).toBe(5) // Friday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-16')
			expect(weekDays[6].day()).toBe(4) // Thursday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Friday when current date is Thursday', () => {
			const currentDate = dayjs('2025-10-16T00:00:00.000Z') // Thursday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-10')
			expect(weekDays[0].day()).toBe(5) // Friday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-16')
			expect(weekDays[6].day()).toBe(4) // Thursday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Saturday as first day of week (6)', () => {
		const firstDayOfWeek = 6

		it('should return week starting from Saturday when current date is Saturday', () => {
			const currentDate = dayjs('2025-10-18T00:00:00.000Z') // Saturday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-18')
			expect(weekDays[0].day()).toBe(6) // Saturday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-24')
			expect(weekDays[6].day()).toBe(5) // Friday
		})

		it('should return week starting from Saturday when current date is Monday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-11')
			expect(weekDays[0].day()).toBe(6) // Saturday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-17')
			expect(weekDays[6].day()).toBe(5) // Friday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})

		it('should return week starting from Saturday when current date is Friday', () => {
			const currentDate = dayjs('2025-10-17T00:00:00.000Z') // Friday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-11')
			expect(weekDays[0].day()).toBe(6) // Saturday
			expect(weekDays[6].format('YYYY-MM-DD')).toBe('2025-10-17')
			expect(weekDays[6].day()).toBe(5) // Friday

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Edge cases', () => {
		it('should always return exactly 7 days', () => {
			const testDates = [
				'2025-01-01T00:00:00.000Z', // New Year
				'2025-02-28T00:00:00.000Z', // End of February
				'2025-12-31T00:00:00.000Z', // End of year
				'2025-06-15T00:00:00.000Z', // Mid year
			]

			const firstDayValues = [0, 1, 2, 3, 4, 5, 6]

			testDates.forEach((dateString) => {
				firstDayValues.forEach((firstDay) => {
					const weekDays = getWeekDays(dayjs(dateString), firstDay)
					expect(weekDays).toHaveLength(7)
				})
			})
		})

		it('should always include the current date in the returned week', () => {
			const testDates = [
				'2025-10-12T00:00:00.000Z', // Sunday
				'2025-10-13T00:00:00.000Z', // Monday
				'2025-10-14T00:00:00.000Z', // Tuesday
				'2025-10-15T00:00:00.000Z', // Wednesday
				'2025-10-16T00:00:00.000Z', // Thursday
				'2025-10-17T00:00:00.000Z', // Friday
				'2025-10-18T00:00:00.000Z', // Saturday
			]

			const firstDayValues = [0, 1, 2, 3, 4, 5, 6]

			testDates.forEach((dateString) => {
				firstDayValues.forEach((firstDay) => {
					const currentDate = dayjs(dateString)
					const weekDays = getWeekDays(currentDate, firstDay)

					const includesCurrentDate = weekDays.some((day) =>
						day.isSame(currentDate, 'day')
					)
					expect(includesCurrentDate).toBe(true)
				})
			})
		})

		it('should return consecutive days without gaps', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z')
			const firstDayValues = [0, 1, 2, 3, 4, 5, 6]

			firstDayValues.forEach((firstDay) => {
				const weekDays = getWeekDays(currentDate, firstDay)

				for (let dayIndex = 1; dayIndex < weekDays.length; dayIndex++) {
					const previousDay = weekDays[dayIndex - 1]
					const currentDay = weekDays[dayIndex]
					const dayDifference = currentDay.diff(previousDay, 'day')

					expect(dayDifference).toBe(1)
				}
			})
		})

		it('should start with the correct first day of week', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z')
			const firstDayValues = [0, 1, 2, 3, 4, 5, 6]

			firstDayValues.forEach((firstDay) => {
				const weekDays = getWeekDays(currentDate, firstDay)
				const firstDayOfWeekValue = weekDays[0].day()

				expect(firstDayOfWeekValue).toBe(firstDay as 0)
			})
		})

		it('should handle month boundaries correctly', () => {
			const currentDate = dayjs('2025-10-01T00:00:00.000Z') // First day of month
			const weekDays = getWeekDays(currentDate, 1) // Monday start

			expect(weekDays).toHaveLength(7)

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)

			const firstDayValue = weekDays[0].day()
			expect(firstDayValue).toBe(1)
		})

		it('should handle year boundaries correctly', () => {
			const currentDate = dayjs('2025-12-31T00:00:00.000Z') // Last day of year
			const weekDays = getWeekDays(currentDate, 1) // Monday start

			expect(weekDays).toHaveLength(7)

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)

			const firstDayValue = weekDays[0].day()
			expect(firstDayValue).toBe(1)
		})

		it('should handle leap year correctly', () => {
			const currentDate = dayjs('2024-02-29T00:00:00.000Z') // Leap day
			const weekDays = getWeekDays(currentDate, 0) // Sunday start

			expect(weekDays).toHaveLength(7)

			const includesCurrentDate = weekDays.some((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(includesCurrentDate).toBe(true)
		})
	})

	describe('Real-world scenario: the reported bug', () => {
		it('should include Monday Oct 13 when firstDayOfWeek is Wednesday', () => {
			const currentDate = dayjs('2025-10-13T00:00:00.000Z') // Monday
			const firstDayOfWeek = 3 // Wednesday
			const weekDays = getWeekDays(currentDate, firstDayOfWeek)

			expect(weekDays).toHaveLength(7)
			expect(weekDays[0].day()).toBe(3) // Starts with Wednesday
			expect(weekDays[0].format('YYYY-MM-DD')).toBe('2025-10-08') // Wed Oct 8

			const mondayIndex = weekDays.findIndex((day) =>
				day.isSame(currentDate, 'day')
			)
			expect(mondayIndex).toBeGreaterThanOrEqual(0)
			expect(weekDays[mondayIndex].format('YYYY-MM-DD')).toBe('2025-10-13')
		})
	})

	describe('timezone preservation', () => {
		const TOKYO_OFFSET = 540 // +09:00

		afterEach(() => {
			dayjs.tz.setDefault()
		})

		it('should preserve timezone offset on all generated days', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const currentDate = dayjs('2026-03-12').tz('Asia/Tokyo')
			const weekDays = getWeekDays(currentDate, 0)

			weekDays.forEach((day) => {
				expect(day.utcOffset()).toBe(TOKYO_OFFSET)
			})
		})

		it('should preserve timezone offset during DST transition week', () => {
			// March 8, 2026 is when NA DST starts — dayjs startOf('week') bug
			dayjs.tz.setDefault('Asia/Tokyo')
			const currentDate = dayjs('2026-03-08').tz('Asia/Tokyo')
			const weekDays = getWeekDays(currentDate, 0)

			weekDays.forEach((day) => {
				expect(day.utcOffset()).toBe(TOKYO_OFFSET)
			})
		})
	})
})

describe('week start under a dayjs locale', () => {
	/*
	 * `firstDayOfWeek` decides the first day of the week, whatever the dayjs
	 * locale says. FullCalendar: `firstDay` is the locale's default and an
	 * explicit value overrides it (https://fullcalendar.io/docs/firstDay).
	 * fr and de start Monday, ar starts Saturday: `startOf('week').day(0)`
	 * stepped back from the locale's start to the Sunday before it.
	 */
	const SUNDAY = 0
	const MONDAY = 1
	const dayNumbers = (days: Dayjs[]) => days.map((day) => day.date())

	afterEach(() => {
		dayjs.locale('en')
	})

	for (const locale of ['fr', 'de', 'ar']) {
		it(`${locale}: Sunday-first week of a Sunday starts on that Sunday`, () => {
			dayjs.locale(locale)
			const sunday = dayjs('2025-03-09T12:00:00.000Z')
			expect(dayNumbers(getWeekDays(sunday, SUNDAY))).toEqual([
				9, 10, 11, 12, 13, 14, 15,
			])
		})

		it(`${locale}: Monday-first week of a Sunday ends on that Sunday`, () => {
			dayjs.locale(locale)
			const sunday = dayjs('2025-03-09T12:00:00.000Z')
			expect(dayNumbers(getWeekDays(sunday, MONDAY))).toEqual([
				3, 4, 5, 6, 7, 8, 9,
			])
		})

		it(`${locale}: the March 2025 month grid runs 23 Feb to 5 Apr`, () => {
			dayjs.locale(locale)
			const days = getMonthWeeks(
				dayjs('2025-03-12T12:00:00.000Z'),
				SUNDAY
			).flat()
			expect(days.at(0)?.format('YYYY-MM-DD')).toBe('2025-02-23')
			expect(days.at(-1)?.format('YYYY-MM-DD')).toBe('2025-04-05')
		})
	}
})

describe('getMonthWeeks', () => {
	/*
	 * #246. `add(n, 'week')` carries the receiver's frozen UTC offset, so across
	 * a DST transition the anchor lands an hour off and on the far side of a week
	 * boundary. `getWeekDays` then snaps it back to the week it already produced,
	 * which puts one week in the grid twice and drops another entirely. Events in
	 * the dropped week do not render at all.
	 */
	describe('across a DST transition', () => {
		afterEach(() => {
			dayjs.tz.setDefault()
		})

		const distinctDays = (month: string, firstDayOfWeek: number) => {
			const weeks = getMonthWeeks(dayjs(month).startOf('month'), firstDayOfWeek)
			const days = weeks.flat().map((day) => day.format('YYYY-MM-DD'))
			return new Set(days).size
		}

		it('keeps 42 distinct days through the autumn transition', () => {
			dayjs.tz.setDefault('Europe/London')

			// 26 October 2025 is the UK autumn transition.
			expect(distinctDays('2025-10-15T12:00:00.000Z', 0)).toBe(42)
			expect(distinctDays('2025-10-15T12:00:00.000Z', 1)).toBe(42)
			expect(distinctDays('2025-11-15T12:00:00.000Z', 1)).toBe(42)
		})

		it('keeps 42 distinct days in a western zone', () => {
			dayjs.tz.setDefault('America/New_York')

			// 2 November 2025 is the US autumn transition. Only the autumn ones
			// break: the offset decreases, so the frozen offset carries the anchor
			// back past midnight into the previous week. A spring transition drifts
			// the other way and stays inside the day.
			expect(distinctDays('2025-11-15T12:00:00.000Z', 0)).toBe(42)
			expect(distinctDays('2025-11-15T12:00:00.000Z', 6)).toBe(42)
		})

		it('keeps 42 distinct days in a southern-hemisphere zone', () => {
			dayjs.tz.setDefault('Australia/Sydney')

			expect(distinctDays('2025-04-15T12:00:00.000Z', 1)).toBe(42)
			expect(distinctDays('2025-10-15T12:00:00.000Z', 1)).toBe(42)
		})
	})
	describe('timezone preservation', () => {
		const TOKYO_OFFSET = 540

		afterEach(() => {
			dayjs.tz.setDefault()
		})

		it('should preserve timezone offset on all generated days', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const currentDate = dayjs('2026-03-15').tz('Asia/Tokyo')
			const weeks = getMonthWeeks(currentDate, 0)

			weeks.flat().forEach((day) => {
				expect(day.utcOffset()).toBe(TOKYO_OFFSET)
			})
		})
	})
})

describe('fixTimezoneOffset plugin', () => {
	const TOKYO_OFFSET = 540 // +09:00
	// March 8, 2026 is when NA DST starts (spring forward).
	// This date triggers the dayjs bug where startOf/endOf lose timezone info
	// when the system timezone observes DST near that date.
	const DST_DATE = '2026-03-08'

	afterEach(() => {
		dayjs.tz.setDefault()
	})

	describe('startOf', () => {
		it('should preserve timezone offset for startOf(day)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('day')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.format('YYYY-MM-DD')).toBe(DST_DATE)
			expect(result.hour()).toBe(0)
			expect(result.minute()).toBe(0)
			expect(result.second()).toBe(0)
		})

		it('should preserve timezone offset for startOf(week)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('week')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.hour()).toBe(0)
		})

		it('should preserve timezone offset for startOf(month)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('month')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.date()).toBe(1)
			expect(result.hour()).toBe(0)
		})

		it('should preserve timezone offset for startOf(hour)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo').hour(14).minute(30)
			const result = d.startOf('hour')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.hour()).toBe(14)
			expect(result.minute()).toBe(0)
		})

		it('should not alter dates when no timezone is set', () => {
			const d = dayjs('2026-06-15T10:30:00.000Z')
			const result = d.startOf('day')
			const offset = result.utcOffset()

			// Without setDefault, should behave normally
			expect(result.hour()).toBe(0)
			expect(result.utcOffset()).toBe(offset)
		})
	})

	describe('endOf', () => {
		it('should preserve timezone offset for endOf(day)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.endOf('day')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.format('YYYY-MM-DD')).toBe(DST_DATE)
			expect(result.hour()).toBe(23)
			expect(result.minute()).toBe(59)
			expect(result.second()).toBe(59)
		})

		it('should preserve timezone offset for endOf(week)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.endOf('week')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.hour()).toBe(23)
			expect(result.minute()).toBe(59)
		})

		it('should preserve timezone offset for endOf(month)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.endOf('month')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.date()).toBe(31) // March has 31 days
			expect(result.hour()).toBe(23)
			expect(result.minute()).toBe(59)
		})

		it('should preserve timezone offset for endOf(hour)', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo').hour(14).minute(30)
			const result = d.endOf('hour')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.hour()).toBe(14)
			expect(result.minute()).toBe(59)
			expect(result.second()).toBe(59)
		})
	})

	describe('chained operations', () => {
		it('should preserve offset through startOf().add() chains', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('week').add(4, 'day')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
		})

		it('should preserve offset through startOf().day() chains', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('week').day(3)

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
		})

		it('should preserve offset through startOf().startOf() chains', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const result = d.startOf('week').add(4, 'day').startOf('day')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
			expect(result.hour()).toBe(0)
		})
	})

	describe('isSame / comparison correctness', () => {
		it('should return true for isSame(dayjs(), day) on today', () => {
			const today = dayjs()
			expect(today.isSame(dayjs(), 'day')).toBe(true)
		})

		it('should return true for isSame with same day in timezone', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const a = dayjs(DST_DATE).tz('Asia/Tokyo').hour(9)
			const b = dayjs(DST_DATE).tz('Asia/Tokyo').hour(21)

			expect(a.isSame(b, 'day')).toBe(true)
		})

		it('should return false for isSame with different days', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const a = dayjs(DST_DATE).tz('Asia/Tokyo')
			const b = dayjs('2026-03-09').tz('Asia/Tokyo')

			expect(a.isSame(b, 'day')).toBe(false)
		})
	})

	describe('unix timestamp preservation', () => {
		it('startOf should not change the represented moment beyond rounding', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo').hour(14)
			const startOfDay = d.startOf('day')

			// Start of day in Tokyo should be midnight Tokyo time
			const expectedUnix = dayjs.tz(`${DST_DATE}T00:00:00`, 'Asia/Tokyo').unix()
			expect(startOfDay.unix()).toBe(expectedUnix)
		})

		it('endOf should represent end of day in the correct timezone', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs(DST_DATE).tz('Asia/Tokyo')
			const endOfDay = d.endOf('day')

			const expectedUnix = dayjs.tz(`${DST_DATE}T23:59:59`, 'Asia/Tokyo').unix()
			expect(endOfDay.unix()).toBe(expectedUnix)
		})
	})

	describe('non-DST dates', () => {
		it('should work correctly for dates far from DST transitions', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d = dayjs('2026-06-15').tz('Asia/Tokyo')

			expect(d.startOf('day').utcOffset()).toBe(TOKYO_OFFSET)
			expect(d.endOf('day').utcOffset()).toBe(TOKYO_OFFSET)
			expect(d.startOf('week').utcOffset()).toBe(TOKYO_OFFSET)
			expect(d.endOf('day').hour()).toBe(23)
			expect(d.endOf('day').minute()).toBe(59)
		})
	})

	describe('default timezone via setDefault', () => {
		it('should apply fix using setDefault timezone even without explicit .tz()', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			// Create date via the timezone-aware constructor (no explicit .tz())
			const d = dayjs(DST_DATE)
			const result = d.startOf('day')

			expect(result.utcOffset()).toBe(TOKYO_OFFSET)
		})

		it('should stop applying fix after setDefault is cleared', () => {
			dayjs.tz.setDefault('Asia/Tokyo')
			const d1 = dayjs(DST_DATE).tz('Asia/Tokyo')
			expect(d1.startOf('day').utcOffset()).toBe(TOKYO_OFFSET)

			dayjs.tz.setDefault()
			// After clearing, the plugin should not force any timezone
			const d2 = dayjs('2026-06-15')
			const result = d2.startOf('day')
			// Should not force Tokyo offset
			expect(result.format('HH:mm')).toBe('00:00')
		})
	})
})

describe('hidden days', () => {
	// Noon UTC is the same calendar day in every zone from Vancouver to Tokyo.
	const noon = (dayOfMarch: number) =>
		dayjs('2025-03-01T12:00:00.000Z').add(dayOfMarch - 1, 'day')
	const weekend = new Set([0, 6])
	const dayNumbers = (days: ReturnType<typeof noon>[]) =>
		days.map((day) => day.date())

	describe('withoutHiddenDays', () => {
		const week = [10, 11, 12, 13, 14, 15, 16].map(noon)

		it('drops the hidden weekdays and keeps the order', () => {
			expect(dayNumbers(withoutHiddenDays(week, weekend))).toEqual([
				10, 11, 12, 13, 14,
			])
		})

		it('returns every day when nothing is hidden', () => {
			expect(dayNumbers(withoutHiddenDays(week, undefined))).toEqual([
				10, 11, 12, 13, 14, 15, 16,
			])
		})
	})

	describe('skipHiddenDays', () => {
		it('leaves a visible day alone', () => {
			expect(skipHiddenDays(noon(14), weekend, 1).date()).toBe(14)
		})

		it('moves a hidden day forward to the next visible one', () => {
			expect(skipHiddenDays(noon(15), weekend, 1).date()).toBe(17)
		})

		it('moves a hidden day back to the previous visible one', () => {
			expect(skipHiddenDays(noon(16), weekend, -1).date()).toBe(14)
		})

		it('keeps the time of day', () => {
			expect(skipHiddenDays(noon(15), weekend, 1).hour()).toBe(noon(15).hour())
		})

		it('returns the date it was given when every day is hidden', () => {
			const everyDay = new Set([0, 1, 2, 3, 4, 5, 6])
			expect(skipHiddenDays(noon(15), everyDay, 1).date()).toBe(15)
			expect(skipHiddenDays(noon(15), everyDay, -1).date()).toBe(15)
		})
	})
})

/**
 * `getDayHours` has a cheap path for a day without a clock change and falls
 * back to one wall-clock parse per row on a change day. Both must give what a
 * per-row wall-clock parse gives, in every calendar zone, so each day of a
 * year is compared against that reference (run under TZ=America/New_York too).
 */
describe('getDayHours matches a per-row wall-clock parse', () => {
	const originalTz = dayjs.tz.guess()

	afterEach(() => {
		dayjs.tz.setDefault(originalTz)
	})

	const wallClockRows = (dayKey: string) =>
		Array.from({ length: 24 }, (_, hour) =>
			dayjs(`${dayKey}T${String(hour).padStart(2, '0')}:00:00.000`).tz()
		)

	const describeRow = (row: ReturnType<typeof dayjs>) =>
		`${row.toISOString()} ${row.format('YYYY-MM-DD HH:mm Z')} ${row.hour()}`

	const zones = [
		'UTC',
		'America/New_York',
		'America/Vancouver',
		'Asia/Kolkata',
		'Australia/Lord_Howe',
	]

	for (const zone of zones) {
		it(`in ${zone}, for every day of 2025`, () => {
			dayjs.tz.setDefault(zone)
			const mismatchedDays: string[] = []
			for (let dayOfYear = 0; dayOfYear < 365; dayOfYear++) {
				const day = dayjs('2025-01-01T12:00:00.000').add(dayOfYear, 'day')
				const dayKey = day.format('YYYY-MM-DD')
				const actual = getDayHours({ referenceDate: day }).map(describeRow)
				const expected = wallClockRows(dayKey).map(describeRow)
				if (actual.join('\n') !== expected.join('\n')) {
					mismatchedDays.push(dayKey)
				}
			}
			expect(mismatchedDays).toEqual([])
		}, 60_000)
	}
})

/**
 * `add(n, 'day')` keeps the receiver's UTC offset across a clock change, so a
 * day after the change reads as the right date but is an hour off as an
 * instant (the previous day at midnight, for a zone that springs forward).
 * Every day a helper returns must be that day's midnight in the calendar's
 * zone, whatever the machine's own zone is. Run under TZ=America/New_York and
 * TZ=UTC: the result must not depend on either.
 */
describe('day lists across the 2025 clock changes', () => {
	const clockChanges = [
		{ zone: 'America/New_York', changeDay: '2025-03-09' },
		{ zone: 'America/New_York', changeDay: '2025-11-02' },
		{ zone: 'Europe/London', changeDay: '2025-03-30' },
		{ zone: 'Europe/London', changeDay: '2025-10-26' },
		{ zone: 'Australia/Sydney', changeDay: '2025-04-06' },
		{ zone: 'Australia/Sydney', changeDay: '2025-10-05' },
	]

	afterEach(() => {
		dayjs.tz.setDefault()
	})

	// A day is wrong when it is not midnight of its own date in the zone.
	const wrongDays = (days: Dayjs[]) =>
		days
			.filter((day) => {
				const dateKey = day.format('YYYY-MM-DD')
				const midnightOfDate = dayjs(`${dateKey}T00:00:00.000`)
				return day.toISOString() !== midnightOfDate.toISOString()
			})
			.map((day) => day.format('YYYY-MM-DD'))

	for (const { zone, changeDay } of clockChanges) {
		const inZone = () => {
			dayjs.tz.setDefault(zone)
			return dayjs(`${changeDay}T12:00:00.000`)
		}

		for (const firstDayOfWeek of [0, 1, 6]) {
			it(`getWeekDays: ${zone} around ${changeDay}, week starting ${firstDayOfWeek}`, () => {
				const changeNoon = inZone()
				const weeks = [-7, 0, 7].map((offset) =>
					getWeekDays(
						dayjs(
							`${changeNoon.add(offset, 'day').format('YYYY-MM-DD')}T12:00:00.000`
						),
						firstDayOfWeek
					)
				)
				expect(wrongDays(weeks.flat())).toEqual([])
			})
		}

		it(`getMonthDays: ${zone} in the month of ${changeDay}`, () => {
			expect(wrongDays(getMonthDays(inZone().startOf('month')))).toEqual([])
		})

		it(`getMonthWeeks: ${zone} in the month of ${changeDay}`, () => {
			const weeks = getMonthWeeks(inZone().startOf('month'), 0)
			expect(wrongDays(weeks.flat())).toEqual([])
		})
	}
})

/**
 * `add` keeps the receiver's UTC offset, so a date stepped across a clock
 * change reads the right clock face but is an hour off as an instant, and
 * the instant is what `onDateChange` and `api.currentDate` hand a consumer.
 * Within the hour after midnight the instant is the previous day.
 */
describe('withOwnOffset', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	it('re-reads a stepped date at its own offset, keeping the clock face', () => {
		dayjs.tz.setDefault('America/New_York')
		const lateNight = dayjs('2025-11-02T00:30:00.000')
		const stepped = withOwnOffset(lateNight.add(1, 'day'))
		expect(stepped.toISOString()).toBe('2025-11-03T05:30:00.000Z')
	})

	it('keeps milliseconds', () => {
		dayjs.tz.setDefault('Europe/London')
		const stepped = withOwnOffset(
			dayjs('2025-10-25T12:34:56.789').add(1, 'day')
		)
		expect(stepped.format('HH:mm:ss.SSS')).toBe('12:34:56.789')
	})
})

describe('skipHiddenDays across a clock change', () => {
	afterEach(() => {
		dayjs.tz.setDefault()
	})

	it('steps back over a hidden weekend to Friday, at its own offset', () => {
		dayjs.tz.setDefault('America/New_York')
		const weekendHidden = new Set([0, 6])
		const mondayJustAfterMidnight = dayjs('2025-03-10T00:30:00.000')
		const settled = skipHiddenDays(
			mondayJustAfterMidnight.subtract(1, 'day'),
			weekendHidden,
			-1
		)
		expect(settled.toISOString()).toBe('2025-03-07T05:30:00.000Z')
	})
})

// Europe/London, Lisbon and Dublin read 0 in winter. With no `timezone` prop a
// zoneless string went through `dayjs.tz()`, which turns a zero offset into a
// UTC-flagged instance, so `add(1, 'day')` added 24 hours and `startOf('day')`
// rounded in UTC. Each case runs on a machine in that zone with no calendar
// zone, across the 2025 spring change (Sunday 30 March, 01:00 GMT to 02:00 BST).
describe('day math on a machine whose winter offset is 0, no calendar zone', () => {
	const MACHINE_ZONES = ['Europe/London', 'Europe/Lisbon', 'Europe/Dublin']

	/** What `expression` gives on a machine in `machineZone`, as ISO strings. */
	const isoOnMachineIn = (
		machineZone: string,
		expression: string
	): string[] => {
		const script = `
			import dayjs from '@ilamy/utils/dayjs'
			import { atTimeOfDay, getWeekDays, withOwnOffset } from '${import.meta.dir}/date-utils.ts'
			const result = [${expression}].flat()
			console.log(JSON.stringify(result.map((day) => day.toISOString())))
		`
		const child = Bun.spawnSync(['bun', '-e', script], {
			env: { ...process.env, TZ: machineZone },
		})
		return JSON.parse(child.stdout.toString().trim())
	}

	it.each(MACHINE_ZONES)(
		'atTimeOfDay builds midnight of the 30th at GMT and of the 31st at BST (%s)',
		(machineZone) => {
			const midnights = isoOnMachineIn(
				machineZone,
				`atTimeOfDay(dayjs('2025-03-30T12:00:00.000'), '00:00:00.000'),
				 atTimeOfDay(dayjs('2025-03-31T12:00:00.000'), '00:00:00.000')`
			)
			expect(midnights).toEqual([
				'2025-03-30T00:00:00.000Z',
				'2025-03-30T23:00:00.000Z',
			])
		}
	)

	it.each(MACHINE_ZONES)(
		'a day stepped across the change starts at its own midnight (%s)',
		(machineZone) => {
			const nextMidnight = isoOnMachineIn(
				machineZone,
				"dayjs('2025-03-30T00:00:00.000').add(1, 'day').startOf('day')"
			)
			expect(nextMidnight).toEqual(['2025-03-30T23:00:00.000Z'])
		}
	)

	it.each(MACHINE_ZONES)(
		'withOwnOffset keeps midnight of the 31st at BST (%s)',
		(machineZone) => {
			const settled = isoOnMachineIn(
				machineZone,
				"withOwnOffset(dayjs('2025-03-30T00:00:00.000').add(1, 'day'))"
			)
			expect(settled).toEqual(['2025-03-30T23:00:00.000Z'])
		}
	)

	it.each(MACHINE_ZONES)(
		'getWeekDays gives the week of the change one midnight per day (%s)',
		(machineZone) => {
			const weekStarts = isoOnMachineIn(
				machineZone,
				"getWeekDays(dayjs('2025-03-30T12:00:00.000'), 0)"
			)
			expect(weekStarts).toEqual([
				'2025-03-30T00:00:00.000Z',
				'2025-03-30T23:00:00.000Z',
				'2025-03-31T23:00:00.000Z',
				'2025-04-01T23:00:00.000Z',
				'2025-04-02T23:00:00.000Z',
				'2025-04-03T23:00:00.000Z',
				'2025-04-04T23:00:00.000Z',
			])
		}
	)
})
