import type { BusinessHours, WeekDays } from '@/components/types'
import type dayjs from '@/lib/configs/dayjs-config'

const DAY_TO_NUMBER: Record<WeekDays, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
}

/**
 * Finds the appropriate business hours configuration for a given date.
 * If businessHours is an array, finds the first config that includes the date's day of week.
 * If businessHours is a single object, returns it as-is.
 *
 * @param date The date to find business hours for
 * @param businessHours The business hours configuration (single or array)
 * @returns The matching BusinessHours config or undefined if no match found
 */
const getBusinessHoursForDate = (
	date: dayjs.Dayjs,
	businessHours?: BusinessHours | BusinessHours[]
): BusinessHours | undefined => {
	if (!businessHours) {
		return undefined
	}

	// If single object, return it
	if (!Array.isArray(businessHours)) {
		return businessHours
	}

	// If array, find the config that applies to this day
	const dayOfWeek = date.day()
	return businessHours.find((config) => {
		if (!config.daysOfWeek) {
			return false
		}
		return config.daysOfWeek.some((d) => DAY_TO_NUMBER[d] === dayOfWeek)
	})
}

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

	const config = getBusinessHoursForDate(date, businessHours)
	if (!config) {
		return false
	}

	// Check day of week
	if (config.daysOfWeek) {
		return config.daysOfWeek.some((d) => DAY_TO_NUMBER[d] === date.day())
	}

	return true
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
	// First check if it's a business day
	if (!isBusinessDay(date, businessHours)) {
		return false
	}

	// If business hours are not configured, consider everything as "business hours"
	if (!businessHours) {
		return true
	}

	// If hour is not provided, we assume the user only cares about the day
	// Since we already passed isBusinessDay check, we return true
	if (hour === undefined) {
		return true
	}

	const config = getBusinessHoursForDate(date, businessHours)
	if (!config) {
		return false
	}

	// Check time
	// startTime and endTime are numbers (0-24)
	// We treat them as exact hours. e.g. 9 means 09:00.
	const startH = config.startTime ?? 9
	const endH = config.endTime ?? 17

	const currentMinutes = hour * 60 + minute
	const startMinutes = startH * 60
	const endMinutes = endH * 60

	if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
		return false
	}

	return true
}
