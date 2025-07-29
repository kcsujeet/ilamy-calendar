import React, { useState } from 'react'
import dayjs from '@/lib/dayjs-config'
import { PlusIcon, XIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DatePicker,
  Button,
} from '@/components/ui'
import type {
  EventRecurrence,
  WeekDays,
  RecurrenceException,
} from '@/components/types'
import { RecurrenceHandler } from '@/lib/recurrence-handler/recurrence-handler'

interface RecurrenceEditorProps {
  value?: EventRecurrence | null
  onChange: (recurrence: EventRecurrence | null) => void
  eventStart?: dayjs.Dayjs
}

interface RecurrenceFormData {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  endType: 'never' | 'on' | 'after'
  endDate?: string
  count?: number
  daysOfWeek: boolean[]
  exceptions: RecurrenceException[]
}

const WEEK_DAYS: { value: WeekDays; label: string; short: string }[] = [
  { value: 'sunday', label: 'Sunday', short: 'Sun' },
  { value: 'monday', label: 'Monday', short: 'Mon' },
  { value: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { value: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { value: 'thursday', label: 'Thursday', short: 'Thu' },
  { value: 'friday', label: 'Friday', short: 'Fri' },
  { value: 'saturday', label: 'Saturday', short: 'Sat' },
]
const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function initializeDaysOfWeek(selectedDays?: WeekDays[]): boolean[] {
  const days = Array.from({ length: 7 }, () => false)
  if (selectedDays) {
    selectedDays.forEach((day) => {
      const dayIndex = WEEK_DAYS.findIndex((d) => d.value === day)
      if (dayIndex >= 0) {
        days[dayIndex] = true
      }
    })
  }
  return days
}

function formatExceptionsForInput(
  exceptions?: RecurrenceException[]
): RecurrenceException[] {
  if (!exceptions) {
    return []
  }
  return exceptions
}

function convertFormDataToRecurrence(
  data: RecurrenceFormData
): EventRecurrence {
  const selectedDays: WeekDays[] = data.daysOfWeek
    .map((selected, index) => (selected ? WEEK_DAYS[index].value : null))
    .filter((day): day is WeekDays => day !== null)

  return {
    frequency: data.frequency,
    interval: data.interval,
    endType: data.endType,
    endDate: data.endDate ? dayjs(data.endDate) : undefined,
    count: data.count,
    daysOfWeek:
      data.frequency === 'weekly' && selectedDays.length > 0
        ? selectedDays
        : undefined,
    exceptions: data.exceptions.length > 0 ? data.exceptions : undefined,
  }
}

export function RecurrenceEditor({
  value,
  onChange,
  eventStart,
}: RecurrenceEditorProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [formData, setFormData] = useState<RecurrenceFormData>(() => {
    if (value) {
      return {
        frequency: value.frequency,
        interval: value.interval,
        endType: value.endType,
        endDate: value.endDate ? dayjs(value.endDate).toISOString() : undefined,
        count: value.count,
        daysOfWeek: initializeDaysOfWeek(value.daysOfWeek),
        exceptions: formatExceptionsForInput(value.exceptions),
      }
    }

    return {
      frequency: 'daily',
      interval: 1,
      endType: 'never',
      daysOfWeek: Array.from({ length: 7 }, () => false),
      exceptions: [],
    }
  })

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked)
    if (checked) {
      onChange(convertFormDataToRecurrence(formData))
    } else {
      onChange(null)
    }
  }

  const handleFormChange = (
    field: keyof RecurrenceFormData,
    value: unknown
  ) => {
    const newFormData = { ...formData, [field]: value }
    setFormData(newFormData)

    if (enabled) {
      onChange(convertFormDataToRecurrence(newFormData))
    }
  }

  const handleDayToggle = (dayIndex: number) => {
    const newDaysOfWeek = [...formData.daysOfWeek]
    newDaysOfWeek[dayIndex] = !newDaysOfWeek[dayIndex]
    handleFormChange('daysOfWeek', newDaysOfWeek)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (date) {
      handleFormChange('endDate', dayjs(date).toISOString())
    }
  }

  const addException = () => {
    const currentExceptions = formData.exceptions || []
    const newException: RecurrenceException = {
      date: eventStart || dayjs(),
      type: 'this', // Default to 'this' for single occurrence exception
      createdAt: dayjs(),
    }

    // Check if an exception for this date already exists
    const existingException = currentExceptions.find((exc) =>
      exc.date.isSame(newException.date, 'day')
    )

    if (!existingException) {
      const newExceptions = [...currentExceptions, newException]
      handleFormChange('exceptions', newExceptions)
    }
  }

  const removeException = (exception: RecurrenceException) => {
    const newExceptions = formData.exceptions.filter(
      (exc) =>
        !exc.date.isSame(exception.date, 'day') || exc.type !== exception.type
    )
    handleFormChange('exceptions', newExceptions)
  }

  const updateException = (index: number, date: string) => {
    const currentExceptions = formData.exceptions || []
    const newExceptions = [...currentExceptions]
    newExceptions[index] = {
      ...newExceptions[index],
      date: dayjs(date),
    }
    handleFormChange('exceptions', newExceptions)
  }

  const description = enabled
    ? RecurrenceHandler.getRecurrenceDescription(
        convertFormDataToRecurrence(formData)
      )
    : 'No recurrence'

  return (
    <Card data-testid="recurrence-editor">
      <CardHeader>
        <CardTitle>Recurrence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="recurrence-enabled"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
            data-testid="toggle-recurrence"
          />
          <Label htmlFor="recurrence-enabled">Repeat event</Label>
        </div>

        {enabled && (
          <>
            {/* Frequency Selection */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => handleFormChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interval */}
            <div className="space-y-2">
              <Label>Repeat every</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  min={1}
                  value={formData.interval}
                  onChange={(e) =>
                    handleFormChange(
                      'interval',
                      Number.parseInt(e.target.value) || 1
                    )
                  }
                  className="w-20"
                />
                <span>
                  {formData.frequency === 'daily' &&
                    (formData.interval === 1 ? 'day' : 'days')}
                  {formData.frequency === 'weekly' &&
                    (formData.interval === 1 ? 'week' : 'weeks')}
                  {formData.frequency === 'monthly' &&
                    (formData.interval === 1 ? 'month' : 'months')}
                  {formData.frequency === 'yearly' &&
                    (formData.interval === 1 ? 'year' : 'years')}
                </span>
              </div>
            </div>

            {/* Days of Week (for weekly) */}
            {formData.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Repeat on</Label>
                <div className="flex flex-wrap gap-2">
                  {dayNames.map((day, index) => (
                    <div key={day} className="flex items-center space-x-1">
                      <Checkbox
                        id={`day-${index}`}
                        checked={formData.daysOfWeek[index] || false}
                        onCheckedChange={() => handleDayToggle(index)}
                      />
                      <Label htmlFor={`day-${index}`} className="text-sm">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Options */}
            <div className="space-y-2">
              <Label>End</Label>
              <Select
                value={formData.endType}
                onValueChange={(value) => handleFormChange('endType', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="on">On date</SelectItem>
                  <SelectItem value="after">After occurrences</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* End Date */}
            {formData.endType === 'on' && (
              <div className="space-y-2">
                <Label>End date</Label>
                <DatePicker
                  date={
                    formData.endDate ? new Date(formData.endDate) : undefined
                  }
                  setDate={handleEndDateChange}
                />
              </div>
            )}

            {/* End Count */}
            {formData.endType === 'after' && (
              <div className="space-y-2">
                <Label>Number of occurrences</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.count || 1}
                  onChange={(e) =>
                    handleFormChange(
                      'count',
                      Number.parseInt(e.target.value) || 1
                    )
                  }
                  className="w-32"
                />
              </div>
            )}

            {/* Exceptions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Exceptions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addException}
                  className="flex items-center space-x-1"
                >
                  <PlusIcon className="h-4 w-4" />
                  <span>Add exception</span>
                </Button>
              </div>

              {formData.exceptions && formData.exceptions.length > 0 && (
                <div className="space-y-2">
                  {formData.exceptions
                    .sort((a, b) => a.date.valueOf() - b.date.valueOf())
                    .map((exception, index) => (
                      <div
                        key={`${exception.date.toISOString()}-${exception.type}`}
                        className="flex items-center space-x-2"
                      >
                        <DatePicker
                          date={exception.date.toDate()}
                          setDate={(newDate) =>
                            newDate &&
                            updateException(index, dayjs(newDate).toISOString())
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {exception.date.format('MMM D, YYYY')} (
                          {exception.type})
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeException(exception)}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Description Preview */}
            <div className="mt-4 p-3 bg-muted rounded-md">
              <Label className="text-sm font-medium">Preview</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
