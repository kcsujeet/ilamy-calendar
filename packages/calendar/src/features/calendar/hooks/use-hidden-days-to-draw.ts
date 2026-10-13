import { useEffect, useMemo } from 'react'
import { DAYS_IN_WEEK } from '@/config/constants'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { toHiddenDaysSet } from '@/features/calendar/utils/normalize'
import { warnInDev } from '@/features/calendar/utils/warn-in-dev'

/**
 * The weekdays the calendar hides, resolved from `hiddenDays` and `weekends`.
 * The Set keeps its identity while the hidden values are unchanged: an inline
 * `hiddenDays={['saturday']}` is a new array every render, and a new Set would
 * make every navigation callback that reads it change with it.
 */
export const useHiddenDaysToDraw = (
	hiddenDays: IlamyCalendarProps['hiddenDays'],
	weekends: IlamyCalendarProps['weekends']
) => {
	const hiddenDaysKey = [...(toHiddenDaysSet(hiddenDays, weekends) ?? [])]
		.sort()
		.join(',')
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
	// A calendar with no day to draw is unusable, so the request is dropped.
	return isEveryDayHidden ? undefined : requestedHiddenDays
}
