import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getDayKey, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

export const DayView = () => {
	const { currentDate, t, businessHours, hideNonBusinessHours, slotDuration } =
		useSmartCalendarContext()
	const today = isToday(currentDate)
	const hours = getViewHours({
		referenceDate: currentDate,
		businessHours,
		hideNonBusinessHours,
		allDates: [currentDate],
	})

	const firstCol = {
		id: keys.col.time,
		day: undefined,
		days: hours,
		className:
			'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20 border-r-0',
		gridType: 'hour' as const,
		noEvents: true,
		renderCell: (date: Dayjs) => (
			<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
				<HourLabel date={date} />
			</div>
		),
	}

	const columns = {
		id: keys.col.day(currentDate),
		day: currentDate,
		days: hours,
		className: 'w-[calc(100%-4rem)] flex-1',
		gridType: 'hour' as const,
	}

	return (
		<VerticalGrid
			allDayRow={<AllDayRow days={[currentDate]} />}
			classes={{
				header: 'w-full',
				body: 'w-full',
				allDay: 'w-full',
			}}
			columns={[firstCol, columns]}
			gridType="hour"
			slotDurationMinutes={slotDuration}
			variant="regular"
		>
			{/* Header */}
			<div
				className={'flex flex-1 justify-center items-center min-h-12'}
				data-testid="day-view-header"
			>
				<AnimatedSection
					className={cn(
						'flex justify-center items-center text-center text-base font-semibold sm:text-xl',
						today && 'text-primary'
					)}
					transitionKey={getDayKey(currentDate)}
				>
					{currentDate.format('dddd, LL')}
					{today && (
						<span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
							{t('today')}
						</span>
					)}
				</AnimatedSection>
			</div>
		</VerticalGrid>
	)
}
