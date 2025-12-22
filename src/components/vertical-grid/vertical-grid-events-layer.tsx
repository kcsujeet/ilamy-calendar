import { memo } from 'react'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useProcessedDayEvents } from '@/features/calendar/hooks/useProcessedDayEvents'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'

interface VerticalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: dayjs.Dayjs[] // The specific day this layer represents
	resourceId?: string | number
	'data-testid'?: string
}

const NoMemoVerticalGridEventsLayer: React.FC<VerticalGridEventsLayerProps> = ({
	days,
	gridType = 'hour',
	resourceId,
	'data-testid': dataTestId,
}) => {
	const todayEvents = useProcessedDayEvents({ days, gridType, resourceId })

	return (
		<div
			className="relative w-full h-full pointer-events-none z-10 overflow-clip"
			data-testid={dataTestId}
		>
			{todayEvents.map((event, index) => {
				const eventKey = `event-${event.id}-${index}-${days.at(0).toISOString()}-${resourceId ?? 'no-resource'}`
				const isShortEvent = event.end.diff(event.start, 'minute') <= 15

				return (
					<div
						className="absolute"
						key={`${eventKey}-wrapper`}
						style={{
							left: `${event.left}%`,
							width: `calc(${event.width}% - var(--spacing) * 2)`,
							top: `${event.top}%`,
							height: `${event.height}%`,
						}}
					>
						<DraggableEvent
							className={cn('pointer-events-auto absolute', {
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
