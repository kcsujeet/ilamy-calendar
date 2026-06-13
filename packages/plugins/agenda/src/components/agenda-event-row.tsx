import type {
	CalendarEvent,
	Dayjs,
	TimeFormat,
	TranslatorFunction,
} from '@ilamy/calendar'

interface AgendaEventRowProps {
	event: CalendarEvent
	/** The day this row appears under (a multi-day event renders one row per day). */
	day: Dayjs
	timeFormat: TimeFormat
	t: TranslatorFunction
	onClick: (event: CalendarEvent) => void
}

const timePattern = (format: TimeFormat): string =>
	format === '24-hour' ? 'HH:mm' : 'h:mm A'

export const AgendaEventRow = ({
	event,
	day,
	timeFormat,
	t,
	onClick,
}: AgendaEventRowProps) => {
	const timeLabel = event.allDay
		? t('allDay')
		: event.start.format(timePattern(timeFormat))

	const eventStartDay = event.start.startOf('day')
	const totalDays = event.end.startOf('day').diff(eventStartDay, 'day') + 1
	const dayIndex = day.startOf('day').diff(eventStartDay, 'day') + 1
	const dayCounter =
		totalDays > 1 ? `${t('day')} ${dayIndex}/${totalDays}` : null

	return (
		<button
			className="hover:bg-accent flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm"
			onClick={() => onClick(event)}
			type="button"
		>
			<span className="text-muted-foreground w-20 shrink-0">{timeLabel}</span>
			<span
				className="size-2 shrink-0 rounded-full"
				style={{ backgroundColor: event.color }}
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
