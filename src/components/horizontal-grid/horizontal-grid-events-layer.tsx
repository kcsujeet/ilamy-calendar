import { memo } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/useProcessedWeekEvents'
import type dayjs from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import { ids } from '@/lib/utils/ids'

export interface HorizontalGridEventsLayerProps {
	days: dayjs.Dayjs[]
	gridType?: 'day' | 'hour'
	resourceId?: string | number
	dayNumberHeight?: number
	allDay?: boolean
}

const NoMemoHorizontalGridEventsLayer: React.FC<
	HorizontalGridEventsLayerProps
> = ({ days, gridType = 'day', resourceId, dayNumberHeight, allDay }) => {
	const weekStart = days.at(0).startOf('day')

	const processedWeekEvents = useProcessedWeekEvents({
		days,
		gridType,
		resourceId,
		dayNumberHeight,
		allDay,
	})

	return (
		<div
			className="relative w-full h-full pointer-events-none z-10 overflow-clip"
			data-testid={ids.horizontalEvents(resourceId || '')}
		>
			{processedWeekEvents.map((event) => {
				const eventKey = ids.draggableEventWrapper(
					event.id,
					event.position,
					weekStart.toISOString(),
					resourceId
				)

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip"
						data-testid={`horizontal-event-${event.id}`}
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

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer)
