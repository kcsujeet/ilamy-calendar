import { useIlamyCalendarContext } from '@ilamy/calendar/react'
import {
	CurrentTimeIndicator,
	type CurrentTimeIndicatorRenderProps,
} from '@ilamy/ui/components/current-time-indicator'
import { DayLabel } from '@ilamy/ui/components/day-label'
import { listKey } from '@ilamy/utils/helpers'
import {
	endOf,
	formatDate,
	isSameDay,
	now,
	startOf,
} from '@ilamy/utils/temporal'
import type { ReactNode } from 'react'
import type { AgendaDayGroupData } from '../utils/group-events-by-day'
import { AgendaEventRow } from './agenda-event-row'

interface AgendaDayGroupProps {
	group: AgendaDayGroupData
}

export const AgendaDayGroup = ({ group }: AgendaDayGroupProps) => {
	const { view, renderCurrentTimeIndicator, currentLocale } =
		useIlamyCalendarContext()
	const isToday = isSameDay(group.date, now(group.date.timeZoneId))

	let renderIndicator:
		((props: CurrentTimeIndicatorRenderProps) => ReactNode) | undefined
	if (renderCurrentTimeIndicator) {
		renderIndicator = (props) => renderCurrentTimeIndicator({ ...props, view })
	}

	return (
		<div
			className="flex gap-4 border-b px-2 py-3"
			data-testid={listKey('agenda-day', group.key)}
		>
			<div className="text-muted-foreground flex w-16 shrink-0 flex-col items-center text-center">
				<DayLabel
					className="flex-col-reverse"
					dayNumber={String(group.date.day)}
					today={isToday}
					weekday={formatDate(group.date, { weekday: 'short' }, currentLocale)}
				/>
			</div>
			<div className="relative flex flex-1 flex-col gap-1">
				{isToday && (
					<CurrentTimeIndicator
						rangeEnd={endOf(group.date, 'day')}
						rangeStart={startOf(group.date, 'day')}
						render={renderIndicator}
					/>
				)}
				{group.entries.map((entry) => (
					<AgendaEventRow
						entry={entry}
						key={listKey(group.key, entry.event.id)}
					/>
				))}
			</div>
		</div>
	)
}
