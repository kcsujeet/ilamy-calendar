import type { BusinessHours } from '@/components/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'

/**
 * Checks if a specific date is a business day.
 *
 * @param date The date to check
 * @param businessHours The business hours configuration (single or array)
 * @returns true if the date is a business day, false otherwise
 */
export const isBusinessDay = (
	date: dayjs.Dayjs,
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

export interface IsBusinessHourOptions {
	date: dayjs.Dayjs
	hour?: number
	minute?: number
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
			// Check time against this specific config
			// startTime and endTime are numbers (0-24)
			const startH = config.startTime ?? 9
			const endH = config.endTime ?? 17

			const startMinutes = startH * 60
			const endMinutes = endH * 60

			if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
				isInBusinessHour = true
			}
		},
	})

	return isInBusinessHour
}

/**
 * Helper to process a business hours configuration and update the range.
 */
export const processBusinessHours = (
	bh: BusinessHours | BusinessHours[] | undefined,
	options: {
		date?: dayjs.Dayjs
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

export interface BusinessHoursRange {
	minStart: number
	maxEnd: number
	hasBusinessHours: boolean
}

/**
 * Calculates the union of business hours ranges across multiple dates and/or resource configurations.
 */
export const calculateBusinessHoursRange = (options: {
	allDates: dayjs.Dayjs[]
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
		minStart = Math.min(minStart, config.startTime ?? 9)
		maxEnd = Math.max(maxEnd, config.endTime ?? 17)
	}

	// Process global and resource business hours for each date
	for (const date of allDates) {
		processBusinessHours(businessHours, { date, onMatch })
		for (const rbh of resourceBusinessHours) {
			processBusinessHours(rbh, { date, onMatch })
		}
	}

	// Fallback logic if no business hours found for specific dates
	if (!hasBusinessHours && hideNonBusinessHours) {
		processBusinessHours(businessHours, { onMatch })
		for (const rbh of resourceBusinessHours) {
			processBusinessHours(rbh, { onMatch })
		}

		// Final fallback to default 9-17 if still nothing
		if (!hasBusinessHours) {
			minStart = 9
			maxEnd = 17
			hasBusinessHours = true
		}
	}

	return { minStart, maxEnd, hasBusinessHours }
}
