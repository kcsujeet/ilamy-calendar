import type React from 'react'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceAllDaySection } from '@/features/resource-calendar/components/shared'
import { getResourceBusinessHours } from '@/features/resource-calendar/hooks/use-stable-resources'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { createTimeColumn } from '@/lib/utils/create-time-column'
import { getWeekDays } from '@/lib/utils/date-utils'

export const ResourceWeekVertical: React.FC = () => {
	const {
		currentDate,
		getVisibleResources,
		firstDayOfWeek,
		timeFormat,
		t,
		businessHours,
		hideNonBusinessHours,
		hiddenDays,
	} = useSmartCalendarContext()

	const resources = getVisibleResources()
	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const visibleDays = useMemo(
		() =>
			hiddenDays
				? weekDays.filter((day) => !hiddenDays.has(day.day()))
				: weekDays,
		[weekDays, hiddenDays]
	)

	const hours = useMemo(
		() =>
			getViewHours({
				referenceDate: currentDate,
				businessHours,
				hideNonBusinessHours,
				allDates: weekDays,
				resourceBusinessHours: getResourceBusinessHours(resources),
			}),
		[currentDate, businessHours, hideNonBusinessHours, weekDays, resources]
	)

	const firstCol = useMemo(
		() => createTimeColumn(hours, timeFormat),
		[hours, timeFormat]
	)

	const columns = useMemo(
		() =>
			resources.flatMap((resource) =>
				visibleDays.map((day) => ({
					id: `day-col-${day.format('YYYY-MM-DD')}-resource-${resource.id}`,
					resourceId: resource.id,
					resource,
					day,
					days: getViewHours({
						referenceDate: day,
						businessHours,
						hideNonBusinessHours,
						allDates: weekDays,
						resourceBusinessHours: getResourceBusinessHours(resources),
					}),
					gridType: 'hour' as const,
				}))
			),
		[resources, weekDays, businessHours, hideNonBusinessHours, visibleDays.map]
	)

	return (
		<VerticalGrid
			allDayRow={
				<ResourceAllDaySection days={visibleDays} resources={resources} />
			}
			classes={{ header: 'h-24' }}
			columns={[firstCol, ...columns]}
			data-testid="resource-week"
			gridType="hour"
		>
			<div className="flex-1 flex flex-col">
				{/* Resource header row */}
				<div className="flex h-12">
					<div className="shrink-0 w-16 border-r z-20 bg-background sticky left-0">
						<span className="px-2 h-full w-full flex justify-center items-end text-xs text-muted-foreground">
							{t('week')}
						</span>
					</div>
					{resources.map((resource) => (
						<div
							className={cn(
								'shrink-0 border-r last:border-r-0 border-b flex items-center text-center font-medium'
							)}
							key={`resource-week-header-${resource.id}-day`}
							style={{
								width: `calc(${visibleDays.length} * var(--spacing) * 50)`,
							}}
						>
							<ResourceCell
								className="h-full w-full flex-1"
								resource={resource}
							>
								<div className="sticky left-1/2 text-sm font-medium truncate">
									{resource.title}
								</div>
							</ResourceCell>
						</div>
					))}
				</div>

				{/* Date header row */}
				<div className="flex h-12">
					<div className="shrink-0 w-16 border-r border-b z-20 bg-background sticky left-0">
						<AnimatedSection
							className="px-2 h-full w-full flex justify-center items-start font-medium"
							transitionKey={`week-${currentDate.week()}`}
						>
							{currentDate.week()}
						</AnimatedSection>
					</div>
					{columns.map((col) => {
						const day = col.day

						return (
							<div
								className={cn(
									'w-50 border-r last:border-r-0 border-b flex flex-col items-center justify-center text-xs shrink-0 bg-background'
								)}
								data-testid={`resource-week-time-label-${day.format('HH')}`}
								key={`resource-week-header-${day.toISOString()}-hour-${col.resourceId}`}
							>
								<div className={'text-sm'}>{day.format('ddd')}</div>
								<AnimatedSection
									className="text-xs text-muted-foreground"
									transitionKey={`${day.toISOString()}-date`}
								>
									{day.format('M/D')}
								</AnimatedSection>
							</div>
						)
					})}
				</div>
			</div>
		</VerticalGrid>
	)
}
