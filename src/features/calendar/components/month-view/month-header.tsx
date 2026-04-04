import type React from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { classes } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

interface MonthHeaderProps {
	className?: string
}

export const MonthHeader: React.FC<MonthHeaderProps> = ({ className }) => {
	const { firstDayOfWeek, stickyViewHeader, viewHeaderClassName, currentDate } =
		useSmartCalendarContext()

	// Reorder week days based on firstDayOfWeek
	const weekDays = getWeekDays(currentDate, firstDayOfWeek)

	return (
		<div
			className={cn(
				'flex w-full',
				stickyViewHeader && 'sticky top-0 z-20',
				viewHeaderClassName,
				className
			)}
			data-testid="month-header"
		>
			{weekDays.map((weekDay) => (
				<div
					className="py-2 text-center font-medium border-r last:border-r-0 border-b flex-1"
					data-testid={`weekday-header-${weekDay.format('ddd').toLowerCase()}`}
					key={weekDay.toISOString()}
				>
					<span
						className={cn('text-sm capitalize', classes.headerAnimation)}
						key={weekDay.toISOString()}
					>
						{weekDay.format('ddd')}
					</span>
				</div>
			))}
		</div>
	)
}
