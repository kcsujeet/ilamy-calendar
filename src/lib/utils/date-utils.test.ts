import dayjs from '@/lib/configs/dayjs-config'
import { describe, expect, it } from 'bun:test'
import { getWeekDays } from './date-utils'

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
})
