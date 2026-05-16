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
