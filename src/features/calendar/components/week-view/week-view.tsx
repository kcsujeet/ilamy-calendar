import type React from 'react'
import { useMemo } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { classes } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays } from '@/lib/utils/date-utils'

const CELL_CLASS =
	'w-[calc((100%-4rem)/var(--visible-days))] min-w-[calc((100%-4rem)/var(--visible-days))] flex-1'
const LEFT_COL_WIDTH = 'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

export const WeekView: React.FC = () => {
	const {
		t,
		currentDate,
		firstDayOfWeek,
		selectDate,
		openEventForm,
		timeFormat,
		businessHours,
		hideNonBusinessHours,
		hiddenDays,
	} = useSmartCalendarContext()

	const weekDays = useMemo(
		() => getWeekDays(currentDate, firstDayOfWeek),
		[currentDate, firstDayOfWeek]
	)

	const visibleDays = useMemo(
		() =>
			hiddenDays
				? weekDays.filter((day) => !hiddenDays.has(day.day()))
				: weekDays,
		[weekDays, hiddenDays]
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

	const firstCol = useMemo(
		() => ({
			id: 'time-col',
			days: hours,
			day: undefined,
			className: `shrink-0 ${LEFT_COL_WIDTH} sticky left-0 bg-background z-20`,
			gridType: 'hour' as const,
			noEvents: true,
			renderCell: (date: Dayjs) => (
				<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
					{date.format(timeFormat === '12-hour' ? 'h A' : 'H')}
				</div>
			),
		}),
		[hours, timeFormat]
	)

	// Generate week days — each column gets its own hours on the correct date
	const columns = useMemo(() => {
		return visibleDays.map((day) => ({
			id: `day-col-${day.format('YYYY-MM-DD')}`,
			day,
			label: day.format('D'),
			className: CELL_CLASS,
			days: getViewHours({
				referenceDate: day,
				businessHours,
				hideNonBusinessHours,
				allDates: weekDays,
			}),
			value: day,
		}))
	}, [visibleDays, weekDays, businessHours, hideNonBusinessHours])

	const cssVars = {
		'--visible-days': visibleDays.length,
	} as React.CSSProperties

	return (
		<VerticalGrid
			allDayRow={
				<AllDayRow
					classes={{ cell: CELL_CLASS, spacer: LEFT_COL_WIDTH }}
					days={visibleDays}
				/>
			}
			classes={{ header: 'w-full h-18', body: 'w-full' }}
			columns={[firstCol, ...columns]}
			gridType="hour"
			style={cssVars}
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
				{visibleDays.map((day) => {
					const isToday = day.isSame(dayjs(), 'day')
					const key = `week-day-header-${day.toISOString()}`

					return (
						<div
							className={cn(
								'hover:bg-accent flex-1 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 border-r last:border-r-0 w-50 h-full',
								isToday && 'bg-primary/10 font-bold'
							)}
							data-testid={`week-day-header-${day.format('dddd').toLowerCase()}`}
							key={key}
							onClick={() => {
								selectDate(day)
								openEventForm({ start: day })
							}}
						>
							<div className={'text-xs sm:text-sm'} key={key}>
								{day.format('ddd')}
							</div>
							<div
								className={cn(
									'mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs',
									classes.headerAnimation,
									isToday && 'bg-primary text-primary-foreground'
								)}
								key={`${key}-num`}
							>
								{day.format('D')}
							</div>
						</div>
					)
				})}
			</div>
		</VerticalGrid>
	)
}
