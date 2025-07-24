import dayjs from '@/lib/dayjs-config'
import React, { useEffect, useState } from 'react'

import {
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/components/types'

const colorOptions = [
  { value: 'bg-blue-100 text-blue-800', label: 'Blue' },
  { value: 'bg-green-100 text-green-800', label: 'Green' },
  { value: 'bg-purple-100 text-purple-800', label: 'Purple' },
  { value: 'bg-red-100 text-red-800', label: 'Red' },
  { value: 'bg-yellow-100 text-yellow-800', label: 'Yellow' },
  { value: 'bg-pink-100 text-pink-800', label: 'Pink' },
  { value: 'bg-indigo-100 text-indigo-800', label: 'Indigo' },
  { value: 'bg-amber-100 text-amber-800', label: 'Amber' },
  { value: 'bg-emerald-100 text-emerald-800', label: 'Emerald' },
  { value: 'bg-sky-100 text-sky-800', label: 'Sky' },
  { value: 'bg-violet-100 text-violet-800', label: 'Violet' },
  { value: 'bg-rose-100 text-rose-800', label: 'Rose' },
  { value: 'bg-teal-100 text-teal-800', label: 'Teal' },
  { value: 'bg-orange-100 text-orange-800', label: 'Orange' },
]

interface EventFormProps {
  selectedEvent?: CalendarEvent | null
  selectedDate?: dayjs.Dayjs | null
  onAdd?: (event: CalendarEvent) => void
  onUpdate?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onClose: () => void
}

export const EventForm: React.FC<EventFormProps> = ({
  selectedEvent,
  selectedDate,
  onClose,
  onUpdate,
  onDelete,
  onAdd,
}) => {
  const start = selectedEvent?.originalStart ?? selectedEvent?.start
  const end = selectedEvent?.originalEnd ?? selectedEvent?.end

  // Form default values
  const defaultStartDate = selectedDate?.toDate() || new Date()
  const defaultEndDate =
    selectedDate?.add(1, 'hour').toDate() || dayjs().add(1, 'hour').toDate()

  // Form state
  const [startDate, setStartDate] = useState(
    start?.toDate() || defaultStartDate
  )
  const [endDate, setEndDate] = useState(end?.toDate() || defaultEndDate)
  const [isAllDay, setIsAllDay] = useState(selectedEvent?.allDay || false)
  const [selectedColor, setSelectedColor] = useState(
    selectedEvent?.color || colorOptions[0].value
  )

  // Time state
  const [startTime, setStartTime] = useState(
    selectedEvent
      ? selectedEvent.start.format('HH:mm')
      : dayjs(defaultStartDate).format('HH:mm')
  )
  const [endTime, setEndTime] = useState(
    selectedEvent
      ? selectedEvent.end.format('HH:mm')
      : dayjs(defaultEndDate).format('HH:mm')
  )

  // Initialize form values from selected event or defaults
  const [formValues, setFormValues] = useState({
    title: selectedEvent?.title || '',
    description: selectedEvent?.description || '',
    location: selectedEvent?.location || '',
  })

  // Create wrapper functions to fix TypeScript errors with DatePicker
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      setStartDate(date)
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      setEndDate(date)
    }
  }

  // Update form values when input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  // Handle time changes
  const handleTimeChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    isStart: boolean
  ) => {
    const timeValue = e.target.value
    if (isStart) {
      setStartTime(timeValue)
    } else {
      setEndTime(timeValue)
    }
  }

  useEffect(() => {
    // Reset end time when all day is toggled to on
    if (isAllDay) {
      setEndTime('23:59')
    }
  }, [isAllDay])

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Create full datetime objects by combining date and time
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    let startDateTime = dayjs(startDate).hour(startHours).minute(startMinutes)

    let endDateTime = dayjs(endDate).hour(endHours).minute(endMinutes)

    // For all-day events, set appropriate times
    if (isAllDay) {
      startDateTime = startDateTime.hour(0).minute(0)
      endDateTime = endDateTime.hour(23).minute(59)
    }

    const eventData: CalendarEvent = {
      id: selectedEvent?.id || dayjs().format('YYYYMMDDHHmmss'),
      title: formValues.title,
      start: startDateTime,
      end: endDateTime,
      description: formValues.description,
      location: formValues.location,
      allDay: isAllDay,
      color: selectedColor,
    }

    if (selectedEvent.id) {
      onUpdate?.(eventData)
    } else {
      onAdd?.(eventData)
    }

    onClose()
  }

  const handleDelete = () => {
    if (selectedEvent.id) {
      onDelete?.(selectedEvent)
      onClose()
    }
  }

  // Validate end date is not before start date
  useEffect(() => {
    if (dayjs(startDate).isAfter(dayjs(endDate))) {
      setEndDate(startDate)
    }
  }, [startDate, endDate])

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-[500px] p-4 sm:p-6">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="mb-2 sm:mb-4">
            <DialogTitle className="text-base sm:text-lg">
              {selectedEvent.id ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedEvent.id
                ? 'Edit your event details'
                : 'Add a new event to your calendar'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-2 sm:gap-4 sm:py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-xs sm:text-sm">
                Title
              </Label>
              <Input
                id="title"
                name="title"
                value={formValues.title}
                onChange={handleInputChange}
                placeholder="Event title"
                required
                className="h-8 text-sm sm:h-9"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="allDay"
                checked={isAllDay}
                onCheckedChange={(checked) => setIsAllDay(checked === true)}
              />
              <Label htmlFor="allDay" className="text-xs sm:text-sm">
                All day
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Start Date</Label>
                <DatePicker
                  date={startDate}
                  setDate={handleStartDateChange}
                  className="mt-1"
                  closeOnSelect
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">End Date</Label>
                <DatePicker
                  date={endDate}
                  setDate={handleEndDateChange}
                  className="mt-1"
                  closeOnSelect
                />
              </div>
            </div>

            {!isAllDay && (
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div>
                  <Label htmlFor="start-time" className="text-xs sm:text-sm">
                    Start Time
                  </Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => handleTimeChange(e, true)}
                    className="mt-1 h-8 text-sm sm:h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="end-time" className="text-xs sm:text-sm">
                    End Time
                  </Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => handleTimeChange(e, false)}
                    className="mt-1 h-8 text-sm sm:h-9"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-1 sm:gap-2">
              <Label className="text-xs sm:text-sm">Color</Label>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  {colorOptions.map((color) => (
                    <Tooltip key={color.value}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          key={color.value}
                          type="button"
                          className={cn(
                            `${color.value} h-6 w-6 rounded-full sm:h-8 sm:w-8`,
                            selectedColor === color.value &&
                              'ring-2 ring-black ring-offset-1 sm:ring-offset-2'
                          )}
                          onClick={() => setSelectedColor(color.value)}
                          aria-label={color.label}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs sm:text-sm">{color.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>
            </div>

            <div className="grid gap-1 sm:gap-2">
              <Label htmlFor="location" className="text-xs sm:text-sm">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                value={formValues.location}
                onChange={handleInputChange}
                placeholder="Event location (optional)"
                className="h-8 text-sm sm:h-9"
              />
            </div>

            <div className="grid gap-1 sm:gap-2">
              <Label htmlFor="description" className="text-xs sm:text-sm">
                Description
              </Label>
              <Input
                id="description"
                name="description"
                value={formValues.description}
                onChange={handleInputChange}
                placeholder="Event description (optional)"
                className="h-8 text-sm sm:h-9"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:mt-4 sm:flex-row sm:gap-0">
            {selectedEvent.id && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="w-full sm:mr-auto sm:w-auto"
                size="sm"
              >
                Delete
              </Button>
            )}
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1 sm:flex-none" size="sm">
                {selectedEvent.id ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
