import { useCalendarContext } from '@/contexts/calendar-context/context'
import { useMemo } from 'react'
import { DraggableEvent } from '../draggable-event/draggable-event'
import { DroppableCell } from '../droppable-cell/droppable-cell'
import type { CalendarEvent, ProcessedCalendarEvent } from '@/components/types'
import { EVENT_BAR_HEIGHT } from '@/lib/constants'

export const DayAllDayRow = () => {
  const { currentDate, getEventsForDate } = useCalendarContext()

  // Get current day's events - this will refresh automatically when store updates
  // because getEventsForDate is a selector function from the store that runs whenever events change
  const dayEvents = getEventsForDate(currentDate)

  // Separate all-day events from regular events
  const { allDayEvents } = useMemo(() => {
    // Only events explicitly marked as all_day should be in the all-day section
    const allDayEvts = dayEvents.filter((event) => event.all_day)

    // Regular events (including multi-day events)
    const regularEvts = dayEvents.filter((event) => !event.all_day)

    return { allDayEvents: allDayEvts, regularEvents: regularEvts }
  }, [dayEvents]) // Only depend on the dayEvents which is refreshed automatically

  // Process all-day events for display
  const { processedAllDayEvents } = useMemo(() => {
    // Sort all-day events (if needed)
    const sortedEvents = [...allDayEvents].sort((a, b) => {
      return a.start.diff(b.start)
    })

    // Track positions in rows for stacking
    const rows: { event: CalendarEvent }[][] = []
    const processedEvents: ProcessedCalendarEvent[] = []

    sortedEvents.forEach((event, rowIndex) => {
      let placed = false

      while (!placed) {
        if (rowIndex >= rows.length) {
          // Create a new row if needed
          rows.push([])
          placed = true
        } else {
          // In day view, we can place one event per row as they don't overlap horizontally
          // This is simpler than week view where we needed to check for overlaps
          placed = true
        }
      }

      // Add event to the row
      rows[rowIndex].push({ event })

      // Add processed event with correct positioning
      processedEvents.push({
        ...event,
        left: 0,
        width: 100,
        top: rowIndex * EVENT_BAR_HEIGHT,
        height: EVENT_BAR_HEIGHT,
        all_day: true,
      })
    })

    return {
      processedAllDayEvents: processedEvents,
      allDayRowsCount: Math.max(1, rows.length), // At least 1 row, even if empty
    }
  }, [allDayEvents])

  return (
    <div
      data-testid="day-all-day-row"
      className="grid grid-cols-8 border-b border-x"
    >
      {/* Left label for all-day events */}
      <div className="sticky left-0 z-10 col-span-2 flex shrink-0 items-center justify-end border-r pr-2 md:col-span-1">
        <span className="text-muted-foreground text-[10px] whitespace-nowrap sm:text-xs">
          All-day
        </span>
      </div>

      {/* All-day events container with dynamic height */}
      <div className="relative col-span-6 md:col-span-7 ">
        <DroppableCell
          id={`all-day-${currentDate.format('YYYY-MM-DD')}`}
          type="day-cell"
          date={currentDate}
          hour={0}
          minute={0}
          className="hover:bg-accent w-full cursor-pointer min-h-10 flex flex-col"
        >
          {processedAllDayEvents.map((event, index) => {
            return (
              <div
                key={`all-day-${event.id}-${index}`}
                style={{ height: EVENT_BAR_HEIGHT + 'px' }}
              >
                <DraggableEvent
                  elementId={`all-day-${event.id}-${index}`}
                  event={event}
                  className="overflow-hidden text-xs"
                  style={{ width: `calc(100% - var(--spacing) * 2)` }}
                />
              </div>
            )
          })}
        </DroppableCell>
      </div>
    </div>
  )
}
