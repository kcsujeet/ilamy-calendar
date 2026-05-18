import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'

interface TimeHeaderRowProps {
	hours: Dayjs[]
	view: 'week' | 'day'
	// Per-item animation delay. Callers pass different step values depending on
	// the list length (e.g. 0.005 for a week of hours, 0.05 for a single day).
	delayStep: number
}

export const TimeHeaderRow: React.FC<TimeHeaderRowProps> = ({
	hours,
	view,
	delayStep,
}) => (
	<div className="flex h-12 border-b">
		{hours.map((col, index) => {
			const isNowHour = col.isSame(dayjs(), 'hour')
			const hourStr = col.format('HH')
			const key = keys.header.week.hour(col, index)
			return (
				<AnimatedSection
					className={cn(
						'min-w-20 flex-1 border-r last:border-r-0 flex items-center justify-center text-xs shrink-0',
						isNowHour && 'bg-blue-50 text-blue-600 font-medium'
					)}
					data-hour={hourStr}
					data-testid={keys.header.resource.timeLabel(view, hourStr)}
					delay={index * delayStep}
					key={keys.listKey(key, 'animated')}
					transitionKey={keys.listKey(key, 'motion')}
				>
					<HourLabel date={col} />
				</AnimatedSection>
			)
		})}
	</div>
)
