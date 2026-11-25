import type {
	BusinessHours,
	CalendarEvent,
	Resource,
} from '../../types/calendar.types'
import {
	getWeekDays,
	isToday,
	withoutHiddenDays,
} from '../../utils/core-date-grid.utils'
import { getResourceEvents } from '../../utils/core-resource-filter.utils'
import {
	collectResourceBusinessHours,
	getViewHours,
} from '../../utils/core-view-hours.utils'
import {
	add,
	formatDate,
	now,
	parseDate,
	startOf,
	wallClockDiff,
	withTime,
	type ZonedDate,
} from '../../utils/temporal'
import type { VerticalPositionedEvent } from '../layout/core-layout-geometry.utils'
import { layoutVertical } from '../layout/core-layout-vertical.utils'

const MINUTES_PER_HOUR = 60
const ALL_DAY_THRESHOLD_HOURS = 24

/** Returns true when an event is explicitly all-day or spans at least 24 wall-clock hours. */
export const isAllDayOrMultiDay = (
	event: CalendarEvent,
	timezone: string
): boolean => {
	if (event.allDay) return true
	const start = parseDate(event.start, timezone)
	const end = parseDate(event.end, timezone)
	if (!start || !end) return false
	return wallClockDiff(end, start, 'hour') >= ALL_DAY_THRESHOLD_HOURS
}

export interface TimeGridColumnViewModel {
	day: ZonedDate
	resource?: Resource
	label: string
	sublabel: string
	isToday: boolean
	allDayEvents: CalendarEvent[]
	timedEvents: CalendarEvent[]
	positionedEvents: VerticalPositionedEvent[]
	nowIndicatorPercent: number | null
}

export interface TimeGridViewModel {
	days: ZonedDate[]
	hours: ZonedDate[]
	columns: TimeGridColumnViewModel[]
}

export interface BuildTimeGridViewModelInput {
	mode: 'day' | 'week'
	currentDate: ZonedDate
	events: CalendarEvent[]
	resources?: Resource[]
	firstDayOfWeek: number
	timezone: string
	locale: string
	hiddenDays?: Set<number>
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	slotMinTime?: string
	slotMaxTime?: string
	nowIndicator?: boolean
}

interface ColumnSeed {
	day: ZonedDate
	resource?: Resource
	label: string
	sublabel: string
	events: CalendarEvent[]
}

const buildColumnSeeds = (
	days: ZonedDate[],
	events: CalendarEvent[],
	resources: Resource[] | undefined,
	locale: string
): ColumnSeed[] => {
	if (!resources || resources.length === 0) {
		return days.map((day) => ({
			day,
			label: formatDate(day, { weekday: 'short' }, locale),
			sublabel: String(day.day),
			events,
		}))
	}

	const seeds: ColumnSeed[] = []
	for (const resource of resources) {
		const resourceEvents = getResourceEvents(events, resource.id)
		for (const day of days) {
			seeds.push({
				day,
				resource,
				label: resource.title,
				sublabel: formatDate(day, { weekday: 'short', day: 'numeric' }, locale),
				events: resourceEvents,
			})
		}
	}
	return seeds
}

const computeNowIndicatorPercent = (
	day: ZonedDate,
	hours: ZonedDate[],
	timezone: string,
	nowIndicator: boolean | undefined
): number | null => {
	if (!nowIndicator || !isToday(day)) return null
	const firstHour = hours.at(0)
	if (!firstHour) return null
	const currentNow = now(timezone)
	const offsetMinutes =
		(currentNow.hour - firstHour.hour) * MINUTES_PER_HOUR + currentNow.minute
	const totalMinutes = hours.length * MINUTES_PER_HOUR
	if (offsetMinutes < 0 || offsetMinutes > totalMinutes) return null
	return (offsetMinutes / totalMinutes) * 100
}

const splitColumnEvents = (
	events: CalendarEvent[],
	day: ZonedDate,
	timezone: string
): { allDayEvents: CalendarEvent[]; timedEvents: CalendarEvent[] } => {
	const dayStartMs = startOf(day, 'day').epochMilliseconds
	const dayEndMs = add(startOf(day, 'day'), 1, 'day').epochMilliseconds
	const allDayEvents: CalendarEvent[] = []
	const timedEvents: CalendarEvent[] = []

	for (const event of events) {
		const start = parseDate(event.start, timezone)
		const end = parseDate(event.end, timezone)
		if (!start || !end) continue
		const overlapsDay =
			start.epochMilliseconds < dayEndMs && end.epochMilliseconds > dayStartMs
		if (!overlapsDay) continue

		if (isAllDayOrMultiDay(event, timezone)) {
			allDayEvents.push(event)
		} else {
			timedEvents.push(event)
		}
	}

	return { allDayEvents, timedEvents }
}

/** Builds a framework-agnostic view model for day or week time grids. */
export const buildTimeGridViewModel = ({
	mode,
	currentDate,
	events,
	resources,
	firstDayOfWeek,
	timezone,
	locale,
	hiddenDays,
	businessHours,
	hideNonBusinessHours,
	slotMinTime,
	slotMaxTime,
	nowIndicator,
}: BuildTimeGridViewModelInput): TimeGridViewModel => {
	const rawDays =
		mode === 'day' ? [currentDate] : getWeekDays(currentDate, firstDayOfWeek)
	const filteredDays = withoutHiddenDays(rawDays, hiddenDays)
	const days = filteredDays.length > 0 ? filteredDays : [currentDate]

	const resourceBusinessHours =
		resources && resources.length > 0
			? collectResourceBusinessHours(resources)
			: []

	const hours = getViewHours({
		referenceDate: days.at(0) ?? currentDate,
		businessHours,
		resourceBusinessHours,
		hideNonBusinessHours,
		slotMinTime,
		slotMaxTime,
		allDates: days,
	})

	const seeds = buildColumnSeeds(days, events, resources, locale)
	const columns = seeds.map((seed): TimeGridColumnViewModel => {
		const { allDayEvents, timedEvents } = splitColumnEvents(
			seed.events,
			seed.day,
			timezone
		)
		const colHours = hours.map((hour) =>
			withTime(seed.day, { hour: hour.hour, minute: 0, second: 0 })
		)
		const positionedEvents = layoutVertical({
			events: timedEvents,
			days: colHours,
			gridType: 'hour',
		})

		return {
			day: seed.day,
			resource: seed.resource,
			label: seed.label,
			sublabel: seed.sublabel,
			isToday: isToday(seed.day),
			allDayEvents,
			timedEvents,
			positionedEvents,
			nowIndicatorPercent: computeNowIndicatorPercent(
				seed.day,
				hours,
				timezone,
				nowIndicator
			),
		}
	})

	return { days, hours, columns }
}
