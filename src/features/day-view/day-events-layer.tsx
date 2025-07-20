import { useProcessedDayEvents } from '@/hooks/useProcessedDayEvents'
import { DraggableEvent } from '../draggable-event/draggable-event'
import type dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'

interface DayEventsLayerProps {
  day: dayjs.Dayjs // The specific day this layer represents
  'data-testid'?: string
}

export const DayEventsLayer: React.FC<DayEventsLayerProps> = ({
  day,
  'data-testid': dataTestId,
}) => {
  const todayEvents = useProcessedDayEvents({ day })

  return (
    <div
      data-testid={dataTestId}
      className="pointer-events-none absolute inset-0 z-30"
    >
      {todayEvents.map((event, index) => {
        const veryVeryUniqueKey = `event-${event.id}-${index}-${day.format(
          'YYYY-MM-DD'
        )}`
        const isShortEvent = event.end.diff(event.start, 'minute') <= 15
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
              className={cn('pointer-events-auto absolute', {
                '[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
              })}
            />
          </div>
        )
      })}
    </div>
  )
}
