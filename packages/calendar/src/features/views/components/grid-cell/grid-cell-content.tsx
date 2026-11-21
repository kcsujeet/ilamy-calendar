import { isToday } from '@ilamy/core'
import { DayLabel } from '@ilamy/ui/components/day-label'
import type { ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { useCalendarCellContext } from '@/hooks/use-calendar-cell-context'
import { keys } from '@/utils/keys.utils'

interface GridCellContentProps {
	day: ZonedDate
	showDayNumber: boolean
	weekNumber?: number
	children?: React.ReactNode
}

export const GridCellContent: React.FC<GridCellContentProps> = ({
	day,
	showDayNumber,
	weekNumber,
	children,
}) => {
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
						dayNumber={String(day.day)}
						today={isToday(day)}
					/>
				</div>
			)}
			{children}
		</div>
	)
}
