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
	style: 'long' | 'short' | 'narrow' = 'short'
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

// Formats a calendar month name (month is 1–12).
export const formatLocaleMonth = (
	month: number,
	locale: string,
	style: 'long' | 'short' = 'long'
): string =>
	formatLocaleDate(new Date(2025, month - 1, 1), locale, { month: style })

const ON_THE_DAY_WEEKDAY_INDEX: Record<string, number> = {
	MO: 1,
	TU: 2,
	WE: 3,
	TH: 4,
	FR: 5,
	SA: 6,
	SU: 0,
}

// Resolves the label for monthly/yearly "on the" weekday select values.
export const getOnTheDaySelectionLabel = (
	value: string,
	locale: string,
	t: (key: string) => string
): string => {
	if (value === 'DAY') {
		return t('recurrenceDay')
	}
	if (value === 'WEEKDAY') {
		return t('recurrenceWeekday')
	}
	if (value === 'WEEKEND') {
		return t('recurrenceWeekend')
	}
	const dayIndex = ON_THE_DAY_WEEKDAY_INDEX[value]
	if (dayIndex !== undefined) {
		return formatLocaleWeekday(dayIndex, locale, 'long')
	}
	return value
}
