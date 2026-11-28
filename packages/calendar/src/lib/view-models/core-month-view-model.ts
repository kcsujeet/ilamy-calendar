import type {
	BusinessHours,
	CalendarEvent,
	CellInfo,
	Resource,
	WeekNumberCalculation,
} from '../../types/calendar.types'
import { isBusinessDay } from '../../utils/core-business-hours.utils'
import {
	getMonthWeeks,
	isToday,
	withoutHiddenDays,
} from '../../utils/core-date-grid.utils'
import {
	add,
	dayKey,
	formatDate,
	getWeekNumber,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '../../utils/temporal'
import {
	type HorizontalLayoutResult,
	layoutHorizontal,
} from '../layout/core-layout-horizontal.utils'

const DEFAULT_DAY_MAX_EVENTS = 4

export interface MonthCellViewModel {
	date: ZonedDate
	key: string
	cellInfo: CellInfo
	isToday: boolean
	isOutsideMonth: boolean
	isNonBusiness: boolean
	isDisabled: boolean
}

export interface MonthWeekViewModel {
	weekNumber?: number
	days: MonthCellViewModel[]
	layout: HorizontalLayoutResult
}

export interface MonthViewModel {
	weeks: MonthWeekViewModel[]
	colCount: number
	weekdayHeaders: string[]
}

export interface BuildMonthViewModelInput {
	currentDate: ZonedDate
	events: CalendarEvent[]
	firstDayOfWeek: number
	locale: string
	hiddenDays?: Set<number>
	weekNumbers?: boolean
	weekNumberCalculation?: WeekNumberCalculation
	dayMaxEvents?: number
	businessHours?: BusinessHours | BusinessHours[]
	resource?: Resource
	isCellDisabled?: (info: CellInfo) => boolean
}

const buildMonthCell = (
	day: ZonedDate,
	currentDate: ZonedDate,
	effectiveBusinessHours: BusinessHours | BusinessHours[] | undefined,
	resource: Resource | undefined,
	isCellDisabled: ((info: CellInfo) => boolean) | undefined
): MonthCellViewModel => {
	const cellStart = startOf(day, 'day')
	const cellInfo: CellInfo = {
		start: toOffsetIso(cellStart),
		end: toOffsetIso(add(cellStart, 1, 'day')),
		allDay: true,
		resource,
	}
	const isOutsideMonth =
		day.month !== currentDate.month || day.year !== currentDate.year
	const isNonBusiness = Boolean(
		effectiveBusinessHours && !isBusinessDay(day, effectiveBusinessHours)
	)
	const isDisabled = Boolean(isCellDisabled?.(cellInfo))

	return {
		date: day,
		key: dayKey(day),
		cellInfo,
		isToday: isToday(day),
		isOutsideMonth,
		isNonBusiness,
		isDisabled,
	}
}

/** Builds a framework-agnostic view model for a 6-week month grid. */
export const buildMonthViewModel = ({
	currentDate,
	events,
	firstDayOfWeek,
	locale,
	hiddenDays,
	weekNumbers = false,
	weekNumberCalculation = 'local',
	dayMaxEvents = DEFAULT_DAY_MAX_EVENTS,
	businessHours,
	resource,
	isCellDisabled,
}: BuildMonthViewModelInput): MonthViewModel => {
	const visibleWeeks = getMonthWeeks(currentDate, firstDayOfWeek)
		.map((week) => withoutHiddenDays(week, hiddenDays))
		.filter((week) => week.length > 0)

	const firstWeek = visibleWeeks.at(0) ?? []
	const colCount = Math.max(1, firstWeek.length)
	const weekdayHeaders = firstWeek.map((day) =>
		formatDate(day, { weekday: 'short' }, locale)
	)
	const effectiveBusinessHours = resource?.businessHours ?? businessHours

	const weeks = visibleWeeks.map((week): MonthWeekViewModel => {
		const firstDay = week.at(0)
		let weekNumber: number | undefined
		if (weekNumbers && firstDay) {
			weekNumber = getWeekNumber(firstDay, weekNumberCalculation, locale)
		}

		const days = week.map((day) =>
			buildMonthCell(
				day,
				currentDate,
				effectiveBusinessHours,
				resource,
				isCellDisabled
			)
		)
		const layout = layoutHorizontal({
			events,
			days: week,
			dayMaxEvents,
		})

		return { weekNumber, days, layout }
	})

	return { weeks, colCount, weekdayHeaders }
}
