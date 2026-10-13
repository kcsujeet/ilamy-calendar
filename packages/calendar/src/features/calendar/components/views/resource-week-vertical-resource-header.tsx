import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { ResourceCell } from '@/features/calendar/components/resource-cell'
import {
	GUTTER_WIDTH,
	STICKY_GUTTER_SHADOW,
} from '@/features/calendar/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/features/calendar/utils/keys'
import { getWeekNumber } from '@/features/calendar/utils/week-number'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface ResourceWeekVerticalResourceHeaderProps {
	resources: Resource[]
}

export const ResourceWeekVerticalResourceHeader: React.FC<
	ResourceWeekVerticalResourceHeaderProps
> = ({ resources }) => {
	const {
		weekViewGranularity,
		t,
		currentDate,
		weekNumbers,
		weekNumberCalculation,
	} = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'
	const showsWeekNumber = weekNumbers !== false
	const weekNumber = getWeekNumber(currentDate, weekNumberCalculation)

	return (
		<div className="flex h-12 gap-px bg-border">
			<div
				className={cn(
					'shrink-0 z-20 bg-background sticky left-0',
					GUTTER_WIDTH,
					STICKY_GUTTER_SHADOW
				)}
			>
				<span
					className={cn(
						'px-2 h-full w-full flex flex-col justify-center text-xs text-muted-foreground text-center min-w-0',
						isHourly ? 'justify-end' : 'justify-center'
					)}
				>
					{showsWeekNumber && (
						<span className="truncate w-full">{t('week')}</span>
					)}
					{showsWeekNumber && !isHourly && (
						<span
							className="font-medium text-foreground truncate w-full"
							data-testid="week-number"
						>
							{weekNumber}
						</span>
					)}
				</span>
			</div>

			{resources.map((resource) => {
				return (
					<ResourceCell
						className={cn(RESOURCE_CELL_WIDTH, 'bg-background border-b')}
						key={keys.listKey('resource-cell', resource.id)}
						resource={resource}
					>
						<div
							className={cn(
								'sticky text-sm font-medium truncate',
								isHourly ? 'left-1/4' : 'left-1'
							)}
						>
							{resource.title}
						</div>
					</ResourceCell>
				)
			})}
		</div>
	)
}
