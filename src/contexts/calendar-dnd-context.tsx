import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import React from 'react'
import type { CalendarEvent } from '../components/types'
import type {
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core'
import { snapCenterToCursor } from '@dnd-kit/modifiers'

interface CalendarDndContextProps {
  children: React.ReactNode
}

export function CalendarDndContext({ children }: CalendarDndContextProps) {
  const { updateEvent, view, disableDragAndDrop } = useCalendarContext()
  const [activeEvent, setActiveEvent] = React.useState<CalendarEvent | null>(
    null
  )

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
      const { date, hour, minute = 0 } = over.data.current

      // Calculate the event duration in minutes
      const originalStart = activeEvent.originalStart ?? activeEvent.start
      const originalEnd = activeEvent.originalEnd ?? activeEvent.end
      const durationMinutes = originalEnd.diff(originalStart, 'minute')

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
      updateEvent(activeEvent.id, {
        start: newStart,
        end: newEnd,
      })
    } else if (over.data.current?.type === 'day-cell') {
      const { date } = over.data.current
      const newDate = dayjs(date)

      // For multi-day events, we need to preserve the duration in days
      const isMultiDayEvent = !activeEvent.start.isSame(activeEvent.end, 'day')
      const originalStart = activeEvent.originalStart ?? activeEvent.start
      const originalEnd = activeEvent.originalEnd ?? activeEvent.end

      if (isMultiDayEvent) {
        if (view === 'week') {
          // Get time components to preserve
          const startHour = originalStart.hour()
          const startMinute = originalStart.minute()
          const endHour = originalEnd.hour()
          const endMinute = originalEnd.minute()

          // Calculate duration in days to preserve
          const durationDays = originalEnd.diff(originalStart, 'day')

          // Create new start and end dates
          const newStart = newDate
            .startOf('day')
            .hour(startHour)
            .minute(startMinute)
          const newEnd = newStart
            .add(durationDays, 'day')
            .hour(endHour)
            .minute(endMinute)

          updateEvent(activeEvent.id, {
            start: newStart,
            end: newEnd,
            originalStart: undefined,
            originalEnd: undefined,
          })
        } else {
          // For other views like month view
          // Calculate the date shift (how many days we're moving the event)
          const daysDifference = newDate.diff(
            originalStart.startOf('day'),
            'day'
          )

          // Calculate new start and end while preserving time components
          const newStart = originalStart.add(daysDifference, 'day')
          const newEnd = originalEnd.add(daysDifference, 'day')

          updateEvent(activeEvent.id, {
            start: newStart,
            end: newEnd,
            originalStart: undefined,
            originalEnd: undefined,
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

        updateEvent(activeEvent.id, {
          start: newStart,
          end: newEnd,
          originalStart: undefined,
          originalEnd: undefined,
        })
      }
    }

    setActiveEvent(null)
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Visual feedback can be implemented here if needed
  }

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveEvent(null)
  }

  // If drag and drop is disabled, just return children without DndContext
  if (disableDragAndDrop) {
    return children as React.ReactElement
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
      collisionDetection={pointerWithin}
    >
      {children}
      <DragOverlay modifiers={[snapCenterToCursor]}>
        {activeEvent && (
          <div
            className={cn(
              'cursor-grab truncate rounded bg-amber-200 p-2 text-[10px] shadow-lg sm:text-xs',
              activeEvent.color || 'bg-blue-500 text-white'
            )}
          >
            {activeEvent?.title}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
