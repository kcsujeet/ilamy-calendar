import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { ResourceCell } from '@/components/resource-cell'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface ResourceWeekVerticalResourceHeaderProps {
	resources: Resource[]
	visibleDays: Dayjs[]
}

export const ResourceWeekVerticalResourceHeader: React.FC<
	ResourceWeekVerticalResourceHeaderProps
> = ({ resources, visibleDays }) => {
	const { weekViewGranularity, t, currentDate } = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'

	return (
		<div className="flex h-12">
			<div className="shrink-0 w-16 border-r z-20 bg-background sticky left-0">
				<span
					className={cn(
						'px-2 h-full w-full flex justify-center text-xs text-muted-foreground',
						isHourly ? 'items-end' : 'items-center border-b'
					)}
				>
					{t('week')}
					{!isHourly && ` ${currentDate.week()}`}
				</span>
			</div>

			{resources.map((resource, index) => {
				const key = `resource-week-header-${resource.id}-day`

				return (
					<AnimatedSection
						className={cn(
							'shrink-0 border-r last:border-r-0 border-b flex items-center text-center font-medium'
						)}
						delay={index * 0.05}
						key={`${key}-animated`}
						style={{
							width: isHourly
								? `calc(${visibleDays.length} * var(--spacing) * 50)`
								: 'calc(var(--spacing) * 50)',
						}}
						transitionKey={`${key}-motion`}
					>
						<ResourceCell className="h-full w-full flex-1" resource={resource}>
							<div
								className={cn(
									'sticky text-sm font-medium truncate',
									isHourly ? 'left-1/2' : 'left-1'
								)}
							>
								{resource.title}
							</div>
						</ResourceCell>
					</AnimatedSection>
				)
			})}
		</div>
	)
}
