import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useDateTimeFormatters } from '@/features/calendar/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import { getWeekDays, withoutHiddenDays } from '@/utils/date-utils'

interface MonthHeaderProps {
	className?: string
}

export const MonthHeader: React.FC<MonthHeaderProps> = ({ className }) => {
	const {
		firstDayOfWeek,
		hiddenDays,
		stickyViewHeader,
		viewHeaderClassName,
		currentDate,
	} = useSmartCalendarContext()

	const { formatDayHeader } = useDateTimeFormatters()

	// Reorder week days based on firstDayOfWeek, leaving out the hidden ones
	const weekDays = withoutHiddenDays(
		getWeekDays(currentDate, firstDayOfWeek),
		hiddenDays
	)

	return (
		<div
			className={cn(
				// gap-px + bg-border: weekday separators; border-b: header/body line.
				'flex w-full gap-px bg-border border-b',
				stickyViewHeader && 'sticky top-0 z-20',
				viewHeaderClassName,
				className
			)}
			data-testid="month-header"
		>
			{weekDays.map((weekDay) => {
				// The month grid's weekday row reads the same in every month, so
				// it is keyed by the name it renders rather than by the date that
				// produced it. Keying it by the date remounted all seven cells on
				// every navigation and replayed the fade over unchanged text.
				const name = weekDay.format('ddd')
				const label = formatDayHeader(weekDay)

				return (
					<div
						className="py-2 text-center font-medium bg-background flex-1 min-w-0 flex items-center justify-center"
						data-testid={keys.header.weekday('month', name)}
						key={name}
					>
						<AnimatedSection transitionKey={label}>
							<span className="text-sm capitalize truncate w-full block">
								{label}
							</span>
						</AnimatedSection>
					</div>
				)
			})}
		</div>
	)
}
