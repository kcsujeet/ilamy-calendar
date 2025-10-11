import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '@/features/resource-calendar/components/resource-event-grid'
import { cn } from '@/lib/utils'

export const ResourceMonthHorizontal: React.FC = () => {
  const { currentDate, t, stickyViewHeader, viewHeaderClassName } =
    useResourceCalendarContext()

  // Generate calendar grid - days of the month
  const monthDays = useMemo<dayjs.Dayjs[]>(() => {
    const daysInMonth = currentDate.daysInMonth()
    return Array.from({ length: daysInMonth }, (_, i) =>
      currentDate.startOf('month').add(i, 'day')
    )
  }, [currentDate])

  return (
    <div className="flex flex-col h-full border">
      <ResourceEventGrid days={monthDays}>
        <div
          className={cn(
            'flex h-12 w-fit',
            stickyViewHeader && 'sticky top-0 z-21 bg-background', // Z-index above the left sticky resource column
            viewHeaderClassName
          )}
        >
          <div className="w-40 border-b border-r flex-shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20">
            <div className="text-sm">{t('resources')}</div>
          </div>

          {monthDays.map((day) => (
            <div
              key={day.format('YYYY-MM-DD')}
              className="w-20 border-b border-r flex-shrink-0 flex items-center justify-center flex-col"
            >
              <div className="text-xs font-medium">{day.format('D')}</div>
              <div className="text-xs text-muted-foreground">
                {day.format('ddd')}
              </div>
            </div>
          ))}
        </div>
      </ResourceEventGrid>
    </div>
  )
}
