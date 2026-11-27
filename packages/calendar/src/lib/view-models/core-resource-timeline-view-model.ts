import type {
	BusinessHours,
	CalendarEvent,
	Resource,
} from '../../types/calendar.types'
import {
	getMonthDays,
	getWeekDays,
	withoutHiddenDays,
} from '../../utils/core-date-grid.utils'
import { getResourceEvents } from '../../utils/core-resource-filter.utils'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '../../utils/core-view-hours.utils'
import {
	add,
	isSameDay,
	now,
	startOf,
	withTime,
	type ZonedDate,
} from '../../utils/temporal'
import { MS_PER_HOUR, wallClockMs } from '../layout/core-layout-columns.utils'
import {
	type HorizontalLayoutResult,
	layoutHorizontal,
} from '../layout/core-layout-horizontal.utils'

export type TimelineGranularity = 'hourly' | 'daily'

export interface HourlyTimelineBar {
	event: CalendarEvent
	leftPercent: number
	widthPercent: number
	lane: number
}

export interface ResourceTimelineRowViewModel {
	resource: Resource
	events: CalendarEvent[]
	hourlyBars: HourlyTimelineBar[]
	hourlyLayout: HorizontalLayoutResult | undefined
	dailyLayout: HorizontalLayoutResult | undefined
}

export interface ResourceTimelineViewModel {
	granularity: TimelineGranularity
	days: ZonedDate[]
	hours: ZonedDate[]
	hourSlots: ZonedDate[]
	rangeStartMs: number
	rangeEndMs: number
	nowIndicatorPercent: number | null
	rows: ResourceTimelineRowViewModel[]
}

export interface BuildResourceTimelineViewModelInput {
	mode: 'day' | 'week' | 'month'
	currentDate: ZonedDate
	events: CalendarEvent[]
	resources: Resource[]
	firstDayOfWeek: number
	timezone: string
	hiddenDays?: Set<number>
	dayMaxEvents?: number
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	slotMinTime?: string
	slotMaxTime?: string
	weekViewGranularity?: TimelineGranularity
	nowIndicator?: boolean
}

const DEFAULT_DAY_MAX_EVENTS = 4

/** Resolves whether a resource timeline mode renders hourly slots or daily columns. */
export const resolveTimelineGranularity = (
	mode: 'day' | 'week' | 'month',
	weekViewGranularity?: TimelineGranularity
): TimelineGranularity => {
	if (mode === 'day') return 'hourly'
	if (mode === 'month') return 'daily'
	if (weekViewGranularity === 'daily') return 'daily'
	return 'hourly'
}

const resolveTimelineDays = (
	mode: 'day' | 'week' | 'month',
	currentDate: ZonedDate,
	firstDayOfWeek: number,
	hiddenDays?: Set<number>
): ZonedDate[] => {
	let rawDays: ZonedDate[]
	if (mode === 'day') {
		rawDays = [currentDate]
	} else if (mode === 'week') {
		rawDays = getWeekDays(currentDate, firstDayOfWeek)
	} else {
		rawDays = getMonthDays(currentDate)
	}
	const visible = withoutHiddenDays(rawDays, hiddenDays)
	return visible.length > 0 ? visible : [currentDate]
}

const resolveRangeBounds = (
	granularity: TimelineGranularity,
	hourSlots: ZonedDate[],
	days: ZonedDate[]
): { rangeStartMs: number; rangeEndMs: number } => {
	if (granularity === 'hourly') {
		const firstSlot = hourSlots.at(0)
		const lastSlot = hourSlots.at(-1)
		if (!firstSlot || !lastSlot) return { rangeStartMs: 0, rangeEndMs: 0 }
		return {
			rangeStartMs: firstSlot.epochMilliseconds,
			rangeEndMs: add(lastSlot, 1, 'hour').epochMilliseconds,
		}
	}
	const firstDay = days.at(0)
	const lastDay = days.at(-1)
	if (!firstDay || !lastDay) return { rangeStartMs: 0, rangeEndMs: 0 }
	return {
		rangeStartMs: startOf(firstDay, 'day').epochMilliseconds,
		rangeEndMs: add(startOf(lastDay, 'day'), 1, 'day').epochMilliseconds,
	}
}

