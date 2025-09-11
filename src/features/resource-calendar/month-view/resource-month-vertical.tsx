import React, { useMemo } from 'react'
import dayjs from '@/lib/dayjs-config'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import { ResourceEventItem } from '../shared/resource-event-item'
import type { ResourceCalendarEvent } from '@/components/ilamy-resource-calendar/types'
import type { TranslationKey } from '@/lib/translations/types'

export const ResourceMonthVertical: React.FC = () => {
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

  // Generate calendar grid
  const calendarGrid = useMemo(() => {
    const startOfMonth = currentDate.startOf('month')
    const endOfMonth = currentDate.endOf('month')
    const startDate = startOfMonth
      .startOf('week')
      .subtract(firstDayOfWeek === 1 ? 1 : 0, 'day')
    const endDate = endOfMonth
      .endOf('week')
      .add(firstDayOfWeek === 1 ? 1 : 0, 'day')

    const days = []
    let currentDay = startDate

    while (currentDay.isBefore(endDate) || currentDay.isSame(endDate, 'day')) {
      days.push(currentDay)
      currentDay = currentDay.add(1, 'day')
    }

    return days
  }, [currentDate, firstDayOfWeek])

  const weekDays = useMemo(() => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    if (firstDayOfWeek === 1) {
      days.push(days.shift()!)
    }
    return days.map((day) => t(day as TranslationKey))
  }, [firstDayOfWeek, t])

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
    <div className="flex h-full flex-col">
      {/* Header with weekdays and resources */}
      <div className="border-b bg-muted/30">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `150px repeat(${weekDays.length}, 1fr)`,
          }}
        >
          <div className="border-r p-2">
            <span className="text-sm font-medium">{t('resources')}</span>
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              className="border-r p-2 text-center text-sm font-medium"
            >
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Calendar grid with resources */}
      <div className="flex-1 overflow-auto">
        {visibleResources.map((resource) => {
          const resourceEvents = getEventsForResource(resource.id)

          return (
            <div key={resource.id} className="border-b">
              {/* Resource header */}
              <div
                className="grid border-b bg-muted/10"
                style={{
                  gridTemplateColumns: `150px repeat(${weekDays.length}, 1fr)`,
                }}
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
                {Array(weekDays.length)
                  .fill(null)
                  .map((_, index) => (
                    <div key={index} className="border-r h-8" />
                  ))}
              </div>

              {/* Week rows for this resource */}
              <div className="min-h-[120px]">
                {Array.from(
                  { length: Math.ceil(calendarGrid.length / 7) },
                  (_, weekIndex) => {
                    const weekDays = calendarGrid.slice(
                      weekIndex * 7,
                      (weekIndex + 1) * 7
                    )

                    return (
                      <div
                        key={weekIndex}
                        className="grid border-b"
                        style={{ gridTemplateColumns: `150px repeat(7, 1fr)` }}
                      >
                        <div className="border-r" />
                        {weekDays.map((day) => {
                          const isCurrentMonth = day.isSame(
                            currentDate,
                            'month'
                          )
                          const isToday = day.isSame(dayjs(), 'day')
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
                              key={day.format('YYYY-MM-DD')}
                              className={cn(
                                'border-r min-h-[120px] p-1 cursor-pointer hover:bg-muted/20',
                                !isCurrentMonth &&
                                  'bg-muted/10 text-muted-foreground',
                                isToday && 'bg-blue-50'
                              )}
                              onClick={() => handleCellClick(day, resource.id)}
                            >
                              <div
                                className={cn(
                                  'text-sm mb-1',
                                  isToday && 'font-semibold text-blue-600'
                                )}
                              >
                                {day.format('D')}
                              </div>
                              <div className="space-y-1">
                                {dayEvents.map(
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
                    )
                  }
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
