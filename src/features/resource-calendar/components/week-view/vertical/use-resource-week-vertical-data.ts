import { useCallback, useMemo } from 'react'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { useResourceWeekViewData } from '../use-resource-week-view-data'

export function useResourceWeekVerticalData() {
	const {
		isHourly,
		resources,
		weekDays,
		visibleDays,
		currentDate,
		businessHours,
		hideNonBusinessHours,
		resourceBusinessHours,
	} = useResourceWeekViewData()

	const getHours = useCallback(
		(date: Dayjs) => {
			return getViewHours({
				referenceDate: date,
				businessHours,
				hideNonBusinessHours,
				allDates: weekDays,
				resourceBusinessHours,
			})
		},
		[businessHours, hideNonBusinessHours, weekDays, resourceBusinessHours]
	)

	const hours = useMemo(() => getHours(currentDate), [currentDate, getHours])
	const hourlyColumns = useMemo(
		() =>
			resources.flatMap((resource) =>
				visibleDays.map((day) => ({
					id: `day-col-${day.format('YYYY-MM-DD')}-resource-${resource.id}`,
					resourceId: resource.id,
					resource,
					day,
					days: getHours(day),
					gridType: 'hour' as const,
				}))
			),
		[resources, visibleDays, getHours]
	)

	// Uses `weekDays` (all 7) intentionally, not `visibleDays`. Non-contiguous
	// visible days would break multi-day event positioning, so `hiddenDays` is
	// not supported in daily granularity.
	const dailyColumns = useMemo(
		() =>
			resources.map((resource) => ({
				id: `week-col-resource-${resource.id}`,
				day: undefined,
				resourceId: resource.id,
				resource,
				days: weekDays,
				gridType: 'day' as const,
			})),
		[resources, weekDays]
	)

	const columns = useMemo(() => {
		if (isHourly) return hourlyColumns
		return dailyColumns
	}, [isHourly, hourlyColumns, dailyColumns])

	return { hours, columns }
}
