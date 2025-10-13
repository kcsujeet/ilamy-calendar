import type dayjs from '@/lib/configs/dayjs-config'

/**
 * Calculates the week days for a given date and first day of week setting.
 *
 * This function ensures that the current date is always included in the returned week,
 * even when the first day of week is set to a day after the current date.
 *
 * @param currentDate - The reference date for calculating the week
 * @param firstDayOfWeek - The day number (0-6) representing the first day of the week (0 = Sunday, 1 = Monday, etc.)
 * @returns An array of 7 dayjs objects representing the week days, starting from firstDayOfWeek
 *
 * @example
 * // Get week starting from Monday for current date
 * const weekDays = getWeekDays(dayjs('2025-10-13'), 1)
 * // Returns: [Mon Oct 13, Tue Oct 14, ..., Sun Oct 19]
 *
 * @example
 * // Get week starting from Wednesday when current date is Monday
 * const weekDays = getWeekDays(dayjs('2025-10-13'), 3)
 * // Returns: [Wed Oct 8, Thu Oct 9, ..., Tue Oct 14] (includes Monday Oct 13)
 */
export function getWeekDays(
  currentDate: dayjs.Dayjs,
  firstDayOfWeek: number
): dayjs.Dayjs[] {
  const startOfWeekFromCurrentDate = currentDate
    .startOf('week')
    .day(firstDayOfWeek)

  const adjustedStartOfWeek = currentDate.isBefore(startOfWeekFromCurrentDate)
    ? startOfWeekFromCurrentDate.subtract(1, 'week')
    : startOfWeekFromCurrentDate

  return Array.from({ length: 7 }, (_, dayIndex) =>
    adjustedStartOfWeek.add(dayIndex, 'day')
  )
}
