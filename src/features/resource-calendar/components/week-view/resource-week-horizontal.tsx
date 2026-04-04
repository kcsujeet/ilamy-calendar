import type React from 'react'
import { useMemo, useRef } from 'react'
import type { BusinessHours } from '@/components/types'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { classes } from '@/lib/constants'
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

	const allVisibleResources = getVisibleResources()
	// Stabilize the array reference — getVisibleResources() returns a new array
	// on every call even when the contents haven't changed.
	const resourcesRef = useRef(allVisibleResources)
	const prevIds = resourcesRef.current.map((r) => r.id).join(',')
	const nextIds = allVisibleResources.map((r) => r.id).join(',')
	if (prevIds !== nextIds) {
		resourcesRef.current = allVisibleResources
	}
	const resources = resourcesRef.current

	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	// Resource-specific business hours combined
	const resourceBusinessHours = useMemo(
		() =>
			resources.map((r) => r.businessHours).filter(Boolean) as (
				| BusinessHours
				| BusinessHours[]
			)[],
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
			<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
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
									isToday && 'bg-blue-50 text-blue-600'
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
											classes.headerAnimation
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

				{/* Time header row */}
				<div className="flex h-12 border-b">
					{weekHours.flat().map((col) => {
						const isNowHour = col.isSame(dayjs(), 'hour')

						return (
							<div
								className={cn(
									'min-w-20 flex-1 border-r flex items-center justify-center text-xs shrink-0',
									isNowHour && 'bg-blue-50 text-blue-600 font-medium'
								)}
								data-testid={`resource-week-time-label-${col.format('HH')}`}
								key={`resource-week-header-${col.toISOString()}`}
							>
								{col.format(timeFormat === '12-hour' ? 'h A' : 'H')}
							</div>
						)
					})}
				</div>
			</div>
		</ResourceEventGrid>
	)
}
