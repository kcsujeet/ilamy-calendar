import { useMemo } from 'react'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useResourceWeekViewData } from '../use-resource-week-view-data'

export function useResourceWeekHorizontalData() {
	const {
		isHourly,
		weekDays,
		businessHours,
		hideNonBusinessHours,
		resourceBusinessHours,
	} = useResourceWeekViewData()

	const weekHours = useMemo(() => {
		if (!isHourly) return []
		return weekDays.map((day) =>
			getViewHours({
				referenceDate: day,
				businessHours,
				hideNonBusinessHours,
				resourceBusinessHours,
			})
		)
	}, [
		isHourly,
		weekDays,
		businessHours,
		hideNonBusinessHours,
		resourceBusinessHours,
	])

	return { weekHours }
}
