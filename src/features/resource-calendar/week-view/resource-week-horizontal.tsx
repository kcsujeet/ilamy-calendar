import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs-config'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'

export const ResourceWeekHorizontal: React.FC = () => {
  const {
    currentDate,
    firstDayOfWeek,
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

  // Generate time columns (hourly slots)
  const timeColumns = useMemo(() => {
    const columns = []

    weekDays.forEach((day) => {
      for (let hour = 0; hour < 24; hour++) {
        columns.push({
          datetime: day.hour(hour).minute(0),
          day,
          hour,
        })
      }
    })

    return columns
  }, [weekDays])

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
        <div className="h-20 border-b flex items-center px-3 bg-background flex-shrink-0">
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
          {/* Day header row */}
          <div className="flex h-10 border-b sticky top-0 z-20 bg-background">
            {weekDays.map((day) => {
              const isToday = day.isSame(dayjs(), 'day')

              return (
                <div
                  key={day.format('YYYY-MM-DD')}
                  className={cn(
                    'flex-shrink-0 border-r flex items-center justify-center text-center font-medium',
                    isToday && 'bg-blue-50 text-blue-600'
                  )}
                  style={{ width: `${24 * 40}px` }} // 24 hours * 40px per hour
                >
                  <div>
                    <div className="text-sm">{day.format('ddd')}</div>
                    <div className="text-xs text-muted-foreground">
                      {day.format('M/D')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Time header row */}
          <div className="flex h-10 border-b sticky top-10 z-10 bg-background">
            {timeColumns.map((col) => {
              const isNowHour = col.datetime.isSame(dayjs(), 'hour')

              return (
                <div
                  key={col.datetime.format('YYYY-MM-DD-HH')}
                  className={cn(
                    'w-10 border-r flex items-center justify-center text-xs flex-shrink-0',
                    isNowHour && 'bg-blue-50 text-blue-600 font-medium',
                    col.hour % 2 === 0 ? 'bg-muted/10' : ''
                  )}
                >
                  {col.hour === 0 || col.hour % 4 === 0
                    ? col.datetime.format('ha')
                    : ''}
                </div>
              )
            })}
          </div>

          {/* Resource rows */}
          {visibleResources.map((resource) => {
            const resourceEvents = getEventsForResource(resource.id)

            return (
              <div key={resource.id} className="flex h-16 border-b">
                {timeColumns.map((col) => {
                  const isNowHour = col.datetime.isSame(dayjs(), 'hour')
                  const isWeekend = col.day.day() === 0 || col.day.day() === 6

                  // Find events for this hour and resource
                  const hourEvents = resourceEvents.filter(
                    (event: ResourceCalendarEvent) => {
                      const eventStart = event.start.startOf('hour')
                      const eventEnd = event.end.endOf('hour')
                      return col.datetime.isBetween(
                        eventStart,
                        eventEnd,
                        null,
                        '[]'
                      )
                    }
                  )

                  return (
                    <div
                      key={`${resource.id}-${col.datetime.format('YYYY-MM-DD-HH')}`}
                      className={cn(
                        'w-10 border-r relative cursor-pointer hover:bg-muted/20 flex-shrink-0',
                        isWeekend && 'bg-muted/10',
                        isNowHour && 'bg-blue-50/50',
                        col.hour % 2 === 0 ? 'bg-muted/5' : ''
                      )}
                      onClick={() => handleCellClick(col.datetime, resource.id)}
                    >
                      {/* Events for this cell - show as colored bars */}
                      {hourEvents.map((event: ResourceCalendarEvent, index) => (
                        <div
                          key={event.id}
                          className="absolute inset-x-0.5 rounded"
                          style={{
                            top: `${4 + index * 12}px`,
                            height: '8px',
                            backgroundColor: event.color || '#3B82F6',
                          }}
                          title={`${event.title} (${event.start.format('HH:mm')} - ${event.end.format('HH:mm')})`}
                        />
                      ))}
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
