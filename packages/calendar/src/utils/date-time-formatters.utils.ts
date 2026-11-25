import type { CalendarEvent, TimeFormat } from '../types/calendar.types'
import { getWeekDays, withoutHiddenDays } from './core-date-grid.utils'
import {
	formatDate,
	formatDateRange as formatTemporalRange,
	isSameDay,
	now,
	parseDate,
	resolveZone,
	withZone,
	type ZonedDate,
} from './temporal'

export interface FormatterOptionsInput {
	view: string
	locale: string
	timezone?: string
	timeFormat?: TimeFormat
	explicitTimeFormat?: TimeFormat
	slotHeaderFormat?: Intl.DateTimeFormatOptions
	eventTimeFormat?: Intl.DateTimeFormatOptions
	dayHeaderFormat?: Intl.DateTimeFormatOptions
	titleFormat?: Intl.DateTimeFormatOptions
	displayEventTime?: boolean
	displayEventEnd?: boolean
}

export interface CalendarFormatters {
	formatDateRange: (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	) => string
	formatSlotHeader: (dateInput: ZonedDate | string) => string
	formatDayHeader: (dateInput: ZonedDate | string) => string
	formatEventTime: (event: CalendarEvent) => string | undefined
	formatTitle: (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	) => string | undefined
}

const DEFAULT_EVENT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
	hour: 'numeric',
	minute: '2-digit',
}

const SHORT_MONTH_DAY: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
}

const FULL_DAY_TITLE: Intl.DateTimeFormatOptions = {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

const SHORT_RANGE_TITLE: Intl.DateTimeFormatOptions = {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
}

const resolveTimeOptions = (
	options: Intl.DateTimeFormatOptions,
	explicitTimeFormat?: TimeFormat
): Intl.DateTimeFormatOptions => {
	const hasExplicitCycle =
		options.hour12 !== undefined || options.hourCycle !== undefined
	if (hasExplicitCycle || !explicitTimeFormat) {
		return options
	}
	return { ...options, hour12: explicitTimeFormat === '12-hour' }
}

const toZoned = (
	value: ZonedDate | string,
	zone: string
): ZonedDate | undefined => {
	if (typeof value === 'string') {
		return parseDate(value, zone)
	}
	return value.timeZoneId === zone ? value : withZone(value, zone)
}

const formatEventTimeSpan = (
	start: ZonedDate,
	end: ZonedDate,
	options: Intl.DateTimeFormatOptions,
	locale: string,
	showsEnd: boolean
): string => {
	if (!showsEnd) {
		return formatDate(start, options, locale)
	}
	if (isSameDay(start, end)) {
		return formatTemporalRange(start, end, options, locale)
	}
	return `${formatDate(start, options, locale)} – ${formatDate(end, options, locale)}`
}

export const createCalendarFormatters = (
	input: FormatterOptionsInput
): CalendarFormatters => {
	const zone = resolveZone(input.timezone)
	const resolvedTimeFormat = input.timeFormat ?? '12-hour'

	const formatDateRange = (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	): string => {
		const start = toZoned(startInput, zone)
		const end = toZoned(endInput, zone)
		if (!start || !end) return ''
		if (start.year === end.year) {
			return formatTemporalRange(start, end, SHORT_MONTH_DAY, input.locale)
		}
		return `${formatDate(start, SHORT_MONTH_DAY, input.locale)} – ${formatDate(end, SHORT_MONTH_DAY, input.locale)}`
	}

	const formatSlotHeader = (dateInput: ZonedDate | string): string => {
		const date = toZoned(dateInput, zone)
		if (!date) return ''
		if (!input.slotHeaderFormat) {
			if (resolvedTimeFormat === '24-hour') {
				return String(date.hour)
			}
			const hour12 = date.hour % 12 === 0 ? 12 : date.hour % 12
			const period = date.hour < 12 ? 'AM' : 'PM'
			return `${hour12} ${period}`
		}
		return formatDate(
			date,
			resolveTimeOptions(input.slotHeaderFormat, input.explicitTimeFormat),
			input.locale
		)
	}

	const formatDayHeader = (dateInput: ZonedDate | string): string => {
		const date = toZoned(dateInput, zone)
		if (!date) return ''
		return formatDate(
			date,
			input.dayHeaderFormat ?? { weekday: 'short' },
			input.locale
		)
	}

	const formatEventTime = (event: CalendarEvent): string | undefined => {
		if (input.displayEventTime === false || event.allDay) {
			return undefined
		}
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (!start || !end) return undefined
		const opts = resolveTimeOptions(
			input.eventTimeFormat ?? DEFAULT_EVENT_TIME_FORMAT,
			input.explicitTimeFormat
		)
		const showsEnd = input.displayEventEnd ?? input.view !== 'month'
		return formatEventTimeSpan(start, end, opts, input.locale, showsEnd)
	}

	const formatTitle = (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	): string | undefined => {
		if (!input.titleFormat) return undefined
		const start = toZoned(startInput, zone)
		const end = toZoned(endInput, zone)
		if (!start || !end) return undefined
		return formatTemporalRange(start, end, input.titleFormat, input.locale)
	}

	return {
		formatDateRange,
		formatSlotHeader,
		formatDayHeader,
		formatEventTime,
		formatTitle,
	}
}

interface TitleFormatParams {
	currentDateIso: string
	visibleRange: { start: string; end: string }
	view: string
	firstDayOfWeek: number
	hiddenDays: Set<number> | undefined
	timezone: string
	locale: string
	hasResources?: boolean
	formatters: CalendarFormatters
}

const formatWeekHeaderTitle = (
	current: ZonedDate,
	params: TitleFormatParams
): string => {
	const rawDays = getWeekDays(current, params.firstDayOfWeek)
	const days = params.hasResources
		? withoutHiddenDays(rawDays, params.hiddenDays)
		: rawDays
	const first = days.at(0) ?? current
	const last = days.at(-1) ?? current
	return (
		params.formatters.formatTitle(first, last) ??
		formatTemporalRange(first, last, SHORT_RANGE_TITLE, params.locale)
	)
}

export const formatCalendarHeaderTitle = (
	params: TitleFormatParams
): string => {
	const current =
		parseDate(params.currentDateIso, params.timezone) ?? now(params.timezone)
	const handlers: Record<string, () => string> = {
		year: () => formatDate(current, { year: 'numeric' }, params.locale),
		day: () =>
			params.formatters.formatTitle(current, current) ??
			formatDate(current, FULL_DAY_TITLE, params.locale),
		week: () => formatWeekHeaderTitle(current, params),
	}
	const formatter = handlers[params.view]
	if (formatter) return formatter()
	return formatDate(current, { month: 'short', year: 'numeric' }, params.locale)
}
