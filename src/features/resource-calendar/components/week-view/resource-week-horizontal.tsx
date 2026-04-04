import type React from 'react'
import { useMemo } from 'react'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { TimeHeaderRow } from '@/features/resource-calendar/components/shared'
import {
	getResourceBusinessHours,
	useStableResources,
} from '@/features/resource-calendar/hooks/use-stable-resources'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import {
	HEADER_ANIMATION,
	RESOURCE_CORNER,
	TODAY_HIGHLIGHT,
} from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

export const ResourceWeekHorizontal: React.FC = () => {
	const {
		currentDate,
		firstDayOfWeek,
		t,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
		getVisibleResources,
	} = useSmartCalendarContext()

	const resources = useStableResources(getVisibleResources())

	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	// Resource-specific business hours combined
	const resourceBusinessHours = useMemo(
		() => getResourceBusinessHours(resources),
		[resources]
	)

	// Generate time columns (hourly slots)
	const weekHours = useMemo(() => {
		return weekDays.map((day) =>
			getViewHours({
				referenceDate: day,
				businessHours,
				hideNonBusinessHours,
				resourceBusinessHours,
			})
		)
	}, [weekDays, businessHours, hideNonBusinessHours, resourceBusinessHours])

	return (
		<ResourceEventGrid
			classes={{
				header: 'h-24 min-w-full',
				body: 'min-w-full',
				cell: 'min-w-20 flex-1',
			}}
			days={weekHours}
			gridType="hour"
		>
			<div className={RESOURCE_CORNER}>
				<div className="text-sm">{t('resources')}</div>
			</div>

			<div className="flex-1 flex flex-col">
				{/* Day header row */}
				<div className="flex h-12">
					{weekDays.map((day) => {
						const isToday = day.isSame(dayjs(), 'day')

						return (
							<div
								className={cn(
									'shrink-0 border-r last:border-r-0 border-b flex-1 flex items-center text-center font-medium',
									isToday && TODAY_HIGHLIGHT
								)}
								data-testid="resource-week-day-header"
								key={`resource-week-header-${day.toISOString()}-day`}
							>
								<div className="sticky left-1/2">
									<div className={'text-sm'} key={day.toISOString()}>
										{day.format('ddd')}
									</div>
									<div
										className={cn(
											'text-xs text-muted-foreground',
											HEADER_ANIMATION
										)}
										key={`${day.toISOString()}-date`}
									>
										{day.format('M/D')}
									</div>
								</div>
							</div>
						)
					})}
				</div>

				<TimeHeaderRow
					className="border-b"
					hours={weekHours.flat()}
					testIdPrefix="resource-week"
					timeFormat={timeFormat}
				/>
			</div>
		</ResourceEventGrid>
	)
}
