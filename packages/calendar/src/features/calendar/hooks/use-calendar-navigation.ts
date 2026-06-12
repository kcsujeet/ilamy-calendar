import { useCallback, useState } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import dayjs, {
	type Dayjs,
	type ManipulateType,
} from '@/lib/configs/dayjs-config'
import { getMonthWeeks, getWeekDays } from '@/lib/utils/date-utils'
import type { CalendarView } from '@/types'

const VIEW_UNITS: Record<string, ManipulateType> = {
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
}

const calculateViewRange = (
	date: Dayjs,
	view: CalendarView,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } => {
	if (view === 'day' || view === 'year') {
		return { start: date.startOf(view), end: date.endOf(view) }
	}
	if (view === 'week') {
		const days = getWeekDays(date, firstDayOfWeek)
		const weekStart = days.at(0) ?? date
		const weekEnd = days.at(-1) ?? date
		return { start: weekStart.startOf('day'), end: weekEnd.endOf('day') }
	}
	// month view: 6 weeks × 7 days — also the default range for plugin/unknown views
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	const gridStart = weeks.at(0)?.at(0) ?? date
	const gridEnd = weeks.at(-1)?.at(-1) ?? date
	return { start: gridStart.startOf('day'), end: gridEnd.endOf('day') }
}

export interface CalendarNavigationParams {
	initialDate: Dayjs
	initialView: CalendarView
	firstDayOfWeek: number
	onDateChange?: (date: Dayjs, range: { start: Dayjs; end: Dayjs }) => void
	onViewChange?: (view: CalendarView) => void
	pluginRuntime: PluginRuntime
}

export interface CalendarNavigationSlice {
	currentDate: Dayjs
	setCurrentDate: React.Dispatch<React.SetStateAction<Dayjs>>
	view: CalendarView
	setView: (view: CalendarView) => void
	selectDate: (date: Dayjs) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
}

/** Navigation slice: current date/view state, period stepping, range math. */
export const useCalendarNavigation = ({
	initialDate,
	initialView,
	firstDayOfWeek,
	onDateChange,
	onViewChange,
	pluginRuntime,
}: CalendarNavigationParams): CalendarNavigationSlice => {
	const [currentDate, setCurrentDate] = useState<Dayjs>(
		dayjs.isDayjs(initialDate) ? initialDate : dayjs(initialDate)
	)
	const [view, setView] = useState<CalendarView>(initialView)

	const getCurrentViewRange = useCallback(() => {
		return calculateViewRange(currentDate, view, firstDayOfWeek)
	}, [currentDate, view, firstDayOfWeek])

	const updateDateAndNotify = useCallback(
		(newDate: Dayjs) => {
			setCurrentDate(newDate)
			const range = calculateViewRange(newDate, view, firstDayOfWeek)
			onDateChange?.(newDate, range)
		},
		[onDateChange, view, firstDayOfWeek]
	)

	const selectDate = updateDateAndNotify

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			const unit =
				VIEW_UNITS[view] ??
				pluginRuntime.getViews().find((v) => v.name === view)?.navigationUnit ??
				'day'
			let newDate = currentDate.subtract(1, unit)
			if (direction === 1) {
				newDate = currentDate.add(1, unit)
			}
			updateDateAndNotify(newDate)
		},
		[currentDate, view, updateDateAndNotify, pluginRuntime]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(
		() => updateDateAndNotify(dayjs()),
		[updateDateAndNotify]
	)

	const handleViewChange = useCallback(
		(newView: CalendarView) => {
			setView(newView)
			onViewChange?.(newView)
			// View change affects visible range — notify consumers
			const range = calculateViewRange(currentDate, newView, firstDayOfWeek)
			onDateChange?.(currentDate, range)
		},
		[onViewChange, onDateChange, currentDate, firstDayOfWeek]
	)

	return {
		currentDate,
		setCurrentDate,
		view,
		setView: handleViewChange,
		selectDate,
		nextPeriod,
		prevPeriod,
		today,
		getCurrentViewRange,
	}
}
