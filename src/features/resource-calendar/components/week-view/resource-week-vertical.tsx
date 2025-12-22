import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useMemo } from 'react'
import { AllDayCell } from '@/components/all-day-row/all-day-cell'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { ResourceCell } from '@/components/resource-cell'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getDayHours, getWeekDays } from '@/lib/utils/date-utils'

export const ResourceWeekVertical: React.FC = () => {
	const {
		currentDate,
		getVisibleResources,
		firstDayOfWeek,
		currentLocale,
		timeFormat,
		t,
	} = useResourceCalendarContext()

	const resources = getVisibleResources()
	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const firstCol = useMemo(
		() => ({
			id: 'time-col',
			days: getDayHours({ referenceDate: currentDate }),
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
		[currentDate, currentLocale, timeFormat]
	)

	const columns = useMemo(
		() =>
			resources.flatMap((resource) =>
				weekDays.map((day) => ({
					id: `day-col-${day.format('YYYY-MM-DD')}-resource-${resource.id}`,
					resourceId: resource.id,
					day,
					days: getDayHours({ referenceDate: day }),
					gridType: 'hour' as const,
				}))
			),
		[resources, weekDays]
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
			<div className="flex-1 border-b border-r flex flex-col">
				{/* Day header row */}
				<div className="flex h-12 border-b">
					<div className="shrink-0 w-16 border-r z-20 bg-background sticky left-0" />
					{resources.map((resource, index) => {
						const key = `resource-week-header-${resource.id}-day`

						return (
							<AnimatePresence key={`${key}-presence`} mode="wait">
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									className={cn(
										'shrink-0 border-r flex items-center text-center font-medium w-[calc(7*var(--spacing)*50)]'
									)}
									exit={{ opacity: 0, y: -10 }}
									initial={{ opacity: 0, y: -10 }}
									key={`${key}-motion`}
									transition={{
										duration: 0.25,
										ease: 'easeInOut',
										delay: index * 0.05,
									}}
								>
									<ResourceCell className="h-full" resource={resource}>
										<div className="sticky left-1/2 text-sm font-medium truncate">
											{resource.title}
										</div>
									</ResourceCell>
								</motion.div>
							</AnimatePresence>
						)
					})}
				</div>

				{/* Date header row */}
				<div className="flex h-12 border-b">
					<div className="shrink-0 w-16 border-r z-20 bg-background sticky left-0" />
					{columns.map((col, index) => {
						const day = col.day
						const key = `resource-week-header-${day.toISOString()}-hour-${col.resourceId}`

						return (
							<AnimatePresence key={`${key}-presence`} mode="wait">
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									className={cn(
										'w-50 border-r flex flex-col items-center justify-center text-xs shrink-0'
									)}
									data-testid={`resource-week-time-label-${day.format('HH')}`}
									exit={{ opacity: 0, y: -10 }}
									initial={{ opacity: 0, y: -10 }}
									key={`${key}-motion`}
									transition={{
										duration: 0.25,
										ease: 'easeInOut',
										delay: index * 0.05,
									}}
								>
									<div className="text-sm">{day.format('ddd')}</div>
									<div className="text-xs text-muted-foreground">
										{day.format('M/D')}
									</div>
								</motion.div>
							</AnimatePresence>
						)
					})}
				</div>
			</div>
		</VerticalGrid>
	)
}
