import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import { useProcessedWeekEvents } from '@/features/calendar/hooks/useProcessedWeekEvents'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'
import type dayjs from '@/lib/configs/dayjs-config'

interface WeekEventsLayerProps {
  days: dayjs.Dayjs[]
}

export const WeekEventsLayer: React.FC<WeekEventsLayerProps> = ({ days }) => {
  const weekStart = days[0]
  const processedWeekEvents = useProcessedWeekEvents({ days })

  return (
    <div className="relative w-full h-full pointer-events-none z-10 overflow-clip">
      {processedWeekEvents.map((event) => {
        const eventKey = `${event.id}-${event.position}-${weekStart.toISOString()}`

        return (
          <div
            key={`${eventKey}-wrapper`}
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
              elementId={eventKey}
              event={event}
              className="h-full w-full shadow"
            />
          </div>
        )
      })}
    </div>
  )
}
