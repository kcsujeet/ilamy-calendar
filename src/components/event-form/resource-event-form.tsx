import React from 'react'
import { EventForm } from './event-form'
import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'

export const ResourceEventForm: React.FC = () => {
  const {
    isEventFormOpen,
    selectedEvent,
    selectedDate,
    addEvent,
    updateEvent,
    deleteEvent,
    closeEventForm,
  } = useResourceCalendarContext()

  if (!isEventFormOpen) {
    return null
  }

  const handleUpdate = (event) => {
    if (event.id) {
      updateEvent(event.id, event)
    }
  }

  const handleDelete = (event) => {
    if (event.id) {
      deleteEvent(event.id)
    }
  }

  return (
    <EventForm
      selectedEvent={selectedEvent}
      selectedDate={selectedDate}
      onAdd={addEvent}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onClose={closeEventForm}
    />
  )
}
