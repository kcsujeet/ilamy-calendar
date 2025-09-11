import React from 'react'
import { useResourceCalendarContext } from '@/contexts/ilamy-resource-calendar-context'
import { ResourceMonthVertical } from './resource-month-vertical'
import { ResourceMonthHorizontal } from './resource-month-horizontal'

export const ResourceMonthView: React.FC = () => {
  const { orientation } = useResourceCalendarContext()

  if (orientation === 'horizontal') {
    return <ResourceMonthHorizontal />
  }

  return <ResourceMonthVertical />
}
