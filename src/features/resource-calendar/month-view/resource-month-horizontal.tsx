import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import type dayjs from '@/lib/dayjs-config'
import React, { useMemo } from 'react'
import { ResourceEventGrid } from '../shared/resource-event-grid'

export const ResourceMonthHorizontal: React.FC = () => {
  const { currentDate } = useResourceCalendarContext()

  // Generate calendar grid - days of the month
  const monthDays = useMemo<dayjs.Dayjs[]>(() => {
    const daysInMonth = currentDate.daysInMonth()
    return Array.from({ length: daysInMonth }, (_, i) =>
      currentDate.startOf('month').add(i, 'day')
    )
  }, [currentDate])

  return (
    <div className="flex flex-col h-full border">
      <ResourceEventGrid days={monthDays} />
    </div>
  )
}
