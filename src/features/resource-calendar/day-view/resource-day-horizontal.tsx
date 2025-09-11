import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs-config'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'

export const ResourceDayHorizontal: React.FC = () => {
  const {
    currentDate,
    getVisibleResources,
    getEventsForResource,
    onCellClick,
    t,
  } = useResourceCalendarContext()

  const visibleResources = getVisibleResources()

  // Generate hourly time slots for the day
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        datetime: currentDate.hour(hour).minute(0),
      })
    }
    return slots
  }, [currentDate])

  const handleCellClick = (
    datetime: dayjs.Dayjs,
    resourceId?: string | number
  ) => {
    const startTime = datetime
    const endTime = datetime.add(1, 'hour')
    onCellClick?.(startTime, endTime, resourceId)
  }

  if (visibleResources.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div>
          <h3 className="text-lg font-medium">{t('noResourcesVisible')}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('addResourcesOrShowExisting')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Resources sidebar */}
      <div className="w-40 border-r bg-muted/30 flex-shrink-0 flex flex-col">
        <div className="h-16 border-b flex items-center px-3 bg-background flex-shrink-0">
          <span className="text-sm font-medium">{t('resources')}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {visibleResources.map((resource) => (
            <div
              key={resource.id}
              className="h-16 border-b flex items-center px-3 flex-shrink-0"
              style={{ backgroundColor: resource.backgroundColor }}
            >
              <span
                className="text-sm font-medium truncate"
                style={{ color: resource.color }}
              >
                {resource.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeline area with single scroll */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max">
          {/* Time header row */}
          <div className="flex h-16 border-b sticky top-0 z-10 bg-background">
            {timeSlots.map((slot) => {
              const isNowHour = slot.datetime.isSame(dayjs(), 'hour')
              const isBusinessHour = slot.hour >= 6 && slot.hour <= 22

              return (
                <div
                  key={slot.hour}
                  className={cn(
                    'w-16 border-r flex items-center justify-center text-center font-medium flex-shrink-0',
                    isNowHour && 'bg-blue-50 text-blue-600',
                    !isBusinessHour && 'bg-muted/20 text-muted-foreground'
                  )}
                >
                  <div>
                    <div className="text-sm">{slot.datetime.format('ha')}</div>
                    <div className="text-xs text-muted-foreground">
                      {slot.datetime.format('HH:mm')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resource rows */}
          {visibleResources.map((resource) => {
            const resourceEvents = getEventsForResource(resource.id)

            return (
              <div key={resource.id} className="flex h-16 border-b">
                {timeSlots.map((slot) => {
                  const isNowHour = slot.datetime.isSame(dayjs(), 'hour')
                  const isBusinessHour = slot.hour >= 6 && slot.hour <= 22

                  // Find events for this hour and resource
                  const hourEvents = resourceEvents.filter(
                    (event: ResourceCalendarEvent) => {
                      const eventStart = event.start.startOf('hour')
                      const eventEnd = event.end.endOf('hour')
                      return slot.datetime.isBetween(
                        eventStart,
                        eventEnd,
                        null,
                        '[]'
                      )
                    }
                  )

                  // Calculate event bars that span across multiple hours
                  const spanningEvents = resourceEvents.filter(
                    (event: ResourceCalendarEvent) => {
                      return (
                        event.start.hour() <= slot.hour &&
                        event.end.hour() > slot.hour
                      )
                    }
                  )

                  return (
                    <div
                      key={`${resource.id}-${slot.hour}`}
                      className={cn(
                        'w-16 border-r relative cursor-pointer hover:bg-muted/20 flex-shrink-0',
                        !isBusinessHour && 'bg-muted/10',
                        isNowHour && 'bg-blue-50/50'
                      )}
                      onClick={() =>
                        handleCellClick(slot.datetime, resource.id)
                      }
                    >
                      {/* Spanning events - horizontal bars */}
                      {spanningEvents.map(
                        (event: ResourceCalendarEvent, index) => {
                          const eventStartHour = event.start.hour()
                          const eventEndHour = event.end.hour()
                          const duration = eventEndHour - eventStartHour + 1

                          // Only render the bar on the first hour of the event
                          if (slot.hour === eventStartHour) {
                            return (
                              <div
                                key={event.id}
                                className="absolute rounded text-white text-xs px-2 py-1 font-medium truncate"
                                style={{
                                  left: '2px',
                                  right: duration > 1 ? 'auto' : '2px',
                                  width:
                                    duration > 1
                                      ? `${duration * 64 - 4}px`
                                      : 'auto', // 64px = w-16
                                  top: `${4 + index * 20}px`,
                                  height: '16px',
                                  backgroundColor: event.color || '#3B82F6',
                                  zIndex: 10,
                                }}
                                title={`${event.title} (${event.start.format('HH:mm')} - ${event.end.format('HH:mm')})`}
                              >
                                {event.title}
                              </div>
                            )
                          }
                          return null
                        }
                      )}

                      {/* Hour-specific events - small indicators */}
                      {hourEvents.length > 0 && spanningEvents.length === 0 && (
                        <div className="absolute inset-1 space-y-0.5">
                          {hourEvents
                            .slice(0, 3)
                            .map((event: ResourceCalendarEvent) => (
                              <div
                                key={event.id}
                                className="h-1 rounded"
                                style={{
                                  backgroundColor: event.color || '#3B82F6',
                                }}
                                title={`${event.title} (${event.start.format('HH:mm')} - ${event.end.format('HH:mm')})`}
                              />
                            ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
