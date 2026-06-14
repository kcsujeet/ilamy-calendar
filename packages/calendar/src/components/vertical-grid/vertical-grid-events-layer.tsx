import type { Resource } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo } from 'react'
import { CurrentTimeMarker } from '@/components/current-time-marker'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { useProcessedDayEvents } from '@/features/calendar/hooks/useProcessedDayEvents'
import { keys } from '@/lib/utils/keys'

interface VerticalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[] // The specific day this layer represents
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
}

const NoMemoVerticalGridEventsLayer: React.FC<VerticalGridEventsLayerProps> = ({
	days,
	gridType = 'hour',
	resourceId,
	resource,
	'data-testid': dataTestId,
}) => {
	const { resources } = useSmartCalendarContext((c) => ({
		resources: c.resources,
	}))
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	// Stacked resource rows share one continuous now-line; only the first resource
	// (or a non-resource grid) draws the dot at its start, so it isn't repeated.
	const isFirstResource = !resourceId || resources?.at(0)?.id === resourceId
	// Only show the "now" line in hour-resolution grids. In day-resolution
	// vertical views (resource month, resource week daily) a sub-day percentage
	// line is meaningless, so suppress it — mirrors the horizontal events layer.
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	return (
		<div
			className="relative w-full h-full pointer-events-none z-10 overflow-clip"
			data-testid={dataTestId}
		>
			{showNowLine && rangeStart && rangeEnd && (
				<CurrentTimeMarker
					rangeEnd={rangeEnd}
					rangeStart={rangeStart}
					resource={resource}
					withDot={isFirstResource}
				/>
			)}
			{todayEvents.map((positioned, index) => {
				const { event } = positioned
				const eventKey = `event-${event.id}-${index}-${days.at(0)?.toISOString()}-${resourceId ?? 'no-resource'}`
				const isShortEvent = event.end.diff(event.start, 'minute') <= 15

				return (
					<div
						className="absolute"
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `${positioned.left}%`,
							width: `calc(${positioned.width}% - var(--spacing) * 2)`,
							top: `${positioned.top}%`,
							height: `${positioned.height}%`,
						}}
					>
						<DraggableEvent
							className={cn('pointer-events-auto', {
								'[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
							})}
							elementId={eventKey}
							event={event}
						/>
					</div>
				)
			})}
		</div>
	)
}

export const VerticalGridEventsLayer = memo(NoMemoVerticalGridEventsLayer)
