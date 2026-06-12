import { ScrollArea, ScrollBar } from '@ilamy/ui/components/scroll-area'
import { AnimatedSection } from '@/components/animations/animated-section'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getDayKey, getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'

const EVENT_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42

interface MonthData {
	date: Dayjs
	name: string
	eventCount: number
	monthKey: string
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
	const {
		currentDate,
		selectDate,
		setView,
		getEventsForDateRange,
		t,
		firstDayOfWeek,
	} = useSmartCalendarContext()
	const currentYear = currentDate.year()

	const weekdayHeaders = getWeekDays(dayjs(), firstDayOfWeek).map((d) => ({
		id: d.day().toString(),
		label: d.format('dd'),
	}))

	const generateMonthsData = (): MonthData[] => {
		return Array.from({ length: 12 }, (_, monthIndex) => {
			const monthDate = dayjs()
				.year(currentYear)
				.month(monthIndex)
				.startOf('month')
			const eventsInMonth = getEventsForDateRange(
				monthDate,
				monthDate.endOf('month')
			)

			return {
				date: monthDate,
				name: monthDate.format('MMMM'),
				eventCount: eventsInMonth.length,
				monthKey: monthDate.format('MM'),
			}
		})
	}

	const generateDaysForMonth = (monthDate: Dayjs): DayData[] => {
		const monthStart = monthDate.startOf('month')
		const firstDayOfCalendar =
			getWeekDays(monthStart, firstDayOfWeek).at(0) ?? monthStart

		return Array.from({ length: DAYS_IN_MINI_CALENDAR }, (_, dayIndex) => {
			const dayDate = firstDayOfCalendar.add(dayIndex, 'day')
			const dayStart = dayDate.startOf('day')
			const dayEnd = dayDate.endOf('day')
			const eventsOnDay = getEventsForDateRange(dayStart, dayEnd)

			return {
				date: dayDate,
				dayKey: getDayKey(dayDate),
				isInCurrentMonth: dayDate.month() === monthDate.month(),
				isToday: isToday(dayDate),
				isSelected: dayDate.isSame(currentDate, 'day'),
				eventCount: eventsOnDay.length,
			}
		})
	}

	const navigateToDate = (
		date: Dayjs,
		view: 'month' | 'day',
		event?: React.MouseEvent
	) => {
		event?.stopPropagation()
		selectDate(date)
		setView(view)
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

	const monthsData = generateMonthsData()

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
				{monthsData.map((month, monthIndex) => {
					const daysInMonth = generateDaysForMonth(month.date)
					const animationDelay = monthIndex * HEADER_STAGGER_DELAY

					return (
						<div
							className="hover:border-primary flex flex-col rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md"
							data-testid={keys.header.year.month(month.monthKey)}
							key={month.monthKey}
						>
							<AnimatedSection
								className="mb-2 flex items-center justify-between"
								delay={animationDelay}
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
