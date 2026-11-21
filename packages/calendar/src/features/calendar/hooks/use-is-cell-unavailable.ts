import { isBusinessDay, isBusinessHour } from '@ilamy/core'
import type { BusinessHours } from '@ilamy/types'
import { parseDate, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import { useEffectiveBusinessHours } from '@/features/calendar/hooks/use-effective-business-hours'

interface BusinessAvailabilityInput {
	day: ZonedDate
	gridType: 'day' | 'hour'
	slotDurationMinutes: number
	businessHours: BusinessHours | BusinessHours[] | undefined
}

/** Whether a cell lies outside business hours (used for shading in v4.0). */
const isOutsideBusinessHours = ({
	day,
	gridType,
	slotDurationMinutes,
	businessHours,
}: BusinessAvailabilityInput): boolean => {
	if (gridType === 'hour') {
		const isBusiness = isBusinessHour({
			date: day,
			hour: day.hour,
			minute: day.minute,
			durationMinutes: slotDurationMinutes,
			businessHours,
		})
		return !isBusiness
	}
	return !isBusinessDay(day, businessHours)
}

/** Whether `day` is a month-grid padding day from a neighbouring month. */
const isPaddingDay = (
	day: ZonedDate,
	view: string,
	currentDate: ZonedDate | string
): boolean => {
	if (view !== 'month') {
		return false
	}
	let ref: ZonedDate | undefined
	if (typeof currentDate === 'string') {
		ref = parseDate(currentDate, day.timeZoneId)
	} else {
		ref = currentDate
	}
	if (!ref) {
		return false
	}
	return day.month !== ref.month
}

interface CellAvailabilityInput {
	day: ZonedDate
	gridType: 'day' | 'hour'
	slotDurationMinutes: number
	resourceId?: string | number
}

/**
 * Whether a cell should be visually shaded as non-business or a padding day.
 * In v4.0 (FullCalendar standard), shading no longer refuses clicks, drops,
 * resizes, or drag-to-create; enforcement is opt-in via `eventConstraint` /
 * `selectConstraint` or `isCellDisabled`.
 */
export const useIsCellUnavailable = ({
	day,
	gridType,
	slotDurationMinutes,
	resourceId,
}: CellAvailabilityInput): boolean => {
	const { currentDate, view } = useCalendarCellContext()
	const effectiveBusinessHours = useEffectiveBusinessHours(resourceId)

	const isClosed = useMemo(
		() =>
			isOutsideBusinessHours({
				day,
				gridType,
				slotDurationMinutes,
				businessHours: effectiveBusinessHours,
			}),
		[gridType, day, slotDurationMinutes, effectiveBusinessHours]
	)

	return isClosed || isPaddingDay(day, view, currentDate)
}
