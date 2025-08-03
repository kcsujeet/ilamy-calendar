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
import type { RRuleOptions } from '@/lib/recurrence-handler/types'
import { useState, useEffect } from 'react'
import { RRule } from 'rrule'
import type { Weekday } from 'rrule'

// Natural language description function using RRule's built-in helper methods
function getRRuleDescription(rruleOptions: RRuleOptions | null): string {
  if (!rruleOptions) {
    return 'Custom recurrence'
  }

  try {
    // Create RRule instance directly from options
    const rule = new RRule(rruleOptions)

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
  value?: RRuleOptions | null
  onChange: (rruleOptions: RRuleOptions | null) => void
}

const WEEK_DAYS: { value: Weekday; label: string; short: string }[] = [
  { value: RRule.SU, label: 'Sunday', short: 'Sun' },
  { value: RRule.MO, label: 'Monday', short: 'Mon' },
  { value: RRule.TU, label: 'Tuesday', short: 'Tue' },
  { value: RRule.WE, label: 'Wednesday', short: 'Wed' },
  { value: RRule.TH, label: 'Thursday', short: 'Thu' },
  { value: RRule.FR, label: 'Friday', short: 'Fri' },
  { value: RRule.SA, label: 'Saturday', short: 'Sat' },
]

export const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({
  value,
  onChange,
}) => {
  const [showRecurrence, setShowRecurrence] = useState(!!value)

  // Helper function to convert RRule frequency to string
  const getFrequencyString = (freq: RRuleOptions['freq']): string => {
    const freqMap: Record<number, string> = {
      [RRule.DAILY]: 'DAILY',
      [RRule.WEEKLY]: 'WEEKLY',
      [RRule.MONTHLY]: 'MONTHLY',
      [RRule.YEARLY]: 'YEARLY',
    }
    return freqMap[freq] || 'DAILY'
  }

  // Work with complete RRuleOptions - dtstart comes from parent EventForm
  const [rruleOptions, setRRuleOptions] = useState<RRuleOptions | null>(
    () => value || null
  )

  // Sync state when value prop changes
  useEffect(() => {
    setShowRecurrence(!!value)
    if (value) {
      setRRuleOptions(value)
    }
  }, [value])

  const updateRRule = (updates: Partial<RRuleOptions>) => {
    if (!rruleOptions) {
      return // Can't update if no base options exist
    }

    const newOptions: RRuleOptions = { ...rruleOptions, ...updates }
    setRRuleOptions(newOptions)

    if (showRecurrence) {
      onChange(newOptions)
    } else {
      onChange(null)
    }
  }

  const handleRecurrenceToggle = (checked: boolean) => {
    setShowRecurrence(checked)
    if (checked) {
      if (rruleOptions) {
        onChange(rruleOptions)
      } else {
        // Create default RRule when toggling on for the first time
        // Note: dtstart will be set by the parent EventForm
        const defaultRRule: Partial<RRuleOptions> = {
          freq: RRule.DAILY,
          interval: 1,
        }
        setRRuleOptions(defaultRRule as RRuleOptions)
        onChange(defaultRRule as RRuleOptions)
      }
    } else {
      onChange(null)
    }
  }

  const handleFrequencyChange = (frequency: string) => {
    // Convert string to RRule frequency constant
    const freqMap: Record<string, RRuleOptions['freq']> = {
      DAILY: RRule.DAILY,
      WEEKLY: RRule.WEEKLY,
      MONTHLY: RRule.MONTHLY,
      YEARLY: RRule.YEARLY,
    }
    updateRRule({ freq: freqMap[frequency] || RRule.DAILY })
  }

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const interval = Math.max(1, Number.parseInt(e.target.value) || 1)
    updateRRule({ interval })
  }

  const handleEndTypeChange = (endType: 'never' | 'count' | 'until') => {
    const updates: Partial<RRuleOptions> = {}

    if (endType === 'never') {
      // Remove count and until
      updates.count = undefined
      updates.until = undefined
    } else if (endType === 'count') {
      // Set default count if none exists, remove until
      updates.count = rruleOptions?.count || 1
      updates.until = undefined
    } else if (endType === 'until') {
      // Set default until date if none exists, remove count
      updates.until =
        rruleOptions?.until || dayjs().add(1, 'month').endOf('day').toDate()
      updates.count = undefined
    }

    updateRRule(updates)
  }

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const count = Math.max(1, Number.parseInt(e.target.value) || 1)
    updateRRule({ count })
  }

  const handleEndDateChange = (date: Date | undefined) => {
    const until = date ? dayjs(date).endOf('day').toDate() : undefined
    updateRRule({ until })
  }

  const handleDayToggle = (dayIndex: number) => {
    const weekdayMap = [
      RRule.SU,
      RRule.MO,
      RRule.TU,
      RRule.WE,
      RRule.TH,
      RRule.FR,
      RRule.SA,
    ]
    const currentWeekdays = (rruleOptions?.byweekday as Weekday[]) || []
    const targetWeekday = weekdayMap[dayIndex]

    const isSelected = currentWeekdays.includes(targetWeekday)
    let newWeekdays: Weekday[]

    if (isSelected) {
      newWeekdays = currentWeekdays.filter((day) => day !== targetWeekday)
    } else {
      newWeekdays = [...currentWeekdays, targetWeekday]
    }

    updateRRule({
      byweekday: newWeekdays.length > 0 ? newWeekdays : undefined,
    })
  }

  // Helper to determine end type from current options
  const getEndType = (): 'never' | 'count' | 'until' => {
    if (rruleOptions?.until) {
      return 'until'
    }
    if (rruleOptions?.count) {
      return 'count'
    }
    return 'never'
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
                  value={getFrequencyString(rruleOptions?.freq ?? RRule.DAILY)}
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
                  value={rruleOptions?.interval || 1}
                  onChange={handleIntervalChange}
                  className="h-8"
                />
              </div>
            </div>

            {/* Weekly Day Selection */}
            {rruleOptions?.freq === RRule.WEEKLY && (
              <div>
                <Label className="text-xs">Repeat on</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {WEEK_DAYS.map((day, index) => {
                    const byweekdayArray = Array.isArray(
                      rruleOptions?.byweekday
                    )
                      ? rruleOptions.byweekday
                      : rruleOptions?.byweekday
                        ? [rruleOptions.byweekday]
                        : []
                    const isSelected = byweekdayArray.includes(day.value)
                    return (
                      <div
                        key={`day-${index}`}
                        className="flex items-center space-x-1"
                      >
                        <Checkbox
                          id={`day-${index}`}
                          checked={isSelected}
                          onCheckedChange={() => handleDayToggle(index)}
                        />
                        <Label
                          htmlFor={`day-${index}`}
                          className="text-xs cursor-pointer"
                        >
                          {day.short}
                        </Label>
                      </div>
                    )
                  })}
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
                    checked={getEndType() === 'never'}
                    onCheckedChange={() => handleEndTypeChange('never')}
                  />
                  <Label htmlFor="never" className="text-xs">
                    Never
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="after"
                    checked={getEndType() === 'count'}
                    onCheckedChange={() => handleEndTypeChange('count')}
                  />
                  <Label htmlFor="after" className="text-xs">
                    After
                  </Label>
                  {getEndType() === 'count' && (
                    <Input
                      type="number"
                      min="1"
                      value={rruleOptions?.count || 1}
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
                    checked={getEndType() === 'until'}
                    onCheckedChange={() => handleEndTypeChange('until')}
                  />
                  <Label htmlFor="on" className="text-xs">
                    On
                  </Label>
                  {getEndType() === 'until' && (
                    <DatePicker
                      date={rruleOptions?.until}
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
