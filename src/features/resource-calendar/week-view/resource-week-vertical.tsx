import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs-config'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import { ResourceEventItem } from '../shared/resource-event-item'
import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'

export const ResourceWeekVertical: React.FC = () => {
  const {
    currentDate,
    firstDayOfWeek,
    resources,
    getVisibleResources,
    getEventsForResource,
    onCellClick,
    t,
  } = useResourceCalendarContext()

  const visibleResources = getVisibleResources()

  // Generate week days
  const weekDays = useMemo(() => {
    const startOfWeek = currentDate
      .startOf('week')
      .subtract(firstDayOfWeek === 1 ? 1 : 0, 'day')
    const days = []

    for (let i = 0; i < 7; i++) {
      days.push(startOfWeek.add(i, 'day'))
    }

    return days
  }, [currentDate, firstDayOfWeek])

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      slots.push(dayjs().hour(hour).minute(0))
    }
    return slots
  }, [])

  const handleCellClick = (
    date: dayjs.Dayjs,
    hour: number,
    resourceId?: string | number
  ) => {
    const startTime = date.hour(hour).minute(0)
    const endTime = date.hour(hour + 1).minute(0)
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
      {/* Header with days */}
      <div className="border-b bg-muted/30">
        <div
          className="grid"
          style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}
        >
          <div className="border-r p-2">
            <span className="text-sm font-medium">{t('resources')}</span>
          </div>
          {weekDays.map((day) => {
            const isToday = day.isSame(dayjs(), 'day')
            return (
              <div
                key={day.format('YYYY-MM-DD')}
                className={cn(
                  'border-r p-2 text-center',
                  isToday && 'bg-blue-50'
                )}
              >
                <div
                  className={cn(
                    'text-sm font-medium',
                    isToday && 'text-blue-600'
                  )}
                >
                  {day.format('ddd D')}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar grid with resources and time */}
      <div className="flex-1 overflow-auto">
        {visibleResources.map((resource) => {
          const resourceEvents = getEventsForResource(resource.id)

          return (
            <div key={resource.id} className="border-b">
              {/* Resource header */}
              <div
                className="grid border-b bg-muted/10"
                style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}
              >
                <div
                  className="border-r p-2 flex items-center"
                  style={{ backgroundColor: resource.backgroundColor }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: resource.color }}
                  >
                    {resource.title}
                  </span>
                </div>
                {Array(7)
                  .fill(null)
                  .map((_, index) => (
                    <div key={index} className="border-r h-8" />
                  ))}
              </div>

              {/* Time grid for this resource */}
              <div className="relative">
                <div
                  className="grid"
                  style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}
                >
                  <div className="border-r bg-muted/5">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot.hour()}
                        className="h-12 border-b p-1 text-xs text-muted-foreground"
                      >
                        {slot.format('HH:mm')}
                      </div>
                    ))}
                  </div>

                  {weekDays.map((day) => (
                    <div key={day.format('YYYY-MM-DD')} className="border-r">
                      {timeSlots.map((slot) => {
                        const cellDateTime = day.hour(slot.hour()).minute(0)
                        const cellEvents = resourceEvents.filter(
                          (event: ResourceCalendarEvent) => {
                            const eventStart = event.start.startOf('hour')
                            const eventEnd = event.end.endOf('hour')
                            return cellDateTime.isBetween(
                              eventStart,
                              eventEnd,
                              null,
                              '[]'
                            )
                          }
                        )

                        return (
                          <div
                            key={slot.hour()}
                            className="h-12 border-b p-1 cursor-pointer hover:bg-muted/20 relative"
                            onClick={() =>
                              handleCellClick(day, slot.hour(), resource.id)
                            }
                          >
                            <div className="space-y-0.5 h-full overflow-hidden">
                              {cellEvents.map(
                                (event: ResourceCalendarEvent) => (
                                  <ResourceEventItem
                                    key={event.id}
                                    event={event}
                                    resources={resources}
                                    size="sm"
                                  />
                                )
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
