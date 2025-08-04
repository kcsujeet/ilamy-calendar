import dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'
import React from 'react'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { DroppableCell } from '@/features/droppable-cell/droppable-cell'
import { AllEventDialog } from './all-events-dialog'
import type { SelectedDayEvents } from '../types'
import type { CalendarEvent } from '@/components/types'

interface DayCellProps {
  index: number // Index of the day in the week (0-6)
  day: dayjs.Dayjs
  dayMaxEvents?: number
  className?: string // Optional className for custom styling
}

export const DayCell: React.FC<DayCellProps> = ({
  index,
  day,
  className = '',
}) => {
  const allEventsDialogRef = React.useRef<{
    open: () => void
    close: () => void
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
  }>(null)
  const {
    getEventsForDateRange,
    currentDate,
    firstDayOfWeek,
    dayMaxEvents = 0,
  } = useCalendarContext()
  const todayEvents = getEventsForDateRange(
    day.startOf('day'),
    day.endOf('day')
  )

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

  const isToday = day.isSame(dayjs(), 'day')
  const isCurrentMonth = day.month() === currentDate.month()
  const isLastColumn = index === 6 // Saturday is the last column in a week

  const hiddenEventsCount = todayEvents.length - dayMaxEvents
  const hasHiddenEvents = hiddenEventsCount > 0

  return (
    <>
      <DroppableCell
        id={`day-cell-${day.format('YYYY-MM-DD')}`}
        type="day-cell"
        data-testid={`day-cell-${day.format('YYYY-MM-DD')}`}
        date={day}
        className={cn(
          'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px]',
          !isCurrentMonth && 'bg-secondary text-muted-foreground',
          isLastColumn && 'border-r-0',
          className
        )}
      >
        {/* Absolutely positioned multi-day bars (Google Calendar style) */}

        {/* Single-day events container positioned below multi-day events */}
        <div className="flex flex-col gap-1">
          {/* Day number */}
          <div
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full text-xs sm:h-6 sm:w-6 sm:text-sm',
              isToday && 'bg-primary text-primary-foreground font-medium'
            )}
          >
            {day.date()}
          </div>

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
              +{hiddenEventsCount} more
            </div>
          )}
        </div>
      </DroppableCell>

      {/* Dialog for showing all events */}
      <AllEventDialog ref={allEventsDialogRef} />
    </>
  )
}
