import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedDayLabel } from '@/components/animations/animated-day-label'
import {
	GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
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
		<div className="flex h-12 gap-px bg-border">
			<div
				className={cn(
					'shrink-0 z-20 bg-background sticky left-0',
					GUTTER_WIDTH,
					STICKY_GUTTER_SHADOW
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
				// Keyed by position, not by date: the column heads the same weekday
				// in every week, and only the number inside it changes.
				const key = keys.listKey(
					'resource-week-day',
					col.resourceId ?? '',
					index
				)

				return (
					<div
						className={cn(
							RESOURCE_CELL_WIDTH,
							'flex flex-col items-center justify-center text-xs shrink-0 bg-background'
						)}
						data-testid={keys.header.resource.timeLabel(
							'week',
							day.format('HH')
						)}
						key={key}
					>
						<AnimatedDayLabel
							dayNumber={day.format('D')}
							today={today}
							weekday={day.format('ddd')}
						/>
					</div>
				)
			})}
		</div>
	)
}
