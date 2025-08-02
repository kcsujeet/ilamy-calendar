import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  DatePicker,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import dayjs from '@/lib/dayjs-config'
import type {
  RRuleFrequency,
  RRuleWeekday,
} from '@/lib/recurrence-handler/types'
import { useState, useEffect } from 'react'
import { RRule } from 'rrule'

// Natural language description function using RRule's built-in helper methods
function getRRuleDescription(rruleString: string): string {
  if (!rruleString) {
    return 'Custom recurrence'
  }

  try {
    // Use RRule.fromString() to parse the RRULE string
    const rule = RRule.fromString(rruleString)

    // Check if the rule can be fully converted to text using RRule helper
    if (rule.isFullyConvertibleToText && !rule.isFullyConvertibleToText()) {
      return 'Custom recurrence'
    }

    // Use RRule's built-in natural language conversion with toText()
    const naturalText = rule.toText()

    // Handle cases where RRule can't convert to natural language
    if (
      !naturalText ||
      naturalText.includes('RRule error') ||
      naturalText.includes('Unable to fully convert') ||
      naturalText.toLowerCase().includes('error')
    ) {
      return 'Custom recurrence'
    }

    // Capitalize first letter for consistent formatting
    return naturalText.charAt(0).toUpperCase() + naturalText.slice(1)
  } catch {
    // If parsing fails, return fallback
    return 'Custom recurrence'
  }
}

interface RecurrenceEditorProps {
  value?: string | null
  onChange: (rrule: string | null) => void
}

interface RRuleFormData {
  freq: RRuleFrequency
  interval: number
  endType: 'never' | 'on' | 'after'
  endDate?: string
  count?: number
  daysOfWeek: boolean[] // Maps to RRuleWeekday array
}

const WEEK_DAYS: { value: RRuleWeekday; label: string; short: string }[] = [
  { value: 'SU', label: 'Sunday', short: 'Sun' },
  { value: 'MO', label: 'Monday', short: 'Mon' },
  { value: 'TU', label: 'Tuesday', short: 'Tue' },
  { value: 'WE', label: 'Wednesday', short: 'Wed' },
  { value: 'TH', label: 'Thursday', short: 'Thu' },
  { value: 'FR', label: 'Friday', short: 'Fri' },
  { value: 'SA', label: 'Saturday', short: 'Sat' },
]

