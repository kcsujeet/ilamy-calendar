import React from 'react'
import MonthView from '../month-view/month-view'
import WeekView from '../week-view/week-view'
import DayView from '../day-view/day-view'
import { EventForm } from '../event-form/event-form'
import { Header } from '../header'
import YearView from '../year-view/year-view'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDndContext } from '../../contexts/calendar-dnd-context'
import { CalendarProvider } from '../../contexts/calendar-context/provider'
import type { CalendarEvent, WeekDays } from '../types'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import '@/lib/dayjs-config'
import dayjs from '@/lib/dayjs-config'

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
    <div className="bg-card flex flex-col w-full h-full">
      <Header />

      {/* Calendar Body with AnimatePresence for view transitions */}
      <div className="relative flex-1 overflow-hidden">
        <CalendarDndContext>
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.1, ease: 'easeInOut' }}
              className="h-full w-full overflow-auto"
            >
              {viewMap[view]}
            </motion.div>
          </AnimatePresence>
        </CalendarDndContext>
      </div>

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
  events?: CalendarEvent[]
  firstDayOfWeek?: WeekDays
  renderEvent?: (event: CalendarEvent) => React.ReactNode
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: dayjs.Dayjs) => void
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void
  locale?: string
  timezone?: string
  disableDateClick?: boolean
  disableEventClick?: boolean
  disableDragAndDrop?: boolean
  dayMaxEvents?: number
}

const dayNumberMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const DEFAULT_DAY_MAX_EVENTS = 6
export const IlamyCalendar: React.FC<CalendarProps> = ({
  events,
  firstDayOfWeek = 'sunday',
  renderEvent,
  onEventClick,
  onDateClick,
  onViewChange,
  locale,
  timezone,
  disableDateClick,
  disableEventClick,
  disableDragAndDrop,
  dayMaxEvents = DEFAULT_DAY_MAX_EVENTS,
}) => {
  return (
    <CalendarProvider
      initialEvents={events}
      firstDayOfWeek={dayNumberMap[firstDayOfWeek]}
      renderEvent={renderEvent}
      onEventClick={onEventClick}
      onDateClick={onDateClick}
      onViewChange={onViewChange}
      locale={locale}
      timezone={timezone}
      disableDateClick={disableDateClick}
      disableEventClick={disableEventClick}
      disableDragAndDrop={disableDragAndDrop}
      dayMaxEvents={dayMaxEvents}
    >
      <CalendarContent />
    </CalendarProvider>
  )
}
