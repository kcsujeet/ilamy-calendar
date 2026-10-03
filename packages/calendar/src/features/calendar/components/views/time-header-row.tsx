import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { CURRENT_HOUR_LABEL_CLASS, HEADER_ROW_HEIGHT } from '@/config/constants'
import { HourLabel } from '@/features/calendar/components/hour-label'
import { keys } from '@/features/calendar/utils/keys'
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
			const currentMarker = isNowHour ? 'time' : undefined
			const hourStr = col.format('HH')
			// Keyed by the hour it renders. The row shows the same hours whatever
			// day is displayed, so keying it by the date replayed the fade over
			// unchanged labels on every navigation.
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
