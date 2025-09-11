import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { BaseHeader } from '@/components/header'
import { ResourceEventForm } from '@/components/event-form/resource-event-form'
import { ResourceMonthView } from '@/features/resource-calendar/month-view'
import { ResourceWeekView } from '@/features/resource-calendar/week-view'
import { ResourceDayView } from '@/features/resource-calendar/day-view'

export const ResourceCalendarBody: React.FC = () => {
  const { view, headerComponent, headerClassName } =
    useResourceCalendarContext()

  const renderCurrentView = () => {
    switch (view) {
      case 'month':
        return <ResourceMonthView />
      case 'week':
        return <ResourceWeekView />
      case 'day':
        return <ResourceDayView />
      default:
        return <ResourceMonthView />
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {headerComponent || (
        <BaseHeader className={headerClassName} showResourceControls={true} />
      )}
      <div className="flex-1 min-h-0">{renderCurrentView()}</div>
      <ResourceEventForm />
    </div>
  )
}
