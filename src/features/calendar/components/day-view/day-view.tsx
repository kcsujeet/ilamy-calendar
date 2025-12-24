import { AnimatePresence, motion } from 'motion/react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getDayHours } from '@/lib/utils/date-utils'

const DayView = () => {
	const { currentDate, currentLocale, timeFormat, t } = useCalendarContext()
	const isToday = currentDate.isSame(dayjs(), 'day')
	const hours = getDayHours({ referenceDate: currentDate })

	const firstCol = {
		id: 'time-col',
		day: undefined,
		days: hours,
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
	}

	const columns = {
		id: `day-col-${currentDate.format('YYYY-MM-DD')}`,
		day: currentDate,
		days: hours,
		className: 'w-[calc(100%-4rem)] flex-1',
		gridType: 'hour' as const,
	}

	return (
		<VerticalGrid
			allDayRow={<AllDayRow days={[currentDate]} />}
			cellSlots={[0, 15, 30, 45]}
			classes={{ header: 'w-full', body: 'w-full', allDay: 'w-full' }}
			columns={[firstCol, columns]}
			gridType="hour"
			variant="regular"
		>
			{/* Header */}
			<div
				className={'flex border-b h-full flex-1 justify-center items-center'}
				data-testid="day-view-header"
			>
				<AnimatePresence mode="wait">
					<motion.div
						animate={{ opacity: 1, y: 0 }}
						className={cn(
							'flex justify-center items-center text-center text-base font-semibold sm:text-xl',
							isToday && 'text-primary'
						)}
						exit={{ opacity: 0, y: -10 }}
						initial={{ opacity: 0, y: -10 }}
						key={currentDate.format('YYYY-MM-DD')}
						transition={{ duration: 0.25, ease: 'easeInOut' }}
					>
						<span className="xs:inline hidden">
							{currentDate.format('dddd, ')}
						</span>
						{currentDate.format('MMMM D, YYYY')}
						{isToday && (
							<span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
								{t('today')}
							</span>
						)}
					</motion.div>
				</AnimatePresence>
			</div>
		</VerticalGrid>
	)
}

export default DayView
