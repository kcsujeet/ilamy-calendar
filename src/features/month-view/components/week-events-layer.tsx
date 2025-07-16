import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import dayjs from '@/lib/dayjs-config'
import { DraggableEvent } from '@/features/draggable-event/draggable-event'
import {
  DAY_NUMBER_HEIGHT,
  EVENT_BAR_HEIGHT,
  GAP_BETWEEN_ELEMENTS,
} from '@/lib/constants'

interface ProcessedEvent extends CalendarEvent {
  left: number // Left position in percentage
  width: number // Width in percentage
  top: number // Top position in percentage
  height: number // Height in percentage
  position: number // Position in the row (0 for first, 1 for second, etc.)
}

interface WeekEventsLayerProps {
  days: dayjs.Dayjs[]
}

export const WeekEventsLayer: React.FC<WeekEventsLayerProps> = ({ days }) => {
  const { events, dayMaxEvents } = useCalendarContext()

  const weekStart = days[0]
  const weekEnd = days[6]

  // Get all events that intersect with this week
  const weekEvents = events.filter((e) => {
    const startsInWeek =
      e.start.isSameOrAfter(weekStart.startOf('day')) &&
      e.start.isSameOrBefore(weekEnd.endOf('day'))
    const endsInWeek =
      e.end.isSameOrAfter(weekStart.startOf('day')) &&
      e.end.isSameOrBefore(weekEnd.endOf('day'))
    const spansWeek =
      e.start.isBefore(weekStart.startOf('day')) &&
      e.end.isAfter(weekEnd.endOf('day'))
    return startsInWeek || endsInWeek || spansWeek
  })

  // Separate multi-day and single-day events
  const multiDayEvents = weekEvents.filter(
    (e) => e.end.diff(e.start, 'day') > 0
  )
  const singleDayEvents = weekEvents.filter(
    (e) => e.end.diff(e.start, 'day') === 0
  )

  // Sort multi-day events by start date, then by duration
  const sortedMultiDay = [...multiDayEvents].sort((a, b) => {
    const startDiff = a.start.diff(b.start)
    if (startDiff !== 0) return startDiff
    return b.end.diff(b.start) - a.end.diff(a.start) // Longer events first
  })

  // Sort single-day events by start time
  const sortedSingleDay = [...singleDayEvents].sort((a, b) =>
    a.start.diff(b.start)
  )

  // Create 7 x dayMaxEvents grid with flags
  const grid: Array<Array<{ taken: boolean; event: CalendarEvent | null }>> = []
  for (let row = 0; row < dayMaxEvents; row++) {
    grid[row] = []
    for (let col = 0; col < 7; col++) {
      grid[row][col] = { taken: false, event: null }
    }
  }

  const eventPositions: ProcessedEvent[] = []

  // Step 1: Assign positions to multi-day events first
  for (const event of sortedMultiDay) {
    const eventStart = dayjs.max(event.start.startOf('day'), weekStart)
    const eventEnd = dayjs.min(event.end.startOf('day'), weekEnd)
    const startCol = Math.max(0, eventStart.diff(weekStart, 'day'))
    const endCol = Math.min(6, eventEnd.diff(weekStart, 'day'))

    // Try to place the event starting from its original start column
    let placedSuccessfully = false

    // First try: place from original start position
    let assignedRow = -1
    for (let row = 0; row < dayMaxEvents; row++) {
      let canPlace = true
      for (let col = startCol; col <= endCol; col++) {
        if (grid[row][col].taken) {
          canPlace = false
          break
        }
      }
      if (canPlace) {
        assignedRow = row
        break
      }
    }

    // If we found a row, assign the event to all its columns
    if (assignedRow !== -1) {
      for (let col = startCol; col <= endCol; col++) {
        grid[assignedRow][col] = { taken: true, event }
      }

      // Create position data for rendering
      const spanDays = endCol - startCol + 1
      eventPositions.push({
        left: (startCol / 7) * 100,
        width: (spanDays / 7) * 100,
        top:
          DAY_NUMBER_HEIGHT +
          GAP_BETWEEN_ELEMENTS +
          assignedRow * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS),
        height: EVENT_BAR_HEIGHT,
        position: assignedRow,
        ...event,
      })
      placedSuccessfully = true
    }

    // If couldn't place at original position, try truncated versions starting from later days
    if (!placedSuccessfully) {
      for (
        let tryStartCol = startCol + 1;
        tryStartCol <= endCol;
        tryStartCol++
      ) {
        // Try to place the truncated event starting from this column
        let truncatedAssignedRow = -1
        for (let row = 0; row < dayMaxEvents; row++) {
          let canPlace = true
          for (let col = tryStartCol; col <= endCol; col++) {
            if (grid[row][col].taken) {
              canPlace = false
              break
            }
          }
          if (canPlace) {
            truncatedAssignedRow = row
            break
          }
        }

        // If we found a row for the truncated version, place it
        if (truncatedAssignedRow !== -1) {
          for (let col = tryStartCol; col <= endCol; col++) {
            grid[truncatedAssignedRow][col] = { taken: true, event }
          }

          // Create position data for the truncated rendering
          const truncatedSpanDays = endCol - tryStartCol + 1
          eventPositions.push({
            left: (tryStartCol / 7) * 100,
            width: (truncatedSpanDays / 7) * 100,
            top:
              DAY_NUMBER_HEIGHT +
              GAP_BETWEEN_ELEMENTS +
              truncatedAssignedRow * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS),
            height: EVENT_BAR_HEIGHT,
            position: truncatedAssignedRow,
            ...event,
          })
          placedSuccessfully = true
          break // Successfully placed, stop trying other start positions
        }
      }
    }
  }

  // Step 2: Fill gaps with single-day events
  for (const event of sortedSingleDay) {
    const eventStart = dayjs.max(event.start.startOf('day'), weekStart)
    const col = Math.max(0, eventStart.diff(weekStart, 'day'))

    // Find the first available row in this column
    let assignedRow = -1
    for (let row = 0; row < dayMaxEvents; row++) {
      if (!grid[row][col].taken) {
        assignedRow = row
        break
      }
    }

    // If we found a row, assign the event
    if (assignedRow !== -1) {
      grid[assignedRow][col] = { taken: true, event }

      // Create position data for rendering
      eventPositions.push({
        left: (col / 7) * 100,
        width: (1 / 7) * 100,
        top:
          DAY_NUMBER_HEIGHT +
          GAP_BETWEEN_ELEMENTS +
          assignedRow * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS),
        height: EVENT_BAR_HEIGHT,
        position: assignedRow,
        ...event,
      })
    }
  }

  return (
    <div className="relative w-full h-full pointer-events-none z-20 overflow-hidden">
      {eventPositions.map((event) => {
        return (
          <div
            key={`event-${event.id}-${event.position}-${weekStart.format(
              'YYYY-MM-DD'
            )}`}
            className="absolute z-10 pointer-events-auto overflow-hidden"
            style={{
              left: `calc(${event.left}% + var(--spacing) * 0.25)`,
              width: `calc(${event.width}% - var(--spacing) * 1)`,
              top: `${event.top}px`,
              height: `${EVENT_BAR_HEIGHT}px`,
            }}
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
