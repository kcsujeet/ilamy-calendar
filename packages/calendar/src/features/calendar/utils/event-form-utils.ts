import type { BusinessHours } from '@ilamy/types'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { calculateBusinessHoursRange } from '@/features/calendar/utils/business-hours'

/** Combine a date with an `"HH:mm"` time into a single Dayjs. */
export const buildDateTime = (date: Date, time: string): Dayjs => {
	const [hours, minutes] = time.split(':').map(Number)
	return dayjs(date).hour(hours).minute(minutes)
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
