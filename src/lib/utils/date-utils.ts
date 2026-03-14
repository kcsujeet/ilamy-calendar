import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'

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
	currentDate: Dayjs,
	firstDayOfWeek: number
): Dayjs[] {
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

/**
 * Generates 6 weeks of days for a month calendar view.
 * Always returns 42 days (6 weeks × 7 days).
 */
export function getMonthWeeks(
	monthDate: Dayjs,
	firstDayOfWeek: number
): Dayjs[][] {
	const firstWeek = getWeekDays(monthDate.startOf('month'), firstDayOfWeek)

	return Array.from({ length: 6 }, (_, weekIndex) => {
		const weekStart = firstWeek[0].add(weekIndex, 'week')
		return getWeekDays(weekStart, firstDayOfWeek)
	})
}

export function getMonthDays(monthDate: Dayjs): Dayjs[] {
	const daysInMonth = monthDate.daysInMonth()
	return Array.from({ length: daysInMonth }, (_, i) =>
		monthDate.startOf('month').add(i, 'day')
	)
}

interface GetDayHoursOptions {
	referenceDate?: Dayjs
	length?: number
}

/**
 * Generates an array of 24 dayjs objects representing hourly slots for a day.
 * Uses .hour(i) so each row maps to "the hour labeled i" — keeping grid rows
 * aligned across columns in week views. On DST spring-forward, .hour(2) returns
 * 3 AM (the non-existent hour is collapsed), but the grid key fix (dayIndex)
 * and per-day generation in views handle this correctly.
 */
export function getDayHours({
	referenceDate = dayjs(),
	length = 24,
}: GetDayHoursOptions = {}): Dayjs[] {
	const startOfDay = referenceDate.startOf('day')
	return Array.from({ length }, (_, i) =>
		startOfDay.hour(i).minute(0).second(0).millisecond(0)
	)
}
