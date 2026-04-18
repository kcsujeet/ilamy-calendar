import { afterEach, describe, expect, it } from 'bun:test'
import dayjs from '@/lib/configs/dayjs-config'
import { getDayHours, getMonthWeeks, getWeekDays } from './date-utils'

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

describe('getMonthWeeks', () => {
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
