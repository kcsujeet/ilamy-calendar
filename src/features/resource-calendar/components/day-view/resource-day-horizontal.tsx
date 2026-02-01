import type React from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

export const ResourceDayHorizontal: React.FC = () => {
	const {
		currentDate,
		t,
		currentLocale,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
	} = useSmartCalendarContext()

	// Generate time columns (hourly slots)
	const dayHours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
	})

	return (
		<ResourceEventGrid
			classes={{
				header: 'min-w-full',
				body: 'min-w-full',
				cell: 'min-w-20 flex-1',
			}}
			days={dayHours}
			gridType="hour"
		>
			<div className="w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
				<div className="text-sm">{t('resources')}</div>
			</div>

			<div className="flex-1 flex flex-col">
				{/* Time header row */}
				<div className="flex h-12">
					{dayHours.map((col, index) => {
						const isNowHour = col.isSame(dayjs(), 'hour')
						const key = `resource-day-header-${col.toISOString()}`

						return (
							<AnimatedSection
								className={cn(
									'min-w-20 flex-1 border-b border-r last:border-r-0 flex items-center justify-center text-xs shrink-0',
									isNowHour && 'bg-blue-50 text-blue-600 font-medium'
								)}
								data-testid={`resource-day-time-label-${col.format('HH')}`}
								delay={index * 0.05}
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
