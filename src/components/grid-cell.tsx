import type { CalendarEvent } from '@/components/types'
import type dayjs from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import React, { useMemo } from 'react'
import { AllEventDialog } from './all-events-dialog'
import type { SelectedDayEvents } from './all-events-dialog'
import { DroppableCell } from './droppable-cell'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { isBusinessHour } from '@/features/calendar/utils/business-hours'

interface GridProps {
  index: number // Index of the day in the week (0-6)
  day: dayjs.Dayjs
  dayMaxEvents?: number
  className?: string // Optional className for custom styling
  resourceId?: string | number // Optional resource ID for resource-specific day cells
  gridType?: 'day' | 'hour' // Future use for different grid types
}

export const GridCell: React.FC<GridProps> = ({
  index,
  day,
  className = '',
  resourceId,
  gridType = 'day',
}) => {
  const allEventsDialogRef = React.useRef<{
    open: () => void
    close: () => void
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
  }>(null)
  const {
    dayMaxEvents = 0,
    getEventsForDateRange,
    currentDate,
    firstDayOfWeek,
    t,
    getEventsForResource,
    businessHours,
  } = useSmartCalendarContext((state) => ({
    dayMaxEvents: state.dayMaxEvents,
    getEventsForDateRange: state.getEventsForDateRange,
    currentDate: state.currentDate,
    firstDayOfWeek: state.firstDayOfWeek,
    t: state.t,
    getEventsForResource: state.getEventsForResource,
    businessHours: state.businessHours,
  }))

  const todayEvents = useMemo(() => {
    const resourceEvents = resourceId ? getEventsForResource(resourceId) : []
    const todayEvents = getEventsForDateRange(
      day.startOf(gridType),
      day.endOf(gridType)
    )

    if (resourceEvents.length) {
      return todayEvents.filter((event) =>
        resourceEvents.some((re) => String(re.id) === String(event.id))
      )
    }

    return todayEvents
  }, [day, resourceId, getEventsForDateRange, getEventsForResource, gridType])

  // Get start date for the current month view based on firstDayOfWeek
  const firstDayOfMonth = currentDate.startOf('month')

  // Calculate the first day of the calendar grid correctly
  // Find the first day of week (e.g. Sunday or Monday) that comes before or on the first day of the month
  let adjustedFirstDayOfCalendar = firstDayOfMonth.clone()
  while (adjustedFirstDayOfCalendar.day() !== firstDayOfWeek) {
    adjustedFirstDayOfCalendar = adjustedFirstDayOfCalendar.subtract(1, 'day')
  }

  // Handler for showing all events in a dialog
  const showAllEvents = (day: dayjs.Dayjs, events: CalendarEvent[]) => {
    allEventsDialogRef.current?.setSelectedDayEvents({
      day,
      events,
    })
    allEventsDialogRef.current?.open()
  }

  const isCurrentMonth = day.month() === currentDate.month()
  const isLastColumn = index === 6 // Saturday is the last column in a week

  const hiddenEventsCount = todayEvents.length - dayMaxEvents
  const hasHiddenEvents = hiddenEventsCount > 0

  const isBusiness = isBusinessHour({
    date: day,
    hour: gridType === 'hour' ? day.hour() : undefined,
    businessHours,
  })

  return (
    <>
      <DroppableCell
        id={`day-cell-${day.toISOString()}${resourceId ? `-resource-${resourceId}` : ''}`}
        type="day-cell"
        data-testid={`day-cell-${day.toISOString()}`}
        date={day}
        resourceId={resourceId}
        disabled={!isBusiness || !isCurrentMonth}
        className={cn(
          'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px]',
          isLastColumn && 'border-r-0',
          className
        )}
      >
        {/* Absolutely positioned multi-day bars (Google Calendar style) */}

        {/* Single-day events container positioned below multi-day events */}
        <div className="flex flex-col gap-1">
          {/* Render placeholders for events that occur today so that the cell height is according to dayMaxEvents. */}
          {todayEvents.slice(0, dayMaxEvents).map((event, rowIndex) => (
            <div
              key={`empty-${rowIndex}`}
              className="h-[20px] w-full"
              data-testid={event?.title}
            />
          ))}

          {/* Show more events button with accurate count */}
          {hasHiddenEvents && (
            <div
              className="text-muted-foreground hover:text-foreground cursor-pointer text-[10px] whitespace-nowrap sm:text-xs mt-1"
              onClick={(e) => {
                e.stopPropagation()

                showAllEvents(day, todayEvents)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  showAllEvents(day, todayEvents)
                }
              }}
              tabIndex={0}
              // oxlint-disable-next-line prefer-tag-over-role
              role="button"
            >
              +{hiddenEventsCount} {t('more')}
            </div>
          )}
        </div>
      </DroppableCell>

      {/* Dialog for showing all events */}
      <AllEventDialog ref={allEventsDialogRef} />
    </>
  )
}
