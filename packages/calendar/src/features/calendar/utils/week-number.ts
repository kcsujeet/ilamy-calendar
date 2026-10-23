import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import type { WeekNumberCalculation } from '@/features/calendar/types'

const DAYS_PER_WEEK = 7
const MS_PER_DAY = 86_400_000
const THURSDAY = 4
const ISO_FIRST_DAY_OF_WEEK = 1
const ISO_FIRST_DAY_OF_YEAR = 4

/** dayjs reads `yearStart` from a locale but does not type it. */
type LocaleYearStart = { yearStart?: number }

/**
 * Days since 1970-01-01 of a calendar day. Plain arithmetic on the day: dayjs's
 * own `week()` and `diff()` read the clock through the machine's zone, which
 * moved a week number an hour (and so a week) wherever a zone's offset is 0 in
 * winter (London, Lisbon, Dublin) or the machine's clocks change.
 */
const dayNumber = (year: number, month: number, dayOfMonth: number): number =>
	Math.floor(Date.UTC(year, month, dayOfMonth) / MS_PER_DAY)

/** 0 = Sunday. 1970-01-01 was a Thursday. */
const weekdayOf = (day: number): number =>
	(((day + THURSDAY) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK

/**
 * The week a day is in, counting from the week that holds `firstDayOfYear`
 * (the day of January) in a year whose weeks start on `firstDayOfWeek`. The
 * days before that week belong to the last week of the year before, and the
 * days from next year's first week on are week 1 of the next year.
 *
 * ISO 8601 is the same rule with Monday-first weeks and week 1 holding 4
 * January, the same thing as "the week holding the year's first Thursday".
 */
const countWeeks = (
	date: Dayjs,
	firstDayOfWeek: number,
	firstDayOfYear: number
): number => {
	const year = date.year()
	const day = dayNumber(year, date.month(), date.date())

	const firstWeekStart = (ofYear: number): number => {
		const anchor = dayNumber(ofYear, 0, firstDayOfYear)
		const daysIntoWeek =
			(weekdayOf(anchor) - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK
		return anchor - daysIntoWeek
	}
	const weeksSince = (start: number): number =>
		Math.floor((day - start) / DAYS_PER_WEEK) + 1

	if (day >= firstWeekStart(year + 1)) {
		return 1
	}
	if (day < firstWeekStart(year)) {
		return weeksSince(firstWeekStart(year - 1))
	}
	return weeksSince(firstWeekStart(year))
}

/**
 * The week number a date is shown under.
 *
 * - `'local'`: the locale's own count, the one dayjs `week()` gives: the
 *   locale's first weekday starts a week, and week 1 holds its `yearStart`
 *   day of January (1 unless the locale says otherwise).
 * - `'ISO'`: ISO 8601.
 */
export const getWeekNumber = (
	date: Dayjs,
	calculation: WeekNumberCalculation
): number => {
	if (calculation === 'ISO') {
		return countWeeks(date, ISO_FIRST_DAY_OF_WEEK, ISO_FIRST_DAY_OF_YEAR)
	}
	const locale = dayjs.Ls[date.locale()] as LocaleYearStart
	const firstDayOfWeek = date.localeData().firstDayOfWeek()
	return countWeeks(date, firstDayOfWeek, locale.yearStart ?? 1)
}
