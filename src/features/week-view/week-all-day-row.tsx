import { useCalendarContext } from '@/contexts/calendar-context/context'
import type dayjs from '@/lib/dayjs-config'
import React, { useMemo } from 'react'
import { DraggableEvent } from '../draggable-event/draggable-event'
import { DroppableCell } from '../droppable-cell/droppable-cell'
import type { CalendarEvent, ProcessedCalendarEvent } from '@/components/types'
import { EVENT_BAR_HEIGHT, GAP_BETWEEN_ELEMENTS } from '@/lib/constants'

export const WeekAllDayRow: React.FC = () => {
  const { currentDate, getEventsForDateRange, firstDayOfWeek, t } =
    useCalendarContext()

  // Get start and end of current week based on firstDayOfWeek setting
  const startOfWeek = currentDate.startOf('week').day(firstDayOfWeek)
  // If current date is before the start of week, move back one week
  const adjustedStartOfWeek = currentDate.isBefore(startOfWeek)
    ? startOfWeek.subtract(1, 'week')
    : startOfWeek
  const endOfWeek = adjustedStartOfWeek.add(6, 'day')

  // Create an array of days for the current week
  const weekDays = []
  for (let i = 0; i < 7; i++) {
    weekDays.push(adjustedStartOfWeek.add(i, 'day'))
  }

  // Get events that might overlap with this week (expand search range)
  const expandedStartDate = adjustedStartOfWeek.subtract(6, 'day') // Look 6 days before week start
  const expandedEndDate = endOfWeek.add(6, 'day') // Look 6 days after week end
  const weekEvents = getEventsForDateRange(expandedStartDate, expandedEndDate)

  // Separate all-day events from regular events (including multi-day events)
  const allDayEvents = weekEvents.filter((event) => event.allDay)

  // Process and layout all-day events to avoid overlapping
  const { processedAllDayEvents } = useMemo(() => {
    // Sort all-day events by start date and then by duration (longer events first)
    const sortedEvents = [...allDayEvents].sort((a, b) => {
      // First compare by start date
      const startDiff = a.start.diff(b.start)
      if (startDiff !== 0) {
        return startDiff
      }

      // If start dates are the same, longer events come first
      const aDuration = a.end.diff(a.start)
      const bDuration = b.end.diff(b.start)
      return bDuration - aDuration
    })

    // Track positions in rows
    const rows: { end: dayjs.Dayjs; event: CalendarEvent }[][] = []
    const processedEvents: ProcessedCalendarEvent[] = []

    sortedEvents.forEach((event) => {
      // Calculate which days this event spans
      const eventStart = event.start.isBefore(adjustedStartOfWeek)
        ? adjustedStartOfWeek
        : event.start
      const eventEnd = event.end.isAfter(endOfWeek) ? endOfWeek : event.end

      // Calculate position as percentage of the week width
      const startDayIndex = Math.max(
        0,
        eventStart.diff(adjustedStartOfWeek, 'day')
      )
      const endDayIndex = Math.min(6, eventEnd.diff(adjustedStartOfWeek, 'day'))

      const left = (startDayIndex / 7) * 100
      const width = ((endDayIndex - startDayIndex + 1) / 7) * 100

      // Find a row where this event can fit
      let rowIndex = 0
      let placed = false

      while (!placed) {
        if (rowIndex >= rows.length) {
          // Create a new row if needed
          rows.push([])
          placed = true
        } else {
          // Check if this event can fit in the current row
          const row = rows[rowIndex]
          const canFit = row.every((item) => {
            return (
              eventStart.isAfter(item.end) ||
              eventEnd.isBefore(item.event.start)
            )
          })

          if (canFit) {
            placed = true
          } else {
            rowIndex++
          }
        }
      }

      // Add event to the row
      rows[rowIndex].push({ end: eventEnd, event })

      // Add processed event with correct positioning
      processedEvents.push({
        ...event,
        left,
        width,
        top: rowIndex * (EVENT_BAR_HEIGHT + GAP_BETWEEN_ELEMENTS),
        height: EVENT_BAR_HEIGHT,
        allDay: true,
      })
    })

    return {
      processedAllDayEvents: processedEvents,
      allDayRowsCount: Math.max(1, rows.length), // At least 1 row, even if empty
    }
  }, [allDayEvents, adjustedStartOfWeek, endOfWeek])

  return (
    <div
      className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr] grid-rows-1 relative"
      data-testid="week-all-day-row"
    >
      {/* Left label for all-day events */}
      <div className="w-16 flex shrink-0 items-center justify-end border-x border-b px-1 min-h-16">
        <span className="text-muted-foreground text-[10px] whitespace-nowrap sm:text-xs">
          {t('allDay')}
        </span>
      </div>

      {/* Droppable cells for each day */}
      {weekDays.map((day) => (
        <DroppableCell
          key={`all-day-${day.format('YYYY-MM-DD')}`}
          id={`all-day-cell-${day.format('YYYY-MM-DD')}`}
          type="day-cell"
          date={day}
          className="hover:bg-accent h-full flex-1 cursor-pointer border-r border-b"
        />
      ))}

      {/* All-day event blocks */}
      <div className="absolute inset-0 z-10 p-1 col-span-7 col-start-2">
        {processedAllDayEvents.map((event, index) => (
          <div
            key={`all-day-container-${event.id}`}
            className="absolute"
            style={{
              left: `${event.left}%`,
              width: `calc(${event.width}% - var(--spacing) * 2)`,
              top: `${event.top}px`,
              height: `${event.height}px`,
            }}
          >
            <DraggableEvent
              elementId={`all-day-${event.id}-${index}`}
              event={event}
              key={`all-day-${event.id}-${index}`}
              className="h-full w-full overflow-clip text-xs absolute"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
