import { useIlamyCalendarContext } from '@ilamy/calendar'
import {
	CurrentTimeIndicator,
	type CurrentTimeIndicatorRenderProps,
} from '@ilamy/ui/components/current-time-indicator'
import { DayLabel } from '@ilamy/ui/components/day-label'
import dayjs from '@ilamy/utils/dayjs'
import { listKey } from '@ilamy/utils/helpers'
import type { ReactNode } from 'react'
import type { AgendaDayGroupData } from '../utils/group-events-by-day'
import { AgendaEventRow } from './agenda-event-row'

interface AgendaDayGroupProps {
	group: AgendaDayGroupData
}

export const AgendaDayGroup = ({ group }: AgendaDayGroupProps) => {
	const { view, renderCurrentTimeIndicator } = useIlamyCalendarContext()
	const isToday = group.date.isSame(dayjs(), 'day')

	let renderIndicator:
		| ((props: CurrentTimeIndicatorRenderProps) => ReactNode)
		| undefined
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
					dayNumber={group.date.format('D')}
					today={isToday}
					weekday={group.date.format('ddd')}
				/>
			</div>
			{/* Treat the day group as a full day: the shared indicator positions a
			    red line at the current time's % through the day (today only). */}
			<div className="relative flex flex-1 flex-col gap-1">
				{isToday && (
					<CurrentTimeIndicator
						rangeEnd={group.date.endOf('day')}
						rangeStart={group.date.startOf('day')}
						render={renderIndicator}
					/>
				)}
				{group.events.map((event) => (
					<AgendaEventRow
						day={group.date}
						event={event}
						key={listKey(group.key, event.id)}
					/>
				))}
			</div>
		</div>
	)
}
