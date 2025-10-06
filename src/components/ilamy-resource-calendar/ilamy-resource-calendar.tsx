import { ResourceCalendarProvider } from '@/contexts/ilamy-resource-calendar-context'
import { cn } from '@/lib/utils'
import React from 'react'
import type { IlamyCalendarProps } from '../ilamy-calendar/types'
import { ResourceCalendarBody } from './resource-calendar-body'
import type { Resource, ResourceCalendarEvent } from './types'
import { DAY_MAX_EVENTS_DEFAULT } from '@/lib/constants'

export interface IlamyResourceCalendarProps extends IlamyCalendarProps {
  /** Array of events to display */
  events?: ResourceCalendarEvent[]
  /** Array of resources */
  resources?: Resource[]
}

export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = ({
  events = [],
  resources = [],
  firstDayOfWeek = 'sunday',
  initialView = 'month',
  renderEvent,
  onEventClick,
  onCellClick,
  onViewChange,
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onDateChange,
  locale,
  timezone,
  disableCellClick,
  disableEventClick,
  disableDragAndDrop = false,
  dayMaxEvents = DAY_MAX_EVENTS_DEFAULT,
  stickyViewHeader,
  viewHeaderClassName,
  headerComponent,
  headerClassName,
  translations,
  translator,
}) => {
  const firstDayOfWeekNumber = firstDayOfWeek === 'monday' ? 1 : 0

  return (
    <div className={cn('h-full')}>
      <ResourceCalendarProvider
        events={events}
        resources={resources}
        firstDayOfWeek={firstDayOfWeekNumber}
        initialView={initialView}
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onCellClick={onCellClick}
        onViewChange={onViewChange}
        onEventAdd={onEventAdd}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onDateChange={onDateChange}
        locale={locale}
        timezone={timezone}
        disableCellClick={disableCellClick}
        disableEventClick={disableEventClick}
        disableDragAndDrop={disableDragAndDrop}
        dayMaxEvents={dayMaxEvents}
        stickyViewHeader={stickyViewHeader}
        viewHeaderClassName={viewHeaderClassName}
        headerComponent={headerComponent}
        headerClassName={headerClassName}
        translations={translations}
        translator={translator}
      >
        <ResourceCalendarBody />
      </ResourceCalendarProvider>
    </div>
  )
}
