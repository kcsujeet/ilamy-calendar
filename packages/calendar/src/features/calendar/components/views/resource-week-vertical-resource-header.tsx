import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type React from 'react'
import { ResourceCell } from '@/components/resource-cell'
import { GUTTER_WIDTH } from '@/components/vertical-grid/gutter'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { keys } from '@/lib/utils/keys'
import { RESOURCE_CELL_WIDTH } from './resource-axis'

interface ResourceWeekVerticalResourceHeaderProps {
	resources: Resource[]
}

export const ResourceWeekVerticalResourceHeader: React.FC<
	ResourceWeekVerticalResourceHeaderProps
> = ({ resources }) => {
	const { weekViewGranularity, t, currentDate } = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'

	return (
		<div className="flex h-12">
			<div
				className={cn(
					'shrink-0 border-r z-20 bg-background sticky left-0',
					GUTTER_WIDTH
				)}
			>
				<span
					className={cn(
						'px-2 h-full w-full flex flex-col justify-center text-xs text-muted-foreground text-center min-w-0',
						isHourly ? 'justify-end' : 'justify-center border-b'
					)}
				>
					<span className="truncate w-full">{t('week')}</span>
					{!isHourly && (
						<span className="font-medium text-foreground truncate w-full">
							{currentDate.week()}
						</span>
					)}
				</span>
			</div>

			{resources.map((resource) => {
				return (
					<ResourceCell
						className={cn(RESOURCE_CELL_WIDTH, 'border-b')}
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
