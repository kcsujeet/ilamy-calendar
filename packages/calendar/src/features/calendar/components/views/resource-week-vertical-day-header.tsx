import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/features/calendar/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import { DayHeaderLabel } from './day-header-label'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface ResourceWeekVerticalDayHeaderProps {
	columns: Array<{ day?: Dayjs; resourceId?: string | number }>
	weekNumber: number
}

export const ResourceWeekVerticalDayHeader: React.FC<
	ResourceWeekVerticalDayHeaderProps
> = ({ columns, weekNumber }) => {
	const { weekNumbers } = useSmartCalendarContext()
	const showsWeekNumber = weekNumbers !== false
	const weekNumberText = String(weekNumber)

	return (
		<div className="flex h-12 gap-px bg-border">
			<div
				className={cn(
					'shrink-0 z-20 bg-background sticky left-0',
					GUTTER_WIDTH,
					STICKY_GUTTER_SHADOW
				)}
			>
				{/* Animated like the day labels beside it and the week view's number
				    (week.tsx): a new number fades in on navigation. */}
				{showsWeekNumber && (
					<div className="px-2 h-full w-full flex justify-center items-start">
						<AnimatedSection
							className="font-medium text-center"
							data-testid="week-number"
							transitionKey={weekNumberText}
						>
							{weekNumberText}
						</AnimatedSection>
					</div>
				)}
			</div>
			{columns.map((col, index) => {
				const day = col.day
				if (!day) return null
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
						<DayHeaderLabel animated day={day} />
					</div>
				)
			})}
		</div>
	)
}
