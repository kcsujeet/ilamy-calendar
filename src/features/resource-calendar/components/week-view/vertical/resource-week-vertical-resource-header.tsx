import type React from 'react'
import { ResourceCell } from '@/components/resource-cell'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'

interface ResourceWeekVerticalResourceHeaderProps {
	resources: Resource[]
	visibleDays: Dayjs[]
}

export const ResourceWeekVerticalResourceHeader: React.FC<
	ResourceWeekVerticalResourceHeaderProps
> = ({ resources }) => {
	const { weekViewGranularity, t, currentDate } = useSmartCalendarContext()
	const isHourly = weekViewGranularity === 'hourly'

	return (
		<div className="flex h-12">
			<div className="shrink-0 w-16 border-r z-20 bg-background sticky left-0">
				<span
					className={cn(
						'px-2 h-full w-full flex justify-center text-xs text-muted-foreground items-center text-center border-b'
					)}
				>
					{t('week')}
					{!isHourly && ` ${currentDate.week()}`}
				</span>
			</div>

			{resources.map((resource) => {
				return (
					<ResourceCell
						className="min-w-20 flex-1 border-b"
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
