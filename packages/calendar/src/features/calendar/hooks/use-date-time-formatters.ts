import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { isSameDay } from '@ilamy/utils/helpers'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

/** What an event bar shows when `displayEventTime` is on and no format is set. */
const DEFAULT_EVENT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
	hour: 'numeric',
	minute: '2-digit',
}

// Building an Intl.DateTimeFormat costs about 100 times what formatting with
// one does, and a grid asks for one per cell on every render.
const formatterCache = new Map<string, Intl.DateTimeFormat>()

const getFormatter = (
	locale: string,
	timeZone: string | undefined,
	options: Intl.DateTimeFormatOptions
) => {
	const cacheKey = JSON.stringify([locale, timeZone, options])
	const cachedFormatter = formatterCache.get(cacheKey)
	if (cachedFormatter) {
		return cachedFormatter
	}
	const formatter = new Intl.DateTimeFormat(locale, { ...options, timeZone })
	formatterCache.set(cacheKey, formatter)
	return formatter
}

export function useDateTimeFormatters() {
	const {
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

	const createFormatter = (options: Intl.DateTimeFormatOptions) =>
		getFormatter(currentLocale, timezone, options)

	// A time format that leaves 12/24 hour open follows a `timeFormat` the
	// consumer passed; without one the locale decides, as plain Intl does.
	const createTimeFormatter = (options: Intl.DateTimeFormatOptions) => {
		const hasHour12 = options.hour12 !== undefined
		const hasHourCycle = options.hourCycle !== undefined
		const choosesHourCycle = hasHour12 || hasHourCycle
		if (choosesHourCycle || !explicitTimeFormat) {
			return createFormatter(options)
		}
		return createFormatter({
			...options,
			hour12: explicitTimeFormat === '12-hour',
		})
	}

	const formatDateRange = (start: Dayjs, end: Dayjs) => {
		const formatter = createFormatter({ month: 'short', day: 'numeric' })
		// `formatRange` shows whichever fields distinguish the two dates, so a
		// week spanning two years renders the year on BOTH ends ("Dec 30, 2026 –
		// Jan 5, 2027"), which wraps the header. A cross-year week always spans two
		// different months, so dropping the year stays unambiguous ("Dec 30 – Jan
		// 5"). Same-year ranges keep `formatRange`'s concise collapsing.
		if (start.year() === end.year()) {
			return formatter.formatRange(start.toDate(), end.toDate())
		}
		return `${formatter.format(start.toDate())} – ${formatter.format(end.toDate())}`
	}

	const formatSlotHeader = (date: Dayjs) => {
		if (!slotHeaderFormat) {
			return date.format(timeFormat === '12-hour' ? 'h A' : 'H')
		}
		return createTimeFormatter(slotHeaderFormat).format(date.toDate())
	}

	const formatDayHeader = (date: Dayjs) => {
		if (!dayHeaderFormat) {
			return date.format('ddd')
		}
		return createFormatter(dayHeaderFormat).format(date.toDate())
	}

	/** The time text of an event bar, or undefined when the bar shows none. */
	const formatEventTime = (event: CalendarEvent) => {
		const showsTime = displayEventTime ?? Boolean(eventTimeFormat)
		if (!showsTime || event.allDay) {
			return undefined
		}
		const formatter = createTimeFormatter(
			eventTimeFormat ?? DEFAULT_EVENT_TIME_FORMAT
		)
		const startDate = event.start.toDate()
		const endDate = event.end.toDate()
		if (!displayEventEnd) {
			return formatter.format(startDate)
		}
		const endsOnSameDay = isSameDay(event.start, event.end)
		if (endsOnSameDay) {
			// The locale's own range ("15:00–15:30 Uhr"), times only.
			return formatter.formatRange(startDate, endDate)
		}
		// `formatRange` would add the dates of an event that ends on another day,
		// and the bar shows times only: write start and end apart.
		return `${formatter.format(startDate)} – ${formatter.format(endDate)}`
	}

	/** The toolbar title, or undefined when the built-in one stays. */
	const formatTitle = (start: Dayjs, end: Dayjs) => {
		if (!titleFormat) {
			return undefined
		}
		return createFormatter(titleFormat).formatRange(
			start.toDate(),
			end.toDate()
		)
	}

	return {
		formatDateRange,
		formatSlotHeader,
		formatDayHeader,
		formatEventTime,
		formatTitle,
	}
}
