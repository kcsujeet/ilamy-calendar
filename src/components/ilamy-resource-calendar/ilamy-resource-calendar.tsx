import React from 'react'
import type { ReactNode } from 'react'
import { CalendarDndContext } from '@/features/drag-and-drop/calendar-dnd-context'
import { ResourceCalendarProvider } from '@/contexts/ilamy-resource-calendar-context'
import type {
  Resource,
  ResourceCalendarEvent,
  ResourceOrientation,
  ResourceView,
} from './types'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import { ResourceCalendarBody } from './resource-calendar-body'
import { cn } from '@/lib/utils'
import type dayjs from '@/lib/dayjs-config'

export interface IlamyResourceCalendarProps {
  /** Array of events to display */
  events?: ResourceCalendarEvent[]
  /** Array of resources */
  resources?: Resource[]
  /** First day of the week (0 = Sunday, 1 = Monday) */
  firstDayOfWeek?: 'sunday' | 'monday'
  /** Initial view to display */
  initialView?: ResourceView
  /** Initial orientation for resource layout */
  initialOrientation?: ResourceOrientation
  /** Custom event renderer */
  renderEvent?: (event: ResourceCalendarEvent) => ReactNode
  /** Callback when an event is clicked */
  onEventClick?: (event: ResourceCalendarEvent) => void
  /** Callback when a cell is clicked */
  onCellClick?: (
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
    resourceId?: string | number
  ) => void
  /** Callback when the view changes */
  onViewChange?: (view: ResourceView) => void
  /** Callback when an event is added */
  onEventAdd?: (event: ResourceCalendarEvent) => void
  /** Callback when an event is updated */
  onEventUpdate?: (event: ResourceCalendarEvent) => void
  /** Callback when an event is deleted */
  onEventDelete?: (event: ResourceCalendarEvent) => void
  /** Callback when the current date changes */
  onDateChange?: (date: dayjs.Dayjs) => void
  /** Callback when a resource is added */
  onResourceAdd?: (resource: Resource) => void
  /** Callback when a resource is updated */
  onResourceUpdate?: (resource: Resource) => void
  /** Callback when a resource is deleted */
  onResourceDelete?: (resource: Resource) => void
  /** Callback when orientation changes */
  onOrientationChange?: (orientation: ResourceOrientation) => void
  /** Locale for internationalization */
  locale?: string
  /** Timezone for date handling */
  timezone?: string
  /** Disable cell click interactions */
  disableCellClick?: boolean
  /** Disable event click interactions */
  disableEventClick?: boolean
  /** Disable drag and drop functionality */
  disableDragAndDrop?: boolean
  /** Maximum number of events to show per day in month view */
  dayMaxEvents?: number
  /** Make view header sticky */
  stickyViewHeader?: boolean
  /** CSS class for view header */
  viewHeaderClassName?: string
  /** Custom header component */
  headerComponent?: ReactNode
  /** CSS class for header */
  headerClassName?: string
  /** Translation object for i18n */
  translations?: Translations
  /** Translation function for i18n (alternative to translations object) */
  translator?: TranslatorFunction
  /** CSS class name for the calendar container */
  className?: string
}

export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = ({
  events = [],
  resources = [],
  firstDayOfWeek = 'sunday',
  initialView = 'month',
  initialOrientation = 'vertical',
  renderEvent,
  onEventClick,
  onCellClick,
  onViewChange,
  onEventAdd,
  onEventUpdate,
  onEventDelete,
  onDateChange,
  onResourceAdd,
  onResourceUpdate,
  onResourceDelete,
  onOrientationChange,
  locale,
  timezone,
  disableCellClick,
  disableEventClick,
  disableDragAndDrop = false,
  dayMaxEvents = 3,
  stickyViewHeader,
  viewHeaderClassName,
  headerComponent,
  headerClassName,
  translations,
  translator,
  className,
}) => {
  const firstDayOfWeekNumber = firstDayOfWeek === 'monday' ? 1 : 0

  return (
    <div className={cn('h-full', className)}>
      <ResourceCalendarProvider
        events={events}
        resources={resources}
        firstDayOfWeek={firstDayOfWeekNumber}
        initialView={initialView}
        initialOrientation={initialOrientation}
        renderEvent={renderEvent}
        onEventClick={onEventClick}
        onCellClick={onCellClick}
        onViewChange={onViewChange}
        onEventAdd={onEventAdd}
        onEventUpdate={onEventUpdate}
        onEventDelete={onEventDelete}
        onDateChange={onDateChange}
        onResourceAdd={onResourceAdd}
        onResourceUpdate={onResourceUpdate}
        onResourceDelete={onResourceDelete}
        onOrientationChange={onOrientationChange}
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
        <CalendarDndContext>
          <ResourceCalendarBody />
        </CalendarDndContext>
      </ResourceCalendarProvider>
    </div>
  )
}
