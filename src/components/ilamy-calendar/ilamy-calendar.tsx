import React from 'react'
import { MonthView } from '@/features/month-view/components/view/month-view'
import WeekView from '@/features/week-view/view/week-view'
import DayView from '@/features/day-view/components/view/day-view'
import { EventForm } from '../event-form/event-form'
import { Header } from '../header'
import YearView from '@/features/year-view/view/year-view'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDndContext } from '@/features/drag-and-drop/calendar-dnd-context'
import { CalendarProvider } from '@/contexts/calendar-context/provider'
import type { CalendarEvent, WeekDays } from '@/components/types'
import { useCalendarContext } from '@/contexts/calendar-context/context'
// oxlint-disable-next-line no-duplicates
import '@/lib/dayjs-config'
import type dayjs from '@/lib/dayjs-config'
import { WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'
import { normalizePublicFacingCalendarEvent } from '@/lib'

const CalendarContent: React.FC = () => {
  const {
    view,
    isEventFormOpen,
    closeEventForm,
    selectedEvent,
    selectedDate,
    addEvent,
    updateEvent,
    deleteEvent,
    dayMaxEvents,
  } = useCalendarContext()

  const viewMap = {
    month: <MonthView key="month" dayMaxEvents={dayMaxEvents} />,
    week: <WeekView key="week" />,
    day: <DayView key="day" />,
    year: <YearView key="year" />,
  }

  const handleOnUpdate = (event: CalendarEvent) => {
    updateEvent(event.id, event)
  }

  const handleOnDelete = (event: CalendarEvent) => {
    deleteEvent(event.id)
  }

  return (
    <div className="flex flex-col w-full h-full">
      <Header className="2xl:h-[5rem]" />

      {/* Calendar Body with AnimatePresence for view transitions */}
      <CalendarDndContext>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.1, ease: 'easeInOut' }}
            className="w-full h-[calc(100%-5rem)]"
          >
            {viewMap[view]}
          </motion.div>
        </AnimatePresence>
      </CalendarDndContext>

      {/* Event Form Dialog */}
      {isEventFormOpen && (
        <EventForm
          onClose={closeEventForm}
          selectedEvent={selectedEvent}
          selectedDate={selectedDate}
          onAdd={addEvent}
          onUpdate={handleOnUpdate}
          onDelete={handleOnDelete}
        />
      )}
    </div>
  )
}

interface CalendarProps {
  /**
   * Array of events to display in the calendar.
   */
  events?: CalendarEvent[]
  /**
   * The first day of the week to display in the calendar.
   * Can be 'sunday', 'monday', etc. Defaults to 'sunday'.
   */
  firstDayOfWeek?: WeekDays
  /**
   * Custom render function for calendar events.
   * If provided, it will override the default event rendering.
   */
  renderEvent?: (event: CalendarEvent) => React.ReactNode
  /**
   * Callback when an event is clicked.
   * Provides the clicked event object.
   */
  onEventClick?: (event: CalendarEvent) => void
  /**
   * Callback when a calendar cell is clicked.
   * Provides the start and end date of the clicked cell.
   */
  onCellClick?: (startDate: dayjs.Dayjs, endDate: dayjs.Dayjs) => void
  /**
   * Callback when the calendar view changes (month, week, day, year).
   * Useful for syncing with external state or analytics.
   */
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void
  /**
   * Locale to use for formatting dates and times.
   * If not provided, the default locale will be used.
   */
  locale?: string
  /**
   * Timezone to use for displaying dates and times.
   * If not provided, the local timezone will be used.
   */
  timezone?: string
  /**
   * Whether to disable click events on calendar cells.
   * Useful for read-only views or when cell clicks are not needed.
   */
  disableCellClick?: boolean
  /**
   * Whether to disable click events on calendar events.
   * Useful for read-only views or when event clicks are not needed.
   */
  disableEventClick?: boolean
  /**
   * Whether to disable drag-and-drop functionality for calendar events.
   * Useful for read-only views or when drag-and-drop is not needed.
   */
  disableDragAndDrop?: boolean
  dayMaxEvents?: number
  /**
   * Whether to stick the view header to the top of the calendar.
   * Useful for keeping the header visible while scrolling.
   */
  stickyViewHeader?: boolean
  /**
   * Custom class name for the view header.
   * Useful for applying custom styles or themes.
   */
  viewHeaderClassName?: string
  /**
   * Custom header component to replace the default calendar header.
   * Useful for adding custom branding or additional controls.
   */
  headerComponent?: React.ReactNode
}

const DEFAULT_DAY_MAX_EVENTS = 4
export const IlamyCalendar: React.FC<CalendarProps> = ({
  events,
  firstDayOfWeek = 'sunday',
  renderEvent,
  onEventClick,
  onCellClick,
  onViewChange,
  locale,
  timezone,
  disableCellClick,
  disableEventClick,
  disableDragAndDrop,
  dayMaxEvents = DEFAULT_DAY_MAX_EVENTS,
  stickyViewHeader = true,
  viewHeaderClassName = '',
  headerComponent,
}) => {
  return (
    <CalendarProvider
      events={normalizePublicFacingCalendarEvent(events)}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      renderEvent={renderEvent}
      onEventClick={onEventClick}
      onCellClick={onCellClick}
      onViewChange={onViewChange}
      locale={locale}
      timezone={timezone}
      disableCellClick={disableCellClick}
      disableEventClick={disableEventClick}
      disableDragAndDrop={disableDragAndDrop}
      dayMaxEvents={dayMaxEvents}
      stickyViewHeader={stickyViewHeader}
      viewHeaderClassName={viewHeaderClassName}
      headerComponent={headerComponent}
    >
      <CalendarContent />
    </CalendarProvider>
  )
}
