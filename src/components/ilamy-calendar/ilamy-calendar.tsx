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
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/contexts/calendar-context/context'
// oxlint-disable-next-line no-duplicates
import '@/lib/dayjs-config'
import { DAY_MAX_EVENTS_DEFAULT, WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'
import { normalizePublicFacingCalendarEvent } from '@/lib'
import type { IlamyCalendarProps } from './types'

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
      <Header className="p-1" />

      {/* Calendar Body with AnimatePresence for view transitions */}
      <CalendarDndContext>
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.1, ease: 'easeInOut' }}
            className="w-full h-[calc(100%-3.5rem)]"
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

export const IlamyCalendar: React.FC<IlamyCalendarProps> = ({
  events,
  firstDayOfWeek = 'sunday',
  initialView = 'month',
  renderEvent,
  onEventClick,
  onCellClick,
  onViewChange,
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onDateChange,
  locale,
  translations,
  translator,
  timezone,
  disableCellClick,
  disableEventClick,
  disableDragAndDrop,
  dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
  stickyViewHeader = true,
  viewHeaderClassName = '',
  headerComponent,
  headerClassName,
}) => {
  return (
    <CalendarProvider
      events={normalizePublicFacingCalendarEvent(events)}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      initialView={initialView}
      renderEvent={renderEvent}
      onEventClick={onEventClick}
      onCellClick={onCellClick}
      onViewChange={onViewChange}
      onEventAdd={onEventAdd}
      onEventUpdate={onEventUpdate}
      onEventDelete={onEventDelete}
      onDateChange={onDateChange}
      locale={locale}
      translations={translations}
      translator={translator}
      timezone={timezone}
      disableCellClick={disableCellClick}
      disableEventClick={disableEventClick}
      disableDragAndDrop={disableDragAndDrop}
      dayMaxEvents={dayMaxEvents}
      stickyViewHeader={stickyViewHeader}
      viewHeaderClassName={viewHeaderClassName}
      headerComponent={headerComponent}
      headerClassName={headerClassName}
    >
      <CalendarContent />
    </CalendarProvider>
  )
}
