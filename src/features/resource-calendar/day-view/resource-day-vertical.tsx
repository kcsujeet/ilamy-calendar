import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs-config'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import { ResourceEventItem } from '../shared/resource-event-item'
import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'

export const ResourceDayVertical: React.FC = () => {
  const {
    currentDate,
    resources,
    getVisibleResources,
    getEventsForResource,
    onCellClick,
    t,
  } = useResourceCalendarContext()

  const visibleResources = getVisibleResources()

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(dayjs().hour(hour).minute(minute))
      }
    }
    return slots
  }, [])

  const handleCellClick = (
    hour: number,
    minute: number,
    resourceId?: string | number
  ) => {
    const startTime = currentDate.hour(hour).minute(minute)
    const endTime = startTime.add(30, 'minute')
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
    <div className="flex h-full flex-col">
      {/* Header with day and resources */}
      <div className="border-b bg-muted/30">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `100px repeat(${visibleResources.length}, 1fr)`,
          }}
        >
          <div className="border-r p-2">
            <span className="text-sm font-medium">{t('time')}</span>
          </div>
          {visibleResources.map((resource) => (
            <div
              key={resource.id}
              className="border-r p-2 text-center"
              style={{ backgroundColor: resource.backgroundColor }}
            >
              <span
                className="text-sm font-medium"
                style={{ color: resource.color }}
              >
                {resource.title}
              </span>
            </div>
          ))}
        </div>

        {/* Day header */}
        <div
          className="grid border-t bg-blue-50/50"
          style={{
            gridTemplateColumns: `100px repeat(${visibleResources.length}, 1fr)`,
          }}
        >
          <div className="border-r p-2">
            <div className="text-sm font-semibold text-blue-600">
              {currentDate.format('dddd, MMMM D')}
            </div>
          </div>
          {Array(visibleResources.length)
            .fill(null)
            .map((_, index) => (
              <div key={index} className="border-r h-8" />
            ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `100px repeat(${visibleResources.length}, 1fr)`,
          }}
        >
          {/* Time column */}
          <div className="border-r bg-muted/5">
            {timeSlots.map((slot) => (
              <div
                key={`${slot.hour()}-${slot.minute()}`}
                className={cn(
                  'h-8 border-b p-1 text-xs text-muted-foreground',
                  slot.minute() === 0 && 'border-b-2 font-medium'
                )}
              >
                {slot.minute() === 0 && slot.format('HH:mm')}
              </div>
            ))}
          </div>

          {/* Resource columns */}
          {visibleResources.map((resource) => {
            const resourceEvents = getEventsForResource(resource.id)

            return (
              <div key={resource.id} className="border-r">
                {timeSlots.map((slot) => {
                  const cellDateTime = currentDate
                    .hour(slot.hour())
                    .minute(slot.minute())
                  const cellEvents = resourceEvents.filter(
                    (event: ResourceCalendarEvent) => {
                      return cellDateTime.isBetween(
                        event.start.subtract(15, 'minute'),
                        event.end.add(15, 'minute'),
                        null,
                        '[]'
                      )
                    }
                  )

                  return (
                    <div
                      key={`${slot.hour()}-${slot.minute()}`}
                      className={cn(
                        'h-8 border-b p-1 cursor-pointer hover:bg-muted/20 relative',
                        slot.minute() === 0 && 'border-b-2'
                      )}
                      onClick={() =>
                        handleCellClick(slot.hour(), slot.minute(), resource.id)
                      }
                    >
                      <div className="space-y-0.5 h-full overflow-hidden">
                        {cellEvents.map((event: ResourceCalendarEvent) => (
                          <ResourceEventItem
                            key={event.id}
                            event={event}
                            resources={resources}
                            size="sm"
                          />
                        ))}
                      </div>
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
