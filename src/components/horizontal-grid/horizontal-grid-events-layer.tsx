import { memo } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import type { PositionedEvent } from '@/lib/utils/position-week-events'

export interface HorizontalGridEventsLayerProps {
	days: Dayjs[]
	resourceId?: string | number
	'data-testid'?: string
	/** Pre-computed positioned events — computed at the row level by useProcessedWeekEvents */
	positionedEvents: PositionedEvent[]
}

const NoMemoHorizontalGridEventsLayer: React.FC<
	HorizontalGridEventsLayerProps
> = ({ days, resourceId, 'data-testid': dataTestId, positionedEvents }) => {
	const weekStart = days.at(0)?.startOf('day')

	return (
		<div
			className="absolute inset-0 pointer-events-none z-10 overflow-clip"
			data-testid={dataTestId}
		>
			{positionedEvents.map((event) => {
				const eventKey = `${event.id}-${resourceId ?? 'no-resource'}`

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip transition-all duration-300 ease-out"
						data-left={event.left}
						data-testid={`horizontal-event-${event.id}`}
						data-top={event.top}
						data-width={event.width}
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
