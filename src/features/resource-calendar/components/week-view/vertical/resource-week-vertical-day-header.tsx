import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface ResourceWeekVerticalDayHeaderProps {
	columns: Array<{ day?: Dayjs; resourceId?: string | number }>
}

export const ResourceWeekVerticalDayHeader: React.FC<
	ResourceWeekVerticalDayHeaderProps
> = ({ columns }) => {
	const { currentDate } = useSmartCalendarContext()

	return (
		<div className="flex h-12">
			<div className="shrink-0 w-16 border-r border-b z-20 bg-background sticky left-0">
				<span className="px-2 h-full w-full flex justify-center items-start font-medium">
					{currentDate.week()}
				</span>
			</div>
			{columns.map((col, index) => {
				const day = col.day
				if (!day) return null
				const key = `resource-week-header-${day.toISOString()}-hour-${col.resourceId}`

				return (
					<AnimatedSection
						className={cn(
							'w-50 border-r last:border-r-0 border-b flex flex-col items-center justify-center text-xs shrink-0 bg-background'
						)}
						data-testid={`resource-week-time-label-${day.format('HH')}`}
						delay={index * 0.05}
						key={`${key}-animated`}
						transitionKey={`${key}-motion`}
					>
						<div className="text-sm">{day.format('ddd')}</div>
						<div className="text-xs text-muted-foreground">
							{day.format('M/D')}
						</div>
					</AnimatedSection>
				)
			})}
		</div>
	)
}
