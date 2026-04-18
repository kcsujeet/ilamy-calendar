import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface ResourceWeekHorizontalTimeHeaderProps {
	hours: Dayjs[]
}

export const ResourceWeekHorizontalTimeHeader: React.FC<
	ResourceWeekHorizontalTimeHeaderProps
> = ({ hours }) => {
	return (
		<div className="flex h-12 border-b">
			{hours.map((col, index) => {
				const isNowHour = col.isSame(dayjs(), 'hour')
				const key = `resource-week-header-${col.toISOString()}-hour-${index}`

				return (
					<AnimatedSection
						className={cn(
							'min-w-20 flex-1 border-r flex items-center justify-center text-xs shrink-0',
							isNowHour && 'bg-blue-50 text-blue-600 font-medium'
						)}
						data-testid={`resource-week-time-label-${col.format('HH')}`}
						delay={index * 0.005}
						key={`${key}-animated`}
						transitionKey={`${key}-motion`}
					>
						<HourLabel date={col} />
					</AnimatedSection>
				)
			})}
		</div>
	)
}
