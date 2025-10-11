import { IlamyCalendar } from '@/features/calendar/components/ilamy-calendar'
import { IlamyResourceCalendar } from '@/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
import type {
  Resource,
  ResourceCalendarEvent,
} from '@/features/resource-calendar/types'
import type { CalendarEvent, WeekDays } from '@/components/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type dayjs from '@/lib/dayjs-config'
import dummyEvents from '@/lib/seed'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { DemoCalendarSettings } from './demo-calendar-settings'

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

// Demo resources
const demoResources: Resource[] = [
  {
    id: 'room-a',
    title: 'Conference Room A',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    order: 1,
  },
  {
    id: 'room-b',
    title: 'Conference Room B',
    color: '#059669',
    backgroundColor: '#d1fae5',
    order: 2,
  },
  {
    id: 'room-c',
    title: 'Meeting Room C',
    color: '#7c2d12',
    backgroundColor: '#fed7aa',
    order: 3,
  },
  {
    id: 'equipment-1',
    title: 'Projector #1',
    color: '#7c3aed',
    backgroundColor: '#ede9fe',
    order: 4,
  },
]

// Convert regular events to resource events
const createResourceEvents = (): ResourceCalendarEvent[] => {
  const resourceIds = demoResources.map((r) => r.id)

  return dummyEvents.map((event, index) => {
    const resourceEvent: ResourceCalendarEvent = { ...event }

    // Assign events to resources
    if (index % 4 === 0) {
      // Cross-resource event
      resourceEvent.resourceIds = [resourceIds[0], resourceIds[1]]
    } else {
      // Single resource event
      resourceEvent.resourceId = resourceIds[index % resourceIds.length]
    }

    return resourceEvent
  })
}

// Resource event handlers
const handleResourceEventClick = (event: ResourceCalendarEvent) => {
  const resources = event.resourceIds
    ? event.resourceIds.join(', ')
    : event.resourceId
  alert(`Resource Event clicked: ${event.title} (Resources: ${resources})`)
}

const handleResourceAdd = (resource: Resource) => {
  alert(`Resource added: ${resource.title}`)
}

const handleResourceUpdate = (resource: Resource) => {
  alert(`Resource updated: ${resource.title}`)
}

const handleResourceDelete = (resource: Resource) => {
  alert(`Resource deleted: ${resource.title}`)
}

export function DemoPage() {
  // Calendar type state
  const [calendarType, setCalendarType] = useState<'regular' | 'resource'>(
    'resource'
  )

  // Calendar configuration state
  const [calendarKey, setCalendarKey] = useState(0)
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<WeekDays>('sunday')
  const [initialView, setInitialView] = useState<
    'month' | 'week' | 'day' | 'year'
  >('month')
  const [customEvents] = useState<CalendarEvent[]>(dummyEvents)
  const [resourceEvents] = useState<ResourceCalendarEvent[]>(
    createResourceEvents()
  )
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
  const [calendarHeight, setCalendarHeight] = useState('600px')
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
          Interactive Demo
        </h1>
        <p className="text-muted-foreground">
          Try out the ilamy Calendar components with different configurations
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendar settings sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <DemoCalendarSettings
            calendarType={calendarType}
            setCalendarType={setCalendarType}
            firstDayOfWeek={firstDayOfWeek}
            setFirstDayOfWeek={setFirstDayOfWeek}
            initialView={initialView}
            setInitialView={setInitialView}
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
            // Resource calendar specific props
            isResourceCalendar={calendarType === 'resource'}
          />

          {/* Resource info card */}
          {calendarType === 'resource' && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Demo Resources</h3>
              <div className="space-y-2 text-sm">
                {demoResources.map((resource) => (
                  <div key={resource.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: resource.color }}
                    />
                    <span>{resource.title}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                Events are automatically assigned to resources. Some events span
                multiple resources.
              </div>
            </Card>
          )}
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
              {calendarType === 'regular' ? (
                <IlamyCalendar
                  key={calendarKey}
                  firstDayOfWeek={firstDayOfWeek}
                  initialView={initialView}
                  events={customEvents}
                  locale={locale}
                  timezone={timezone}
                  renderEvent={useCustomEventRenderer ? renderEvent : undefined}
                  onEventClick={
                    useCustomOnEventClick ? handleEventClick : undefined
                  }
                  onCellClick={
                    useCustomOnDateClick ? handleDateClick : undefined
                  }
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
              ) : (
                <IlamyResourceCalendar
                  key={`resource-${calendarKey}`}
                  resources={demoResources}
                  events={resourceEvents}
                  firstDayOfWeek={
                    firstDayOfWeek === 'sunday' ? 'sunday' : 'monday'
                  }
                  initialView={initialView === 'year' ? 'month' : initialView} // No year view for resource calendar
                  locale={locale}
                  timezone={timezone}
                  onEventClick={
                    useCustomOnEventClick ? handleResourceEventClick : undefined
                  }
                  onEventAdd={handleEventAdd}
                  onEventUpdate={handleEventUpdate}
                  onEventDelete={handleEventDelete}
                  onResourceAdd={handleResourceAdd}
                  onResourceUpdate={handleResourceUpdate}
                  onResourceDelete={handleResourceDelete}
                  onDateChange={handleDateChange}
                  disableCellClick={disableCellClick}
                  disableEventClick={disableEventClick}
                  disableDragAndDrop={disableDragAndDrop}
                  dayMaxEvents={dayMaxEvents}
                  stickyViewHeader={stickyViewHeader}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
