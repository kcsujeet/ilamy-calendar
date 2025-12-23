import { AnimatePresence, motion } from 'motion/react'
import React, { useMemo } from 'react'
import { AllEventDialog } from '@/components/all-events-dialog'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { DAY_NUMBER_HEIGHT } from '@/lib/constants'
import { getMonthWeeks } from '@/lib/utils/date-utils'
import { MonthHeader } from './month-header'
import type { MonthViewProps, SelectedDayEvents } from './types'

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

	const rows = weeks.map((days, weekIndex) => ({
		id: `week-${weekIndex}`,
		rowTestId: `week-row-${weekIndex}`,
		days,
		hideLabel: true,
		dayNumberHeight: DAY_NUMBER_HEIGHT, // Height of the day number in GridCell
		className: 'flex-1',
		showDayNumber: true,
	}))

	return (
		<div className="flex h-full flex-col" data-testid="month-view">
			<AnimatePresence mode="wait">
				<motion.div
					animate={{ opacity: 1 }}
					className="flex flex-col flex-1 h-full"
					exit={{ opacity: 0 }}
					initial={{ opacity: 0 }}
					key={currentDate.format('YYYY-MM-DD')}
					transition={{ duration: 0.25, ease: 'easeInOut' }}
				>
					<HorizontalGrid
						bodyTestId="month-calendar-grid"
						classes={{ body: 'flex-1' }}
						rows={rows}
					>
						<MonthHeader className="h-[3rem]" />
					</HorizontalGrid>
				</motion.div>
			</AnimatePresence>

			<AllEventDialog ref={allEventsDialogRef} />
		</div>
	)
}
