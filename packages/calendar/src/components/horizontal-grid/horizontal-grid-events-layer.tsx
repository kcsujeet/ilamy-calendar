import { memo } from 'react'
import { CurrentTimeIndicator } from '@/components/current-time-indicator'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { keys } from '@/lib/utils/keys'
import type { PositionedEvent } from '@/lib/utils/position-week-events'

export interface HorizontalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[]
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
	positionedEvents: PositionedEvent[]
}

const NoMemoHorizontalGridEventsLayer: React.FC<
	HorizontalGridEventsLayerProps
> = ({
	gridType = 'day',
	days,
	resourceId,
	resource,
	'data-testid': dataTestId,
	positionedEvents,
}) => {
	const { eventHeight } = useSmartCalendarContext()
	const weekStart = days.at(0)?.startOf('day')

	// Now-line is gated to hour-resolution horizontal grids (resource day horizontal,
	// resource week horizontal hourly). Day-resolution grids — regular MonthView and
	// resource MonthView — skip it; a 24h-percentage line per cell would be a
	// meaningless 1px sliver.
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	return (
		<div
			className="absolute inset-0 pointer-events-none z-10 overflow-clip"
			data-testid={dataTestId}
		>
			{showNowLine && rangeStart && rangeEnd && (
				<CurrentTimeIndicator
					axis="horizontal"
					rangeEnd={rangeEnd}
					rangeStart={rangeStart}
					resource={resource}
				/>
			)}
			{positionedEvents.map((event) => {
				const eventKey = `${event.id}-${event.position}-${weekStart?.toISOString()}-${resourceId ?? 'no-resource'}`

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip"
						data-left={event.left}
						data-testid={keys.container.horizontal.event(event.id)}
						data-top={event.top}
						data-width={event.width}
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `calc(${event.left}% + var(--spacing) * 0.25)`,
							width: `calc(${event.width}% - var(--spacing) * 1)`,
							top: `${event.top}px`,
							height: `${eventHeight}px`,
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
