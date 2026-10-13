import type { Dayjs } from '@ilamy/utils/dayjs'
import type { WeekNumberCalculation } from '@/features/calendar/types'

const DAYS_PER_WEEK = 7
const MONDAY_BASED_THURSDAY_OFFSET = 3

/**
 * ISO 8601: weeks start on Monday and week 1 is the week holding the year's
 * first Thursday. The week belongs to the year its Thursday is in, so the
 * number is that Thursday's day of the year, in whole weeks.
 */
const getIsoWeekNumber = (date: Dayjs): number => {
	const daysSinceMonday = (date.day() + 6) % DAYS_PER_WEEK
	const thursday = date
		.startOf('day')
		.add(MONDAY_BASED_THURSDAY_OFFSET - daysSinceMonday, 'day')
	const daysIntoYear = thursday.diff(thursday.startOf('year'), 'day')
	return Math.floor(daysIntoYear / DAYS_PER_WEEK) + 1
}

/**
 * The week number a date is shown under.
 *
 * - `'local'`: the locale's own count, dayjs `week()`.
 * - `'ISO'`: ISO 8601.
 */
export const getWeekNumber = (
	date: Dayjs,
	calculation: WeekNumberCalculation
): number => {
	if (calculation === 'ISO') {
		return getIsoWeekNumber(date)
	}
	return date.week()
}
