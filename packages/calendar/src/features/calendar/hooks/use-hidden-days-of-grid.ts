import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

/**
 * The hidden weekdays a grid's events layer must respect. Day-resolution grids
 * hide whole day columns; hour grids never do.
 */
export const useHiddenDaysOfGrid = (gridType: 'day' | 'hour') => {
	const hiddenDays = useSmartCalendarContext((c) => c.hiddenDays)
	const isHourGrid = gridType === 'hour'
	return isHourGrid ? undefined : hiddenDays
}
