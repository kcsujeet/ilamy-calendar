import type React from 'react'
import { useMemo } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

const CELL_CLASS = 'flex-1 min-w-0'
const LEFT_COL_WIDTH = 'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

export const WeekView: React.FC = () => {
	const {
		t,
		currentDate,
		firstDayOfWeek,
		selectDate,
		openEventForm,
		businessHours,
		hideNonBusinessHours,
		hiddenDays,
		slotDuration,
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

	const firstCol = {
		id: keys.col.time,
		days: hours,
		day: undefined,
		className: `shrink-0 ${LEFT_COL_WIDTH} sticky left-0 bg-background z-20 border-r-0`,
		gridType: 'hour' as const,
		noEvents: true,
		renderCell: (date: Dayjs) => (
			<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
				<HourLabel date={date} />
			</div>
		),
	}

	// Generate week days — each column gets its own hours on the correct date
	const columns = useMemo(() => {
		return visibleDays.map((day) => ({
			id: keys.col.day(day),
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
	}, [weekDays, businessHours, hideNonBusinessHours, visibleDays.map])

	const cssVars = {
		'--visible-days': visibleDays.length,
	} as React.CSSProperties

	const WidthClass = 'w-full'
	return (
		<VerticalGrid
			allDayRow={
				<AllDayRow
					classes={{ cell: CELL_CLASS, spacer: LEFT_COL_WIDTH }}
					days={visibleDays}
				/>
			}
			classes={{
				header: `${WidthClass} h-18`,
				allDay: WidthClass,
				body: WidthClass,
			}}
			columns={[firstCol, ...columns]}
			gridType="hour"
			slotDurationMinutes={slotDuration}
			style={cssVars}
			variant="regular"
		>
			<div className={'flex h-full flex-1'} data-testid="week-view-header">
				{/* Corner cell with week number */}
				<div className="w-10 sm:w-16 min-w-10 sm:min-w-16 h-full shrink-0 items-center justify-center border-r p-2 flex">
					<div className="flex flex-col items-center justify-center min-w-0 w-full">
						<span className="text-muted-foreground text-xs truncate w-full text-center">
							{t('week')}
						</span>
						<span className="font-medium truncate w-full text-center">
							{currentDate.week()}
						</span>
					</div>
				</div>

				{/* Day header cells */}
				{visibleDays.map((day, index) => {
					const today = isToday(day)
					const key = keys.header.week.day(day)

					return (
						<AnimatedSection
							className={cn(
								'hover:bg-accent flex-1 min-w-0 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 border-r last:border-r-0 w-20 h-full',
								today && 'bg-primary/10 font-bold'
							)}
							data-testid={keys.header.weekday('week', day.format('dddd'))}
							delay={index * 0.05}
							key={key}
							onClick={() => {
								selectDate(day)
								openEventForm({ start: day })
							}}
							transitionKey={key}
						>
							<div className="text-xs sm:text-sm">{day.format('ddd')}</div>
							<div
								className={cn(
									'mx-auto mt-1 flex h-5 w-5 items-center justify-center rounded-full text-xs',
									today && 'bg-primary text-primary-foreground'
								)}
							>
								{day.format('D')}
							</div>
						</AnimatedSection>
					)
				})}
			</div>
		</VerticalGrid>
	)
}
