import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
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
			{weekDays.map((weekDay, index) => (
				<AnimatedSection
					className="py-2 text-center font-medium border-r last:border-r-0 border-b flex-1"
					data-testid={`weekday-header-${weekDay.format('ddd').toLowerCase()}`}
					delay={index * 0.05}
					key={weekDay.toISOString()}
					transitionKey={weekDay.toISOString()}
				>
					<span className="text-sm capitalize">{weekDay.format('ddd')}</span>
				</AnimatedSection>
			))}
		</div>
	)
}