export const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({
  value,
  onChange,
}) => {
  const [showRecurrence, setShowRecurrence] = useState(!!value)

  // Parse RRULE string to form data using RRule.fromString with enhanced error handling
  const parseRRuleToFormData = (rruleString?: string | null): RRuleFormData => {
    const defaultFormData: RRuleFormData = {
      freq: 'DAILY',
      interval: 1,
      endType: 'never',
      daysOfWeek: [false, false, false, false, false, false, false],
    }

    if (!rruleString) {
      return defaultFormData
    }

    try {
      // Use RRule.fromString() helper to parse the RRULE string
      const rule = RRule.fromString(rruleString)
      const options = rule.origOptions

      // Validate that we got valid options
      if (!options || typeof options.freq !== 'number') {
        return defaultFormData
      }

      const frequencyMapFromNumber: Record<number, RRuleFrequency> = {
        [RRule.DAILY]: 'DAILY',
        [RRule.WEEKLY]: 'WEEKLY',
        [RRule.MONTHLY]: 'MONTHLY',
        [RRule.YEARLY]: 'YEARLY',
      }

      const formData: RRuleFormData = {
        freq: frequencyMapFromNumber[options.freq] || 'DAILY',
        interval: options.interval || 1,
        endType: options.until ? 'on' : options.count ? 'after' : 'never',
        endDate: options.until
          ? dayjs(options.until).format('YYYY-MM-DD')
          : undefined,
        count: options.count,
        daysOfWeek: [false, false, false, false, false, false, false],
      }

      // Parse byweekday for weekly recurrence using RRule weekday constants
      if (options.byweekday && Array.isArray(options.byweekday)) {
        const weekdayIndexMap: Record<number, number> = {
          [RRule.SU.weekday]: 0,
          [RRule.MO.weekday]: 1,
          [RRule.TU.weekday]: 2,
          [RRule.WE.weekday]: 3,
          [RRule.TH.weekday]: 4,
          [RRule.FR.weekday]: 5,
          [RRule.SA.weekday]: 6,
        }

        options.byweekday.forEach((wd: unknown) => {
          const weekday =
            typeof wd === 'number' ? wd : (wd as { weekday: number }).weekday
          const dayIndex = weekdayIndexMap[weekday]
          if (dayIndex !== undefined) {
            formData.daysOfWeek[dayIndex] = true
          }
        })
      }

      return formData
    } catch {
      // Enhanced error handling - return default on parse failure
      return defaultFormData
    }
  }

  // Convert form data to RRULE string using RRule constructor + toString
  const convertFormDataToRRuleString = (data: RRuleFormData): string => {
    const frequencyMap: Record<RRuleFrequency, number> = {
      SECONDLY: RRule.SECONDLY,
      MINUTELY: RRule.MINUTELY,
      HOURLY: RRule.HOURLY,
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
    }

    const rruleOptions: Record<string, unknown> = {
      freq: frequencyMap[data.freq],
      interval: data.interval,
    }

    if (data.endType === 'after' && data.count) {
      rruleOptions.count = data.count
    }

    if (data.endType === 'on' && data.endDate) {
      rruleOptions.until = dayjs(data.endDate).endOf('day').toDate()
    }

    // Add weekdays for weekly recurrence
    if (data.freq === 'WEEKLY' && data.daysOfWeek.some(Boolean)) {
      const weekdayMap = [
        RRule.SU,
        RRule.MO,
        RRule.TU,
        RRule.WE,
        RRule.TH,
        RRule.FR,
        RRule.SA,
      ]
      rruleOptions.byweekday = data.daysOfWeek
        .map((selected, index) => (selected ? weekdayMap[index] : null))
        .filter(Boolean)
    }

    // Create RRule instance and use toString() method for clean string generation
    try {
      const rule = new RRule(rruleOptions)
      // Use RRule.toString() to get clean RRULE string, then extract just the RRULE part
      const fullString = rule.toString()
      const rruleMatch = fullString.match(/^RRULE:(.+)$/m)
      return rruleMatch
        ? rruleMatch[1]
        : RRule.optionsToString(rruleOptions).replace('RRULE:', '')
    } catch {
      // Fallback to optionsToString if RRule constructor fails
      return RRule.optionsToString(rruleOptions).replace('RRULE:', '')
    }
  }

  const [formData, setFormData] = useState<RRuleFormData>(() =>
    parseRRuleToFormData(value)
  )

  // Sync showRecurrence and formData when value prop changes
  useEffect(() => {
    setShowRecurrence(!!value)
    const newFormData = parseRRuleToFormData(value)
    setFormData(newFormData)
  }, [value])

  const updateRRuleFromFormData = (newFormData: RRuleFormData) => {
    if (showRecurrence) {
      const rruleString = convertFormDataToRRuleString(newFormData)
      onChange(rruleString)
    } else {
      onChange(null)
    }
  }

  const handleRecurrenceToggle = (checked: boolean) => {
    setShowRecurrence(checked)
    if (checked) {
      const rruleString = convertFormDataToRRuleString(formData)
      onChange(rruleString)
    } else {
      onChange(null)
    }
  }

  const handleFormDataChange = (updates: Partial<RRuleFormData>) => {
    const newFormData = { ...formData, ...updates }
    setFormData(newFormData)
    updateRRuleFromFormData(newFormData)
  }

  const handleFrequencyChange = (frequency: RRuleFrequency) => {
    handleFormDataChange({ freq: frequency })
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const interval = Math.max(1, Number.parseInt(e.target.value) || 1)
    handleFormDataChange({ interval })
  }

  const handleEndTypeChange = (endType: 'never' | 'on' | 'after') => {
    const updates: Partial<RRuleFormData> = { endType }

    // Set default count to 1 when switching to 'after' if no count exists
    if (endType === 'after' && !formData.count) {
      updates.count = 1
    }

    // Set default end date to one month from now when switching to 'on' if no end date exists
    if (endType === 'on' && !formData.endDate) {
      updates.endDate = dayjs().add(1, 'month').format('YYYY-MM-DD')
    }

    handleFormDataChange(updates)
  }

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, Number.parseInt(e.target.value) || 1)
    handleFormDataChange({ count })
  }

  const handleEndDateChange = (date: Date | undefined) => {
    const endDate = date ? dayjs(date).format('YYYY-MM-DD') : undefined
    handleFormDataChange({ endDate })
  }

  const handleDayToggle = (dayIndex: number) => {
    const newDaysOfWeek = [...formData.daysOfWeek]
    newDaysOfWeek[dayIndex] = !newDaysOfWeek[dayIndex]
    handleFormDataChange({ daysOfWeek: newDaysOfWeek })
  }

  return (
    <Card data-testid="recurrence-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="recurring"
            checked={showRecurrence}
            onCheckedChange={handleRecurrenceToggle}
            data-testid="toggle-recurrence"
          />
          <CardTitle className="text-sm">Repeat</CardTitle>
        </div>
        {showRecurrence && value && (
          <p className="text-xs text-muted-foreground">
            {getRRuleDescription(value)}
          </p>
        )}
      </CardHeader>

      {showRecurrence && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Frequency Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency" className="text-xs">
                  Repeats
                </Label>
                <Select
                  value={formData.freq}
                  onValueChange={handleFrequencyChange}
                >
                  <SelectTrigger
                    id="frequency"
                    className="h-8"
                    data-testid="frequency-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interval" className="text-xs">
                  Every
                </Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={formData.interval}
                  onChange={handleIntervalChange}
                  className="h-8"
                />
              </div>
            </div>

            {/* Weekly Day Selection */}
            {formData.freq === 'WEEKLY' && (
              <div>
                <Label className="text-xs">Repeat on</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEEK_DAYS.map((day, index) => (
                    <div
                      key={day.value}
                      className="flex items-center space-x-1"
                    >
                      <Checkbox
                        id={`day-${index}`}
                        checked={formData.daysOfWeek[index]}
                        onCheckedChange={() => handleDayToggle(index)}
                      />
                      <Label
                        htmlFor={`day-${index}`}
                        className="text-xs cursor-pointer"
                      >
                        {day.short}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* End Condition */}
            <div>
              <Label className="text-xs">Ends</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="never"
                    checked={formData.endType === 'never'}
                    onCheckedChange={() => handleEndTypeChange('never')}
                  />
                  <Label htmlFor="never" className="text-xs">
                    Never
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="after"
                    checked={formData.endType === 'after'}
                    onCheckedChange={() => handleEndTypeChange('after')}
                  />
                  <Label htmlFor="after" className="text-xs">
                    After
                  </Label>
                  {formData.endType === 'after' && (
                    <Input
                      type="number"
                      min="1"
                      value={formData.count || 1}
                      onChange={handleCountChange}
                      className="h-6 w-16 text-xs"
                      data-testid="count-input"
                    />
                  )}
                  <span className="text-xs">occurrences</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="on"
                    checked={formData.endType === 'on'}
                    onCheckedChange={() => handleEndTypeChange('on')}
                  />
                  <Label htmlFor="on" className="text-xs">
                    On
                  </Label>
                  {formData.endType === 'on' && (
                    <DatePicker
                      date={
                        formData.endDate
                          ? new Date(formData.endDate)
                          : undefined
                      }
                      setDate={handleEndDateChange}
                      className="h-6"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
