import type React from 'react'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

export const ResourceWeekHorizontal: React.FC = () => {
	const {
		currentDate,
		firstDayOfWeek,
		t,
		currentLocale,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
	} = useSmartCalendarContext()

	// Generate week days
	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	// Generate time columns (hourly slots)
	const weekHours = useMemo(() => {
		return weekDays.map((day) =>
			getViewHours({
				referenceDate: day,
				businessHours,
				hideNonBusinessHours,
			})
		)
	}, [weekDays, businessHours, hideNonBusinessHours])

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
					{weekDays.map((day, index) => {
						const isToday = day.isSame(dayjs(), 'day')
						const key = `resource-week-header-${day.toISOString()}-day`

						return (
							<AnimatedSection
								className={cn(
									'shrink-0 border-r last:border-r-0 border-b flex-1 flex items-center text-center font-medium',
									isToday && 'bg-blue-50 text-blue-600'
								)}
								data-testid="resource-week-day-header"
								delay={index * 0.05}
								key={`${key}-animated`}
								transitionKey={`${key}-motion`}
							>
								<div className="sticky left-1/2">
									<div className="text-sm">{day.format('ddd')}</div>
									<div className="text-xs text-muted-foreground">
										{day.format('M/D')}
									</div>
								</div>
							</AnimatedSection>
						)
					})}
				</div>

				{/* Time header row */}
				<div className="flex h-12 border-b">
					{weekHours.flat().map((col, index) => {
						const isNowHour = col.isSame(dayjs(), 'hour')
						const key = `resource-week-header-${col.toISOString()}-hour`

						return (
							<AnimatedSection
								className={cn(
									'min-w-20 flex-1 border-r flex items-center justify-center text-xs shrink-0',
									isNowHour && 'bg-blue-50 text-blue-600 font-medium'
								)}
								data-testid={`resource-week-time-label-${col.format('HH')}`}
								delay={index * 0.005}
								key={`${key}-animated`}
								transitionKey={`${key}-motion`}
							>
								{Intl.DateTimeFormat(currentLocale, {
									hour: 'numeric',
									hour12: timeFormat === '12-hour',
								}).format(col.toDate())}
							</AnimatedSection>
						)
					})}
				</div>
			</div>
		</ResourceEventGrid>
	)
}
