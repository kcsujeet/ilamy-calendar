import type { BusinessHours } from '@/components/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { getDayHours } from '@/lib/utils/date-utils'
import { calculateBusinessHoursRange } from './business-hours'

interface GetViewHoursOptions {
	referenceDate: dayjs.Dayjs
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	/**
	 * For views with multiple days (like WeekView), we might want to show
	 * the union of all business hours across those days.
	 */
	allDates?: dayjs.Dayjs[]
	/**
	 * Optional additional business hours configurations (e.g., from resources).
	 * These will be merged with the global businessHours when calculating the visible range.
	 */
	resourceBusinessHours?: (BusinessHours | BusinessHours[])[]
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
	resourceBusinessHours = [],
}: GetViewHoursOptions): dayjs.Dayjs[] {
	const allHours = getDayHours({ referenceDate })

	if (
		!hideNonBusinessHours ||
		(!businessHours && resourceBusinessHours.length === 0)
	) {
		return allHours
	}

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates,
		businessHours,
		resourceBusinessHours,
		hideNonBusinessHours,
	})

	if (!hasBusinessHours) {
		return allHours
	}

	// Return hours within the range [minStart, maxEnd)
	return allHours.filter((h) => {
		const hour = h.hour()
		return hour >= minStart && hour < maxEnd
	})
}
