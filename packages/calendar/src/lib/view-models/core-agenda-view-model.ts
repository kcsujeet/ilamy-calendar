import type { CalendarEvent } from '../../types/calendar.types'
import {
	add,
	dayKey,
	endOf,
	isSameDay,
	isSameOrBefore,
	now,
	overlapsRange,
	parseDate,
	startOf,
	subtract,
	toEpochMs,
	wallClockDiff,
	type ZonedDate,
} from '../../utils/temporal'

export type AgendaWindow = 'day' | 'week' | 'month' | number

type NamedAgendaWindow = Exclude<AgendaWindow, number>

export interface AgendaZonedRange {
	start: ZonedDate
	end: ZonedDate
}

export interface AgendaStep {
	amount: number
	unit: 'day' | 'week' | 'month'
}

export interface AgendaEventEntry {
	event: CalendarEvent
	start: ZonedDate
	end: ZonedDate
	startMs: number
	dayIndex: number
	totalDays: number
	isMultiDay: boolean
	isFirstDay: boolean
	isLastDay: boolean
	isAllDayLabel: boolean
}

export interface AgendaDayGroup {
	key: string
	date: ZonedDate
	isToday: boolean
	nowIndicatorPercent: number | null
	entries: AgendaEventEntry[]
}

export interface AgendaViewModel {
	range: AgendaZonedRange
	groups: AgendaDayGroup[]
}

export interface BuildAgendaViewModelInput {
	currentDate: ZonedDate
	events: CalendarEvent[]
	window: AgendaWindow
	firstDayOfWeek?: number
	timezone: string
	nowIndicator?: boolean
}

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR

const NAMED_RANGE_BUILDERS: Record<
	NamedAgendaWindow,
	(date: ZonedDate, firstDayOfWeek: number) => AgendaZonedRange
> = {
	day: (date) => ({ start: startOf(date, 'day'), end: endOf(date, 'day') }),
	week: (date, firstDayOfWeek) => {
		const start = startOf(date, 'week', firstDayOfWeek)
		return { start, end: endOf(add(start, 6, 'day'), 'day') }
	},
	month: (date) => ({
		start: startOf(date, 'month'),
		end: endOf(date, 'month'),
	}),
}

const NAMED_STEPS: Record<NamedAgendaWindow, AgendaStep> = {
	day: { amount: 1, unit: 'day' },
	week: { amount: 1, unit: 'week' },
	month: { amount: 1, unit: 'month' },
}

/** Resolves the inclusive zoned `[start, end]` range for an agenda window. */
export const resolveAgendaWindowRange = (
	date: ZonedDate,
	window: AgendaWindow,
	firstDayOfWeek = 0
): AgendaZonedRange => {
	if (typeof window === 'number') {
		const days = Math.max(1, window)
		return {
			start: startOf(date, 'day'),
			end: endOf(add(date, days - 1, 'day'), 'day'),
		}
	}
	return NAMED_RANGE_BUILDERS[window](date, firstDayOfWeek)
}

/** Resolves the navigation step matching an agenda window. */
export const resolveAgendaWindowStep = (window: AgendaWindow): AgendaStep => {
	if (typeof window === 'number') {
		return { amount: Math.max(1, window), unit: 'day' }
	}
	return NAMED_STEPS[window]
}

interface ParsedAgendaEvent {
	event: CalendarEvent
	start: ZonedDate
	end: ZonedDate
	startMs: number
}

const sortAgendaEvents = (
	a: ParsedAgendaEvent,
	b: ParsedAgendaEvent
): number => {
	const aRank = a.event.allDay ? 0 : 1
	const bRank = b.event.allDay ? 0 : 1
	if (aRank !== bRank) return aRank - bRank
	return a.startMs - b.startMs
}

const buildAgendaEntry = (
	parsed: ParsedAgendaEvent,
	dayStart: ZonedDate
): AgendaEventEntry => {
	const { event, start, end, startMs } = parsed
	const eventStartDay = startOf(start, 'day')
	const lastCoveredDay = startOf(subtract(end, 1, 'millisecond'), 'day')
	const coveredDayCount =
		Math.round(wallClockDiff(lastCoveredDay, eventStartDay, 'day')) + 1
	const totalDays = Math.max(coveredDayCount, 1)
	const dayIndex = Math.round(wallClockDiff(dayStart, eventStartDay, 'day')) + 1
	const isMultiDay = totalDays > 1
	const isFirstDay = dayIndex === 1
	const isLastDay = dayIndex === totalDays
	const isAllDayLabel =
		Boolean(event.allDay) || (isMultiDay && !isFirstDay && !isLastDay)

	return {
		event,
		start,
		end,
		startMs,
		dayIndex,
		totalDays,
		isMultiDay,
		isFirstDay,
		isLastDay,
		isAllDayLabel,
	}
}

const computeAgendaNowPercent = (
	dayStart: ZonedDate,
	currentNow: ZonedDate,
	nowIndicator?: boolean
): number | null => {
	if (!nowIndicator || !isSameDay(dayStart, currentNow)) return null
	const elapsedMinutes = currentNow.hour * MINUTES_PER_HOUR + currentNow.minute
	return (elapsedMinutes / MINUTES_PER_DAY) * 100
}

/** Builds a framework-agnostic view model grouping events by day for an agenda window. */
export const buildAgendaViewModel = ({
	currentDate,
	events,
	window,
	firstDayOfWeek = 0,
	timezone,
	nowIndicator,
}: BuildAgendaViewModelInput): AgendaViewModel => {
	const range = resolveAgendaWindowRange(currentDate, window, firstDayOfWeek)
	const parsedEvents: ParsedAgendaEvent[] = []

	for (const event of events) {
		const start = parseDate(event.start, timezone)
		const end = parseDate(event.end, timezone)
		if (!start || !end) continue
		parsedEvents.push({ event, start, end, startMs: toEpochMs(start) })
	}

	const currentNow = now(timezone)
	const groups: AgendaDayGroup[] = []
	const lastDay = startOf(range.end, 'day')
	let cursor = startOf(range.start, 'day')

	while (isSameOrBefore(cursor, lastDay, 'day')) {
		const dayStart = startOf(cursor, 'day')
		const dayEnd = endOf(cursor, 'day')
		const dayEvents = parsedEvents
			.filter((entry) => overlapsRange(entry, dayStart, dayEnd))
			.sort(sortAgendaEvents)

		if (dayEvents.length > 0) {
			groups.push({
				key: dayKey(dayStart),
				date: dayStart,
				isToday: isSameDay(dayStart, currentNow),
				nowIndicatorPercent: computeAgendaNowPercent(
					dayStart,
					currentNow,
					nowIndicator
				),
				entries: dayEvents.map((entry) => buildAgendaEntry(entry, dayStart)),
			})
		}

		cursor = startOf(add(cursor, 1, 'day'), 'day')
	}

	return { range, groups }
}
