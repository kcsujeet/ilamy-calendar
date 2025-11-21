import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import dayjs from '@/lib/configs/dayjs-config'
import type { RRuleOptions } from '@/features/recurrence/types'
import { useState, useEffect, useMemo } from 'react'
import { RRule } from 'rrule'
import type { Weekday } from 'rrule'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

const FREQ_MAP = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
} as const
const FREQ_TO_STR = Object.fromEntries(
  Object.entries(FREQ_MAP).map(([k, v]) => [v, k])
) as Record<number, string>
const WEEKDAYS = [
  RRule.SU,
  RRule.MO,
  RRule.TU,
  RRule.WE,
  RRule.TH,
  RRule.FR,
  RRule.SA,
]
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const parseNum = (v: string) => Math.max(1, Number.parseInt(v) || 1)

const getDescription = (
  opts: RRuleOptions | null,
  t: (k: string) => string
) => {
  if (!opts) {
    return t('customRecurrence')
  }
  try {
    const text = new RRule(opts).toText()
    return text && !text.toLowerCase().includes('error')
      ? text.charAt(0).toUpperCase() + text.slice(1)
      : t('customRecurrence')
  } catch {
    return t('customRecurrence')
  }
}

interface Props {
  value?: RRuleOptions | null
  onChange: (v: RRuleOptions | null) => void
}

export const RecurrenceEditor: React.FC<Props> = ({ value, onChange }) => {
  const { t } = useSmartCalendarContext((ctx) => ({ t: ctx.t }))
  const [show, setShow] = useState(!!value)
  const [opts, setOpts] = useState<RRuleOptions | null>(() => value || null)

  const weekDays = useMemo(
    () => DAY_KEYS.map((k, i) => ({ value: WEEKDAYS[i], label: t(k) })),
    [t]
  )

  useEffect(() => {
    setShow(!!value)
    if (value) {
      setOpts(value)
    }
  }, [value])

  const update = (u: Partial<RRuleOptions>) => {
    if (!opts) {
      return
    }
    const next = { ...opts, ...u }
    setOpts(next)
    onChange(show ? next : null)
  }

  const toggle = (checked: boolean) => {
    setShow(checked)
    if (!checked) {
      onChange(null)
      return
    }
    if (opts) {
      onChange(opts)
      return
    }
    const def = { freq: RRule.DAILY, interval: 1 } as RRuleOptions
    setOpts(def)
    onChange(def)
  }

  const toggleDay = (i: number) => {
    const curr = (opts?.byweekday as Weekday[]) || []
    const day = WEEKDAYS[i]
    const next = curr.includes(day)
      ? curr.filter((d) => d !== day)
      : [...curr, day]
    update({ byweekday: next.length ? next : undefined })
  }

  const setEndType = (type: 'never' | 'count' | 'until') => {
    const u: Partial<RRuleOptions> = { count: undefined, until: undefined }
    if (type === 'count') {
      u.count = opts?.count || 1
    }
    if (type === 'until') {
      u.until = opts?.until || dayjs().add(1, 'month').endOf('day').toDate()
    }
    update(u)
  }

  const endType = opts?.until ? 'until' : opts?.count ? 'count' : 'never'
  const freq = FREQ_TO_STR[opts?.freq ?? RRule.DAILY] || 'DAILY'
  const byweekday = Array.isArray(opts?.byweekday)
    ? opts.byweekday
    : opts?.byweekday
      ? [opts.byweekday]
      : []

  return (
    <Card data-testid="recurrence-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="recurring"
            checked={show}
            onCheckedChange={toggle}
            data-testid="toggle-recurrence"
          />
          <CardTitle className="text-sm">{t('repeat')}</CardTitle>
        </div>
        {show && value && (
          <p className="text-xs text-muted-foreground">
            {getDescription(value, t)}
          </p>
        )}
      </CardHeader>

      {show && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency" className="text-xs">
                  {t('repeats')}
                </Label>
                <Select
                  value={freq}
                  onValueChange={(f) =>
                    update({ freq: FREQ_MAP[f as keyof typeof FREQ_MAP] })
                  }
                >
                  <SelectTrigger
                    id="frequency"
                    className="h-8"
                    data-testid="frequency-select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(FREQ_MAP).map((f) => (
                      <SelectItem key={f} value={f}>
                        {t(f.toLowerCase())}
                      </SelectItem>
                    ))}
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
                  value={opts?.interval || 1}
                  onChange={(e) =>
                    update({ interval: parseNum(e.target.value) })
                  }
                  className="h-8"
                />
              </div>
            </div>

            {opts?.freq === RRule.WEEKLY && (
              <div>
                <Label className="text-xs">{t('repeatOn')}</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {weekDays.map((d, i) => (
                    <div key={d.label} className="flex items-center space-x-1">
                      <Checkbox
                        id={`day-${i}`}
                        checked={byweekday.includes(d.value)}
                        onCheckedChange={() => toggleDay(i)}
                      />
                      <Label
                        htmlFor={`day-${i}`}
                        className="text-xs cursor-pointer"
                      >
                        {d.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">{t('ends')}</Label>
              <div className="space-y-2 mt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="never"
                    checked={endType === 'never'}
                    onCheckedChange={() => setEndType('never')}
                  />
                  <Label htmlFor="never" className="text-xs">
                    {t('never')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="after"
                    checked={endType === 'count'}
                    onCheckedChange={() => setEndType('count')}
                  />
                  <Label htmlFor="after" className="text-xs">
                    {t('after')}
                  </Label>
                  {endType === 'count' && (
                    <Input
                      type="number"
                      min="1"
                      value={opts?.count || 1}
                      onChange={(e) =>
                        update({ count: parseNum(e.target.value) })
                      }
                      className="h-6 w-16 text-xs"
                      data-testid="count-input"
                    />
                  )}
                  <span className="text-xs">{t('occurrences')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="on"
                    checked={endType === 'until'}
                    onCheckedChange={() => setEndType('until')}
                  />
                  <Label htmlFor="on" className="text-xs">
                    {t('on')}
                  </Label>
                  {endType === 'until' && (
                    <DatePicker
                      date={opts?.until}
                      onChange={(d) =>
                        update({
                          until: d ? dayjs(d).endOf('day').toDate() : undefined,
                        })
                      }
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
