import type { CalendarEvent } from '@ilamy/types'
import {
	formatDate,
	formatDateRange as formatTemporalRange,
	isSameDay,
	parseDate,
	resolveZone,
	withZone,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

const DEFAULT_EVENT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
	hour: 'numeric',
	minute: '2-digit',
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

export function useDateTimeFormatters() {
	const {
		view,
		currentLocale,
		timezone,
		timeFormat,
		explicitTimeFormat,
		slotHeaderFormat,
		eventTimeFormat,
		displayEventTime,
		displayEventEnd,
		dayHeaderFormat,
		titleFormat,
	} = useSmartCalendarContext((ctx) => ({
		view: ctx.view,
		currentLocale: ctx.currentLocale,
		timezone: ctx.timezone,
		timeFormat: ctx.timeFormat,
		explicitTimeFormat: ctx.explicitTimeFormat,
		slotHeaderFormat: ctx.slotHeaderFormat,
		eventTimeFormat: ctx.eventTimeFormat,
		displayEventTime: ctx.displayEventTime,
		displayEventEnd: ctx.displayEventEnd,
		dayHeaderFormat: ctx.dayHeaderFormat,
		titleFormat: ctx.titleFormat,
	}))

	const zone = resolveZone(timezone)

	const toZoned = (value: ZonedDate | string): ZonedDate | undefined => {
		if (typeof value === 'string') {
			return parseDate(value, zone)
		}
		return value.timeZoneId === zone ? value : withZone(value, zone)
	}

	const resolveTimeOptions = (
		options: Intl.DateTimeFormatOptions
	): Intl.DateTimeFormatOptions => {
		const hasExplicitCycle =
			options.hour12 !== undefined || options.hourCycle !== undefined
		if (hasExplicitCycle || !explicitTimeFormat) {
			return options
		}
		return { ...options, hour12: explicitTimeFormat === '12-hour' }
	}

	const formatDateRange = (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	): string => {
		const start = toZoned(startInput)
		const end = toZoned(endInput)
		if (!start || !end) return ''
		const options: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
		}
		if (start.year === end.year) {
			return formatTemporalRange(start, end, options, currentLocale)
		}
		return `${formatDate(start, options, currentLocale)} – ${formatDate(end, options, currentLocale)}`
	}

	const formatSlotHeader = (dateInput: ZonedDate | string): string => {
		const date = toZoned(dateInput)
		if (!date) return ''
		if (!slotHeaderFormat) {
			if (timeFormat === '24-hour') {
				return String(date.hour)
			}
			const hour12 = date.hour % 12 === 0 ? 12 : date.hour % 12
			const period = date.hour < 12 ? 'AM' : 'PM'
			return `${hour12} ${period}`
		}
		return formatDate(date, resolveTimeOptions(slotHeaderFormat), currentLocale)
	}

	const formatDayHeader = (dateInput: ZonedDate | string): string => {
		const date = toZoned(dateInput)
		if (!date) return ''
		const options: Intl.DateTimeFormatOptions = dayHeaderFormat ?? {
			weekday: 'short',
		}
		return formatDate(date, options, currentLocale)
	}

	/**
	 * Event bar time text, or `undefined` when hidden (D9, FullCalendar):
	 * - `displayEventTime` defaults to `true`.
	 * - `displayEventEnd` defaults to `false` in month view and `true` in
	 *   time-grid (week/day) views.
	 */
	const formatEventTime = (event: CalendarEvent): string | undefined => {
		if (displayEventTime === false || event.allDay) {
			return undefined
		}
		const start = parseDate(event.start, zone)
		const end = parseDate(event.end, zone)
		if (!start || !end) {
			return undefined
		}
		const options = resolveTimeOptions(
			eventTimeFormat ?? DEFAULT_EVENT_TIME_FORMAT
		)
		const showsEnd = displayEventEnd ?? view !== 'month'
		return formatEventTimeSpan(start, end, options, currentLocale, showsEnd)
	}

	const formatTitle = (
		startInput: ZonedDate | string,
		endInput: ZonedDate | string
	): string | undefined => {
		if (!titleFormat) {
			return undefined
		}
		const start = toZoned(startInput)
		const end = toZoned(endInput)
		if (!start || !end) return undefined
		return formatTemporalRange(start, end, titleFormat, currentLocale)
	}

	return {
		formatDateRange,
		formatSlotHeader,
		formatDayHeader,
		formatEventTime,
		formatTitle,
	}
}
