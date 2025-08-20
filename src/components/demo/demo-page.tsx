import dummyEvents from '@/lib/seed'
import { cn } from '@/lib/utils'
import type { CalendarEvent, WeekDays } from '@/components/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useState } from 'react'
import { DemoCalendarSettings } from './demo-calendar-settings'
import type dayjs from '@/lib/dayjs-config'
import { IlamyCalendar } from '@/components/ilamy-calendar/ilamy-calendar'

// Event handlers moved outside component to avoid recreation
const handleEventClick = (event: CalendarEvent) => {
  alert(`Event clicked: ${event.title}`)
}

const handleDateClick = (date: dayjs.Dayjs) => {
  alert(`Date clicked: ${date.toISOString()}`)
}

const handleEventAdd = (event: CalendarEvent) => {
  alert(`Event added: ${event.title}`)
}

const handleEventUpdate = (event: CalendarEvent) => {
  alert(`Event updated: ${event.title}`)
}

const handleEventDelete = (event: CalendarEvent) => {
  alert(`Event deleted: ${event.title}`)
}

const handleDateChange = (date: dayjs.Dayjs) => {
  // Date navigation - could trigger other state updates in real apps
  void date
}

export function DemoPage() {
  // Calendar configuration state
  const [calendarKey, setCalendarKey] = useState(0)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<WeekDays>('sunday')
  const [customEvents] = useState<CalendarEvent[]>(dummyEvents)
  const [useCustomEventRenderer, setUseCustomEventRenderer] = useState(false)
  const [locale, setLocale] = useState('en')
  const [timezone, setTimezone] = useState(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const [stickyViewHeader, setStickyHeader] = useState(true)

  // Disable functionality state
  const [disableCellClick, setDisableCellClick] = useState(false)
  const [disableEventClick, setDisableEventClick] = useState(false)
  const [disableDragAndDrop, setDisableDragAndDrop] = useState(false)

  // Custom handler state
  const [useCustomOnDateClick, setUseCustomOnDateClick] = useState(false)
  const [useCustomOnEventClick, setUseCustomOnEventClick] = useState(false)

  // UI settings
  const [calendarHeight, setCalendarHeight] = useState('auto')
  const [dayMaxEvents, setDayMaxEvents] = useState(3)

  const handleSetLocale = (newLocale: string) => {
    setLocale(newLocale)
    // wait for the uesEffect to complete
    setTimeout(() => {
      // Force re-render to apply locale changes
      setCalendarKey((prev) => prev + 1)
    }, 10)
  }

  // Custom event renderer function
  const renderEvent = (event: CalendarEvent) => {
    const backgroundColor = event.backgroundColor || 'bg-blue-500'
    const color = event.color || 'text-blue-800'
    return (
      <div
        className={cn(
          'border-primary border-1 border-l-2 px-2 truncate w-full h-full',
          backgroundColor,
          color
        )}
        style={{ backgroundColor, color }}
      >
        {event.title}
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 relative">
      {/* Decorative background elements */}
      <div className="fixed top-20 right-20 -z-10 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
      <div className="fixed bottom-20 left-10 -z-10 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-3xl animate-pulse"></div>

      <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
        Interactive Demo
      </h1>
      <p className="text-muted-foreground mb-8">
        Try out the ilamy Calendar component with different configurations
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar settings sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <DemoCalendarSettings
            firstDayOfWeek={firstDayOfWeek}
            setFirstDayOfWeek={setFirstDayOfWeek}
            useCustomEventRenderer={useCustomEventRenderer}
            setUseCustomEventRenderer={setUseCustomEventRenderer}
            locale={locale}
            setLocale={handleSetLocale}
            timezone={timezone}
            setTimezone={setTimezone}
            disableCellClick={disableCellClick}
            setDisableCellClick={setDisableCellClick}
            disableEventClick={disableEventClick}
            setDisableEventClick={setDisableEventClick}
            disableDragAndDrop={disableDragAndDrop}
            setDisableDragAndDrop={setDisableDragAndDrop}
            useCustomOnDateClick={useCustomOnDateClick}
            setUseCustomOnDateClick={setUseCustomOnDateClick}
            useCustomOnEventClick={useCustomOnEventClick}
            setUseCustomOnEventClick={setUseCustomOnEventClick}
            calendarHeight={calendarHeight}
            setCalendarHeight={setCalendarHeight}
            dayMaxEvents={dayMaxEvents}
            setDayMaxEvents={setDayMaxEvents}
            stickyViewHeader={stickyViewHeader}
            setStickyHeader={setStickyHeader}
          />
        </div>

        {/* Calendar display */}
        <div className="lg:col-span-3">
          <Card className="border backdrop-blur-md shadow-lg overflow-clip relative p-2 bg-background">
            <CardHeader>
              <div className="py-3 flex items-center">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="mx-auto text-sm font-medium">Calendar Demo</div>
              </div>
            </CardHeader>

            <CardContent
              className="p-0 overflow-clip relative z-10"
              style={{ height: calendarHeight }}
            >
              <IlamyCalendar
                key={calendarKey}
                firstDayOfWeek={firstDayOfWeek}
                events={customEvents}
                locale={locale}
                timezone={timezone}
                renderEvent={useCustomEventRenderer ? renderEvent : undefined}
                onEventClick={
                  useCustomOnEventClick ? handleEventClick : undefined
                }
                onCellClick={useCustomOnDateClick ? handleDateClick : undefined}
                onEventAdd={handleEventAdd}
                onEventUpdate={handleEventUpdate}
                onEventDelete={handleEventDelete}
                onDateChange={handleDateChange}
                disableCellClick={disableCellClick}
                disableEventClick={disableEventClick}
                disableDragAndDrop={disableDragAndDrop}
                dayMaxEvents={dayMaxEvents}
                stickyViewHeader={stickyViewHeader}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
