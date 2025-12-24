import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'
import { ids } from '@/lib/utils/ids'

interface MonthHeaderProps {
	className?: string
}

export const MonthHeader: React.FC<MonthHeaderProps> = ({ className }) => {
	const { firstDayOfWeek, stickyViewHeader, viewHeaderClassName, currentDate } =
		useCalendarContext()

	// Reorder week days based on firstDayOfWeek
	const weekDays = getWeekDays(currentDate, firstDayOfWeek)

	return (
		<div
			className={cn(
				'flex w-full',
				stickyViewHeader && 'sticky top-0 z-20',
				viewHeaderClassName,
				className
			)}
			data-testid={ids.monthHeader}
		>
			{weekDays.map((weekDay, index) => (
				<AnimatePresence key={weekDay.toISOString()} mode="wait">
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className="py-2 text-center font-medium border-r last:border-r-0 border-b flex-1"
						data-testid={ids.weekdayHeader(weekDay.format('ddd'))}
						exit={{ opacity: 0, y: -10 }}
						initial={{ opacity: 0, y: -10 }}
						key={weekDay.toISOString()}
						transition={{
							duration: 0.25,
							ease: 'easeInOut',
							delay: index * 0.05,
						}}
					>
						<span className="text-sm capitalize">{weekDay.format('ddd')}</span>
					</motion.div>
				</AnimatePresence>
			))}
		</div>
	)
}
