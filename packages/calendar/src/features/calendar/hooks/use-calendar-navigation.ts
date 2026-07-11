import type { PluginView } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { useCallback, useMemo, useState } from 'react'
import { builtInViews } from '@/features/calendar/components/views/built-in-views'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import { getMonthGridRange } from '@/lib/utils/date-utils'
import type { CalendarView } from '@/types'

const calculateViewRange = (
	date: Dayjs,
	viewSpec: PluginView | undefined,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } =>
	// Views without `range` keep today's fallback: the month 6x7 grid range.
	viewSpec?.range?.(date, { firstDayOfWeek }) ??
	getMonthGridRange(date, firstDayOfWeek)

interface CalendarNavigationParams {
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
	/**
	 * Switches the view, optionally moving to `date` in the same update so both
	 * settle atomically. Side effects: fires `onViewChange(newView)`, then one
	 * `onDateChange(date ?? currentDate, range)` because the visible range changes.
	 */
	setView: (view: CalendarView, date?: Dayjs) => void
	selectDate: (date: Dayjs) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	/** The one resolution path: built-in view specs prepended, then plugin views. */
	getAllViews: () => PluginView[]
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

	const getAllViews = useCallback(
		() => [...builtInViews, ...pluginRuntime.getViews()],
		[pluginRuntime]
	)
	const resolveViewSpec = useCallback(
		(name: CalendarView) => getAllViews().find((v) => v.name === name),
		[getAllViews]
	)

	const getCurrentViewRange = useCallback(() => {
		return calculateViewRange(
			currentDate,
			resolveViewSpec(view),
			firstDayOfWeek
		)
	}, [currentDate, view, firstDayOfWeek, resolveViewSpec])

	const updateDateAndNotify = useCallback(
		(newDate: Dayjs) => {
			setCurrentDate(newDate)
			const range = calculateViewRange(
				newDate,
				resolveViewSpec(view),
				firstDayOfWeek
			)
			onDateChange?.(newDate, range)
		},
		[onDateChange, view, firstDayOfWeek, resolveViewSpec]
	)

	const selectDate = updateDateAndNotify

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			const spec = resolveViewSpec(view)
			// navigationStep wins; else one navigationUnit; else one day (today's default).
			const step = spec?.navigationStep ?? {
				amount: 1,
				unit: spec?.navigationUnit ?? 'day',
			}
			updateDateAndNotify(currentDate.add(direction * step.amount, step.unit))
		},
		[currentDate, view, updateDateAndNotify, resolveViewSpec]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(
		() => updateDateAndNotify(dayjs()),
		[updateDateAndNotify]
	)

	const handleViewChange = useCallback(
		(newView: CalendarView, date?: Dayjs) => {
			// When a target date accompanies the view change (e.g. year view day
			// click), apply both before notifying so consumers never observe a
			// range computed from the previous date (issue #231).
			const targetDate = date ?? currentDate
			if (date) {
				setCurrentDate(date)
			}
			setView(newView)
			onViewChange?.(newView)
			// View change affects visible range — notify consumers
			const range = calculateViewRange(
				targetDate,
				resolveViewSpec(newView),
				firstDayOfWeek
			)
			onDateChange?.(targetDate, range)
		},
		[onViewChange, onDateChange, currentDate, firstDayOfWeek, resolveViewSpec]
	)

	return useMemo(
		() => ({
			currentDate,
			setCurrentDate,
			view,
			setView: handleViewChange,
			selectDate,
			nextPeriod,
			prevPeriod,
			today,
			getCurrentViewRange,
			getAllViews,
		}),
		[
			currentDate,
			view,
			handleViewChange,
			selectDate,
			nextPeriod,
			prevPeriod,
			today,
			getCurrentViewRange,
			getAllViews,
		]
	)
}
