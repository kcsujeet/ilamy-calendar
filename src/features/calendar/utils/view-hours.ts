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

	// If no business hours are defined for any of the dates
	if (!hasBusinessHours) {
		if (hideNonBusinessHours) {
			// If hiding non-business hours, try to find a global range from ALL business hours
			if (Array.isArray(businessHours)) {
				for (const config of businessHours) {
					minStart = Math.min(minStart, config.startTime ?? 9)
					maxEnd = Math.max(maxEnd, config.endTime ?? 17)
					hasBusinessHours = true
				}
			} else if (businessHours) {
				minStart = businessHours.startTime ?? 9
				maxEnd = businessHours.endTime ?? 17
				hasBusinessHours = true
			}

			// If still no business hours (though unlikely if businessHours exists), fallback to default
			if (!hasBusinessHours) {
				minStart = 9
				maxEnd = 17
			}
		} else {
			// Not hiding, show full day
			return allHours
		}
	}

	// Return hours within the range [minStart, maxEnd)
	return allHours.filter((h) => {
		const hour = h.hour()
		return hour >= minStart && hour < maxEnd
	})
}
