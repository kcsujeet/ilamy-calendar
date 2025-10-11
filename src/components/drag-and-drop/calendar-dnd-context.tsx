import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useSmartCalendarContext } from '@/lib/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import dayjs from '@/lib/dayjs-config'
import React, { useState } from 'react'
import type {
  DragCancelEvent,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'
import type { CalendarEvent } from '@/components/types'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import { RecurrenceEditDialog } from '@/features/recurrence/components/recurrence-edit-dialog'
import type { RecurrenceEditScope } from '@/features/recurrence/types'

interface CalendarDndContextProps {
  children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
  const { updateEvent, updateRecurringEvent, view, disableDragAndDrop } =
    useSmartCalendarContext((context) => ({
      updateEvent: context.updateEvent,
      updateRecurringEvent: context.updateRecurringEvent,
      view: context.view,
      disableDragAndDrop: context.disableDragAndDrop,
    }))
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(
    null
  )

  // State for recurring event dialog
  const [recurringDialog, setRecurringDialog] = useState<{
    isOpen: boolean
    event: CalendarEvent | null
    updates: Partial<CalendarEvent> | null
  }>({
    isOpen: false,
    event: null,
    updates: null,
  })

  // Configure sensors with reduced activation constraints for easier dragging
  const mouseSensor = useSensor(MouseSensor, {
    // Require minimal movement before activating
    activationConstraint: {
      distance: 2,
    },
  })

  const touchSensor = useSensor(TouchSensor, {
    // Reduce delay for touch devices
    activationConstraint: {
      delay: 100,
      tolerance: 5,
    },
  })

  const sensors = useSensors(mouseSensor, touchSensor)

  // Helper function to perform the actual event update
  const performEventUpdate = (
    event: CalendarEvent,
    updates: Partial<CalendarEvent>
  ) => {
    // Validate inputs
    if (!event || !event.id) {
      return
    }

    if (!updates || Object.keys(updates).length === 0) {
      return
    }

    if (isRecurringEvent(event)) {
      // Show dialog for recurring events
      setRecurringDialog({
        isOpen: true,
        event,
        updates,
      })
    } else {
      // Directly update regular events
      updateEvent(event.id, updates)
    }
  }

  // Handle recurring event dialog confirmation
  const handleRecurringEventConfirm = (scope: RecurrenceEditScope) => {
    if (!recurringDialog.event || !recurringDialog.updates) {
      setRecurringDialog({ isOpen: false, event: null, updates: null })
      return
    }

    try {
      updateRecurringEvent(recurringDialog.event, recurringDialog.updates, {
        scope,
        eventDate: recurringDialog.event.start,
      })
    } catch {
      // Silently handle error and reset dialog state
    } finally {
      setRecurringDialog({ isOpen: false, event: null, updates: null })
    }
  }

  // Handle recurring event dialog close
  const handleRecurringEventClose = () => {
    setRecurringDialog({ isOpen: false, event: null, updates: null })
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event

    // Set the active event based on the event data
    if (active.data.current?.type === 'calendar-event') {
      setActiveEvent(active.data.current.event)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!active || !over || !activeEvent) {
      setActiveEvent(null)
      return
    }

    if (over.data.current?.type === 'time-cell') {
      const { date, hour = 0, minute = 0 } = over.data.current

      // Calculate the event duration in minutes
      const start = activeEvent.start
      const end = activeEvent.end
      const durationMinutes = end.diff(start, 'minute')

      // Create new start time based on the drop target
      const newStart = dayjs(date)
        .hour(hour)
        .minute(minute || 0)

      // Create new end time by adding the original duration
      let newEnd = newStart.add(durationMinutes, 'minute')
      if (newEnd.isSame(newEnd.startOf('day'))) {
        // If the new end time is at midnight, set it to 24 hours of partial day
        newEnd = newEnd.subtract(1, 'day').endOf('day')
      }

      // Update the event with new times
      performEventUpdate(activeEvent, {
        start: newStart,
        end: newEnd,
      })
    } else if (over.data.current?.type === 'day-cell') {
      const { date } = over.data.current
      const newDate = dayjs(date)

      // For multi-day events, we need to preserve the duration in days
      const isMultiDayEvent = !activeEvent.start.isSame(activeEvent.end, 'day')
      const start = activeEvent.start
      const end = activeEvent.end

      if (isMultiDayEvent) {
        if (view === 'week') {
          // Get time components to preserve
          const startHour = start.hour()
          const startMinute = start.minute()
          const endHour = end.hour()
          const endMinute = end.minute()

          // Calculate duration in days to preserve
          const durationDays = end.diff(start, 'day')

          // Create new start and end dates
          const newStart = newDate
            .startOf('day')
            .hour(startHour)
            .minute(startMinute)
          const newEnd = newStart
            .add(durationDays, 'day')
            .hour(endHour)
            .minute(endMinute)

          performEventUpdate(activeEvent, {
            start: newStart,
            end: newEnd,
          })
        } else {
          // For other views like month view
          // Calculate the date shift (how many days we're moving the event)
          const daysDifference = newDate.diff(start.startOf('day'), 'day')

          // Calculate new start and end while preserving time components
          const newStart = start.add(daysDifference, 'day')
          const newEnd = end.add(daysDifference, 'day')

          performEventUpdate(activeEvent, {
            start: newStart,
            end: newEnd,
          })
        }
      } else {
        // For single-day events, maintain the time but change the date
        const newStart = newDate
          .hour(activeEvent.start.hour())
          .minute(activeEvent.start.minute())

        // Calculate event duration and set new end time
        const durationMinutes = activeEvent.end.diff(
          activeEvent.start,
          'minute'
        )
        const newEnd = newStart.add(durationMinutes, 'minute')

        performEventUpdate(activeEvent, {
          start: newStart,
          end: newEnd,
        })
      }
    }

    setActiveEvent(null)
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveEvent(null)
  }

  // If drag and drop is disabled, just return children without DndContext
  if (disableDragAndDrop) {
    return children as React.ReactElement
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        collisionDetection={pointerWithin}
      >
        {children}
        <DragOverlay modifiers={[snapCenterToCursor]}>
          {activeEvent && (
            <div
              className={cn(
                'cursor-grab truncate rounded bg-amber-200 p-2 text-[10px] shadow-lg sm:text-xs',
                activeEvent.backgroundColor || 'bg-blue-500',
                activeEvent.color || 'text-white'
              )}
            >
              {activeEvent?.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Recurring event edit dialog */}
      <RecurrenceEditDialog
        isOpen={recurringDialog.isOpen}
        onClose={handleRecurringEventClose}
        onConfirm={handleRecurringEventConfirm}
        operationType="edit"
        eventTitle={recurringDialog.event?.title || ''}
      />
    </>
  )
}
