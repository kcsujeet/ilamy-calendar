import { ScrollArea, ScrollBar } from '@ilamy/ui/components/scroll-area'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import {
	buildDayIndex,
	countEventsByDay,
	dayIndexOf,
	getEventBoundsMs,
	overlapsRangeMs,
} from '@ilamy/utils/events'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getDayKey, getWeekDays } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

const EVENT_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42

/**
 * First cell of a month's mini calendar, normalised to local midnight.
 *
 * `getWeekDays` builds its values with `.startOf('week').day(n)`, which can carry
 * a stale UTC offset when that week crosses a DST fall-back — the resulting
 * instant is then 23:00 on the PREVIOUS day. Indexing that raw instant shifted
 * the whole 42-cell grid by one day (Europe/London and Europe/Berlin, November
 * 2025, `firstDayOfWeek: 1`), so the boundary is re-normalised here.
 */
const monthGridStartOf = (monthDate: Dayjs, firstDayOfWeek: number): Dayjs => {
	const weekStart = getWeekDays(monthDate, firstDayOfWeek).at(0) ?? monthDate
	return weekStart.startOf('day')
}

interface MonthData {
	date: Dayjs
	name: string
	eventCount: number
	monthKey: string
	days: DayData[]
}

interface DayData {
	date: Dayjs
	dayKey: string
	isInCurrentMonth: boolean
	isSelected: boolean
	eventCount: number
}

