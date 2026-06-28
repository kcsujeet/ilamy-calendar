import { DayLabel } from '@ilamy/ui/components/day-label'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { HEADER_ROW_HEIGHT, HEADER_STAGGER_DELAY } from '@/lib/constants'
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
		<div className={cn('flex gap-px bg-border border-b', HEADER_ROW_HEIGHT)}>
			{days.map((day, index) => {
				const today = isToday(day)
				const key = keys.header.week.day(day)

				return (
					<AnimatedSection
						className={cn(
							'shrink-0 bg-background flex-1 flex items-center text-center font-medium min-w-20'
						)}
						data-testid={keys.header.resource.weekDay}
						delay={index * HEADER_STAGGER_DELAY}
						key={keys.listKey(key, 'animated')}
						transitionKey={keys.listKey(key, 'motion')}
					>
						<div
							className={cn(
								isHourly ? 'sticky left-1/2' : 'w-full text-center'
							)}
						>
							<DayLabel
								dayNumber={day.format('D')}
								today={today}
								weekday={day.format('ddd')}
							/>
						</div>
					</AnimatedSection>
				)
			})}
		</div>
	)
}
