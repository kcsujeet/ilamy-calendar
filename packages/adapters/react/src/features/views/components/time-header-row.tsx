import { cn } from '@ilamy/ui/lib/utils'
import { isSameDay, now, type ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CURRENT_HOUR_LABEL_CLASS, HEADER_ROW_HEIGHT } from '@/config/constants'
import { keys } from '@/utils/keys.utils'
import { HourLabel } from './hour-label'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface TimeHeaderRowProps {
	hours: ZonedDate[]
	view: 'week' | 'day'
}

export const TimeHeaderRow: React.FC<TimeHeaderRowProps> = ({
	hours,
	view,
}) => (
	<div className={cn('flex gap-px bg-border border-b', HEADER_ROW_HEIGHT)}>
		{hours.map((col, index) => {
			const currentNow = now(col.timeZoneId)
			const isNowHour =
				isSameDay(col, currentNow) && col.hour === currentNow.hour
			const currentMarker = isNowHour ? 'time' : undefined
			const hourStr = String(col.hour).padStart(2, '0')
			const key = keys.listKey('time-header-hour', hourStr, index)
			return (
				<div
					aria-current={currentMarker}
					className={cn(
						RESOURCE_CELL_WIDTH,
						'bg-background flex items-center justify-center text-xs shrink-0',
						isNowHour && CURRENT_HOUR_LABEL_CLASS
					)}
					data-hour={hourStr}
					data-testid={keys.header.resource.timeLabel(view, hourStr)}
					key={key}
				>
					<AnimatedSection className="text-center" transitionKey={key}>
						<HourLabel date={col} />
					</AnimatedSection>
				</div>
			)
		})}
	</div>
)
