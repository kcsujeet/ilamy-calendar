import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { ResourceDayVertical } from './resource-day-vertical'
import { ResourceDayHorizontal } from './resource-day-horizontal'

export const ResourceDayView: React.FC = () => {
  const { orientation } = useResourceCalendarContext()

  if (orientation === 'horizontal') {
    return <ResourceDayHorizontal />
  }

  return <ResourceDayVertical />
}
