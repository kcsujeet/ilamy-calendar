import type { CalendarEvent, Dayjs, TimeFormat } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { cn } from '@ilamy/ui/lib/utils'

interface AgendaEventRowProps {
	event: CalendarEvent
	/** The day this row appears under (an all-day event renders one row per day). */
	day: Dayjs
}

const getTimePattern = (format: TimeFormat): string =>
	format === '24-hour' ? 'HH:mm' : 'h:mm A'

export const AgendaEventRow = ({ event, day }: AgendaEventRowProps) => {
	const { t, timeFormat, onEventClick } = useIlamyCalendarContext()

	const timeLabel = event.allDay
		? t('allDay')
		: event.start.format(getTimePattern(timeFormat))

	const eventStartDay = event.start.startOf('day')
	const totalDays = event.end.startOf('day').diff(eventStartDay, 'day') + 1
	const dayIndex = day.startOf('day').diff(eventStartDay, 'day') + 1
	const isMultiDayAllDay = Boolean(event.allDay) && totalDays > 1
	const dayCounter = isMultiDayAllDay
		? `${t('day')} ${dayIndex}/${totalDays}`
		: null

	return (
		<button
			className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm"
			onClick={() => onEventClick(event)}
			type="button"
		>
			<span className="text-muted-foreground w-20 shrink-0">{timeLabel}</span>
			<span
				className={cn(
					'size-2 shrink-0 rounded-full',
					event.backgroundColor || 'bg-blue-500'
				)}
				style={{ backgroundColor: event.backgroundColor }}
			/>
			<span className="flex-1 truncate">{event.title}</span>
			{dayCounter && (
				<span className="text-muted-foreground shrink-0 text-xs">
					{dayCounter}
				</span>
			)}
		</button>
	)
}
