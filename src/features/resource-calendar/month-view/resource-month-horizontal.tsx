import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'
import React, { useMemo } from 'react'

export const ResourceMonthHorizontal: React.FC = () => {
  const {
    currentDate,
    getVisibleResources,
    getEventsForResource,
    onCellClick,
    t,
  } = useResourceCalendarContext()

  const visibleResources = getVisibleResources()

  // Generate calendar grid - days of the month
  const monthDays = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')

    const days = []
    let currentDay = startOfMonth

    while (
      currentDay.isBefore(endOfMonth) ||
      currentDay.isSame(endOfMonth, 'day')
    ) {
      days.push(currentDay)
      currentDay = currentDay.add(1, 'day')
    }

    return days
  }, [currentDate])

  const handleCellClick = (date: dayjs.Dayjs, resourceId?: string | number) => {
    const startTime = date.hour(9).minute(0)
    const endTime = date.hour(10).minute(0)
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
        <div className="h-12 border-b flex items-center px-3 bg-background flex-shrink-0">
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
          {/* Header row */}
          <div className="flex sticky top-0 z-10">
            {monthDays.map((day) => {
              const isToday = day.isSame(dayjs(), 'day')
              const isWeekend = day.day() === 0 || day.day() === 6

              return (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={cn(
                    'w-20 h-12 border-r border-b bg-background flex-shrink-0 flex flex-col items-center justify-center text-center',
                    isWeekend && 'bg-muted/20',
                    isToday && 'bg-blue-50 text-blue-600'
                  )}
                >
                  <div className="text-xs font-medium">{day.format('D')}</div>
                  <div className="text-xs text-muted-foreground">
                    {day.format('ddd')}
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
                {monthDays.map((day) => {
                  const isToday = day.isSame(dayjs(), 'day')
                  const isWeekend = day.day() === 0 || day.day() === 6

                  // Find events for this day and resource
                  const dayEvents = resourceEvents.filter(
                    (event: ResourceCalendarEvent) =>
                      day.isBetween(
                        event.start.startOf('day'),
                        event.end.endOf('day'),
                        null,
                        '[]'
                      )
                  )

                  return (
                    <div
                      key={`${resource.id}-${day.format('YYYY-MM-DD')}`}
                      className={cn(
                        'w-20 border-r relative cursor-pointer hover:bg-muted/20 flex-shrink-0',
                        isWeekend && 'bg-muted/10',
                        isToday && 'bg-blue-50/50'
                      )}
                      onClick={() => handleCellClick(day, resource.id)}
                    >
                      {/* Events for this cell */}
                      <div className="absolute inset-1 space-y-0.5">
                        {dayEvents
                          .slice(0, 2)
                          .map((event: ResourceCalendarEvent) => (
                            <div
                              key={event.id}
                              className={cn(
                                'text-xs px-1 py-0.5 rounded truncate text-white font-medium',
                                'bg-blue-500' // Default color, should use event color
                              )}
                              style={{
                                backgroundColor: event.color || '#3B82F6',
                              }}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-muted-foreground px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
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
