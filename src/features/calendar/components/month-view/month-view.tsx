import { AnimatePresence, motion } from 'motion/react'
import React, { useMemo } from 'react'
import { AllEventDialog } from '@/components/all-events-dialog'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { getMonthWeeks } from '@/lib/utils/date-utils'
import { DayCell } from './day-cell'
import { MonthHeader } from './month-header'
import type { MonthViewProps, SelectedDayEvents } from './types'
import { WeekEventsLayer } from './week-events-layer'

export const MonthView: React.FC<MonthViewProps> = ({ dayMaxEvents = 3 }) => {
	const allEventsDialogRef = React.useRef<{
		open: () => void
		close: () => void
		setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
	}>(null)

	const { currentDate, firstDayOfWeek } = useCalendarContext()

	const weeks = useMemo(
		() => getMonthWeeks(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	return (
		<div className="flex h-full flex-col" data-testid="month-view">
			<MonthHeader className="h-[3rem]" />

			<ScrollArea
				className="overflow-auto h-[calc(100%-3rem)] z-30"
				data-testid="month-scroll-area"
				viewPortProps={{ className: '*:flex! *:flex-col *:min-h-full' }}
			>
				<AnimatePresence mode="wait">
					<motion.div
						animate={{ opacity: 1 }}
						className="relative grid h-full grid-cols-7 grid-rows-6 overflow-auto flex-1"
						data-testid="month-calendar-grid"
						exit={{ opacity: 0 }}
						initial={{ opacity: 0 }}
						key={currentDate.format('YYYY-MM-DD')}
						transition={{ duration: 0.25, ease: 'easeInOut' }}
					>
						{weeks.map((days, weekIndex) => (
							<div
								className="relative col-span-7 grid grid-cols-7"
								data-testid={`week-row-${weekIndex}`}
								key={`week-${weekIndex}`}
							>
								{days.map((day, dayIndex) => (
									<DayCell
										className="border-r border-b first:border-l"
										day={day}
										dayMaxEvents={dayMaxEvents}
										index={dayIndex}
										key={day.format('YYYY-MM-DD')}
									/>
								))}

								<div className="absolute inset-0 z-10 pointer-events-none">
									<WeekEventsLayer days={days} />
								</div>
							</div>
						))}
					</motion.div>
				</AnimatePresence>
				<ScrollBar className="z-30" />
			</ScrollArea>

			<AllEventDialog ref={allEventsDialogRef} />
		</div>
	)
}
