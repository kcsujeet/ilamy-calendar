import {
	isValidTimeZone,
	parseDate,
	resolveZone,
	withZone,
	type ZonedDate,
} from './temporal'

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/
const HAS_EXPLICIT_OFFSET = /[+-]\d{2}:\d{2}$/
const UTC_MIDNIGHT = /T00:00:00(?:\.000)?Z$/i

const pad2 = (value: number): string => String(value).padStart(2, '0')
const pad4 = (value: number): string => String(value).padStart(4, '0')

/** Formats a zoned date as RFC 5545 `DATE` (`YYYYMMDD`). */
export const formatICalDateOnly = (date: ZonedDate): string =>
	`${pad4(date.year)}${pad2(date.month)}${pad2(date.day)}`

/** Formats a zoned date as RFC 5545 floating/TZID `DATE-TIME` (`YYYYMMDDTHHMMSS`). */
export const formatICalLocalDateTime = (date: ZonedDate): string =>
	`${formatICalDateOnly(date)}T${pad2(date.hour)}${pad2(date.minute)}${pad2(date.second)}`

/** Formats a zoned date as RFC 5545 UTC `DATE-TIME` (`YYYYMMDDTHHMMSSZ`). */
export const formatICalUtcDateTime = (date: ZonedDate): string =>
	`${formatICalLocalDateTime(withZone(date, 'UTC'))}Z`

/**
 * Formats an all-day date input (`string | Date`) as RFC 5545 `YYYYMMDD`,
 * preserving explicit calendar date prefixes when no target zone is supplied.
 */
export const formatICalAllDayDate = (
	value: string | Date,
	eventZone: string | undefined
): string => {
	if (eventZone) {
		const parsed = parseDate(value, eventZone)
		return parsed ? formatICalDateOnly(parsed) : ''
	}
	if (typeof value === 'string') {
		const match = ISO_DATE_PREFIX.exec(value)
		const hasOwnCalendarDate =
			HAS_EXPLICIT_OFFSET.test(value) ||
			UTC_MIDNIGHT.test(value) ||
			!value.endsWith('Z')
		if (match && hasOwnCalendarDate) {
			return `${match[1]}${match[2]}${match[3]}`
		}
	}
	const parsed = parseDate(value, resolveZone())
	return parsed ? formatICalDateOnly(parsed) : ''
}

/**
 * Returns a valid non-UTC IANA timezone identifier for RFC 5545 `TZID`,
 * or `undefined` when UTC / empty / invalid.
 */
export const resolveICalTzid = (
	timezone: string | undefined
): string | undefined => {
	if (!timezone || timezone.toUpperCase() === 'UTC') {
		return undefined
	}
	return isValidTimeZone(timezone) ? timezone : undefined
}
