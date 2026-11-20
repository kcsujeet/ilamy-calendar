import { useIlamyCalendarContext } from '@ilamy/calendar'
import { ScrollArea } from '@ilamy/ui/components/scroll-area'
import { now, parseDate, resolveZone, toOffsetIso } from '@ilamy/utils/temporal'
import { type AgendaWindow, windowRange } from '../utils/agenda-window'
import { groupEventsByDay } from '../utils/group-events-by-day'
import { AgendaDayGroup } from './agenda-day-group'

interface AgendaViewProps {
	window: AgendaWindow
}

export const AgendaView = ({ window }: AgendaViewProps) => {
	const {
		currentDate: currentDateIso,
		timezone,
		getEventsForDateRange,
		t,
		firstDayOfWeek,
	} = useIlamyCalendarContext()
	const zone = resolveZone(timezone)
	const currentDate = parseDate(currentDateIso, zone) ?? now(zone)

	const range = windowRange(currentDate, window, firstDayOfWeek)
	const events = getEventsForDateRange(
		toOffsetIso(range.start),
		toOffsetIso(range.end)
	)
	const groups = groupEventsByDay(events, range)

	if (groups.length === 0) {
		return (
			<div
				className="text-muted-foreground flex h-full items-center justify-center p-4 text-sm"
				data-testid="agenda-empty"
			>
				{t('agendaNoEvents')}
			</div>
		)
	}

	return (
		<ScrollArea className="h-full" data-testid="agenda-view">
			<div className="flex flex-col">
				{groups.map((group) => (
					<AgendaDayGroup group={group} key={group.key} />
				))}
			</div>
		</ScrollArea>
	)
}
