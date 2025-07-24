import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import React, { useImperativeHandle, useState } from 'react'
import { DraggableEvent } from '@/features/draggable-event/draggable-event'
import { useCalendarContext } from '@/contexts/calendar-context/context'
import type { SelectedDayEvents } from '../types'

interface AllEventDialogProps {
  ref: React.Ref<{
    open: () => void
    close: () => void
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) => void
  }>
}

export const AllEventDialog: React.FC<AllEventDialogProps> = ({ ref }) => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDayEvents, setSelectedDayEvents] =
    useState<SelectedDayEvents | null>(null)
  const { currentDate, firstDayOfWeek } = useCalendarContext()

  useImperativeHandle(ref, () => ({
    open: () => setDialogOpen(true),
    close: () => setDialogOpen(false),
    setSelectedDayEvents: (dayEvents: SelectedDayEvents) =>
      setSelectedDayEvents(dayEvents),
  }))

  // Get start date for the current month view based on firstDayOfWeek
  const firstDayOfMonth = currentDate.startOf('month')

  // Calculate the first day of the calendar grid correctly
  // Find the first day of week (e.g. Sunday or Monday) that comes before or on the first day of the month
  let adjustedFirstDayOfCalendar = firstDayOfMonth.clone()
  while (adjustedFirstDayOfCalendar.day() !== firstDayOfWeek) {
    adjustedFirstDayOfCalendar = adjustedFirstDayOfCalendar.subtract(1, 'day')
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedDayEvents && selectedDayEvents.day.format('MMMM D, YYYY')}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4 space-y-3">
          {selectedDayEvents &&
            selectedDayEvents.events.map((event) => {
              return (
                <DraggableEvent
                  elementId={`all-events-dialog-event-$${event.id}`} // Use event ID for unique identification
                  key={event.id}
                  event={event}
                  className="relative my-1 h-[30px]"
                />
              )
            })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
