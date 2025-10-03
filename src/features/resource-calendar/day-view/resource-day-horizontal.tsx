import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '../shared/resource-event-grid'
import dayjs from '@/lib/dayjs-config'
import { cn } from '@/lib/utils'

export const ResourceDayHorizontal: React.FC = () => {
  const { currentDate, t } = useResourceCalendarContext()

  // Generate time columns (hourly slots)
  const dayHours = useMemo(() => {
    return Array.from({ length: 24 }, (_, hour) =>
      currentDate.hour(hour).minute(0)
    )
  }, [currentDate])

  return (
    <div className="flex h-full flex-col">
      <ResourceEventGrid days={dayHours} gridType="hour">
        <div className="flex h-12">
          <div className="w-40 border-b border-r flex-shrink-0 flex justify-center items-center">
            <div className="text-sm">{t('resources')}</div>
          </div>

          <div className="flex-1 border-b border-r flex flex-col">
            {/* Time header row */}
            <div className="flex h-12 border-b sticky top-10 z-10 bg-background">
              {dayHours.map((col) => {
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
