import {
	add,
	dayKey,
	endOf,
	fromFields,
	getFields,
	now,
	startOf,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type { CalendarView, WeekDays } from '../core-calendar.types'

export const DAYS_IN_WEEK = 7
export const HOURS_IN_DAY = 24
export const MONTH_GRID_WEEKS = 6

export const WEEK_DAYS_NUMBER_MAP: Record<WeekDays, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
}

/**
 * Days of the week (0 = Sunday .. 6 = Saturday) hidden by `hiddenDays` and
 * `weekends={false}` (FullCalendar `DateProfileGenerator.ts:397-399`, v7.1.1).
 * Returns `undefined` when all 7 days are visible (or if all 7 would be hidden).
 */
export const toHiddenDaysSet = (
	hiddenDays: WeekDays[] = [],
	weekends = true
): Set<number> | undefined => {
	const hidden = new Set(hiddenDays.map((day) => WEEK_DAYS_NUMBER_MAP[day]))
	if (!weekends) {
		hidden.add(WEEK_DAYS_NUMBER_MAP.sunday)
		hidden.add(WEEK_DAYS_NUMBER_MAP.saturday)
	}
	if (hidden.size === 0 || hidden.size >= DAYS_IN_WEEK) {
		return undefined
	}
	return hidden
}

/** Whether `date` falls on today in `date`'s timezone. */
export const isToday = (date: ZonedDate): boolean =>
	dayKey(date) === dayKey(now(date.timeZoneId))

/** Filters out days whose weekday is in `hiddenDays`. */
export const withoutHiddenDays = (
	days: ZonedDate[],
	hiddenDays: Set<number> | undefined
): ZonedDate[] => {
	if (!hiddenDays) {
		return days
	}
	return days.filter((day) => !hiddenDays.has(getFields(day).dayOfWeek))
}

/**
 * Moves `date` to the nearest non-hidden day in `direction`, matching
 * FullCalendar's `skipHiddenDays` (`DateProfileGenerator.ts:450-457`, v7.1.1).
 */
export const skipHiddenDays = (
	date: ZonedDate,
	hiddenDays: Set<number> | undefined,
	direction: 1 | -1
): ZonedDate => {
	let candidate = date
	for (let step = 0; step < DAYS_IN_WEEK; step++) {
		if (!hiddenDays?.has(getFields(candidate).dayOfWeek)) {
			return candidate
		}
		candidate = add(candidate, direction, 'day')
	}
	return date
}

/** Seven calendar days of the week containing `currentDate`, starting on `firstDayOfWeek` (0 = Sun). */
export const getWeekDays = (
	currentDate: ZonedDate,
	firstDayOfWeek: number
): ZonedDate[] => {
	const weekStart = startOf(currentDate, 'week', firstDayOfWeek)
	return Array.from({ length: DAYS_IN_WEEK }, (_, index) =>
		startOf(add(weekStart, index, 'day'), 'day')
	)
}

/** Six weeks (42 days) for a month calendar grid starting on `firstDayOfWeek`. */
export const getMonthWeeks = (
	monthDate: ZonedDate,
	firstDayOfWeek: number
): ZonedDate[][] => {
	const monthStart = startOf(monthDate, 'month')
	const firstWeek = getWeekDays(monthStart, firstDayOfWeek)
	const gridStart = firstWeek.at(0) ?? monthStart
	return Array.from({ length: MONTH_GRID_WEEKS }, (_, weekIndex) => {
		const weekStart = startOf(add(gridStart, weekIndex, 'week'), 'day')
		return getWeekDays(weekStart, firstDayOfWeek)
	})
}

/** All calendar days of `monthDate`'s month. */
export const getMonthDays = (monthDate: ZonedDate): ZonedDate[] => {
	const { daysInMonth } = getFields(monthDate)
	const monthStart = startOf(monthDate, 'month')
	return Array.from({ length: daysInMonth }, (_, index) =>
		startOf(add(monthStart, index, 'day'), 'day')
	)
}

export interface GetDayHoursOptions {
	referenceDate?: ZonedDate
	length?: number
}

/**
 * Hourly slot starts (0..length-1) for `referenceDate`'s calendar day in its
 * own timezone. Temporal resolves every wall-clock hour cleanly across DST
 * transitions with zero machine-timezone leakage.
 */
export const getDayHours = ({
	referenceDate = now(),
	length = HOURS_IN_DAY,
}: GetDayHoursOptions = {}): ZonedDate[] => {
	const { year, month, day } = referenceDate
	const zone = referenceDate.timeZoneId
	return Array.from({ length }, (_, hour) =>
		fromFields({ year, month, day, hour }, zone)
	)
}

/**
 * The 6x7 month grid range (`start` inclusive, `end` end-of-last-drawn-day).
 * Trims leading/trailing hidden days when `hiddenDays` is set (D10, matching
 * FullCalendar's `activeStart`/`activeEnd`).
 */
export const getMonthGridRange = (
	date: ZonedDate,
	firstDayOfWeek: number,
	hiddenDays?: Set<number>
): { start: ZonedDate; end: ZonedDate } => {
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	const visibleDays = withoutHiddenDays(weeks.flat(), hiddenDays)
	const firstDay = visibleDays.at(0) ?? weeks.at(0)?.at(0) ?? date
	const lastDay = visibleDays.at(-1) ?? weeks.at(-1)?.at(-1) ?? date
	return { start: startOf(firstDay, 'day'), end: endOf(lastDay, 'day') }
}

/**
 * Visible range for a built-in view (`month`, `week`, `day`), trimmed to drawn
 * days when `hiddenDays` hides days (D10; FullCalendar `activeStart`/`activeEnd`).
 */
export const getVisibleDateRange = (
	date: ZonedDate,
	view: CalendarView,
	firstDayOfWeek: number,
	hiddenDays?: Set<number>
): { start: ZonedDate; end: ZonedDate } => {
	if (view === 'day') {
		const visibleDay = skipHiddenDays(date, hiddenDays, 1)
		return { start: startOf(visibleDay, 'day'), end: endOf(visibleDay, 'day') }
	}
	if (view === 'week') {
		const weekDays = withoutHiddenDays(
			getWeekDays(date, firstDayOfWeek),
			hiddenDays
		)
		const firstDay = weekDays.at(0) ?? startOf(date, 'week', firstDayOfWeek)
		const lastDay = weekDays.at(-1) ?? endOf(date, 'week', firstDayOfWeek)
		return { start: startOf(firstDay, 'day'), end: endOf(lastDay, 'day') }
	}
	if (view === 'year') {
		return { start: startOf(date, 'year'), end: endOf(date, 'year') }
	}
	return getMonthGridRange(date, firstDayOfWeek, hiddenDays)
}
