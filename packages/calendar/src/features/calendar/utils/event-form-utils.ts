import type { BusinessHours } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { calculateBusinessHoursRange } from '@/features/calendar/utils/business-hours'
import { atTimeOfDay } from '@/utils/date-utils'

/**
 * `time` on the calendar day `date` falls on, built from a zoneless wall-clock
 * string, which dayjs anchors in the calendar's zone on parse.
 *
 * The `.hour()` and `.minute()` setters hold the clock face but keep the UTC
 * offset of `date`, so on a day the clocks change a `date` from before the
 * change saved an instant an hour off: 9:00 became 10:00, midnight became 23:00
 * the day before. A string re-derives the offset for the target time. A time
 * the clocks skip is read with the offset in effect before the gap, and a
 * repeated one is its first occurrence, as RFC 5545 section 3.3.5 says, so
 * 02:30 on a spring-forward day is 03:30.
 *
 * The form only ever offers hours and minutes, so anything finer that rode in on
 * `date` is not something the user chose. It has to be cleared: `start` is seeded
 * from the calendar's `currentDate`, which comes from `dayjs()` and carries the
 * seconds and milliseconds of page load, while a date picked from the calendar
 * arrives clean. Mixing the two made a midnight-to-next-midnight event 23:59:27
 * long, which `layoutHorizontal` then read as a single-day event because
 * `end.diff(start, 'day')` truncates below 24h (#248).
 */
const atTime = (date: Date, time: string): Dayjs =>
	atTimeOfDay(dayjs(date), `${time}:00.000`)

const MIDNIGHT = '00:00'

export const buildDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => atTime(date, isAllDay ? MIDNIGHT : time)

/**
 * `date` is the LAST day an all-day event covers, which is what the picker shows
 * the user. It is stored as the following midnight, because `end` is exclusive
 * (#248): RFC 5545 calls DTEND "the non-inclusive end of the event", and the
 * Google Calendar API documents `end` the same way. `event-form` converts back
 * for display.
 */
export const buildEndDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => {
	if (!isAllDay) {
		return atTime(date, time)
	}
	// `startOf('day')` re-anchors after `add`, which keeps the receiver's offset.
	return atTime(date, MIDNIGHT).add(1, 'day').startOf('day')
}

export const getTimeConstraints = (
	date: Date,
	businessHours?: BusinessHours | BusinessHours[]
) => {
	if (!businessHours) return { min: '00:00', max: '23:59' }

	const dayjsDate = dayjs(date)

	const { minStart, maxEnd, hasBusinessHours } = calculateBusinessHoursRange({
		allDates: [dayjsDate],
		businessHours,
		hideNonBusinessHours: false,
	})

	if (!hasBusinessHours) {
		return { min: '00:00', max: '23:59' }
	}

	return {
		min: `${minStart.toString().padStart(2, '0')}:00`,
		max: `${(maxEnd - 1).toString().padStart(2, '0')}:45`,
	}
}
