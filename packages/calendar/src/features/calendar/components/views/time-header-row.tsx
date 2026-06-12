import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import { HEADER_ROW_HEIGHT } from '@/lib/constants'
import { keys } from '@/lib/utils/keys'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface TimeHeaderRowProps {
	hours: Dayjs[]
	view: 'week' | 'day'
	// Per-item animation delay. Callers pass different step constants depending
	// on the list length (HOUR_STAGGER_DELAY for a week of hours,
	// HEADER_STAGGER_DELAY for a single day).
	delayStep: number
}

export const TimeHeaderRow: React.FC<TimeHeaderRowProps> = ({
	hours,
	view,
	delayStep,
}) => (
	<div className={cn('flex border-b', HEADER_ROW_HEIGHT)}>
		{hours.map((col, index) => {
			const isNowHour = col.isSame(dayjs(), 'hour')
			const hourStr = col.format('HH')
			const key = keys.header.week.hour(col, index)
			return (
				<AnimatedSection
					className={cn(
						RESOURCE_CELL_WIDTH,
						'border-r last:border-r-0 flex items-center justify-center text-xs shrink-0',
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
