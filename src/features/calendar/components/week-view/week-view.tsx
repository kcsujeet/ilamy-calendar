import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { AnimatedSection } from '@/components/animations/animated-section'
import { HourLabel } from '@/components/hour-label/hour-label'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { formatLocaleDate } from '@/lib/utils/date-locale-format'
import { getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

// All-day row cells still use flex inside a spanned grid cell; `min-w-0 flex-1` splits that span like the body grid.
const WEEK_DAY_COLUMN_CLASS = 'min-w-0 flex-1'
const LEFT_COL_WIDTH = 'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

// Matches Tailwind `w-10` / `sm:w-16` so the first grid track matches `AllDayCell` and the time gutter.
const useWeekGridGutterWidth = () => {
	const [wide, setWide] = useState(false)
	useEffect(() => {
		const mq = window.matchMedia('(min-width: 640px)')
		const sync = () => setWide(mq.matches)
		sync()
		mq.addEventListener('change', sync)
		return () => mq.removeEventListener('change', sync)
	}, [])
	return wide ? '4rem' : '2.5rem'
}

export const WeekView: React.FC = () => {
	const gutter = useWeekGridGutterWidth()
	const {
		t,
		currentDate,
		currentLocale,
		firstDayOfWeek,
		selectDate,
		openEventForm,
		businessHours,
		hideNonBusinessHours,
		hiddenDays,
	} = useSmartCalendarContext()
	const locale = currentLocale || currentDate.locale()

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

	const weekColumnTemplate = useMemo(
		() => `${gutter} repeat(${visibleDays.length}, minmax(0, 1fr))`,
		[gutter, visibleDays.length]
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
		className:
			'min-w-0 w-full max-w-full shrink-0 overflow-x-clip sticky left-0 bg-background z-20',
		gridType: 'hour' as const,
		noEvents: true,
		renderCell: (date: Dayjs) => (
			<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
				<HourLabel date={date} />
			</div>
		),
	}

	const columns = useMemo(() => {
		return visibleDays.map((day) => ({
			id: keys.col.day(day),
			day,
			label: day.format('D'),
			className: 'min-w-0',
			days: getViewHours({
				referenceDate: day,
				businessHours,
				hideNonBusinessHours,
				allDates: weekDays,
			}),
			value: day,
		}))
	}, [weekDays, businessHours, hideNonBusinessHours, visibleDays])

	return (
		<VerticalGrid
			allDayRow={
				<AllDayRow
					classes={{
						cell: WEEK_DAY_COLUMN_CLASS,
						spacer: LEFT_COL_WIDTH,
					}}
					columnTemplate={weekColumnTemplate}
					days={visibleDays}
				/>
			}
			bodyColumnTemplate={weekColumnTemplate}
			classes={{
				header: 'h-18',
			}}
			columns={[firstCol, ...columns]}
			gridType="hour"
			variant="regular"
		>
			<div
				className="grid h-full min-w-0 w-full items-stretch"
				data-testid="week-view-header"
				style={{ gridTemplateColumns: weekColumnTemplate }}
			>
				{/* Corner cell with week number */}
				<div
					className={cn(
						'flex h-full shrink-0 items-center justify-center border-r p-2',
						LEFT_COL_WIDTH
					)}
				>
					<div className="flex flex-col items-center justify-center">
						<span className="text-muted-foreground text-xs">{t('week')}</span>
						<span className="font-medium">{currentDate.week()}</span>
					</div>
				</div>

				{/* Day header cells */}
				{visibleDays.map((day, index) => {
					const today = isToday(day)
					const key = keys.header.week.day(day)
					const weekdayLabel = formatLocaleDate(day.toDate(), locale, {
						weekday: 'short',
					})
					const isLast = index === visibleDays.length - 1
					return (
						<AnimatedSection
							className={cn(
								'hover:bg-accent flex h-full min-w-0 flex-col justify-center cursor-pointer overflow-x-clip border-r p-1 text-center sm:p-2',
								isLast && 'border-r-0',
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
							<div className="text-xs sm:text-sm capitalize">
								{weekdayLabel}
							</div>
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
