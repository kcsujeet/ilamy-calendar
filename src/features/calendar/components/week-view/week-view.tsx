import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { useMemo } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

const CELL_CLASS = 'w-[calc((100%-4rem)/7)] min-w-[calc((100%-4rem)/7)] flex-1'
const LEFT_COL_WIDTH = 'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

const WeekView: React.FC = () => {
	const {
		t,
		currentDate,
		firstDayOfWeek,
		selectDate,
		openEventForm,
		currentLocale,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
	} = useCalendarContext()

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

	const firstCol = {
		id: 'time-col',
		days: hours,
		day: undefined,
		className: `shrink-0 ${LEFT_COL_WIDTH} sticky left-0 bg-background z-20`,
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

	// Generate week days
	const columns = useMemo(() => {
		return weekDays.map((day) => ({
			id: `day-col-${day.format('YYYY-MM-DD')}`,
			day,
			label: day.format('D'),
			className: CELL_CLASS,
			days: hours.map((h) =>
				day.hour(h.hour()).minute(0).second(0).millisecond(0)
			),
			value: day,
		}))
	}, [weekDays, hours])

	return (
		<VerticalGrid
			allDayRow={
				<AllDayRow
					classes={{ cell: CELL_CLASS, spacer: LEFT_COL_WIDTH }}
					days={weekDays}
				/>
			}
			classes={{ header: 'w-full h-18', body: 'h-[calc(100%-4.5rem)] w-full' }}
			columns={[firstCol, ...columns]}
			gridType="hour"
			variant="regular"
		>
			<div className={'flex h-full flex-1'} data-testid="week-view-header">
				{/* Corner cell with week number */}
				<div className="w-10 sm:w-16 h-full shrink-0 items-center justify-center border-r p-2 flex">
					<div className="flex flex-col items-center justify-center">
						<span className="text-muted-foreground text-xs">{t('week')}</span>
						<span className="font-medium">{currentDate.week()}</span>
					</div>
				</div>

				{/* Day header cells */}
				{weekDays.map((day, index) => {
					const isToday = day.isSame(dayjs(), 'day')
					const key = `week-day-header-${day.toISOString()}`

					return (
						<AnimatePresence key={key} mode="wait">
							<motion.div
								animate={{ opacity: 1, y: 0 }}
								className={cn(
									'hover:bg-accent flex-1 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 border-r last:border-r-0 w-50 h-full',
									isToday && 'bg-primary/10 font-bold'
								)}
								data-testid={`week-day-header-${day.format('dddd').toLowerCase()}`}
								exit={{ opacity: 0, y: -10 }}
								initial={{ opacity: 0, y: -10 }}
								onClick={() => {
									selectDate(day)
									openEventForm({ start: day })
								}}
								transition={{
									duration: 0.25,
									ease: 'easeInOut',
									delay: index * 0.05,
								}}
							>
								<div className="text-xs sm:text-sm">{day.format('ddd')}</div>
								<div
									className={cn(
										'mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs',
										isToday && 'bg-primary text-primary-foreground'
									)}
								>
									{Intl.DateTimeFormat(currentLocale, {
										day: 'numeric',
									}).format(day.toDate())}
								</div>
							</motion.div>
						</AnimatePresence>
					)
				})}
			</div>
		</VerticalGrid>
	)
}

export default WeekView
