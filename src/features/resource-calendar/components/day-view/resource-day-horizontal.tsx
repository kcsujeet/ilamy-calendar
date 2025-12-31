import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
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
	} = useResourceCalendarContext()

	// Generate time columns (hourly slots)
	const dayHours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
	})

	return (
		<ResourceEventGrid days={dayHours} gridType="hour">
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
							<AnimatePresence key={`${key}-presence`} mode="wait">
								<motion.div
									animate={{ opacity: 1, y: 0 }}
									className={cn(
										'w-20 border-b border-r last:border-r-0 flex items-center justify-center text-xs shrink-0',
										isNowHour && 'bg-blue-50 text-blue-600 font-medium'
									)}
									data-testid={`resource-day-time-label-${col.format('HH')}`}
									exit={{ opacity: 0, y: -10 }}
									initial={{ opacity: 0, y: -10 }}
									key={`${key}-motion`}
									transition={{
										duration: 0.25,
										ease: 'easeInOut',
										delay: index * 0.05,
									}}
								>
									{Intl.DateTimeFormat(currentLocale, {
										hour: 'numeric',
										hour12: timeFormat === '12-hour',
									}).format(col.toDate())}
								</motion.div>
							</AnimatePresence>
						)
					})}
				</div>
			</div>
		</ResourceEventGrid>
	)
}
