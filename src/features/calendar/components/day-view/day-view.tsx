import { Fragment } from 'react'
import { DroppableCell } from '@/components/droppable-cell'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'
import dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { DayAllDayRow } from './day-all-day-row'
import { DayEventsLayer } from './day-events-layer'
import { DayHeader } from './day-header'
import { DayTimeCol } from './day-time-col'

// Hours to display (all 24 hours of the day)
const hours = Array.from({ length: 24 }, (_, i) => i).map((hour) => {
	return dayjs().hour(hour).minute(0)
})

const DayView = () => {
	const {
		currentDate,
		businessHours,
		currentLocale,
		timeFormat,
		showCurrentTimeLabel,
	} = useCalendarContext()

	const isToday = currentDate.isSame(dayjs(), 'day')
	const dateStr = currentDate.format('YYYY-MM-DD')

	// Format current time for label
	const currentTimeFormatted = Intl.DateTimeFormat(currentLocale, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: timeFormat === '12-hour',
	}).format(dayjs().toDate())

	return (
		<div data-testid="day-view" className="flex h-full flex-col">
			{/* Day header */}
			<DayHeader className="h-[3rem]" />

			{/* Time grid without scrollbar */}
			<ScrollArea
				data-testid="day-scroll-area"
				className="relative overflow-y-auto h-[calc(100%-3rem)]"
			>
				{/* All-day events row */}
				<DayAllDayRow />

				{/* Set a fixed height container that matches exactly the total height of all hour blocks */}
				<div
					data-testid="day-time-grid"
					className="grid grid-cols-8 divide-x border-x"
					style={{ height: `${hours.length * 60}px` }}
				>
					{/* Time labels column */}
					<DayTimeCol className="col-span-2 h-full md:col-span-1" />

					{/* Day column with events */}
					<div
						data-testid="day-events-column"
						className="relative col-span-6 h-full md:col-span-7"
					>
						{hours.map((time) => {
							const hour = time.hour()
							const hourStr = time.format('HH')

							const checkBusiness = (minute: number) =>
								isBusinessHour({
									date: currentDate,
									hour,
									minute,
									businessHours,
								})

							return (
								<Fragment key={`${dateStr}-${hourStr}`}>
									{[0, 15, 30, 45].map((minute) => {
										const isBusiness = checkBusiness(minute)
										const isLastSlot = minute === 45
										const minuteStr = minute.toString().padStart(2, '0')

										const borderClass = isLastSlot
											? 'border-border'
											: 'border-dashed'

										return (
											<DroppableCell
												key={minute}
												id={`day-time-cell-${dateStr}-${hourStr}-${minuteStr}`}
												data-testid={`day-time-cell-${hourStr}-${minuteStr}`}
												type="time-cell"
												date={currentDate}
												hour={hour}
												minute={minute}
												disabled={!isBusiness}
												className={cn(
													'h-[15px] border-b hover:bg-accent',
													borderClass
												)}
											/>
										)
									})}
								</Fragment>
							)
						})}

						{/* Events layer - middle-top layer */}
						<DayEventsLayer day={currentDate} />

						{/* Current time indicator - top layer */}
						{isToday && (
							<div
								data-testid="day-current-time-indicator"
								className="absolute right-0 left-0 z-40 border-t border-red-500"
								style={{
									top: `${(dayjs().hour() + dayjs().minute() / 60) * 60}px`,
								}}
							>
								<div className="-mt-1 -ml-1 h-2 w-2 rounded-full bg-red-500"></div>
								{showCurrentTimeLabel && (
									<div
										data-testid="day-current-time-label"
										className="absolute right-3 top-1/2 -translate-y-1/2 -mt-0.75 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-sm whitespace-nowrap"
									>
										{currentTimeFormatted}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
				<ScrollBar className="z-30" />
			</ScrollArea>
		</div>
	)
}

export default DayView
