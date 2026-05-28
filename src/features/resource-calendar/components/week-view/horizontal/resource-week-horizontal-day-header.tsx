import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

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
				const today = isToday(day)
				const key = keys.header.week.day(day)

				return (
					<AnimatedSection
						className={cn(
							'shrink-0 border-r last:border-r-0 border-b flex-1 flex items-center text-center font-medium min-w-20',
							today && 'bg-primary/10 font-bold'
						)}
						data-testid={keys.header.resource.weekDay}
						delay={index * 0.05}
						key={keys.listKey(key, 'animated')}
						transitionKey={keys.listKey(key, 'motion')}
					>
						<div
							className={cn(
								isHourly ? 'sticky left-1/2' : 'w-full text-center'
							)}
						>
							<div className="text-sm truncate w-full">{day.format('ddd')}</div>
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
