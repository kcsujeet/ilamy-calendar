import { getWeekDays, withoutHiddenDays } from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import { formatDate, now, parseDate, resolveZone } from '@ilamy/utils/temporal'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useDateTimeFormatters } from '@/features/calendar/hooks/use-date-time-formatters'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/features/calendar/stores/calendar-theme-context'
import { keys } from '@/features/calendar/utils/keys'

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
		currentLocale,
		timezone,
	} = useSmartCalendarContext()
	const dayHeaderSlot = useSlotProps('dayHeader', {
		structuralClassName:
			'py-2 text-center flex-1 min-w-0 flex items-center justify-center',
		defaultClassName: 'font-medium bg-background',
	})

	const { formatDayHeader } = useDateTimeFormatters()
	const zone = resolveZone(timezone)
	const zonedCurrent = parseDate(currentDate, zone) ?? now(zone)

	const weekDays = withoutHiddenDays(
		getWeekDays(zonedCurrent, firstDayOfWeek),
		hiddenDays
	)

	return (
		<div
			className={cn(
				'flex w-full gap-px bg-border border-b',
				stickyViewHeader && 'sticky top-0 z-20',
				viewHeaderClassName,
				className
			)}
			data-testid="month-header"
		>
			{weekDays.map((weekDay) => {
				const name = formatDate(weekDay, { weekday: 'short' }, currentLocale)
				const testName = formatDate(weekDay, { weekday: 'short' }, 'en')
				const label = formatDayHeader(weekDay)

				return (
					<div
						className={dayHeaderSlot.className}
						data-testid={keys.header.weekday('month', testName)}
						key={name}
						style={dayHeaderSlot.style}
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
