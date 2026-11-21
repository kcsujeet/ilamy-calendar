import { type CalendarEvent, useIlamyCalendarContext } from '@ilamy/calendar'
import { getWeekDays } from '@ilamy/core'
import { ScrollArea, ScrollBar } from '@ilamy/ui/components/scroll-area'
import { cn } from '@ilamy/ui/lib/utils'
import { listKey } from '@ilamy/utils/helpers'
import {
	add,
	dayKey,
	endOf,
	formatDate,
	fromFields,
	getFields,
	now,
	overlapsRange,
	parseDate,
	resolveZone,
	startOf,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type React from 'react'
import { useMemo } from 'react'

const EVENT_DOT_COLORS = ['bg-primary', 'bg-blue-500', 'bg-green-500']
const DAYS_IN_MINI_CALENDAR = 42
const MAX_YEAR_DOTS = 3

interface MonthData {
	date: ZonedDate
	name: string
	eventCount: number
	monthKey: string
	yearMonthKey: string
	days: DayData[]
}

interface DayData {
	date: ZonedDate
	dayKey: string
	isInCurrentMonth: boolean
	isToday: boolean
	isSelected: boolean
	eventCount: number
}

interface WeekdayHeader {
	id: string
	label: string
}

interface ParsedYearEvent {
	event: CalendarEvent
	start: ZonedDate
	end: ZonedDate
}

const pad2 = (value: number): string => String(value).padStart(2, '0')

const getDayClassName = (day: DayData): string => {
	const baseClass =
		'relative flex aspect-square w-full cursor-pointer flex-col items-center justify-center hover:bg-accent rounded-sm transition-colors duration-200'
	const outsideMonthClass = day.isInCurrentMonth ? '' : 'text-muted-foreground'
	let todayClass = ''
	if (day.isToday) {
		todayClass = 'bg-primary text-primary-foreground rounded-full'
	}
	let selectedClass = ''
	if (day.isSelected && !day.isToday) {
		selectedClass = 'bg-muted rounded-full font-bold'
	}
	let hasEventsClass = ''
	if (day.eventCount > 0 && !day.isToday && !day.isSelected) {
		hasEventsClass = 'font-medium'
	}

	return cn(
		baseClass,
		outsideMonthClass,
		todayClass,
		selectedClass,
		hasEventsClass
	)
}

const getEventDotClassName = (color: string, isToday: boolean): string =>
	cn('h-[3px] w-[3px] rounded-full', isToday ? 'bg-primary-foreground' : color)

interface YearMonthCardProps {
	month: MonthData
	locale: string
	weekdayHeaders: WeekdayHeader[]
	formatEventCount: (count: number) => string
	onNavigate: (
		date: ZonedDate,
		view: 'month' | 'day',
		event?: React.MouseEvent
	) => void
}

function YearMonthCard({
	month,
	locale,
	weekdayHeaders,
	formatEventCount,
	onNavigate,
}: YearMonthCardProps) {
	return (
		<div
			className="hover:border-primary flex flex-col rounded-lg border p-3 text-left transition-all duration-200 hover:shadow-md"
			data-testid={listKey('year-month', month.monthKey)}
		>
			<div className="mb-2 flex items-center justify-between">
				<button
					className="text-lg font-medium hover:underline cursor-pointer"
					data-testid={listKey('year-month-title', month.monthKey)}
					onClick={() => onNavigate(month.date, 'month')}
					type="button"
				>
					{month.name}
				</button>

				{month.eventCount > 0 && (
					<span
						className="bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs"
						data-testid={listKey('year-month-count', month.monthKey)}
					>
						{formatEventCount(month.eventCount)}
					</span>
				)}
			</div>

			<div
				className="grid grid-cols-7 gap-px text-[0.6rem]"
				data-testid={listKey('year-month-mini', month.monthKey)}
			>
				{weekdayHeaders.map((day) => (
					<div
						className="text-muted-foreground h-3 text-center"
						key={listKey('header', month.monthKey, day.id)}
					>
						{day.label}
					</div>
				))}

				{month.days.map((day) => {
					const dayTestId = `year-day-${month.yearMonthKey}-${day.dayKey}`
					const hasEvents = day.eventCount > 0
					const visibleDotColors = EVENT_DOT_COLORS.slice(
						0,
						Math.min(day.eventCount, MAX_YEAR_DOTS)
					)
					const tooltip = hasEvents ? formatEventCount(day.eventCount) : ''
					const accessibleDate = formatDate(
						day.date,
						{
							weekday: 'long',
							month: 'long',
							day: 'numeric',
							year: 'numeric',
						},
						locale
					)
					let ariaLabel = accessibleDate
					if (hasEvents) {
						ariaLabel = `${accessibleDate}, ${tooltip}`
					}

					return (
						<button
							aria-current={day.isToday ? 'date' : undefined}
							aria-label={ariaLabel}
							className={getDayClassName(day)}
							data-testid={dayTestId}
							key={day.dayKey}
							onClick={(e) => onNavigate(day.date, 'day', e)}
							title={tooltip}
							type="button"
						>
							<span className="text-center leading-none">{day.date.day}</span>

							{hasEvents && (
								<div
									className={cn(
										'absolute bottom-0 flex w-full justify-center space-x-px',
										day.isToday && 'bottom-px'
									)}
								>
									{visibleDotColors.map((dotColor) => (
										<span
											className={getEventDotClassName(dotColor, day.isToday)}
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
}

export const YearView = (): React.ReactNode => {
	const {
		currentDate: currentDateIso,
		currentLocale,
		timezone,
		setView,
		getEventsForDateRange,
		t,
		firstDayOfWeek,
	} = useIlamyCalendarContext()
	const zone = resolveZone(timezone)
	const currentDate = parseDate(currentDateIso, zone) ?? now(zone)
	const currentYear = currentDate.year
	const selectedKey = dayKey(currentDate)

	const weekdayHeaders = getWeekDays(now(zone), firstDayOfWeek).map((d) => ({
		id: String(getFields(d).dayOfWeek),
		label: formatDate(d, { weekday: 'short' }, currentLocale).slice(0, 2),
	}))

	/**
	 * One query for the whole visible year, then every cell and badge is counted
	 * from that single list (#245).
	 */
	const monthsData = useMemo((): MonthData[] => {
		const todayKey = dayKey(now(zone))

		const monthStarts = Array.from({ length: 12 }, (_, monthIndex) =>
			fromFields({ year: currentYear, month: monthIndex + 1, day: 1 }, zone)
		)
		const monthGrids = monthStarts.map((monthStart) => {
			const gridStart = getWeekDays(monthStart, firstDayOfWeek).at(0)
			const firstDayOfCalendar = gridStart ?? monthStart
			return Array.from({ length: DAYS_IN_MINI_CALENDAR }, (_, dayIndex) =>
				startOf(add(firstDayOfCalendar, dayIndex, 'day'), 'day')
			)
		})

		const firstVisibleDay = monthGrids.at(0)?.at(0)
		const lastVisibleDay = monthGrids.at(-1)?.at(-1)
		let rawYearEvents: CalendarEvent[] = []
		if (firstVisibleDay && lastVisibleDay) {
			rawYearEvents = getEventsForDateRange(
				toOffsetIso(startOf(firstVisibleDay, 'day')),
				toOffsetIso(endOf(lastVisibleDay, 'day'))
			)
		}

		const parsedEvents: ParsedYearEvent[] = []
		for (const event of rawYearEvents) {
			const start = parseDate(event.start, zone)
			const end = parseDate(event.end, zone)
			if (start && end) {
				parsedEvents.push({ event, start, end })
			}
		}

		return monthStarts.map((monthDate, monthIndex) => {
			const gridDays = monthGrids.at(monthIndex) ?? []
			const days = gridDays.map((dayDate): DayData => {
				const dayStart = startOf(dayDate, 'day')
				const dayEnd = endOf(dayDate, 'day')
				const cellKey = dayKey(dayDate)
				const eventsOnDay = parsedEvents.filter((entry) =>
					overlapsRange(entry, dayStart, dayEnd)
				)

				return {
					date: dayDate,
					dayKey: cellKey,
					isInCurrentMonth:
						dayDate.year === monthDate.year &&
						dayDate.month === monthDate.month,
					isToday: cellKey === todayKey,
					isSelected: cellKey === selectedKey,
					eventCount: eventsOnDay.length,
				}
			})

			const monthEnd = endOf(monthDate, 'month')
			const eventsInMonth = parsedEvents.filter((entry) =>
				overlapsRange(entry, monthDate, monthEnd)
			)
			const monthKey = pad2(monthDate.month)

			return {
				date: monthDate,
				name: formatDate(monthDate, { month: 'long' }, currentLocale),
				eventCount: eventsInMonth.length,
				monthKey,
				yearMonthKey: `${monthDate.year}-${monthKey}`,
				days,
			}
		})
	}, [
		currentYear,
		selectedKey,
		currentLocale,
		firstDayOfWeek,
		getEventsForDateRange,
		zone,
	])

	const navigateToDate = (
		date: ZonedDate,
		view: 'month' | 'day',
		event?: React.MouseEvent
	) => {
		event?.stopPropagation()
		setView(view, toOffsetIso(date))
	}

	const formatEventCount = (count: number): string => {
		const eventWord = count === 1 ? t('event') : t('events')
		return `${count} ${eventWord}`
	}

	return (
		<ScrollArea className="h-full" data-testid="year-view">
			<div
				className="grid auto-rows-fr grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3"
				data-testid="year-grid"
			>
				{monthsData.map((month) => (
					<YearMonthCard
						formatEventCount={formatEventCount}
						key={month.monthKey}
						locale={currentLocale}
						month={month}
						onNavigate={navigateToDate}
						weekdayHeaders={weekdayHeaders}
					/>
				))}
			</div>
			<ScrollBar className="z-30" />
		</ScrollArea>
	)
}
