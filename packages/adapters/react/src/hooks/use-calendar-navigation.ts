import { getMonthGridRange, skipHiddenDays } from '@ilamy/core'
import type {
	DateRange,
	IsoDateString,
	PluginView,
	PublicDateInput,
} from '@ilamy/types'
import {
	add,
	now,
	parseDate,
	resolveZone,
	toOffsetIso,
} from '@ilamy/utils/temporal'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { PluginRuntime } from '@/lib/plugins/types'
import type { CalendarView } from '@/types'

const EMPTY_VIEWS: PluginView[] = []

const calculateViewRange = (
	dateIso: IsoDateString,
	viewSpec: PluginView | undefined,
	firstDayOfWeek: number,
	timezone: string | undefined,
	hiddenDays: Set<number> | undefined
): DateRange => {
	const customRange = viewSpec?.range?.(dateIso, {
		firstDayOfWeek,
		timezone,
		hiddenDays,
	})
	if (customRange) {
		return customRange
	}
	const zone = resolveZone(timezone)
	const zoned = parseDate(dateIso, zone) ?? now(zone)
	const { start, end } = getMonthGridRange(zoned, firstDayOfWeek, hiddenDays)
	return { start: toOffsetIso(start), end: toOffsetIso(end) }
}

interface CalendarNavigationParams {
	initialDate: IsoDateString
	initialView: CalendarView
	firstDayOfWeek: number
	timezone?: string
	hiddenDays?: Set<number>
	onDateChange?: (date: IsoDateString, range: DateRange) => void
	onViewChange?: (view: CalendarView) => void
	pluginRuntime: PluginRuntime
	defaultViews?: PluginView[]
}

export interface CalendarNavigationSlice {
	currentDate: IsoDateString
	setCurrentDate: (
		action: PublicDateInput | ((prev: IsoDateString) => PublicDateInput)
	) => void
	view: CalendarView
	setView: (view: CalendarView, date?: PublicDateInput) => void
	selectDate: (date: PublicDateInput) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	getCurrentViewRange: () => DateRange
	getAllViews: () => PluginView[]
}

interface NavState {
	date: IsoDateString
	view: CalendarView
}

const settleOnVisibleDay = (
	nav: NavState,
	timezone: string | undefined,
	hiddenDays: Set<number> | undefined,
	direction: 1 | -1
): NavState => {
	if (nav.view !== 'day' || !hiddenDays) {
		return nav
	}
	const zone = resolveZone(timezone)
	const parsed = parseDate(nav.date, zone) ?? now(zone)
	const visible = skipHiddenDays(parsed, hiddenDays, direction)
	return { ...nav, date: toOffsetIso(visible) }
}

const toDateIsoInZone = (
	input: PublicDateInput,
	timezone: string | undefined
): IsoDateString => {
	const zone = resolveZone(timezone)
	return toOffsetIso(parseDate(input, zone) ?? now(zone))
}

const advanceViewDate = (
	date: IsoDateString,
	spec: PluginView | undefined,
	direction: 1 | -1,
	timezone: string | undefined
): IsoDateString => {
	const step = spec?.navigationStep ?? {
		amount: 1,
		unit: spec?.navigationUnit ?? 'day',
	}
	const zone = resolveZone(timezone)
	const current = parseDate(date, zone) ?? now(zone)
	return toOffsetIso(add(current, direction * step.amount, step.unit))
}

export const useCalendarNavigation = ({
	initialDate,
	initialView,
	firstDayOfWeek,
	timezone,
	hiddenDays,
	onDateChange,
	onViewChange,
	pluginRuntime,
	defaultViews = EMPTY_VIEWS,
}: CalendarNavigationParams): CalendarNavigationSlice => {
	const [navState, setNavState] = useState<NavState>(() =>
		settleOnVisibleDay(
			{ date: initialDate, view: initialView },
			timezone,
			hiddenDays,
			1
		)
	)
	const latestNav = useRef(navState)

	const applyNav = useCallback(
		(partial: Partial<NavState>, direction: 1 | -1 = 1): NavState => {
			const requested = { ...latestNav.current, ...partial }
			const next = settleOnVisibleDay(
				requested,
				timezone,
				hiddenDays,
				direction
			)
			latestNav.current = next
			setNavState(next)
			return next
		},
		[timezone, hiddenDays]
	)

	const getAllViews = useCallback(
		() => [...defaultViews, ...pluginRuntime.getViews()],
		[defaultViews, pluginRuntime]
	)

	const resolveViewSpec = useCallback(
		(name: CalendarView) => getAllViews().find((v) => v.name === name),
		[getAllViews]
	)

	const getCurrentViewRange = useCallback(
		() =>
			calculateViewRange(
				navState.date,
				resolveViewSpec(navState.view),
				firstDayOfWeek,
				timezone,
				hiddenDays
			),
		[navState, firstDayOfWeek, timezone, hiddenDays, resolveViewSpec]
	)

	const notifyDateChange = useCallback(
		(next: NavState) => {
			const range = calculateViewRange(
				next.date,
				resolveViewSpec(next.view),
				firstDayOfWeek,
				timezone,
				hiddenDays
			)
			onDateChange?.(next.date, range)
		},
		[onDateChange, firstDayOfWeek, timezone, hiddenDays, resolveViewSpec]
	)

	const selectDate = useCallback(
		(date: PublicDateInput) => {
			notifyDateChange(applyNav({ date: toDateIsoInZone(date, timezone) }))
		},
		[applyNav, notifyDateChange, timezone]
	)

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			const { date, view } = latestNav.current
			const nextDate = advanceViewDate(
				date,
				resolveViewSpec(view),
				direction,
				timezone
			)
			notifyDateChange(applyNav({ date: nextDate }, direction))
		},
		[applyNav, notifyDateChange, resolveViewSpec, timezone]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(() => {
		const zone = resolveZone(timezone)
		notifyDateChange(applyNav({ date: toOffsetIso(now(zone)) }))
	}, [applyNav, notifyDateChange, timezone])

	const handleViewChange = useCallback(
		(newView: CalendarView, date?: PublicDateInput) => {
			const partial: Partial<NavState> = { view: newView }
			if (date !== undefined) {
				partial.date = toDateIsoInZone(date, timezone)
			}
			const next = applyNav(partial)
			onViewChange?.(newView)
			notifyDateChange(next)
		},
		[applyNav, onViewChange, notifyDateChange, timezone]
	)

	const setCurrentDate = useCallback(
		(action: PublicDateInput | ((prev: IsoDateString) => PublicDateInput)) => {
			let nextDate: PublicDateInput
			if (typeof action === 'function') {
				nextDate = action(latestNav.current.date)
			} else {
				nextDate = action
			}
			applyNav({ date: toDateIsoInZone(nextDate, timezone) })
		},
		[applyNav, timezone]
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
