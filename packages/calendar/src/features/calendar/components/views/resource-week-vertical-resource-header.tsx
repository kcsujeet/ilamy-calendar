import type { Resource } from '@ilamy/types'
import type React from 'react'
import { ResourceCell } from '@/components/resource-cell'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
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
