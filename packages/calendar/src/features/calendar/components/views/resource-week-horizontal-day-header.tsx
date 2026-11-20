import { cn } from '@ilamy/ui/lib/utils'
import type { ZonedDate } from '@ilamy/utils/temporal'
import type React from 'react'
import { HEADER_ROW_HEIGHT } from '@/config/constants'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import { DayHeaderLabel } from './day-header-label'

interface ResourceWeekHorizontalDayHeaderProps {
	days: ZonedDate[]
}

export const ResourceWeekHorizontalDayHeader: React.FC<
	ResourceWeekHorizontalDayHeaderProps
> = ({ days }) => {
	const { weekViewGranularity } = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'

	return (
		<div className={cn('flex gap-px bg-border border-b', HEADER_ROW_HEIGHT)}>
			{days.map((day, index) => {
				const key = keys.listKey('resource-week-day', index)

				return (
					<div
						className={cn(
							'shrink-0 bg-background flex-1 flex items-center text-center font-medium min-w-20'
						)}
						data-testid={keys.header.resource.weekDay}
						key={key}
					>
						<DayHeaderLabel
							animated
							className={cn(
								isHourly ? 'sticky left-1/2 px-2' : 'w-full text-center'
							)}
							day={day}
						/>
					</div>
				)
			})}
		</div>
	)
}
