import {
	add,
	now,
	parseDate,
	startOf,
	withTime,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type {
	BusinessHours,
	CalendarEvent,
	Resource,
} from '../core-calendar.types'
import {
	type HorizontalLayoutResult,
	layoutHorizontal,
} from '../layout/core-layout-horizontal.utils'
import {
	getMonthDays,
	getWeekDays,
	withoutHiddenDays,
} from '../utils/core-date-grid.utils'
import { getResourceEvents } from '../utils/core-resource-filter.utils'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '../utils/core-view-hours.utils'

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
const MIN_BAR_WIDTH_PERCENT = 1.5

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

const buildHourlyBarsForResource = (
	events: CalendarEvent[],
	timezone: string,
	rangeStartMs: number,
	rangeEndMs: number
): HourlyTimelineBar[] => {
	const totalMs = Math.max(1, rangeEndMs - rangeStartMs)
	const clampedItems: Array<{
		event: CalendarEvent
		startMs: number
		endMs: number
	}> = []

	for (const event of events) {
		const start = parseDate(event.start, timezone)
		const end = parseDate(event.end, timezone)
		if (!start || !end) continue
		const startMs = Math.max(start.epochMilliseconds, rangeStartMs)
		const endMs = Math.min(end.epochMilliseconds, rangeEndMs)
		if (endMs <= startMs) continue
		clampedItems.push({ event, startMs, endMs })
	}

	clampedItems.sort((a, b) => a.startMs - b.startMs)
	const laneEndMs: number[] = []

	return clampedItems.map(({ event, startMs, endMs }) => {
		let lane = laneEndMs.findIndex((occupiedUntil) => occupiedUntil <= startMs)
		if (lane === -1) {
			lane = laneEndMs.length
			laneEndMs.push(endMs)
		} else {
			laneEndMs[lane] = endMs
		}

		return {
			event,
			leftPercent: ((startMs - rangeStartMs) / totalMs) * 100,
			widthPercent: Math.max(
				((endMs - startMs) / totalMs) * 100,
				MIN_BAR_WIDTH_PERCENT
			),
			lane,
		}
	})
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
	rangeStartMs: number,
	rangeEndMs: number,
	timezone: string,
	nowIndicator?: boolean
): number | null => {
	if (!nowIndicator || rangeEndMs <= rangeStartMs) return null
	const nowMs = now(timezone).epochMilliseconds
	if (nowMs < rangeStartMs || nowMs > rangeEndMs) return null
	return ((nowMs - rangeStartMs) / (rangeEndMs - rangeStartMs)) * 100
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
		rangeStartMs,
		rangeEndMs,
		timezone,
		nowIndicator
	)

	const rows = resources.map((resource): ResourceTimelineRowViewModel => {
		const resEvents = getResourceEvents(events, resource.id)
		if (granularity === 'hourly') {
			return {
				resource,
				events: resEvents,
				hourlyBars: buildHourlyBarsForResource(
					resEvents,
					timezone,
					rangeStartMs,
					rangeEndMs
				),
				dailyLayout: undefined,
			}
		}
		return {
			resource,
			events: resEvents,
			hourlyBars: [],
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
