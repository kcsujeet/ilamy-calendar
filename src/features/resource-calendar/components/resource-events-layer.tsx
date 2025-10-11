import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import type dayjs from '@/lib/dayjs-config'
import { useProcessedResourceWeekEvents } from '../hooks/useProcessedResourceWeekEvents'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'

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
        return (
          <div
            key={`event-${event.id}-${event.position}-${weekStart.format(
              'YYYY-MM-DD'
            )}`}
            className="absolute z-10 pointer-events-auto overflow-clip"
            style={{
              left: `calc(${event.left}% + var(--spacing) * 0.25)`,
              width: `calc(${event.width}% - var(--spacing) * 1)`,
              top: `${event.top}px`,
              height: `${EVENT_BAR_HEIGHT}px`,
            }}
            data-testid={`week-event-layer-event-${event.id}`}
          >
            <DraggableEvent
              elementId={`event-${event.id}-${
                event.position
              }-${weekStart.format('YYYY-MM-DD')}`}
              event={event}
              className="h-full w-full shadow"
            />
          </div>
        )
      })}
    </div>
  )
}
