import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface ResourceWeekHorizontalDayHeaderProps {
	days: Dayjs[]
}

export const ResourceWeekHorizontalDayHeader: React.FC<
	ResourceWeekHorizontalDayHeaderProps
> = ({ days }) => {
	const { weekViewGranularity } = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'

	return (
		<div className="flex h-12">
			{days.map((day, index) => {
				const isToday = day.isSame(dayjs(), 'day')
				const key = `resource-week-header-${day.toISOString()}-day`

				return (
					<AnimatedSection
						className={cn(
							'shrink-0 border-r last:border-r-0 border-b flex-1 flex items-center text-center font-medium min-w-20',
							isToday && 'bg-blue-50 text-blue-600'
						)}
						data-testid="resource-week-day-header"
						delay={index * 0.05}
						key={`${key}-animated`}
						transitionKey={`${key}-motion`}
					>
						<div
							className={cn(
								isHourly ? 'sticky left-1/2' : 'w-full text-center'
							)}
						>
							<div className="text-sm">{day.format('ddd')}</div>
							<div className="text-xs text-muted-foreground">
								{day.format('M/D')}
							</div>
						</div>
					</AnimatedSection>
				)
			})}
		</div>
	)
}
