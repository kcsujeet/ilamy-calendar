import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import React from 'react'
import { ResourceCalendarBody } from './resource-calendar-body'
import type {
  IlamyResourceCalendarProps,
  IlamyResourceCalendarPropEvent,
} from '@/features/resource-calendar/types'
import {
  DAY_MAX_EVENTS_DEFAULT,
  GAP_BETWEEN_ELEMENTS,
  WEEK_DAYS_NUMBER_MAP,
} from '@/lib/constants'
import { safeDate, normalizeEvents } from '@/lib/utils'
import type { CalendarEvent } from '@/components/types'

export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = ({
  events = [],
  resources = [],
  firstDayOfWeek = 'sunday',
  initialView = 'month',
  initialDate,
  disableDragAndDrop = false,
  dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
  timeFormat = '12-hour',
  eventSpacing = GAP_BETWEEN_ELEMENTS,
  ...props
}) => {
  return (
    <ResourceCalendarProvider
      events={normalizeEvents<IlamyResourceCalendarPropEvent, CalendarEvent>(
        events
      )}
      resources={resources}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      initialView={initialView}
      initialDate={safeDate(initialDate)}
      disableDragAndDrop={disableDragAndDrop}
      dayMaxEvents={dayMaxEvents}
      timeFormat={timeFormat}
      eventSpacing={eventSpacing}
      {...props}
    >
      <ResourceCalendarBody />
    </ResourceCalendarProvider>
  )
}
