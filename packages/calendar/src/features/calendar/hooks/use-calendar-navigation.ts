import type { PluginView } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { useCallback, useMemo, useRef, useState } from 'react'
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

/** Date + view as one value so a navigation step can move both atomically. */
interface NavState {
	date: Dayjs
	view: CalendarView
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
	const [navState, setNavState] = useState<NavState>(() => ({
		date: dayjs.isDayjs(initialDate) ? initialDate : dayjs(initialDate),
		view: initialView,
	}))
	// Mutation-time mirror of navState. React state read from a closure is
	// pre-batch, so navigation calls sequenced in one handler (selectDate +
	// setView, double nextPeriod, …) would compute their emissions from stale
	// values (issue #231). Every write goes through applyNav, which updates the
	// mirror synchronously; every read that feeds a mutation or an emission
	// uses the mirror, never the closure.
	const latestNav = useRef(navState)

	const applyNav = useCallback((partial: Partial<NavState>): NavState => {
		const next = { ...latestNav.current, ...partial }
		latestNav.current = next
		setNavState(next)
		return next
	}, [])

	const getAllViews = useCallback(
		() => [...builtInViews, ...pluginRuntime.getViews()],
		[pluginRuntime]
	)
	const resolveViewSpec = useCallback(
		(name: CalendarView) => getAllViews().find((v) => v.name === name),
		[getAllViews]
	)

	// Render-facing: reads the committed state so it stays consistent with what
	// is on screen.
	const getCurrentViewRange = useCallback(() => {
		return calculateViewRange(
			navState.date,
			resolveViewSpec(navState.view),
			firstDayOfWeek
		)
	}, [navState, firstDayOfWeek, resolveViewSpec])

	const notifyDateChange = useCallback(
		(next: NavState) => {
			const range = calculateViewRange(
				next.date,
				resolveViewSpec(next.view),
				firstDayOfWeek
			)
			onDateChange?.(next.date, range)
		},
		[onDateChange, firstDayOfWeek, resolveViewSpec]
	)

	const selectDate = useCallback(
		(date: Dayjs) => {
			notifyDateChange(applyNav({ date }))
		},
		[applyNav, notifyDateChange]
	)

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			const { date, view } = latestNav.current
			const spec = resolveViewSpec(view)
			// navigationStep wins; else one navigationUnit; else one day (today's default).
			const step = spec?.navigationStep ?? {
				amount: 1,
				unit: spec?.navigationUnit ?? 'day',
			}
			const nextDate = date.add(direction * step.amount, step.unit)
			notifyDateChange(applyNav({ date: nextDate }))
		},
		[applyNav, notifyDateChange, resolveViewSpec]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(
		() => notifyDateChange(applyNav({ date: dayjs() })),
		[applyNav, notifyDateChange]
	)

	const handleViewChange = useCallback(
		(newView: CalendarView, date?: Dayjs) => {
			const next = applyNav(date ? { view: newView, date } : { view: newView })
			onViewChange?.(newView)
			// View change affects visible range — notify consumers
			notifyDateChange(next)
		},
		[applyNav, onViewChange, notifyDateChange]
	)

	// Raw setter (no onDateChange): funneled through applyNav so the mutation
	// mirror never drifts. Supports functional updaters like React's dispatch.
	const setCurrentDate: React.Dispatch<React.SetStateAction<Dayjs>> =
		useCallback(
			(action) => {
				const nextDate =
					typeof action === 'function' ? action(latestNav.current.date) : action
				applyNav({ date: nextDate })
			},
			[applyNav]
		)

	return useMemo(
		() => ({
			currentDate: navState.date,
			setCurrentDate,
			view: navState.view,
			setView: handleViewChange,
			selectDate,
			nextPeriod,
			prevPeriod,
			today,
			getCurrentViewRange,
			getAllViews,
		}),
		[
			navState,
			setCurrentDate,
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
