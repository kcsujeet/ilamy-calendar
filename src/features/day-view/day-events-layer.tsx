import { useProcessedDayEvents } from '@/hooks/useProcessedDayEvents'
import { DraggableEvent } from '../draggable-event/draggable-event'
import type dayjs from 'dayjs'

interface DayEventsLayerProps {
  day: dayjs.Dayjs // The specific day this layer represents
}

export const DayEventsLayer: React.FC<DayEventsLayerProps> = ({ day }) => {
  const todayEvents = useProcessedDayEvents({ day })

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {todayEvents.map((event, index) => {
        const veryVeryUniqueKey = `event-${event.id}-${index}-${day.format(
          'YYYY-MM-DD'
        )}`
        return (
          <div
            key={`container-${veryVeryUniqueKey}`}
            className="absolute"
            style={{
              left: `${event.left}%`,
              width: `calc(${event.width}% - var(--spacing) * 2)`,
              top: `${event.top}%`,
              height: `${event.height}%`,
            }}
          >
            <DraggableEvent
              elementId={`draggable-${veryVeryUniqueKey}`}
              event={event}
              className="pointer-events-auto absolute"
            />
          </div>
        )
      })}
    </div>
  )
}
