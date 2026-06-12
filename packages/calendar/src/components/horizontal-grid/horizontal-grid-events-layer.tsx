import type { Resource } from '@ilamy/types'
import { memo } from 'react'
import { CurrentTimeIndicator } from '@/components/current-time-indicator'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { DAY_NUMBER_HEIGHT } from '@/lib/constants'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { keys } from '@/lib/utils/keys'

export interface HorizontalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[]
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
	positionedEvents: HorizontalPositionedEvent[]
	/** Pixel offset reserved above the bars (the day-number strip). */
	dayNumberHeight?: number
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
	dayNumberHeight = DAY_NUMBER_HEIGHT,
}) => {
	const { eventHeight, eventSpacing } = useSmartCalendarContext()
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
			{positionedEvents.map((positioned) => {
				const { event, row } = positioned
				// Layout returns the abstract row; the renderer owns the CSS units.
				const top =
					dayNumberHeight + eventSpacing + row * (eventHeight + eventSpacing)
				const eventKey = `${event.id}-${row}-${weekStart?.toISOString()}-${resourceId ?? 'no-resource'}`

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip"
						data-left={positioned.left}
						data-testid={keys.container.horizontal.event(event.id)}
						data-top={top}
						data-width={positioned.width}
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `calc(${positioned.left}% + var(--spacing) * 0.25)`,
							width: `calc(${positioned.width}% - var(--spacing) * 1)`,
							top: `${top}px`,
							height: `${eventHeight}px`,
						}}
					>
						<DraggableEvent
							className="h-full w-full shadow"
							elementId={eventKey}
							event={event}
							isTruncatedEnd={positioned.isTruncatedEnd}
							isTruncatedStart={positioned.isTruncatedStart}
						/>
					</div>
				)
			})}
		</div>
	)
}

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer)
