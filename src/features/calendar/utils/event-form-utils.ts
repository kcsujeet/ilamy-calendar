import type { BusinessHours } from '@/components/types'
import { calculateBusinessHoursRange } from '@/features/calendar/utils/business-hours'
import dayjs from '@/lib/configs/dayjs-config'

export const buildDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): dayjs.Dayjs => {
	const [hours, minutes] = time.split(':').map(Number)
	const base = dayjs(date).hour(hours).minute(minutes)
	return isAllDay ? base.hour(0).minute(0) : base
}

export const buildEndDateTime = (
	date: Date,
	time: string,
	isAllDay: boolean
): dayjs.Dayjs => {
	const [hours, minutes] = time.split(':').map(Number)
	const base = dayjs(date).hour(hours).minute(minutes)
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
