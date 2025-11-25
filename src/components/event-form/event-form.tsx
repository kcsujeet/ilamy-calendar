import dayjs from '@/lib/configs/dayjs-config'
import React, { useEffect, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RecurrenceEditDialog } from '@/features/recurrence/components/recurrence-edit-dialog'
import { RecurrenceEditor } from '@/features/recurrence/components/recurrence-editor/recurrence-editor'
import { useRecurringEventActions } from '@/features/recurrence/hooks/useRecurringEventActions'
import type { RRuleOptions } from '@/features/recurrence/types'
import { isRecurringEvent } from '@/features/recurrence/utils/recurrence-handler'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'

const COLOR_NAMES = [
  'blue',
  'green',
  'purple',
  'red',
  'yellow',
  'pink',
  'indigo',
  'amber',
  'emerald',
  'sky',
  'violet',
  'rose',
  'teal',
  'orange',
] as const

const COLOR_OPTIONS = COLOR_NAMES.map((color) => ({
  value: `bg-${color}-100 text-${color}-800`,
  label: color.charAt(0).toUpperCase() + color.slice(1),
}))

const buildDateTime = (
  date: Date,
  time: string,
  isAllDay: boolean
): dayjs.Dayjs => {
  const [hours, minutes] = time.split(':').map(Number)
  const base = dayjs(date).hour(hours).minute(minutes)
  return isAllDay ? base.hour(0).minute(0) : base
}

const buildEndDateTime = (
  date: Date,
  time: string,
  isAllDay: boolean
): dayjs.Dayjs => {
  const [hours, minutes] = time.split(':').map(Number)
  const base = dayjs(date).hour(hours).minute(minutes)
  return isAllDay ? base.hour(23).minute(59) : base
}

export interface EventFormProps {
  open?: boolean
  selectedEvent?: CalendarEvent | null
  onAdd?: (event: CalendarEvent) => void
  onUpdate?: (event: CalendarEvent) => void
  onDelete?: (event: CalendarEvent) => void
  onClose: () => void
}

