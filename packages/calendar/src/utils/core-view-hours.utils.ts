import type { BusinessHours, Resource } from '../types/calendar.types'
import { calculateBusinessHoursRange } from './core-business-hours.utils'
import { getDayHours, HOURS_IN_DAY } from './core-date-grid.utils'
import type { ZonedDate } from './temporal'

const MINUTES_PER_HOUR = 60
const MINUTES_PER_DAY = HOURS_IN_DAY * MINUTES_PER_HOUR
const SLOT_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/** Collects per-resource business hours for `getViewHours`. */
export const collectResourceBusinessHours = (
	resources: Resource[]
): (BusinessHours | BusinessHours[])[] =>
	resources.flatMap((resource) =>
		resource.businessHours ? [resource.businessHours] : []
	)

const parseSlotTime = (value: string): number | undefined => {
	const match = SLOT_TIME_PATTERN.exec(value)
	if (!match) return undefined
	const hours = Number(match[1])
	const minutes = Number(match[2])
	const totalMinutes = hours * MINUTES_PER_HOUR + minutes
	const isMinuteOnClock = minutes <= 59
	const isWithinOneDay = totalMinutes <= MINUTES_PER_DAY
	return isMinuteOnClock && isWithinOneDay ? totalMinutes : undefined
}

/**
 * Parses `slotMinTime` and `slotMaxTime` into minutes since midnight.
 * Invalid bounds or an end not after start fall back to `[0, 1440)`.
 */
export const parseSlotRange = (
	slotMinTime?: string,
	slotMaxTime?: string
): { startMinutes: number; endMinutes: number; invalidProps: string[] } => {
	const startMinutes = parseSlotTime(slotMinTime ?? '00:00')
	const endMinutes = parseSlotTime(slotMaxTime ?? '24:00')
	const areBothBoundsValid =
		startMinutes !== undefined && endMinutes !== undefined
	const isSlotRangeUsable = areBothBoundsValid && endMinutes > startMinutes
	if (isSlotRangeUsable) {
		return { startMinutes, endMinutes, invalidProps: [] }
	}
	const invalidProps: string[] = []
	if (slotMinTime !== undefined) invalidProps.push('slotMinTime')
	if (slotMaxTime !== undefined) invalidProps.push('slotMaxTime')
	return { startMinutes: 0, endMinutes: MINUTES_PER_DAY, invalidProps }
}

const warnedEmptyIntersections = new Set<string>()

const warnEmptyIntersection = (
	slotMinTime: string | undefined,
	slotMaxTime: string | undefined
) => {
	const windowKey = `${slotMinTime}-${slotMaxTime}`
	if (warnedEmptyIntersections.has(windowKey)) return
	warnedEmptyIntersections.add(windowKey)
	console.warn(
		`[@ilamy/calendar] The business hours do not overlap slotMinTime/slotMaxTime (${windowKey}), so \`hideNonBusinessHours\` is ignored and the whole slotMinTime-slotMaxTime window is shown.`
	)
}

export interface GetViewHoursOptions {
	referenceDate: ZonedDate
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	allDates?: ZonedDate[]
	resourceBusinessHours?: (BusinessHours | BusinessHours[])[]
	slotMinTime?: string
	slotMaxTime?: string
}

/** Generates the visible hourly slots for a time grid. */
export const getViewHours = ({
	referenceDate,
	businessHours,
	hideNonBusinessHours,
	allDates = [referenceDate],
	resourceBusinessHours = [],
	slotMinTime,
	slotMaxTime,
}: GetViewHoursOptions): ZonedDate[] => {
	const { startMinutes, endMinutes } = parseSlotRange(slotMinTime, slotMaxTime)
	const firstSlotHour = Math.floor(startMinutes / MINUTES_PER_HOUR)
	const lastSlotHourExclusive = Math.ceil(endMinutes / MINUTES_PER_HOUR)
	const hours = getDayHours({ referenceDate }).slice(
		firstSlotHour,
		lastSlotHourExclusive
	)

	const hasBusinessHoursConfig =
		Boolean(businessHours) || resourceBusinessHours.length > 0
	const shouldFilterByBusinessHours =
		Boolean(hideNonBusinessHours) && hasBusinessHoursConfig

	if (!shouldFilterByBusinessHours) return hours

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates,
		businessHours,
		resourceBusinessHours,
		hideNonBusinessHours,
	})

	if (!hasBusinessHours) return hours
	if (minStart >= maxEnd) return []

	const firstVisibleHour = Math.floor(minStart)
	const lastVisibleHourExclusive = Math.ceil(maxEnd)

	const businessHoursInWindow = hours.filter(
		(slot) =>
			slot.hour >= firstVisibleHour && slot.hour < lastVisibleHourExclusive
	)

	const isNarrowedByWindow = hours.length < HOURS_IN_DAY
	const isWindowEmptiedByBusinessHours =
		isNarrowedByWindow && businessHoursInWindow.length === 0
	if (isWindowEmptiedByBusinessHours) {
		warnEmptyIntersection(slotMinTime, slotMaxTime)
		return hours
	}
	return businessHoursInWindow
}
