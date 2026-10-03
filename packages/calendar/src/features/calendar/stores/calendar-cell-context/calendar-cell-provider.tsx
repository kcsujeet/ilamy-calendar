import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarCellContext } from './calendar-cell-context'

interface CalendarCellProviderProps {
	children: ReactNode
}

/**
 * Provides the cell subset of the calendar context, rebuilt only when one of
 * its fields changes. Rendered by CalendarProvider, inside CalendarContext.
 */
export const CalendarCellProvider: FC<CalendarCellProviderProps> = ({
	children,
}) => {
	const {
		currentDate,
		view,
		eventSpacing,
		businessHours,
		getResourceById,
		onCellClick,
		isCellDisabled,
		getCellClassName,
		disableDragAndDrop,
		disableCellClick,
		classesOverride,
	} = useSmartCalendarContext()

	const cellContextValue = useMemo(
		() => ({
			currentDate,
			view,
			eventSpacing,
			businessHours,
			getResourceById,
			onCellClick,
			isCellDisabled,
			getCellClassName,
			disableDragAndDrop,
			disableCellClick,
			classesOverride,
		}),
		[
			currentDate,
			view,
			eventSpacing,
			businessHours,
			getResourceById,
			onCellClick,
			isCellDisabled,
			getCellClassName,
			disableDragAndDrop,
			disableCellClick,
			classesOverride,
		]
	)

	return (
		<CalendarCellContext.Provider value={cellContextValue}>
			{children}
		</CalendarCellContext.Provider>
	)
}