export const EventForm: React.FC<EventFormProps> = ({
  selectedEvent,
  onClose,
  onUpdate,
  onDelete,
  onAdd,
}) => {
  const {
    dialogState,
    openEditDialog,
    openDeleteDialog,
    closeDialog,
    handleConfirm,
  } = useRecurringEventActions(onClose)

  const { findParentRecurringEvent, t, businessHours, timeFormat } =
    useSmartCalendarContext((context) => ({
      findParentRecurringEvent: context.findParentRecurringEvent,
      t: context.t,
      businessHours: context.businessHours,
      timeFormat: context.timeFormat,
    }))

  const start = selectedEvent?.start ?? dayjs()
  const end = selectedEvent?.end ?? dayjs().add(1, 'hour')

  // Find parent event if this is a recurring event instance
  const parentEvent = selectedEvent
    ? findParentRecurringEvent(selectedEvent)
    : null

  // Form state
  const [startDate, setStartDate] = useState(start.toDate())
  const [endDate, setEndDate] = useState(end.toDate())
  const [isAllDay, setIsAllDay] = useState(selectedEvent?.allDay || false)
  const [selectedColor, setSelectedColor] = useState(
    selectedEvent?.color || COLOR_OPTIONS[0].value
  )

  // Time state
  const [startTime, setStartTime] = useState(start.format('HH:mm'))
  const [endTime, setEndTime] = useState(end.format('HH:mm'))

  // Initialize form values from selected event or defaults
  const [formValues, setFormValues] = useState({
    title: selectedEvent?.title || '',
    description: selectedEvent?.description || '',
    location: selectedEvent?.location || '',
  })

  // Recurrence state - pull RRULE from parent if this is an instance
  const [rrule, setRrule] = useState<RRuleOptions | null>(() => {
    const eventRrule = selectedEvent?.rrule || parentEvent?.rrule
    return eventRrule || null
  })

  // Create wrapper functions to fix TypeScript errors with DatePicker
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    if (date && dayjs(date).isAfter(dayjs(endDate))) {
      setEndDate(date)
    }
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    if (date && dayjs(date).isBefore(dayjs(startDate))) {
      setStartDate(date)
    }
  }

  // Time validation handlers - only validate when dates are the same
  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    // Only validate if same day
    if (dayjs(startDate).isSame(dayjs(endDate), 'day') && time > endTime) {
      setEndTime(time)
    }
  }

  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    // Only validate if same day
    if (dayjs(startDate).isSame(dayjs(endDate), 'day') && time < startTime) {
      setStartTime(time)
    }
  }

  // Update form values when input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormValues((prev) => ({ ...prev, [name]: value }))
  }

  useEffect(() => {
    // Reset end time when all day is toggled to on
    if (isAllDay) {
      setEndTime('23:59')
    }
  }, [isAllDay])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const startDateTime = buildDateTime(startDate, startTime, isAllDay)
    const endDateTime = buildEndDateTime(endDate, endTime, isAllDay)

    const eventData: CalendarEvent = {
      id: selectedEvent?.id || dayjs().format('YYYYMMDDHHmmss'),
      title: formValues.title,
      start: startDateTime,
      end: endDateTime,
      resourceId: selectedEvent?.resourceId,
      description: formValues.description,
      location: formValues.location,
      allDay: isAllDay,
      color: selectedColor,
      rrule: rrule || undefined,
    }

    if (selectedEvent?.id && isRecurringEvent(selectedEvent)) {
      openEditDialog(selectedEvent, {
        title: formValues.title,
        start: startDateTime,
        end: endDateTime,
        description: formValues.description,
        location: formValues.location,
        allDay: isAllDay,
        color: selectedColor,
        rrule: rrule || undefined,
      })
      return
    }

    if (selectedEvent?.id) {
      onUpdate?.(eventData)
    } else {
      onAdd?.(eventData)
    }
    onClose()
  }

  const handleDelete = () => {
    if (selectedEvent?.id) {
      // Check if this is a recurring event
      if (isRecurringEvent(selectedEvent)) {
        // Show recurring event delete dialog
        openDeleteDialog(selectedEvent)
        return // Don't close the form yet, let the dialog handle it
      }
      onDelete?.(selectedEvent)
      onClose()
    }
  }

  const handleRRuleChange = (newRRule: RRuleOptions | null) => {
    if (!newRRule) {
      setRrule(null)
      return
    }
    const startDateTime = buildDateTime(startDate, startTime, isAllDay)
    setRrule({ ...newRRule, dtstart: startDateTime.toDate() })
  }

  const disabledDateMatcher = businessHours
    ? (date: Date) => {
        const dayOfWeek = dayjs(date).format('dddd').toLowerCase()
        return !businessHours.daysOfWeek.includes(
          dayOfWeek as (typeof businessHours.daysOfWeek)[number]
        )
      }
    : undefined

  const minTime = businessHours
    ? `${businessHours.startTime.toString().padStart(2, '0')}:00`
    : '00:00'
  const maxTime = businessHours
    ? `${(businessHours.endTime - 1).toString().padStart(2, '0')}:45`
    : '23:59'

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="flex flex-col h-[90vh] w-[90vw] max-w-[500px] p-4 sm:p-6 overflow-hidden gap-0">
          <DialogHeader className="mb-2 sm:mb-4 shrink-0">
            <DialogTitle className="text-base sm:text-lg">
              {selectedEvent?.id ? t('editEvent') : t('createEvent')}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {selectedEvent?.id ? t('editEventDetails') : t('addNewEvent')}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
          >
            <ScrollArea className="flex-1 min-h-0">
              <div className="grid gap-3 sm:gap-4 p-1">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-xs sm:text-sm">
                    {t('title')}
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={formValues.title}
                    onChange={handleInputChange}
                    placeholder={t('eventTitlePlaceholder')}
                    required
                    className="h-8 text-sm sm:h-9"
                  />
                </div>

                <div className="grid gap-1 sm:gap-2">
                  <Label htmlFor="description" className="text-xs sm:text-sm">
                    {t('description')}
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    value={formValues.description}
                    onChange={handleInputChange}
                    placeholder={t('eventDescriptionPlaceholder')}
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
                    {t('allDay')}
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <Label className="text-xs sm:text-sm">
                      {t('startDate')}
                    </Label>
                    <DatePicker
                      date={startDate}
                      onChange={handleStartDateChange}
                      className="mt-1"
                      closeOnSelect
                      disabled={disabledDateMatcher}
                    />
                  </div>
                  <div>
                    <Label className="text-xs sm:text-sm">{t('endDate')}</Label>
                    <DatePicker
                      date={endDate}
                      onChange={handleEndDateChange}
                      className="mt-1"
                      closeOnSelect
                      disabled={disabledDateMatcher}
                    />
                  </div>
                </div>

                {!isAllDay && (
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">
                        {t('startTime')}
                      </Label>
                      <TimePicker
                        value={startTime}
                        onChange={handleStartTimeChange}
                        minTime={minTime}
                        maxTime={maxTime}
                        timeFormat={timeFormat}
                        className="mt-1 h-8 text-sm sm:h-9"
                        name="start-time"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">
                        {t('endTime')}
                      </Label>
                      <TimePicker
                        value={endTime}
                        onChange={handleEndTimeChange}
                        minTime={minTime}
                        maxTime={maxTime}
                        timeFormat={timeFormat}
                        className="mt-1 h-8 text-sm sm:h-9"
                        name="end-time"
                      />
                    </div>
                  </div>
                )}

                <div className="grid gap-1 sm:gap-2">
                  <Label className="text-xs sm:text-sm">{t('color')}</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <Button
                        key={color.value}
                        variant="ghost"
                        type="button"
                        className={cn(
                          `${color.value} h-6 w-6 rounded-full sm:h-8 sm:w-8`,
                          selectedColor === color.value &&
                            'ring-2 ring-black ring-offset-1 sm:ring-offset-2'
                        )}
                        onClick={() => setSelectedColor(color.value)}
                        aria-label={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-1 sm:gap-2">
                  <Label htmlFor="location" className="text-xs sm:text-sm">
                    {t('location')}
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={formValues.location}
                    onChange={handleInputChange}
                    placeholder={t('eventLocationPlaceholder')}
                    className="h-8 text-sm sm:h-9"
                  />
                </div>

                {/* Recurrence Section */}
                <RecurrenceEditor value={rrule} onChange={handleRRuleChange} />
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4 shrink-0 flex flex-col-reverse gap-2 sm:flex-row sm:gap-0">
              {selectedEvent?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="w-full sm:mr-auto sm:w-auto"
                  size="sm"
                >
                  {t('delete')}
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
                  {t('cancel')}
                </Button>
                <Button type="submit" className="flex-1 sm:flex-none" size="sm">
                  {selectedEvent?.id ? t('update') : t('create')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Recurring Event Edit Dialog */}
      <RecurrenceEditDialog
        isOpen={dialogState.isOpen}
        onClose={closeDialog}
        onConfirm={handleConfirm}
        operationType={dialogState.operationType}
        eventTitle={dialogState.event?.title || ''}
      />
    </>
  )
}
