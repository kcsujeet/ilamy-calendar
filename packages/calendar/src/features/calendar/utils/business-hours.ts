import type { BusinessHours } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'

/**
 * Checks if a specific date is a business day.
 *
 * @param date The date to check
 * @param businessHours The business hours configuration (single or array)
 * @returns true if the date is a business day, false otherwise
 */
export const isBusinessDay = (
	date: Dayjs,
	businessHours?: BusinessHours | BusinessHours[]
): boolean => {
	if (!businessHours) {
		return true
	}

	let hasMatch = false
	processBusinessHours(businessHours, {
		date,
		onMatch: () => {
			hasMatch = true
		},
	})

	return hasMatch
}

const TIME_STRING_PATTERN = /^(\d{1,2}):(\d{2})$/

/**
 * Normalizes a business-hours boundary to minutes since midnight. Numbers are
 * whole 24-hour values (fractions round to the nearest hour — decimal hours
 * are NOT supported); sub-hour boundaries use 'HH:mm' strings. Malformed
 * strings fall back to the given default hour.
 */
const toBoundaryMinutes = (
	value: number | string | undefined,
	fallbackHours: number
): number => {
	if (typeof value === 'number') {
		return Math.round(value) * 60
	}

	if (typeof value === 'string') {
		const match = value.match(TIME_STRING_PATTERN)
		if (match) {
			const hours = Number(match[1])
			const minutes = Number(match[2])
			const withinDay = hours * 60 + minutes <= 24 * 60
			if (minutes <= 59 && withinDay) {
				return hours * 60 + minutes
			}
		}
	}

	return fallbackHours * 60
}

interface IsBusinessHourOptions {
	date: Dayjs
	hour?: number
	minute?: number
	/**
	 * When set, the check covers the whole slot [hour:minute, +durationMinutes):
	 * the slot counts as business only if it fits entirely inside a config's
	 * range. Without it, the check is a point-in-range test.
	 */
	durationMinutes?: number
	businessHours?: BusinessHours | BusinessHours[]
}

/**
 * Checks if a specific hour on a specific date is within business hours.
 *
 * @param options The options for checking business hours
 * @returns true if the time is within business hours, false otherwise
 */
export const isBusinessHour = ({
	date,
	hour,
	minute = 0,
	durationMinutes,
	businessHours,
}: IsBusinessHourOptions): boolean => {
	// If business hours are not configured, consider everything as "business hours"
	if (!businessHours) {
		return true
	}

	// If hour is not provided, we assume the user only cares about the day
	if (hour === undefined) {
		return isBusinessDay(date, businessHours)
	}

	let isInBusinessHour = false
	const currentMinutes = hour * 60 + minute

	processBusinessHours(businessHours, {
		date,
		onMatch: (config) => {
			const startMinutes = toBoundaryMinutes(config.startTime, 9)
			const endMinutes = toBoundaryMinutes(config.endTime, 17)

			const startsInside = currentMinutes >= startMinutes
			const endsInside = durationMinutes
				? currentMinutes + durationMinutes <= endMinutes
				: currentMinutes < endMinutes

			if (startsInside && endsInside) {
				isInBusinessHour = true
			}
		},
	})

	return isInBusinessHour
}

/**
 * Helper to process a business hours configuration and update the range.
 */
const processBusinessHours = (
	bh: BusinessHours | BusinessHours[] | undefined,
	options: {
		date?: Dayjs
		onMatch: (config: BusinessHours) => void
	}
) => {
	const { date, onMatch } = options
	if (!bh) return

	const configs = Array.isArray(bh) ? bh : [bh]

	for (const config of configs) {
		if (date && config.daysOfWeek) {
			const dayOfWeek = date.day()
			if (
				config.daysOfWeek.some((d) => WEEK_DAYS_NUMBER_MAP[d] === dayOfWeek)
			) {
				onMatch(config)
			}
		} else {
			onMatch(config)
		}
	}
}

interface BusinessHoursRange {
	/** Earliest start across configs, in hours (fractional for sub-hour boundaries). */
	minStart: number
	/** Latest end across configs, in hours (fractional for sub-hour boundaries). */
	maxEnd: number
	hasBusinessHours: boolean
}

/**
 * Calculates the union of business hours ranges across multiple dates and/or resource configurations.
 */
export const calculateBusinessHoursRange = (options: {
	allDates: Dayjs[]
	businessHours?: BusinessHours | BusinessHours[]
	resourceBusinessHours?: (BusinessHours | BusinessHours[])[]
	hideNonBusinessHours?: boolean
}): BusinessHoursRange => {
	const {
		allDates,
		businessHours,
		resourceBusinessHours = [],
		hideNonBusinessHours,
	} = options

	let minStart = 24
	let maxEnd = 0
	let hasBusinessHours = false

	const onMatch = (config: BusinessHours) => {
		hasBusinessHours = true
		minStart = Math.min(minStart, toBoundaryMinutes(config.startTime, 9) / 60)
		maxEnd = Math.max(maxEnd, toBoundaryMinutes(config.endTime, 17) / 60)
	}

	// Invoke processBusinessHours for the global config and every resource
	// config, optionally scoped to a specific date.
	const processAll = (date?: Dayjs) => {
		processBusinessHours(businessHours, { date, onMatch })
		for (const rbh of resourceBusinessHours) {
			processBusinessHours(rbh, { date, onMatch })
		}
	}

	for (const date of allDates) processAll(date)

	// Fallback: retry without date scoping, then default to 9-17 if still empty.
	if (!hasBusinessHours && hideNonBusinessHours) {
		processAll()
		if (!hasBusinessHours) {
			minStart = 9
			maxEnd = 17
			hasBusinessHours = true
		}
	}

	return { minStart, maxEnd, hasBusinessHours }
}
