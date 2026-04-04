import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { HEADER_ANIMATION } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { createTimeColumn } from '@/lib/utils/create-time-column'

export const DayView = () => {
	const { currentDate, timeFormat, t, businessHours, hideNonBusinessHours } =
		useSmartCalendarContext()
	const isToday = currentDate.isSame(dayjs(), 'day')
	const hours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
	})

	const firstCol = createTimeColumn(hours, timeFormat)

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
			classes={{
				header: 'w-full',
				body: 'w-full',
				allDay: 'w-full',
			}}
			columns={[firstCol, columns]}
			gridType="hour"
			variant="regular"
		>
			{/* Header */}
			<div
				className={'flex flex-1 justify-center items-center min-h-12'}
				data-testid="day-view-header"
			>
				<div
					className={cn(
						'flex justify-center items-center text-center text-base font-semibold sm:text-xl',
						isToday && 'text-primary'
					)}
				>
					<span
						className={cn('xs:inline hidden', HEADER_ANIMATION)}
						key={currentDate.format('YYYY-MM-DD')}
					>
						{currentDate.format('dddd, ')}
					</span>
					<span
						className={HEADER_ANIMATION}
						key={`${currentDate.format('YYYY-MM-DD')}-date`}
					>
						{currentDate.format('MMMM D, YYYY')}
					</span>
					{isToday && (
						<span
							className={cn(
								HEADER_ANIMATION,
								'bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm'
							)}
						>
							{t('today')}
						</span>
					)}
				</div>
			</div>
		</VerticalGrid>
	)
}
