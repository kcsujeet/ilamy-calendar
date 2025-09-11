import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { ResourceWeekVertical } from './resource-week-vertical'
import { ResourceWeekHorizontal } from './resource-week-horizontal'

export const ResourceWeekView: React.FC = () => {
  const { orientation } = useResourceCalendarContext()

  if (orientation === 'horizontal') {
    return <ResourceWeekHorizontal />
  }

  return <ResourceWeekVertical />
}
