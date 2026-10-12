import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { isSameDay } from '@ilamy/utils/helpers'
import { DAYS_IN_WEEK } from '@/config/constants'
import type { TimeFormat } from '@/types'

/**
 * Whether the given date falls on today (calendar day, respecting timezone).
 *
 * Callers rendering many cells at once should hoist `dayKey(dayjs())` and
 * compare keys directly: constructing "now" is the cost that remains here.
 */
export function isToday(date: Dayjs): boolean {
	return isSameDay(date, dayjs())
}

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
	// `startOf('week')` and `day()` each carry the receiver's offset forward
	// rather than recomputing it, so composing them across a DST transition lands
	// an hour off and on the far side of a day boundary. Re-anchoring here keeps
	// the week this returns the week the caller asked for (#246).
	const startOfWeekFromCurrentDate = currentDate
		.startOf('week')
		.day(firstDayOfWeek)
		.startOf('day')

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
	const monthStart = monthDate.startOf('month')
	const firstWeek = getWeekDays(monthStart, firstDayOfWeek)
	const firstDayOfGrid = firstWeek.at(0) ?? monthStart

	return Array.from({ length: 6 }, (_, weekIndex) => {
		// `startOf('day')` re-anchors after the step, because `add` carries the
		// receiver's offset forward rather than recomputing it. Across an autumn
		// transition the offset it kept is an hour too large, so the anchor lands
		// before midnight, in the previous week, and `getWeekDays` snaps it back
		// to the week already emitted: one week twice, another missing, and the
		// events in the missing week never render (#246). Measured rather than
		// assumed, since dayjs does not document `add` against DST.
		const weekStart = firstDayOfGrid.add(weekIndex, 'week').startOf('day')
		return getWeekDays(weekStart, firstDayOfWeek)
	})
}

export function getMonthDays(monthDate: Dayjs): Dayjs[] {
	const daysInMonth = monthDate.daysInMonth()
	const startOfMonth = monthDate.startOf('month')
	return Array.from({ length: daysInMonth }, (_, i) =>
		startOfMonth.add(i, 'day')
	)
}

/**
 * The days a grid draws: `days` without those on a hidden weekday
 * (0 = Sunday). A grid reads its columns from this list, so a hidden day is
 * simply not there and its neighbours sit side by side.
 */
export const withoutHiddenDays = (
	days: Dayjs[],
	hiddenDays: Set<number> | undefined
): Dayjs[] => {
	if (!hiddenDays) {
		return days
	}
	return days.filter((day) => !hiddenDays.has(day.day()))
}

/**
 * `date`, or the nearest day in `direction` that is not hidden. FullCalendar's
 * day view does the same when its range falls on hidden days: it steps past
 * them in the direction of travel (`skipHiddenDays`,
 * `packages/preact/src/DateProfileGenerator.ts:450-457`, v7.1.1). Callers must
 * If every day is hidden there is none to move to, so `date` comes back as is.
 */
export const skipHiddenDays = (
	date: Dayjs,
	hiddenDays: Set<number> | undefined,
	direction: 1 | -1
): Dayjs => {
	let day = date
	for (let step = 0; step < DAYS_IN_WEEK; step++) {
		if (!hiddenDays?.has(day.day())) {
			return day
		}
		day = day.add(direction, 'day')
	}
	return date
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
	// Each row is rebuilt from a zoneless string, which dayjs anchors in the
	// configured zone on parse and so derives the offset for THIS day. The
	// `.hour(i)` setter keeps the clock face but the start-of-day's UTC offset,
	// so on a day the clocks change a row after the change carried the wrong
	// offset (docs/timezones.md); the same reason `calculateDropTimes` rebuilds
	// its target this way.
	const referenceDay = referenceDate.format('YYYY-MM-DD')
	return Array.from({ length }, (_, i) => {
		const hourOfDay = String(i).padStart(2, '0')
		// `.tz()` with no argument re-reads the instant in the configured zone, so
		// `format()` and `.hour()` show the right clock on a machine whose own
		// clocks change that day too.
		return dayjs(`${referenceDay}T${hourOfDay}:00:00.000`).tz()
	})
}

/** The 6x7 month grid range: first cell of week 1 → last cell of week 6. */
export const getMonthGridRange = (
	date: Dayjs,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } => {
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	const gridStart = weeks.at(0)?.at(0) ?? date
	const gridEnd = weeks.at(-1)?.at(-1) ?? date
	return { start: gridStart.startOf('day'), end: gridEnd.endOf('day') }
}

/**
 * The dayjs pattern for a clock time in the calendar's configured format.
 * `HourLabel` formats whole hours and keeps its own, coarser pattern.
 */
export const getTimeOfDayPattern = (timeFormat: TimeFormat): string =>
	timeFormat === '12-hour' ? 'h:mma' : 'HH:mm'
