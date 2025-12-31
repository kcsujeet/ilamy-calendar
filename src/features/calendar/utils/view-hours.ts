import type { BusinessHours } from '@/components/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { getDayHours } from '@/lib/utils/date-utils'
import { getBusinessHoursForDate } from './business-hours'

interface GetViewHoursOptions {
	referenceDate: dayjs.Dayjs
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	/**
	 * For views with multiple days (like WeekView), we might want to show
	 * the union of all business hours across those days.
	 */
	allDates?: dayjs.Dayjs[]
}

/**
 * Generates the list of hours to display in the calendar view.
 * If hideNonBusinessHours is true, it filters the hours based on businessHours configuration.
 * For multiple dates, it takes the earliest start and latest end across all dates.
 */
export function getViewHours({
	referenceDate,
	businessHours,
	hideNonBusinessHours,
	allDates = [referenceDate],
}: GetViewHoursOptions): dayjs.Dayjs[] {
	const allHours = getDayHours({ referenceDate })

	if (!hideNonBusinessHours || !businessHours) {
		return allHours
	}

	let minStart = 24
	let maxEnd = 0
	let hasBusinessHours = false

	for (const date of allDates) {
		const config = getBusinessHoursForDate(date, businessHours)
		if (config) {
			hasBusinessHours = true
			minStart = Math.min(minStart, config.startTime ?? 9)
			maxEnd = Math.max(maxEnd, config.endTime ?? 17)
		}
	}

	// If no business hours are defined for any of the dates, fallback to full day
	if (!hasBusinessHours) {
		return allHours
	}

	// Return hours within the range [minStart, maxEnd)
	// We use maxEnd for the last hour to ensure we show the full duration of the last business hour
	return allHours.filter((h) => {
		const hour = h.hour()
		return hour >= minStart && hour < maxEnd
	})
}
