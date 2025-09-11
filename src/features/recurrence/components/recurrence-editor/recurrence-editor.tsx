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
import { useState, useEffect, useMemo } from 'react'
import { RRule } from 'rrule'
import type { Weekday } from 'rrule'
import { useSmartCalendarContext } from '@/lib/hooks/use-smart-calendar-context'

// Natural language description function using RRule's built-in helper methods
function getRRuleDescription(
  rruleOptions: RRuleOptions | null,
  t: (key: string) => string
): string {
  if (!rruleOptions) {
    return t('customRecurrence')
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
      return t('customRecurrence')
    }

    // Capitalize first letter for consistent formatting
    return naturalText.charAt(0).toUpperCase() + naturalText.slice(1)
  } catch {
    // If parsing fails, return fallback
    return t('customRecurrence')
  }
}

interface RecurrenceEditorProps {
  value?: RRuleOptions | null
  onChange: (rruleOptions: RRuleOptions | null) => void
}

export const RecurrenceEditor: React.FC<RecurrenceEditorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useSmartCalendarContext((context) => ({ t: context.t }))
  const [showRecurrence, setShowRecurrence] = useState(!!value)

  // Create WEEK_DAYS array with translations
  const WEEK_DAYS = useMemo(
    () => [
      { value: RRule.SU, label: t('sunday'), short: t('sun') },
      { value: RRule.MO, label: t('monday'), short: t('mon') },
      { value: RRule.TU, label: t('tuesday'), short: t('tue') },
      { value: RRule.WE, label: t('wednesday'), short: t('wed') },
      { value: RRule.TH, label: t('thursday'), short: t('thu') },
      { value: RRule.FR, label: t('friday'), short: t('fri') },
      { value: RRule.SA, label: t('saturday'), short: t('sat') },
    ],
    [t]
  )

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
          <CardTitle className="text-sm">{t('repeat')}</CardTitle>
        </div>
        {showRecurrence && value && (
          <p className="text-xs text-muted-foreground">
            {getRRuleDescription(value, t)}
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
                  {t('repeats')}
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
                    <SelectItem value="DAILY">{t('daily')}</SelectItem>
                    <SelectItem value="WEEKLY">{t('weekly')}</SelectItem>
                    <SelectItem value="MONTHLY">{t('monthly')}</SelectItem>
                    <SelectItem value="YEARLY">{t('yearly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="interval" className="text-xs">
                  {t('every')}
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
                <Label className="text-xs">{t('repeatOn')}</Label>
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
              <Label className="text-xs">{t('ends')}</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="never"
                    checked={getEndType() === 'never'}
                    onCheckedChange={() => handleEndTypeChange('never')}
                  />
                  <Label htmlFor="never" className="text-xs">
                    {t('never')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="after"
                    checked={getEndType() === 'count'}
                    onCheckedChange={() => handleEndTypeChange('count')}
                  />
                  <Label htmlFor="after" className="text-xs">
                    {t('after')}
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
                  <span className="text-xs">{t('occurrences')}</span>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="on"
                    checked={getEndType() === 'until'}
                    onCheckedChange={() => handleEndTypeChange('until')}
                  />
                  <Label htmlFor="on" className="text-xs">
                    {t('on')}
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
