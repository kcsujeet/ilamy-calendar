import { DayLabel } from '@ilamy/ui/components/day-label'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import { isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

interface GridCellContentProps {
	day: Dayjs
	showDayNumber: boolean
	children?: React.ReactNode
}

/** The inside of a cell: its day number, if shown, above its contents. */
export const GridCellContent: React.FC<GridCellContentProps> = ({
	day,
	showDayNumber,
	children,
}) => {
	// The narrow cell context, not the full one: a time grid has thousands of
	// these cells, and the full context changes whenever any event does.
	const { eventSpacing } = useCalendarCellContext()

	return (
		<div
			className="flex flex-col h-full w-full"
			data-testid="grid-cell-content"
			style={{ gap: `${eventSpacing}px` }}
		>
			{showDayNumber && (
				<DayLabel
					className="items-start"
					data-testid={keys.dayNumber(day)}
					dayNumber={day.format('D')}
					today={isToday(day)}
				/>
			)}
			{children}
		</div>
	)
}
