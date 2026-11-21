import { DAYS_IN_WEEK, WEEK_DAYS_NUMBER_MAP } from '@ilamy/core'
import { useEffect, useMemo } from 'react'
import type { IlamyCalendarProps } from '@/types/calendar.types'
import { warnInDev } from '@/utils/warn-in-dev.utils'

export const useHiddenDaysToDraw = (
	hiddenDays: IlamyCalendarProps['hiddenDays'],
	weekends = true
) => {
	const hiddenSet = new Set(
		(hiddenDays ?? []).map((day) => WEEK_DAYS_NUMBER_MAP[day])
	)
	if (!weekends) {
		hiddenSet.add(WEEK_DAYS_NUMBER_MAP.sunday)
		hiddenSet.add(WEEK_DAYS_NUMBER_MAP.saturday)
	}
	const hiddenDaysKey = [...hiddenSet].sort().join(',')
	const requestedHiddenDays = useMemo(
		() =>
			hiddenDaysKey === ''
				? undefined
				: new Set(hiddenDaysKey.split(',').map(Number)),
		[hiddenDaysKey]
	)
	const isEveryDayHidden = requestedHiddenDays?.size === DAYS_IN_WEEK
	useEffect(() => {
		if (isEveryDayHidden) {
			warnInDev(
				'[@ilamy/calendar] `hiddenDays` and `weekends` together hide every day of the week, so they are ignored.'
			)
		}
	}, [isEveryDayHidden])
	return isEveryDayHidden ? undefined : requestedHiddenDays
}