const computeTimelineNowPercent = (
	granularity: TimelineGranularity,
	hourSlots: ZonedDate[],
	days: ZonedDate[],
	timezone: string,
	nowIndicator?: boolean
): number | null => {
	if (!nowIndicator) return null
	const currentNow = now(timezone)
	if (granularity === 'hourly') {
		if (hourSlots.length === 0) return null
		const nowClock = wallClockMs(currentNow)
		const slotIdx = hourSlots.findIndex((slot) => {
			const slotClock = wallClockMs(slot)
			return nowClock >= slotClock && nowClock < slotClock + MS_PER_HOUR
		})
		const matchedSlot = slotIdx >= 0 ? hourSlots.at(slotIdx) : undefined
		if (!matchedSlot) return null
		const fraction = (nowClock - wallClockMs(matchedSlot)) / MS_PER_HOUR
		return ((slotIdx + fraction) / hourSlots.length) * 100
	}
	if (days.length === 0) return null
	const dayIdx = days.findIndex((day) => isSameDay(day, currentNow))
	const matchedDay = dayIdx >= 0 ? days.at(dayIdx) : undefined
	if (!matchedDay) return null
	const dayStartMs = startOf(matchedDay, 'day').epochMilliseconds
	const dayEndMs = add(startOf(matchedDay, 'day'), 1, 'day').epochMilliseconds
	const fraction =
		(currentNow.epochMilliseconds - dayStartMs) /
		Math.max(1, dayEndMs - dayStartMs)
	return ((dayIdx + fraction) / days.length) * 100
}

/** Builds a framework-agnostic view model for horizontal resource timelines. */
export const buildResourceTimelineViewModel = ({
	mode,
	currentDate,
	events,
	resources,
	firstDayOfWeek,
	timezone,
	hiddenDays,
	dayMaxEvents = DEFAULT_DAY_MAX_EVENTS,
	businessHours,
	hideNonBusinessHours,
	slotMinTime,
	slotMaxTime,
	weekViewGranularity,
	nowIndicator,
}: BuildResourceTimelineViewModelInput): ResourceTimelineViewModel => {
	const granularity = resolveTimelineGranularity(mode, weekViewGranularity)
	const days = resolveTimelineDays(
		mode,
		currentDate,
		firstDayOfWeek,
		hiddenDays
	)

	let hours: ZonedDate[] = []
	const hourSlots: ZonedDate[] = []
	if (granularity === 'hourly') {
		hours = getViewHours({
			referenceDate: days.at(0) ?? currentDate,
			businessHours,
			resourceBusinessHours: collectResourceBusinessHours(resources),
			hideNonBusinessHours,
			slotMinTime,
			slotMaxTime,
			allDates: days,
		})
		for (const day of days) {
			for (const hour of hours) {
				hourSlots.push(withTime(day, { hour: hour.hour, minute: 0, second: 0 }))
			}
		}
	}

	const { rangeStartMs, rangeEndMs } = resolveRangeBounds(
		granularity,
		hourSlots,
		days
	)
	const nowIndicatorPercent = computeTimelineNowPercent(
		granularity,
		hourSlots,
		days,
		timezone,
		nowIndicator
	)

	const rows = resources.map((resource): ResourceTimelineRowViewModel => {
		const resEvents = getResourceEvents(events, resource.id)
		if (granularity === 'hourly') {
			const hourlyLayout = layoutHorizontal({
				events: resEvents,
				days: hourSlots,
				dayMaxEvents,
				gridType: 'hour',
			})
			const hourlyBars: HourlyTimelineBar[] = hourlyLayout.positionedEvents.map(
				(pos) => ({
					event: pos.event,
					leftPercent: pos.left,
					widthPercent: pos.width,
					lane: pos.row,
				})
			)
			return {
				resource,
				events: resEvents,
				hourlyBars,
				hourlyLayout,
				dailyLayout: undefined,
			}
		}
		return {
			resource,
			events: resEvents,
			hourlyBars: [],
			hourlyLayout: undefined,
			dailyLayout: layoutHorizontal({
				events: resEvents,
				days,
				dayMaxEvents,
			}),
		}
	})

	return {
		granularity,
		days,
		hours,
		hourSlots,
		rangeStartMs,
		rangeEndMs,
		nowIndicatorPercent,
		rows,
	}
}
