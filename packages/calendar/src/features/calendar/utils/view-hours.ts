import type { BusinessHours, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { getDayHours } from '@/lib/utils/date-utils'
import { calculateBusinessHoursRange } from './business-hours'

/**
 * The ONE derivation of per-resource business hours for `getViewHours`'s
 * `resourceBusinessHours` parameter. Empty input → empty output, which
 * `getViewHours` treats as "no resource config" (regular-calendar behavior).
 */
export function collectResourceBusinessHours(
	resources: Resource[]
): (BusinessHours | BusinessHours[])[] {
	return resources.flatMap((r) => (r.businessHours ? [r.businessHours] : []))
}

interface GetViewHoursOptions {
	referenceDate: Dayjs
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	/**
	 * For views with multiple days (like WeekView), we might want to show
	 * the union of all business hours across those days.
	 */
	allDates?: Dayjs[]
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
}: GetViewHoursOptions): Dayjs[] {
	const hours = getDayHours({ referenceDate })

	const hasBusinessHoursConfig =
		Boolean(businessHours) || resourceBusinessHours.length > 0
	const shouldFilterByBusinessHours =
		hideNonBusinessHours && hasBusinessHoursConfig

	if (!shouldFilterByBusinessHours) return hours

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates,
		businessHours,
		resourceBusinessHours,
		hideNonBusinessHours,
	})

	if (!hasBusinessHours) return hours

	if (minStart >= maxEnd) return []

	// Floor/ceil so hours hosting a sub-hour boundary (e.g. a 9:15 start)
	// stay visible rather than being cut off at the fractional bound.
	const firstVisibleHour = Math.floor(minStart)
	const lastVisibleHourExclusive = Math.ceil(maxEnd)

	return hours.filter((h) => {
		const hour = h.hour()
		return hour >= firstVisibleHour && hour < lastVisibleHourExclusive
	})
}
