import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import React from 'react'
import { ResourceCalendarBody } from './resource-calendar-body'
import type { IlamyResourceCalendarProps } from '@/features/resource-calendar/types'
import { DAY_MAX_EVENTS_DEFAULT, WEEK_DAYS_NUMBER_MAP } from '@/lib/constants'

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
  renderResource,
}) => {
  return (
    <ResourceCalendarProvider
      events={events}
      resources={resources}
      firstDayOfWeek={WEEK_DAYS_NUMBER_MAP[firstDayOfWeek]}
      initialView={initialView}
      renderEvent={renderEvent}
      renderResource={renderResource}
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
  )
}
