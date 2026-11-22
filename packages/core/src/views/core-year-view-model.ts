import {
	add,
	dayKey,
	endOf,
	formatDate,
	fromFields,
	getFields,
	now,
	overlapsRange,
	parseDate,
	resolveZone,
	startOf,
	withZone,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type { CalendarEvent } from '../core-calendar.types'
import { getWeekDays } from '../utils/core-date-grid.utils'

const MONTHS_IN_YEAR = 12
const DAYS_IN_MINI_CALENDAR = 42

export interface YearWeekdayHeader {
	id: string
	label: string
}

export interface YearDayViewModel {
	date: ZonedDate
	dayKey: string
	isInCurrentMonth: boolean
	isToday: boolean
	isSelected: boolean
	eventCount: number
}

export interface YearMonthViewModel {
	month: number
	date: ZonedDate
	name: string
	monthKey: string
	yearMonthKey: string
	eventCount: number
	days: YearDayViewModel[]
}

export interface YearViewModel {
	year: number
	weekdayHeaders: YearWeekdayHeader[]
	months: YearMonthViewModel[]
}

export interface BuildYearViewModelInput {
	currentDate: ZonedDate
	events: CalendarEvent[]
	firstDayOfWeek: number
	timezone: string
	locale: string
}

interface ParsedYearEvent {
	start: ZonedDate
	end: ZonedDate
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const buildMonthGrid = (
	year: number,
	month: number,
	zone: string,
	firstDayOfWeek: number,
	locale: string,
	todayKey: string,
	selectedKey: string,
	parsedEvents: ParsedYearEvent[]
): YearMonthViewModel => {
	const monthDate = fromFields({ year, month, day: 1 }, zone)
	const monthEnd = endOf(monthDate, 'month')
	const firstCell = getWeekDays(monthDate, firstDayOfWeek).at(0) ?? monthDate

	const days = Array.from(
		{ length: DAYS_IN_MINI_CALENDAR },
		(_, dayIndex): YearDayViewModel => {
			const dayDate = startOf(add(firstCell, dayIndex, 'day'), 'day')
			const dayEnd = endOf(dayDate, 'day')
			const cellKey = dayKey(dayDate)
			const eventCount = parsedEvents.filter((entry) =>
				overlapsRange(entry, dayDate, dayEnd)
			).length

			return {
				date: dayDate,
				dayKey: cellKey,
				isInCurrentMonth:
					dayDate.year === monthDate.year && dayDate.month === monthDate.month,
				isToday: cellKey === todayKey,
				isSelected: cellKey === selectedKey,
				eventCount,
			}
		}
	)

	const monthKey = pad2(month)
	const eventCount = parsedEvents.filter((entry) =>
		overlapsRange(entry, monthDate, monthEnd)
	).length

	return {
		month,
		date: monthDate,
		name: formatDate(monthDate, { month: 'long' }, locale),
		monthKey,
		yearMonthKey: `${year}-${monthKey}`,
		eventCount,
		days,
	}
}

/** Builds a framework-agnostic view model for a 12-month year overview. */
export const buildYearViewModel = ({
	currentDate,
	events,
	firstDayOfWeek,
	timezone,
	locale,
}: BuildYearViewModelInput): YearViewModel => {
	const zone = resolveZone(timezone)
	const zonedAnchor = withZone(currentDate, zone)
	const year = zonedAnchor.year
	const selectedKey = dayKey(zonedAnchor)
	const todayKey = dayKey(now(zone))

	const weekdayHeaders = getWeekDays(zonedAnchor, firstDayOfWeek).map(
		(day) => ({
			id: String(getFields(day).dayOfWeek),
			label: formatDate(day, { weekday: 'short' }, locale).slice(0, 2),
		})
	)

	const parsedEvents: ParsedYearEvent[] = []
	for (const event of events) {
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (start && end) {
			parsedEvents.push({ start, end })
		}
	}

	const months = Array.from({ length: MONTHS_IN_YEAR }, (_, index) =>
		buildMonthGrid(
			year,
			index + 1,
			zone,
			firstDayOfWeek,
			locale,
			todayKey,
			selectedKey,
			parsedEvents
		)
	)

	return { year, weekdayHeaders, months }
}
