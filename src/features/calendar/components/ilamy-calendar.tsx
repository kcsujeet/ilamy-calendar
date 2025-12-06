import React from 'react'
import { MonthView } from '@/features/calendar/components/month-view/month-view'
import WeekView from '@/features/calendar/components/week-view/week-view'
import DayView from '@/features/calendar/components/day-view/day-view'
import { EventForm } from '@/components/event-form/event-form'
import { Header } from '@/components/header'
import YearView from '@/features/calendar/components/year-view/year-view'
import { AnimatePresence, motion } from 'motion/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
// oxlint-disable-next-line no-duplicates
import '@/lib/configs/dayjs-config'
import { DAY_MAX_EVENTS_DEFAULT, WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'
import { normalizeEvents, safeDate } from '@/lib'
import type {
  IlamyCalendarProps,
  IlamyCalendarPropEvent,
} from '@/features/calendar/types'

const CalendarContent: React.FC = () => {
  const {
    view,
    isEventFormOpen,
    closeEventForm,
    selectedEvent,
    addEvent,
    updateEvent,
    deleteEvent,
    dayMaxEvents,
    renderEventForm,
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

  const eventFormProps = {
    open: isEventFormOpen,
    onClose: closeEventForm,
    selectedEvent,
    onAdd: addEvent,
    onUpdate: handleOnUpdate,
    onDelete: handleOnDelete,
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
      {renderEventForm
        ? renderEventForm(eventFormProps)
        : isEventFormOpen && <EventForm {...eventFormProps} />}
    </div>
  )
}

export const IlamyCalendar: React.FC<IlamyCalendarProps> = ({
  events,
  firstDayOfWeek = 'sunday',
  initialView = 'month',
  initialDate,
  renderEvent,
  renderEventForm,
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
  businessHours,
  timeFormat = '12-hour',
  classesOverride,
}) => {
  return (
    <CalendarProvider
      events={normalizeEvents<IlamyCalendarPropEvent, CalendarEvent>(events)}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      initialView={initialView}
      initialDate={safeDate(initialDate)}
      renderEvent={renderEvent}
      renderEventForm={renderEventForm}
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
      businessHours={businessHours}
      timeFormat={timeFormat}
      classesOverride={classesOverride}
    >
      <CalendarContent />
    </CalendarProvider>
  )
}
