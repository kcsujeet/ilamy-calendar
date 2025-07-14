import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import type { WeekDays } from '@/components/types'

interface DemoCalendarSettingsProps {
  firstDayOfWeek: WeekDays
  setFirstDayOfWeek: (value: WeekDays) => void
  useCustomEventRenderer: boolean
  setUseCustomEventRenderer: (value: boolean) => void
  locale: string
  setLocale: (value: string) => void
  timezone: string
  setTimezone: (value: string) => void
  disableDateClick: boolean
  setDisableDateClick: (value: boolean) => void
  disableEventClick: boolean
  setDisableEventClick: (value: boolean) => void
  disableDragAndDrop: boolean
  setDisableDragAndDrop: (value: boolean) => void
  useCustomOnDateClick: boolean
  setUseCustomOnDateClick: (value: boolean) => void
  useCustomOnEventClick: boolean
  setUseCustomOnEventClick: (value: boolean) => void
  calendarHeight: string
  setCalendarHeight: (value: string) => void
  dayMaxEvents: number
  setDayMaxEvents: (value: number) => void
}

export function DemoCalendarSettings({
  firstDayOfWeek,
  setFirstDayOfWeek,
  useCustomEventRenderer,
  setUseCustomEventRenderer,
  locale,
  setLocale,
  timezone,
  setTimezone,
  disableDateClick,
  setDisableDateClick,
  disableEventClick,
  setDisableEventClick,
  disableDragAndDrop,
  setDisableDragAndDrop,
  useCustomOnDateClick,
  setUseCustomOnDateClick,
  useCustomOnEventClick,
  setUseCustomOnEventClick,
  calendarHeight,
  setCalendarHeight,
  dayMaxEvents,
  setDayMaxEvents,
}: DemoCalendarSettingsProps) {
  return (
    <Card className="border border-white/20 dark:border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-md shadow-lg overflow-hidden gap-0">
      <CardHeader className="border-b border-white/10 dark:border-white/5 p-4">
        <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Calendar Settings
        </CardTitle>
        <CardDescription>Customize the calendar display</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        <div>
          <label className="block text-sm font-medium mb-1">
            First Day of Week
          </label>
          <Select
            value={firstDayOfWeek}
            onValueChange={(value) => setFirstDayOfWeek(value as WeekDays)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select first day of week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sunday">Sunday</SelectItem>
              <SelectItem value="monday">Monday</SelectItem>
              <SelectItem value="tuesday">Tuesday</SelectItem>
              <SelectItem value="wednesday">Wednesday</SelectItem>
              <SelectItem value="thursday">Thursday</SelectItem>
              <SelectItem value="friday">Friday</SelectItem>
              <SelectItem value="saturday">Saturday</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Locale</label>
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select locale" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="ru">Русский</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Timezone</label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {Intl.supportedValuesOf('timeZone').map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Calendar Height
          </label>
          <Select value={calendarHeight} onValueChange={setCalendarHeight}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select height" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="400px">Small (400px)</SelectItem>
              <SelectItem value="600px">Medium (600px)</SelectItem>
              <SelectItem value="800px">Large (800px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Max Events Per Day
          </label>
          <Select
            value={dayMaxEvents?.toString()}
            onValueChange={(value) => setDayMaxEvents(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select max events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 event</SelectItem>
              <SelectItem value="2">2 events</SelectItem>
              <SelectItem value="3">3 events</SelectItem>
              <SelectItem value="4">4 events</SelectItem>
              <SelectItem value="5">5 events</SelectItem>
              <SelectItem value="999">No limit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="customRenderer"
            checked={useCustomEventRenderer}
            onCheckedChange={() =>
              setUseCustomEventRenderer(!useCustomEventRenderer)
            }
          />
          <label
            htmlFor="customRenderer"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Use custom event renderer
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="useCustomOnDateClick"
            checked={useCustomOnDateClick}
            onCheckedChange={() =>
              setUseCustomOnDateClick(!useCustomOnDateClick)
            }
          />
          <label
            htmlFor="useCustomOnDateClick"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Use custom onDateClick handler
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="useCustomOnEventClick"
            checked={useCustomOnEventClick}
            onCheckedChange={() =>
              setUseCustomOnEventClick(!useCustomOnEventClick)
            }
          />
          <label
            htmlFor="useCustomOnEventClick"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Use custom onEventClick handler
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="disableDateClick"
            checked={disableDateClick}
            onCheckedChange={() => setDisableDateClick(!disableDateClick)}
          />
          <label
            htmlFor="disableDateClick"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Disable cell clicks
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="disableEventClick"
            checked={disableEventClick}
            onCheckedChange={() => setDisableEventClick(!disableEventClick)}
          />
          <label
            htmlFor="disableEventClick"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Disable event clicks
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="disableDragAndDrop"
            checked={disableDragAndDrop}
            onCheckedChange={() => setDisableDragAndDrop(!disableDragAndDrop)}
          />
          <label
            htmlFor="disableDragAndDrop"
            className="text-sm font-medium leading-none cursor-pointer"
          >
            Disable drag & drop
          </label>
        </div>
      </CardContent>
    </Card>
  )
}
