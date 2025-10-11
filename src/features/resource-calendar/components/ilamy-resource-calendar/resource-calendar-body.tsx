import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { Header } from '@/components/header'
import { ResourceMonthView } from '@/features/resource-calendar/components/month-view'
import { ResourceWeekView } from '@/features/resource-calendar/components/week-view'
import { ResourceDayView } from '@/features/resource-calendar/components/day-view'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { AnimatePresence, motion } from 'motion/react'
import { EventForm } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'

export const ResourceCalendarBody: React.FC = () => {
  const {
    view,
    isEventFormOpen,
    closeEventForm,
    selectedEvent,
    selectedDate,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useResourceCalendarContext()

  const viewMap = {
    month: <ResourceMonthView key="month" />,
    week: <ResourceWeekView key="week" />,
    day: <ResourceDayView key="day" />,
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
