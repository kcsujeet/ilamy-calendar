import type React from 'react'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { getWeekDays } from '@/lib/utils/date-utils'
import { WeekDayCol } from './week-day-col'

const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) =>
	dayjs().hour(hour).minute(0)
)

export const WeekTimeGrid: React.FC = () => {
	const {
		currentDate,
		firstDayOfWeek,
		currentLocale,
		timeFormat,
		showCurrentTimeLabel,
	} = useCalendarContext()

	const weekDays = getWeekDays(currentDate, firstDayOfWeek)

	// Separate all-day events from regular events (including multi-day events)

	// Find if current day is in the displayed week
	const todayIndex = weekDays.findIndex((day) => day.isSame(dayjs(), 'day'))
	const isCurrentWeek = todayIndex !== -1

	// Format current time for label
	const currentTimeFormatted = Intl.DateTimeFormat(currentLocale, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: timeFormat === '12-hour',
	}).format(dayjs().toDate())

	return (
		<div
			data-testid="week-time-grid"
			className="relative h-full grid grid-cols-[auto_repeat(7,1fr)] grid-rows-[repeat(24,minmax(60px, 1fr))]"
		>
			{/* Time labels column - fixed */}
			<div
				data-testid="week-time-labels"
				className="z-10 col-span-1 w-16 grid grid-rows-24 border-x"
			>
				{hours.map((time) => (
					<div
						key={time.format('HH:mm')}
						data-testid={`week-time-hour-${time.format('HH')}`}
						className="h-[60px] border-b text-right"
					>
						<span className="text-muted-foreground px-1 text-right text-[10px] sm:text-xs">
							{Intl.DateTimeFormat(currentLocale, {
								hour: 'numeric',
								hour12: timeFormat === '12-hour',
							}).format(time.toDate())}
						</span>
					</div>
				))}
			</div>

			{/* Day columns with time slots */}
			{weekDays.map((day) => (
				<WeekDayCol key={day.format('YYYY-MM-DD')} day={day} />
			))}

			{/* Current time indicator */}
			{isCurrentWeek && (
				<>
					{/* Time label in the time column */}
					{showCurrentTimeLabel && (
						<div
							data-testid="week-current-time-label"
							className="pointer-events-none absolute z-40"
							style={{
								top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
								left: '3px',
							}}
						>
							<div className="flex justify-center -mt-3">
								<span className="bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-sm whitespace-nowrap">
									{currentTimeFormatted}
								</span>
							</div>
						</div>
					)}
					{/* Red line and dot indicator */}
					<div
						data-testid="week-current-time-indicator"
						className="pointer-events-none absolute z-40"
						style={{
							top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
							left: `calc(var(--spacing) * 16 + ${todayIndex} * (100% - var(--spacing) * 16) / 7)`,
							width: `calc((100% - var(--spacing) * 16) / 7)`,
						}}
					>
						<div className="w-full border-t border-red-500">
							<div className="-mt-1 ml-1 h-2 w-2 rounded-full bg-red-500"></div>
						</div>
					</div>
				</>
			)}
		</div>
	)
}
