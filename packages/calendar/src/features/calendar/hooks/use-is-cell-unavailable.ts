import type { BusinessHours } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import { useEffectiveBusinessHours } from '@/features/calendar/hooks/use-effective-business-hours'
import {
	isBusinessDay,
	isBusinessHour,
} from '@/features/calendar/utils/business-hours'

interface BusinessAvailabilityInput {
	day: Dayjs
	gridType: 'day' | 'hour'
	slotDurationMinutes: number
	businessHours: BusinessHours | BusinessHours[] | undefined
}

/**
 * Whether a cell lies outside business hours. Whole-slot containment: an
 * hour-grid slot is business only if it fits entirely inside business hours,
 * so slots partially crossing a sub-hour boundary (e.g. a 9:00 hour cell with
 * a 9:15 start) count as non-business. A day cell is judged by its day.
 */
export const isOutsideBusinessHours = ({
	day,
	gridType,
	slotDurationMinutes,
	businessHours,
}: BusinessAvailabilityInput): boolean => {
	if (gridType === 'hour') {
		const isBusiness = isBusinessHour({
			date: day,
			hour: day.hour(),
			minute: day.minute(),
			durationMinutes: slotDurationMinutes,
			businessHours,
		})
		return !isBusiness
	}
	return !isBusinessDay(day, businessHours)
}

/**
 * Only the month grid pads itself: its first and last rows carry days from
 * the neighbouring months so every week is seven cells wide, and those are
 * context rather than part of the month being edited. Every other grid
 * shows exactly the days it means to, and those days are free to cross a
 * month boundary — the week of 31 March runs into April, and April is not
 * padding there.
 */
export const isPaddingDay = (
	day: Dayjs,
	view: string,
	currentDate: Dayjs
): boolean => view === 'month' && day.month() !== currentDate.month()

interface CellAvailabilityInput {
	day: Dayjs
	gridType: 'day' | 'hour'
	slotDurationMinutes: number
	resourceId?: string | number
}

/**
 * Whether a cell refuses clicks and drops, before any consumer predicate:
 * outside business hours (the whole slot for an hour grid, the day otherwise),
 * or a padding day the month grid shows from the neighbouring month.
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
