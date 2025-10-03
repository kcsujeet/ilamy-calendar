import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '../shared/resource-event-grid'
import dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'

export const ResourceWeekHorizontal: React.FC = () => {
  const { currentDate, firstDayOfWeek, t } = useResourceCalendarContext()

  // Generate week days
  const weekDays = useMemo(() => {
    const dayjsStartOfWeek = currentDate.startOf('week')
    const offset =
      firstDayOfWeek === 0 ? 0 : firstDayOfWeek - dayjsStartOfWeek.day()
    const adjustedStart = dayjsStartOfWeek.add(offset, 'day')
    return Array.from({ length: 7 }, (_, i) => adjustedStart.add(i, 'day'))
  }, [currentDate, firstDayOfWeek])

  // Generate time columns (hourly slots)
  const weekHours = useMemo(() => {
    return weekDays.flatMap((day) =>
      Array.from({ length: 24 }, (_, hour) => day.hour(hour).minute(0))
    )
  }, [weekDays])

  return (
    <div className="flex h-full flex-col">
      <ResourceEventGrid days={weekHours} gridType="hour">
        <div className="flex h-24">
          <div className="w-40 border-b border-r flex-shrink-0 flex justify-center items-center">
            <div className="text-sm">{t('resources')}</div>
          </div>

          <div className="flex-1 border-b border-r flex flex-col">
            {/* Day header row */}
            <div className="flex h-12 border-b sticky top-0 z-20 bg-background">
              {weekDays.map((day) => {
                const isToday = day.isSame(dayjs(), 'day')

                return (
                  <div
                    key={day.format('YYYY-MM-DD')}
                    className={cn(
                      'flex-shrink-0 border-r flex items-center justify-center text-center font-medium w-[calc(24*var(--spacing)*20)]',
                      isToday && 'bg-blue-50 text-blue-600'
                    )}
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
            <div className="flex h-12 border-b sticky top-10 z-10 bg-background">
              {weekHours.map((col) => {
                const isNowHour = col.isSame(dayjs(), 'hour')

                return (
                  <div
                    key={col.format('YYYY-MM-DD-HH')}
                    className={cn(
                      'w-20 border-r flex items-center justify-center text-xs flex-shrink-0',
                      isNowHour && 'bg-blue-50 text-blue-600 font-medium'
                    )}
                  >
                    {col.format('ha')}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </ResourceEventGrid>
    </div>
  )
}
