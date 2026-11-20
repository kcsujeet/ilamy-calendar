import type { CalendarEvent, EventSegment } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { cn } from '@ilamy/ui/lib/utils'
import {
	formatDate,
	parseDate,
	startOf,
	subtract,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/utils/temporal'

interface AgendaEventRowProps {
	event: CalendarEvent
	day: ZonedDate
}

interface AgendaEventRowContentProps {
	event: CalendarEvent
	segment: EventSegment
	dayCounter: string | null
}

const AgendaEventRowContent = ({
	event,
	segment,
	dayCounter,
}: AgendaEventRowContentProps) => {
	const { renderEvent } = useIlamyCalendarContext()
	if (renderEvent) {
		return renderEvent(event, segment)
	}
	return (
		<>
			<span className="truncate">{event.title}</span>
			{dayCounter && (
				<span className="text-muted-foreground shrink-0 text-xs">
					{dayCounter}
				</span>
			)}
		</>
	)
}

export const AgendaEventRow = ({ event, day }: AgendaEventRowProps) => {
	const { t, timeFormat, currentLocale, onEventClick } =
		useIlamyCalendarContext()
	const zone = day.timeZoneId
	const start = parseDate(event.start, zone) ?? day
	const end = parseDate(event.end, zone) ?? start

	const eventStartDay = startOf(start, 'day')
	const lastCoveredDay = startOf(subtract(end, 1, 'millisecond'), 'day')
	const coveredDayCount =
		Math.round(wallClockDiff(lastCoveredDay, eventStartDay, 'day')) + 1
	const totalDays = Math.max(coveredDayCount, 1)
	const dayIndex =
		Math.round(wallClockDiff(startOf(day, 'day'), eventStartDay, 'day')) + 1
	const isMultiDay = totalDays > 1
	const isFirstDay = dayIndex === 1
	const isLastDay = dayIndex === totalDays

	const isAllDayLabel =
		Boolean(event.allDay) || (isMultiDay && !isFirstDay && !isLastDay)
	const edgeTime = isMultiDay && isLastDay ? end : start
	const formattedTime = formatDate(
		edgeTime,
		{
			hour: 'numeric',
			minute: '2-digit',
			hour12: timeFormat === '12-hour',
		},
		currentLocale
	)
	const timeLabel = isAllDayLabel ? t('allDay') : formattedTime
	const dayLabel = `(${t('day')} ${dayIndex}/${totalDays})`
	const dayCounter = isMultiDay ? dayLabel : null
	const segment: EventSegment = { isStart: isFirstDay, isEnd: isLastDay }

	return (
		<button
			className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded px-2 py-1 text-left text-sm"
			onClick={() => onEventClick(event)}
			type="button"
		>
			<span className="text-muted-foreground w-20 shrink-0">{timeLabel}</span>
			<span
				className={cn(
					'size-3 shrink-0 rounded-full border',
					event.backgroundColor || 'bg-blue-500',
					event.color
				)}
				style={{ backgroundColor: event.backgroundColor }}
			/>
			<AgendaEventRowContent
				dayCounter={dayCounter}
				event={event}
				segment={segment}
			/>
		</button>
	)
}
