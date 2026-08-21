import type { CalendarEvent } from '@ilamy/types'
import { ScrollArea, ScrollBar } from '@ilamy/ui/components/scroll-area'
import { cn } from '@ilamy/ui/lib/utils'
import dayjs, { type Dayjs } from '@ilamy/utils/dayjs'
import { overlapsRange } from '@ilamy/utils/helpers'
import { useMemo } from 'react'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getDayKey, getWeekDays } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

const EVENT_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42

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
	isToday: boolean
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
	 * One query for the whole visible year, then every cell and badge is counted
	 * from that single list.
	 *
	 * This used to run in the render body and issue 12 month queries plus
	 * 12 x 42 day queries, uncached, on every render. Nothing memoizes beneath
	 * `getEventsForDateRange`, so with the recurrence plugin installed each of
	 * those re-expanded every RRULE, and one recurring event was enough to make
	 * the view unusable (#245). Memoizing the old shape would not have helped:
	 * all 516 ranges are distinct, so a range-keyed cache gets no hits within a
	 * render, and the first paint is the problem.
	 *
	 * Every month's grid sits inside the January-to-December span, so the wide
	 * query returns a superset of what each narrow one did and re-filtering with
	 * the same predicate reproduces the old counts exactly.
	 */
	const monthsData = useMemo((): MonthData[] => {
		const todayKey = getDayKey(dayjs())
		const selectedKey = getDayKey(currentDate)

		const monthStarts = Array.from({ length: 12 }, (_, monthIndex) =>
			dayjs().year(currentYear).month(monthIndex).startOf('month')
		)
		// A mini calendar starts on the first day of the week containing the 1st.
		// `dayDate` is deliberately left un-normalized, exactly as before: after a
		// DST fall-back `add(n, 'day')` carries a stale offset, and the cell's
		// label, its click target and its event window all derive from that one
		// instant, so they agree with each other. Normalizing only some of them
		// would shift the grid by a day.
		const monthGrids = monthStarts.map((monthStart) => {
			const gridStart = getWeekDays(monthStart, firstDayOfWeek).at(0)
			const firstDayOfCalendar = gridStart ?? monthStart
			return Array.from({ length: DAYS_IN_MINI_CALENDAR }, (_, dayIndex) =>
				firstDayOfCalendar.add(dayIndex, 'day')
			)
		})

		const firstVisibleDay = monthGrids.at(0)?.at(0)
		const lastVisibleDay = monthGrids.at(-1)?.at(-1)
		let yearEvents: CalendarEvent[] = []
		if (firstVisibleDay && lastVisibleDay) {
			yearEvents = getEventsForDateRange(
				firstVisibleDay.startOf('day'),
				lastVisibleDay.endOf('day')
			)
		}

		return monthStarts.map((monthDate, monthIndex) => {
			const gridDays = monthGrids.at(monthIndex) ?? []
			const days = gridDays.map((dayDate): DayData => {
				const dayStart = dayDate.startOf('day')
				const dayEnd = dayDate.endOf('day')
				const dayKey = getDayKey(dayDate)
				const eventsOnDay = yearEvents.filter((event) =>
					overlapsRange(event, dayStart, dayEnd)
				)

				return {
					date: dayDate,
					dayKey,
					isInCurrentMonth: dayDate.month() === monthDate.month(),
					// Day-key comparison rather than `isToday`/`isSame(_, 'day')`:
					// identical answers, but those cost ~91µs each under a timezone
					// and this runs 504 times per render.
					isToday: dayKey === todayKey,
					isSelected: dayKey === selectedKey,
					eventCount: eventsOnDay.length,
				}
			})

			// The badge counts DISTINCT events in the month. Summing the day buckets
			// would count a five-day event five times.
			//
			// `monthEnd` is hoisted out of the predicate deliberately. Inline, it
			// was re-evaluated once per event, and `endOf` on a tz-aware instance
			// costs ~45µs: that single misplaced call was ~760ms of this view.
			const monthEnd = monthDate.endOf('month')
			const eventsInMonth = yearEvents.filter((event) =>
				overlapsRange(event, monthDate, monthEnd)
			)

			return {
				date: monthDate,
				name: monthDate.format('MMMM'),
				eventCount: eventsInMonth.length,
				monthKey: monthDate.format('MM'),
				days,
			}
		})
	}, [currentYear, currentDate, firstDayOfWeek, getEventsForDateRange])

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

	const getDayClassName = (day: DayData): string => {
		const baseClass =
			'relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center hover:bg-accent rounded-sm transition-colors duration-200'
		const outsideMonthClass = day.isInCurrentMonth
			? ''
			: 'text-muted-foreground opacity-50'
		const todayClass = day.isToday
			? 'bg-primary text-primary-foreground rounded-full'
			: ''
		const selectedClass =
			day.isSelected && !day.isToday ? 'bg-muted rounded-full font-bold' : ''
		const hasEventsClass =
			day.eventCount > 0 && !day.isToday && !day.isSelected ? 'font-medium' : ''

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

									return (
										<button
											className={getDayClassName(day)}
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
														day.isToday && 'bottom-px'
													)}
												>
													{visibleDotColors.map((dotColor) => (
														<span
															className={getEventDotClassName(
																dotColor,
																day.isToday
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
