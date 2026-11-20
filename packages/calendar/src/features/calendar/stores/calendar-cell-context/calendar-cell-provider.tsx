import type { FC, ReactNode } from 'react'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { CalendarCellContext } from './calendar-cell-context'

interface CalendarCellProviderProps {
	children: ReactNode
}

export const CalendarCellProvider: FC<CalendarCellProviderProps> = ({
	children,
}) => {
	const {
		currentDate,
		view,
		timezone,
		eventSpacing,
		businessHours,
		getResourceById,
		onCellClick,
		isCellDisabled,
		getCellClassName,
		disableCellClick,
		classesOverride,
		snapDuration,
	} = useSmartCalendarContext()

	const cellContextValue = useMemo(
		() => ({
			currentDate,
			view,
			timezone,
			eventSpacing,
			businessHours,
			getResourceById,
			onCellClick,
			isCellDisabled,
			getCellClassName,
			disableCellClick,
			classesOverride,
			snapDuration,
		}),
		[
			currentDate,
			view,
			timezone,
			eventSpacing,
			businessHours,
			getResourceById,
			onCellClick,
			isCellDisabled,
			getCellClassName,
			disableCellClick,
			classesOverride,
			snapDuration,
		]
	)

	return (
		<CalendarCellContext.Provider value={cellContextValue}>
			{children}
		</CalendarCellContext.Provider>
	)
}
