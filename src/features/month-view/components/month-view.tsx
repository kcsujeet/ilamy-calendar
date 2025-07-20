import type dayjs from '@/lib/dayjs-config'
import { AnimatePresence, motion } from 'motion/react'
import React, { useMemo } from 'react'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { AllEventDialog } from './all-events-dialog'
import { DayCell } from './day-cell'
import type { MonthViewProps, SelectedDayEvents } from '../types'
import { MonthHeader } from './month-header'
import { WeekEventsLayer } from './week-events-layer'

export const MonthView: React.FC<MonthViewProps> = ({ dayMaxEvents = 3 }) => {
  const allEventsDialogRef = React.useRef<{
    open: () => void
    close: () => void
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
  }>(null)
  const { currentDate, firstDayOfWeek } = useCalendarContext()

  // Get start date for the current month view based on firstDayOfWeek
  const firstDayOfMonth = currentDate.startOf('month')

  // Calculate the first day of the calendar grid correctly
  // Find the first day of week (e.g. Sunday or Monday) that comes before or on the first day of the month
  let adjustedFirstDayOfCalendar = firstDayOfMonth.clone()
  while (adjustedFirstDayOfCalendar.day() !== firstDayOfWeek) {
    adjustedFirstDayOfCalendar = adjustedFirstDayOfCalendar.subtract(1, 'day')
  }

  // Always generate 6 weeks (42 days) regardless of the month length
  // This ensures we always have 6 rows of days
  const calendarDays = useMemo(() => {
    // 6 weeks × 7 days = 42 days
    const days: dayjs.Dayjs[][] = [[]]
    let day = adjustedFirstDayOfCalendar.clone() // Clone to avoid mutation
    for (let i = 0; i < 42; i++) {
      if (days[days.length - 1].length === 7) {
        days.push([]) // Start a new week
      }
      days[days.length - 1].push(day)
      day = day.add(1, 'day') // Move to the next day
    }
    return days
  }, [adjustedFirstDayOfCalendar])

  return (
    <div className="flex h-full flex-col" data-testid="month-view">
      {/* Week days header */}
      <MonthHeader />

      {/* Calendar grid - added fixed height */}
      <div
        className="flex-1 overflow-auto h-full"
        data-testid="month-scroll-area"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentDate.format('YYYY-MM-DD')}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="relative grid h-full grid-cols-7 grid-rows-6 overflow-auto"
            data-testid="month-calendar-grid"
          >
            {/* Day cells */}
            {calendarDays.map((days, index) => {
              return (
                <div
                  key={`week-${index}`}
                  className="relative col-span-7 grid grid-cols-7"
                  data-testid={`week-row-${index}`}
                >
                  {days.map((day, dayIndex) => {
                    return (
                      <DayCell
                        index={dayIndex}
                        day={day}
                        dayMaxEvents={dayMaxEvents}
                        key={day.format('YYYY-MM-DD')}
                        className="border-r border-b first:border-l"
                      />
                    )
                  })}

                  <div className="absolute inset-0 z-10 pointer-events-none">
                    <WeekEventsLayer days={days} />
                  </div>
                </div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dialog for showing all events */}
      <AllEventDialog ref={allEventsDialogRef} />
    </div>
  )
}
