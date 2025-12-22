import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import type dayjs from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import { useProcessedResourceWeekEvents } from '../hooks/useProcessedResourceWeekEvents'

interface WeekEventsLayerProps {
	days: dayjs.Dayjs[]
	gridType?: 'day' | 'hour'
	resourceId: string | number
}

export const ResourceEventsLayer: React.FC<WeekEventsLayerProps> = ({
	days,
	gridType = 'day',
	resourceId,
}) => {
	const weekStart = days[0].startOf('day')
	const processedWeekEvents = useProcessedResourceWeekEvents({
		days,
		gridType,
		resourceId,
	})

	return (
		<div className="relative w-full h-full pointer-events-none z-10 overflow-clip">
			{processedWeekEvents.map((event) => {
				const eventKey = `${resourceId}-event-${event.id}-${event.position}-${weekStart.toISOString()}`

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip"
						data-testid={`week-event-layer-event-${event.id}`}
						key={`${eventKey}-wrapper`}
						style={{
							left: `calc(${event.left}% + var(--spacing) * 0.25)`,
							width: `calc(${event.width}% - var(--spacing) * 1)`,
							top: `${event.top}px`,
							height: `${EVENT_BAR_HEIGHT}px`,
						}}
					>
						<DraggableEvent
							className="h-full w-full shadow"
							elementId={eventKey}
							event={event}
						/>
					</div>
				)
			})}
		</div>
	)
}
