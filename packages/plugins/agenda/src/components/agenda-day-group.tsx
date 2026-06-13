import { listKey } from '@ilamy/utils/helpers'
import type { AgendaDayGroupData } from '../utils/group-events-by-day'
import { AgendaEventRow } from './agenda-event-row'

interface AgendaDayGroupProps {
	group: AgendaDayGroupData
}

export const AgendaDayGroup = ({ group }: AgendaDayGroupProps) => (
	<div
		className="flex gap-4 border-b px-2 py-3"
		data-testid={listKey('agenda-day', group.key)}
	>
		<div className="text-muted-foreground w-16 shrink-0">
			<div className="text-foreground text-lg font-medium">
				{group.date.format('D')}
			</div>
			<div className="text-xs uppercase">{group.date.format('ddd, MMM')}</div>
		</div>
		<div className="flex flex-1 flex-col gap-1">
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
