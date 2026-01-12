import type React from 'react'
import { useMemo } from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { AnimatedSection } from '@/components/animations/animated-section'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

export const ResourceWeekVertical: React.FC = () => {
	const {
		currentDate,
		getVisibleResources,
		firstDayOfWeek,
		currentLocale,
		timeFormat,
		t,
		businessHours,
		hideNonBusinessHours,
	} = useResourceCalendarContext()

	const resources = getVisibleResources()
	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const hours = useMemo(
		() =>
			getViewHours({
				referenceDate: currentDate,
				businessHours,
				hideNonBusinessHours,
				allDates: weekDays,
			}),
		[currentDate, businessHours, hideNonBusinessHours, weekDays]
	)

	const firstCol = useMemo(
		() => ({
			id: 'time-col',
			days: hours,
			day: undefined,
			className:
				'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20',
			gridType: 'hour' as const,
			noEvents: true,
			renderCell: (date: dayjs.Dayjs) => (
				<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
					{Intl.DateTimeFormat(currentLocale, {
						hour: 'numeric',
						hour12: timeFormat === '12-hour',
					}).format(date.toDate())}
				</div>
			),
		}),
		[hours, currentLocale, timeFormat]
	)

	const columns = useMemo(
		() =>
			resources.flatMap((resource) =>
				weekDays.map((day) => ({
					id: `day-col-${day.format('YYYY-MM-DD')}-resource-${resource.id}`,
					resourceId: resource.id,
					resource,
					day,
					days: hours.map((h) =>
						day.hour(h.hour()).minute(0).second(0).millisecond(0)
					),
					gridType: 'hour' as const,
				}))
			),
		[resources, weekDays, hours]
	)
	return (
		<VerticalGrid
			allDayRow={
				<div className="flex">
					<AllDayCell />
					{resources.map((resource) => (
						<AllDayRow
							classes={{ cell: 'min-w-50' }}
							days={weekDays}
							key={`resource-week-allday-row-${resource.id}`}
							resource={resource}
							showSpacer={false}
						/>
					))}
				</div>
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
					{resources.map((resource, index) => {
						const key = `resource-week-header-${resource.id}-day`

						return (
							<AnimatedSection
								className={cn(
									'shrink-0 border-r last:border-r-0 border-b flex items-center text-center font-medium w-[calc(7*var(--spacing)*50)]'
								)}
								delay={index * 0.05}
								key={`${key}-animated`}
								transitionKey={`${key}-motion`}
							>
								<ResourceCell
									className="h-full w-full flex-1"
									resource={resource}
								>
									<div className="sticky left-1/2 text-sm font-medium truncate">
										{resource.title}
									</div>
								</ResourceCell>
							</AnimatedSection>
						)
					})}
				</div>

				{/* Date header row */}
				<div className="flex h-12">
					<div className="shrink-0 w-16 border-r border-b z-20 bg-background sticky left-0">
						<span className="px-2 h-full w-full flex justify-center items-start font-medium">
							{currentDate.week()}
						</span>
					</div>
					{columns.map((col, index) => {
						const day = col.day
						const key = `resource-week-header-${day.toISOString()}-hour-${col.resourceId}`

						return (
							<AnimatedSection
								className={cn(
									'w-50 border-r last:border-r-0 border-b flex flex-col items-center justify-center text-xs shrink-0 bg-background'
								)}
								data-testid={`resource-week-time-label-${day.format('HH')}`}
								delay={index * 0.05}
								key={`${key}-animated`}
								transitionKey={`${key}-motion`}
							>
								<div className="text-sm">{day.format('ddd')}</div>
								<div className="text-xs text-muted-foreground">
									{day.format('M/D')}
								</div>
							</AnimatedSection>
						)
					})}
				</div>
			</div>
		</VerticalGrid>
	)
}
