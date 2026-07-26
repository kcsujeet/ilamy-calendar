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
}

export const TimeHeaderRow: React.FC<TimeHeaderRowProps> = ({
	hours,
	view,
}) => (
	<div className={cn('flex gap-px bg-border border-b', HEADER_ROW_HEIGHT)}>
		{hours.map((col, index) => {
			const isNowHour = col.isSame(dayjs(), 'hour')
			const hourStr = col.format('HH')
			const key = keys.header.week.hour(col, index)
			return (
				<div
					className={cn(
						RESOURCE_CELL_WIDTH,
						'bg-background flex items-center justify-center text-xs shrink-0',
						isNowHour && 'bg-blue-50 text-blue-600 font-medium'
					)}
					data-hour={hourStr}
					data-testid={keys.header.resource.timeLabel(view, hourStr)}
					key={key}
				>
					{/* `HourLabel` renders bare text, so the animated wrapper has to
					    carry the centering the cell used to apply directly. */}
					<AnimatedSection className="text-center" transitionKey={key}>
						<HourLabel date={col} />
					</AnimatedSection>
				</div>
			)
		})}
	</div>
)
