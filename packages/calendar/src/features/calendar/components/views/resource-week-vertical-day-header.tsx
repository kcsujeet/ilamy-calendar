import { DayLabel } from '@ilamy/ui/components/day-label'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { GUTTER_WIDTH } from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface ResourceWeekVerticalDayHeaderProps {
	columns: Array<{ day?: Dayjs; resourceId?: string | number }>
}

export const ResourceWeekVerticalDayHeader: React.FC<
	ResourceWeekVerticalDayHeaderProps
> = ({ columns }) => {
	const { currentDate } = useSmartCalendarContext()

	return (
		<div className="flex h-12">
			<div
				className={cn(
					'shrink-0 border-r border-b z-20 bg-background sticky left-0',
					GUTTER_WIDTH
				)}
			>
				<span className="px-2 h-full w-full flex justify-center items-start font-medium">
					{currentDate.week()}
				</span>
			</div>
			{columns.map((col, index) => {
				const day = col.day
				if (!day) return null
				const today = isToday(day)
				const key = keys.header.week.hour(day, col.resourceId ?? '')

				return (
					<AnimatedSection
						className={cn(
							RESOURCE_CELL_WIDTH,
							'border-r last:border-r-0 border-b flex flex-col items-center justify-center text-xs shrink-0 bg-background'
						)}
						data-testid={keys.header.resource.timeLabel(
							'week',
							day.format('HH')
						)}
						delay={index * HEADER_STAGGER_DELAY}
						key={keys.listKey(key, 'animated')}
						transitionKey={keys.listKey(key, 'motion')}
					>
						<DayLabel
							dayNumber={day.format('D')}
							today={today}
							weekday={day.format('ddd')}
						/>
					</AnimatedSection>
				)
			})}
		</div>
	)
}
