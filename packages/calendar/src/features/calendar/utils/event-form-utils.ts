import type { BusinessHours } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { calculateBusinessHoursRange } from '@/features/calendar/utils/business-hours'

/**
 * The form only ever offers hours and minutes, so anything finer that rode in on
 * `date` is not something the user chose. It has to be cleared: `start` is seeded
 * from the calendar's `currentDate`, which comes from `dayjs()` and carries the
 * seconds and milliseconds of page load, while a date picked from the calendar
 * arrives clean. Mixing the two made a midnight-to-next-midnight event 23:59:27
 * long, which `layoutHorizontal` then read as a single-day event because
 * `end.diff(start, 'day')` truncates below 24h (#248).
 */
const atMinute = (date: Date, time: string): Dayjs => {
	const [hours, minutes] = time.split(':').map(Number)
	return dayjs(date).hour(hours).minute(minutes).second(0).millisecond(0)
}

export const buildDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => {
	const base = atMinute(date, time)
	return isAllDay ? base.hour(0).minute(0) : base
}

export const buildEndDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): Dayjs => {
	const base = atMinute(date, time)
	return isAllDay ? base.hour(23).minute(59) : base
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
