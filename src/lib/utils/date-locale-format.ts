import type { Dayjs } from '@/lib/configs/dayjs-config'

export const MONTH_KEYS = [
	'january',
	'february',
	'march',
	'april',
	'may',
	'june',
	'july',
	'august',
	'september',
	'october',
	'november',
	'december',
] as const

export const MONTH_SHORT_KEYS = [
	'jan',
	'feb',
	'mar',
	'apr',
	'mayShort',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec',
] as const

export const WEEKDAY_KEYS = [
	'sunday',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
] as const

// Returns whether the locale typically places the day before the month (e.g. fr-FR).
export const isDayFirstLocale = (
	locale: string,
	referenceDate: Date
): boolean => {
	const parts = new Intl.DateTimeFormat(locale, {
		day: 'numeric',
		month: 'numeric',
	}).formatToParts(referenceDate)
	const dayPartIndex = parts.findIndex((part) => part.type === 'day')
	const monthPartIndex = parts.findIndex((part) => part.type === 'month')

	return (
		dayPartIndex !== -1 &&
		monthPartIndex !== -1 &&
		dayPartIndex < monthPartIndex
	)
}

// Builds the day-view header date string with weekday, month, day, and year in locale order.
export const formatDayViewHeaderDate = ({
	date,
	weekdayLabel,
	monthLabel,
	isDayFirst,
}: {
	date: Dayjs
	weekdayLabel: string
	monthLabel: string
	isDayFirst: boolean
}): string => {
	const day = date.format('D')
	const year = date.format('YYYY')

	if (isDayFirst) {
		return `${weekdayLabel} ${day} ${monthLabel} ${year}`
	}

	return `${weekdayLabel}, ${monthLabel} ${day}, ${year}`
}