export const YearView = () => {
	const { currentDate, setView, getEventsForDateRange, t, firstDayOfWeek } =
		useSmartCalendarContext()
	const currentYear = currentDate.year()

	const weekdayHeaders = getWeekDays(dayjs(), firstDayOfWeek).map((d) => ({
		id: d.day().toString(),
		label: d.format('dd'),
	}))

	/**
	 * Per-day event counts for the whole visible year, from ONE range query.
	 *
	 * This component used to call `getEventsForDateRange` 516 times per render —
	 * 12 month queries plus 12 x 42 mini-calendar day queries — in the render
	 * body, with no memoization and no cache anywhere beneath it. With the
	 * recurrence plugin active every one of those queries re-expanded every
	 * RRULE, so a single recurring event cost hundreds of milliseconds per
	 * render.
	 *
	 * Note that memoizing the old shape alone would not have fixed it: all 516
	 * ranges are distinct, so a range-keyed cache gets zero hits within a render.
	 * The fix has to be structural — query once, then bucket by day.
	 *
	 * The 12 mini-calendars overlap (each shows leading/trailing days from its
	 * neighbours), so they all index into a single contiguous day array rather
	 * than building 504 dates of their own.
	 */
	const yearGrid = useMemo(() => {
		const monthStarts = Array.from({ length: 12 }, (_, monthIndex) =>
			dayjs().year(currentYear).month(monthIndex).startOf('month')
		)
		const januaryStart = dayjs().year(currentYear).month(0).startOf('month')
		const decemberStart = dayjs().year(currentYear).month(11).startOf('month')

		const firstGridDay = monthGridStartOf(januaryStart, firstDayOfWeek)
		const lastGridDay = monthGridStartOf(decemberStart, firstDayOfWeek).add(
			DAYS_IN_MINI_CALENDAR - 1,
			'day'
		)

		// Walk the span rather than deriving a length from diff(), which truncates
		// to a whole number of days and can come up short across a DST transition.
		// The bound is compared numerically on purpose: `isSameOrBefore(x, 'day')`
		// would run two `startOf` calls per iteration, and with a timezone
		// configured each of those costs around 81us. Both endpoints are local
		// midnight and the cursor advances a day at a time, so it lands on
		// `lastGridDay` exactly.
		const lastGridDayMs = lastGridDay.valueOf()
		const days: Dayjs[] = []
		let cursor = firstGridDay
		while (cursor.valueOf() <= lastGridDayMs) {
			days.push(cursor)
			cursor = cursor.add(1, 'day')
		}

		const dayIndex = buildDayIndex(days)
		const events = getEventsForDateRange(
			firstGridDay.startOf('day'),
			lastGridDay.endOf('day')
		)
		// Only the per-day COUNT is rendered, so materialising 504 buckets and then
		// reading their lengths would allocate for nothing.
		const dayCounts = countEventsByDay(events, dayIndex)

		return { monthStarts, days, dayIndex, events, dayCounts }
	}, [currentYear, firstDayOfWeek, getEventsForDateRange])

	const monthsData = useMemo((): MonthData[] => {
		const { monthStarts, days, dayIndex, events, dayCounts } = yearGrid

		// `isSelected` reduces to an integer comparison once the day index exists.
		// `dayIndexOf` returns -1 for a date outside the grid, so no clamping guard
		// is needed. `isToday` is deliberately NOT resolved here: this memo does not
		// re-run at a midnight rollover, so a long-lived tab would keep highlighting
		// yesterday. It is compared at render time instead.
		const selectedIndex = dayIndexOf(
			dayIndex,
			currentDate.startOf('day').valueOf()
		)

		return monthStarts.map((monthDate) => {
			const monthStartMs = monthDate.valueOf()
			const monthEndMs = monthDate.endOf('month').valueOf()

			// Count DISTINCT events overlapping the month. Summing the per-day
			// buckets would count a multi-day event once per day it spans, which
			// inflates the badge (a single 5-day event would read as 5).
			let eventCount = 0
			for (const event of events) {
				if (
					overlapsRangeMs(getEventBoundsMs(event), monthStartMs, monthEndMs)
				) {
					eventCount++
				}
			}

			const monthGridStart = monthGridStartOf(monthDate, firstDayOfWeek)
			const firstCellIndex = dayIndexOf(dayIndex, monthGridStart.valueOf())
			const monthNumber = monthDate.month()

			const monthDays = Array.from(
				{ length: DAYS_IN_MINI_CALENDAR },
				(_, offset) => {
					const cellIndex = firstCellIndex + offset
					const dayDate =
						days.at(cellIndex) ?? monthGridStart.add(offset, 'day')
					return {
						date: dayDate,
						dayKey: getDayKey(dayDate),
						isInCurrentMonth: dayDate.month() === monthNumber,
						isSelected: cellIndex === selectedIndex,
						eventCount: dayCounts.at(cellIndex) ?? 0,
					}
				}
			)

			return {
				date: monthDate,
				name: monthDate.format('MMMM'),
				eventCount,
				monthKey: monthDate.format('MM'),
				days: monthDays,
			}
		})
	}, [yearGrid, currentDate, firstDayOfWeek])

	const navigateToDate = (
		date: Dayjs,
		view: 'month' | 'day',
		event?: React.MouseEvent
	) => {
		event?.stopPropagation()
		// Atomic date + view change: one onDateChange with the clicked day's
		// range in the target view (issue #231).
		setView(view, date)
	}

	const getEventCountLabel = (count: number): string => {
		const eventWord = count === 1 ? t('event') : t('events')
		return `${count} ${eventWord}`
	}

	const getDayClassName = (day: DayData, isTodayCell: boolean): string => {
		const baseClass =
			'relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center hover:bg-accent rounded-sm transition-colors duration-200'
		const outsideMonthClass = day.isInCurrentMonth
			? ''
			: 'text-muted-foreground opacity-50'
		const todayClass = isTodayCell
			? 'bg-primary text-primary-foreground rounded-full'
			: ''
		const selectedClass =
			day.isSelected && !isTodayCell ? 'bg-muted rounded-full font-bold' : ''
		const hasEventsClass =
			day.eventCount > 0 && !isTodayCell && !day.isSelected ? 'font-medium' : ''

		return cn(
			baseClass,
			outsideMonthClass,
			todayClass,
			selectedClass,
			hasEventsClass
		)
	}

	const getEventDotClassName = (color: string, isToday: boolean): string => {
		const dotColor = isToday ? 'bg-primary-foreground' : color
		return cn('h-[3px] w-[3px] rounded-full', dotColor)
	}

	// Computed once per render, outside the memo, so a midnight rollover moves the
	// highlight on the next render instead of requiring the events or year to change.
	const todayKey = getDayKey(dayjs())

	const getDayTooltip = (eventCount: number): string => {
		if (eventCount === 0) {
			return ''
		}
		return getEventCountLabel(eventCount)
	}

	return (
		<ScrollArea className="h-full" data-testid="year-view">
			<div
				className="grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
				data-testid="year-grid"
			>
				{monthsData.map((month) => {
					const daysInMonth = month.days

					return (
						<div
							className="hover:border-primary flex flex-col rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md"
							data-testid={keys.header.year.month(month.monthKey)}
							key={month.monthKey}
						>
							<AnimatedSection
								className="mb-2 flex items-center justify-between"
								key={keys.listKey('month', month.monthKey)}
								transitionKey={keys.listKey('month', month.monthKey)}
							>
								<button
									className="text-lg font-medium hover:underline cursor-pointer"
									data-testid={keys.header.year.month(month.monthKey, 'title')}
									onClick={() => navigateToDate(month.date, 'month')}
									type="button"
								>
									{month.name}
								</button>

								{month.eventCount > 0 && (
									<span
										className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs"
										data-testid={keys.header.year.month(
											month.monthKey,
											'count'
										)}
									>
										{getEventCountLabel(month.eventCount)}
									</span>
								)}
							</AnimatedSection>

							<div
								className="grid grid-cols-7 gap-px text-[0.6rem]"
								data-testid={keys.header.year.month(month.monthKey, 'mini')}
							>
								{weekdayHeaders.map((day) => (
									<div
										className="text-muted-foreground h-3 text-center"
										key={keys.listKey('header', month.monthKey, day.id)}
									>
										{day.label}
									</div>
								))}

								{daysInMonth.map((day) => {
									const dayTestId = keys.header.year.day(
										month.date.format('YYYY-MM'),
										day.dayKey
									)
									const hasEvents = day.eventCount > 0
									const visibleDotCount = Math.min(day.eventCount, 3)
									const visibleDotColors = EVENT_DOT_COLORS.slice(
										0,
										visibleDotCount
									)
									// Resolved per render rather than inside the memo, so a tab
									// left open past midnight stops highlighting yesterday.
									const isTodayCell = day.dayKey === todayKey

									return (
										<button
											className={getDayClassName(day, isTodayCell)}
											data-testid={dayTestId}
											key={day.dayKey}
											onClick={(e) => navigateToDate(day.date, 'day', e)}
											title={getDayTooltip(day.eventCount)}
											type="button"
										>
											<span className="text-center leading-none">
												{day.date.date()}
											</span>

											{hasEvents && (
												<div
													className={cn(
														'absolute bottom-0 flex w-full justify-center space-x-px',
														isTodayCell && 'bottom-px'
													)}
												>
													{visibleDotColors.map((dotColor) => (
														<span
															className={getEventDotClassName(
																dotColor,
																isTodayCell
															)}
															key={dotColor}
														/>
													))}
												</div>
											)}
										</button>
									)
								})}
							</div>
						</div>
					)
				})}
			</div>
			<ScrollBar className="z-30" />
		</ScrollArea>
	)
}
