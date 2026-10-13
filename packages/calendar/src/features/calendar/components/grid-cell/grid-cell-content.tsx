import { DayLabel } from '@ilamy/ui/components/day-label'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { useCalendarCellContext } from '@/features/calendar/hooks/use-calendar-cell-context'
import { keys } from '@/features/calendar/utils/keys'
import { isToday } from '@/utils/date-utils'

interface GridCellContentProps {
	day: Dayjs
	showDayNumber: boolean
	/** Shown in line before the day number, so the two never overlap. */
	weekNumber?: number
	children?: React.ReactNode
}

/** The inside of a cell: its day number, if shown, above its contents. */
export const GridCellContent: React.FC<GridCellContentProps> = ({
	day,
	showDayNumber,
	weekNumber,
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
				<div className="flex items-center gap-1">
					{weekNumber !== undefined && (
						<span
							className="pointer-events-none text-[10px] leading-none text-muted-foreground"
							data-testid="week-number"
						>
							{weekNumber}
						</span>
					)}
					<DayLabel
						className="items-start"
						data-testid={keys.dayNumber(day)}
						dayNumber={day.format('D')}
						today={isToday(day)}
					/>
				</div>
			)}
			{children}
		</div>
	)
}
