import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { getWeekDays } from '@/lib/utils/date-utils'

export function useResourceWeekViewData() {
	const {
		currentDate,
		firstDayOfWeek,
		getVisibleResources,
		weekViewGranularity,
		businessHours,
		hideNonBusinessHours,
		hiddenDays,
	} = useSmartCalendarContext()

	const isHourly = weekViewGranularity === 'hourly'
	const resources = getVisibleResources()

	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const visibleDays = useMemo(
		() =>
			hiddenDays
				? weekDays.filter((day) => !hiddenDays.has(day.day()))
				: weekDays,
		[weekDays, hiddenDays]
	)

	const resourceBusinessHours = useMemo(
		() => resources.flatMap((r) => (r.businessHours ? [r.businessHours] : [])),
		[resources]
	)

	return {
		isHourly,
		resources,
		weekDays,
		visibleDays,
		currentDate,
		businessHours,
		hideNonBusinessHours,
		resourceBusinessHours,
	}
}
