import { memo } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/useProcessedWeekEvents'
import type dayjs from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'

interface WeekEventsLayerProps {
	days: dayjs.Dayjs[]
	allDay?: boolean
	dayNumberHeight?: number
	resourceId?: string | number
}

const WeekEventsLayer: React.FC<WeekEventsLayerProps> = ({
	days,
	allDay,
	dayNumberHeight,
	resourceId,
}) => {
	const weekStart = days[0]
	const processedWeekEvents = useProcessedWeekEvents({
		days,
		allDay,
		dayNumberHeight,
		resourceId,
	})

	return (
		<div className="relative w-full h-full pointer-events-none z-10 overflow-clip">
			{processedWeekEvents.map((event) => {
				const eventKey = `${event.id}-${event.position}-${weekStart.toISOString()}-${resourceId ?? 'no-resource'}`

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

const memoizedWeekEventsLayer = memo(WeekEventsLayer)
export { memoizedWeekEventsLayer as WeekEventsLayer }
