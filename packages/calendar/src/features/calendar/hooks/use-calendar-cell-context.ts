import { useContext } from 'react'
import {
	CalendarCellContext,
	type CalendarCellContextType,
} from '@/features/calendar/contexts/calendar-cell-context/calendar-cell-context'

/**
 * Internal hook for grid cells: the narrow context a cell draws from, so a
 * change elsewhere in the calendar (an event moving) does not re-render the
 * thousands of cells in a time grid. See CalendarCellContextType.
 */
export const useCalendarCellContext = (): CalendarCellContextType => {
	const context = useContext(CalendarCellContext)

	if (!context) {
		throw new Error(
			'useCalendarCellContext must be used within a CalendarProvider'
		)
	}

	return context
}
