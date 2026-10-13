import type { BusinessHours, Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { getDayHours } from '@/utils/date-utils'
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

const MINUTES_PER_DAY = 24 * 60
const SLOT_TIME_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

/**
 * `'HH:mm'` or `'HH:mm:ss'` from `00:00` to `24:00` as minutes, else undefined.
 * Not `toBoundaryMinutes` (business-hours.ts), which falls back silently to a
 * default so the caller cannot tell a bad value, and does not read seconds; nor
 * the form's `atMinute` and the time picker's `split(':')`, which validate
 * nothing.
 */
const parseSlotTime = (value: string): number | undefined => {
	const match = SLOT_TIME_PATTERN.exec(value)
	if (!match) return undefined
	const hours = Number(match[1])
	const minutes = Number(match[2])
	const totalMinutes = hours * 60 + minutes
	const isMinuteOnClock = minutes <= 59
	const isWithinOneDay = totalMinutes <= MINUTES_PER_DAY
	return isMinuteOnClock && isWithinOneDay ? totalMinutes : undefined
}

/**
 * The clock range an hour grid shows, in minutes since midnight; the end is
 * exclusive. An unset bound is the start or end of the day. Any bound that is
 * set but unusable, or an end that is not after the start, makes the whole
 * range the whole day. `invalidProps` names the props that were set to blame.
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

// One warning per window: `getViewHours` runs for every column of every render.
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
	/** First visible time, `'HH:mm'`. Defaults to the start of the day. */
	slotMinTime?: string
	/** End of the visible time, exclusive, `'HH:mm'` up to `'24:00'`. */
	slotMaxTime?: string
}

/**
 * Generates the list of hours to display in the calendar view.
 * `slotMinTime`/`slotMaxTime` narrow the day first; if hideNonBusinessHours is true, the
 * businessHours range then narrows it further (the intersection).
 * For multiple dates, it takes the earliest start and latest end across all dates.
 */
export function getViewHours({
	referenceDate,
	businessHours,
	hideNonBusinessHours,
	allDates = [referenceDate],
	resourceBusinessHours = [],
	slotMinTime,
	slotMaxTime,
}: GetViewHoursOptions): Dayjs[] {
	// Sliced by row index, not by `.hour()`: row N is "the hour labeled N", so a
	// day the clocks change keeps one row per labeled hour (docs/time-grid.md).
	// A sub-hour bound rounds outward, like the business-hours range below.
	const { startMinutes, endMinutes } = parseSlotRange(slotMinTime, slotMaxTime)
	const firstSlotHour = Math.floor(startMinutes / 60)
	const lastSlotHourExclusive = Math.ceil(endMinutes / 60)
	const hours = getDayHours({ referenceDate }).slice(
		firstSlotHour,
		lastSlotHourExclusive
	)

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

	const businessHoursInWindow = hours.filter((h) => {
		const hour = h.hour()
		return hour >= firstVisibleHour && hour < lastVisibleHourExclusive
	})

	// A window the business hours do not reach would leave a blank grid, so the
	// window alone wins. Without a window an empty result is the business
	// hours' own and stays.
	const isNarrowedByWindow = hours.length < 24
	const isWindowEmptiedByBusinessHours =
		isNarrowedByWindow && businessHoursInWindow.length === 0
	if (isWindowEmptiedByBusinessHours) {
		warnEmptyIntersection(slotMinTime, slotMaxTime)
		return hours
	}
	return businessHoursInWindow
}
