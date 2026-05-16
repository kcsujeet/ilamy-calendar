// Formats a date with the browser Intl API (locale-aware labels and ordering).
export const formatLocaleDate = (
	date: Date,
	locale: string,
	options: Intl.DateTimeFormatOptions
): string => new Intl.DateTimeFormat(locale, options).format(date)

// Formats a date range with Intl when formatRange is available.
export const formatLocaleDateRange = (
	start: Date,
	end: Date,
	locale: string,
	options: Intl.DateTimeFormatOptions
): string => {
	const formatter = new Intl.DateTimeFormat(locale, options)
	if (typeof formatter.formatRange === 'function') {
		return formatter.formatRange(start, end)
	}
	const startLabel = formatter.format(start)
	const endLabel = formatter.format(end)
	return `${startLabel} - ${endLabel}`
}

// Returns a Date on a known Sunday plus dayIndex (0 = Sunday … 6 = Saturday).
export const getDateForWeekdayIndex = (dayIndex: number): Date => {
	const sunday = new Date(2025, 0, 5)
	const date = new Date(sunday)
	date.setDate(sunday.getDate() + dayIndex)
	return date
}

// Formats a weekday label (short or narrow) for a day-of-week index.
export const formatLocaleWeekday = (
	dayIndex: number,
	locale: string,
	style: 'short' | 'narrow' = 'short'
): string =>
	formatLocaleDate(getDateForWeekdayIndex(dayIndex), locale, { weekday: style })

// Returns the first character of the narrow weekday label, uppercased for the locale.
export const formatLocaleWeekdayInitial = (
	dayIndex: number,
	locale: string
): string => {
	const label = formatLocaleWeekday(dayIndex, locale, 'narrow')
	return label.charAt(0).toLocaleUpperCase(locale)
}

// Builds weekday initials reordered to start on firstDayOfWeek (0 = Sunday).
export const getOrderedWeekdayInitials = (
	firstDayOfWeek: number,
	locale: string
): string[] =>
	Array.from({ length: 7 }, (_, index) => {
		const dayIndex = (firstDayOfWeek + index) % 7
		return formatLocaleWeekdayInitial(dayIndex, locale)
	})
