import { useRequiredContext } from '@ilamy/ui/hooks/use-required-context'
import {
	CalendarCellContext,
	type CalendarCellContextType,
} from '@/features/calendar/stores/calendar-cell-context/calendar-cell-context'

/**
 * Internal hook for grid cells: the narrow context a cell draws from, so a
 * change elsewhere in the calendar (an event moving) does not re-render the
 * thousands of cells in a time grid. See CalendarCellContextType.
 */
export const useCalendarCellContext = (): CalendarCellContextType =>
	useRequiredContext(
		CalendarCellContext,
		'useCalendarCellContext',
		'CalendarProvider'
	)
