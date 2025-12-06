import type { CalendarEvent, WeekDays, BusinessHours } from '@/components/types'
import type { EventFormProps } from '@/components/event-form/event-form'
import React from 'react'
import type dayjs from '@/lib/configs/dayjs-config'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView, TimeFormat } from '@/types'

/**
 * Custom class names for calendar styling.
 * Allows users to override default styles for various calendar elements.
 */
export interface CalendarClassesOverride {
  /**
   * Class name for disabled cells (non-business hours).
   * Replaces the DISABLED_CELL_CLASSNAME constant.
   * @default "bg-secondary text-muted-foreground pointer-events-none"
   * @example "bg-gray-100 text-gray-400 cursor-not-allowed"
   */
  disabledCell?: string
}

/**
 * This interface extends the base CalendarEvent but allows more flexible date types
 * for the start and end properties. The component will automatically convert these
 * to dayjs objects internally for consistent date handling.
 *
 * @interface IlamyCalendarPropEvent
 * @extends {Omit<CalendarEvent, 'start' | 'end'>}
 */
export interface IlamyCalendarPropEvent
  extends Omit<CalendarEvent, 'start' | 'end'> {
  start: dayjs.Dayjs | Date | string
  end: dayjs.Dayjs | Date | string
}

/**
 * Information passed to the onCellClick callback.
 * Uses named properties for extensibility.
 */
export interface CellClickInfo {
  /** Start date/time of the clicked cell */
  start: dayjs.Dayjs
  /** End date/time of the clicked cell */
  end: dayjs.Dayjs
  /** Resource ID if clicking on a resource calendar cell (optional) */
  resourceId?: string | number
}

export interface IlamyCalendarProps {
  /**
   * Array of events to display in the calendar.
   */
  events?: IlamyCalendarPropEvent[]
  /**
   * The first day of the week to display in the calendar.
   * Can be 'sunday', 'monday', etc. Defaults to 'sunday'.
   */
  firstDayOfWeek?: WeekDays
  /**
   * The initial view to display when the calendar loads.
   * Defaults to 'month'.
   */
  initialView?: CalendarView
  /**
   * The initial date to display when the calendar loads.
   * If not provided, the calendar will default to today's date.
   */
  initialDate?: dayjs.Dayjs | Date | string
  /**
   * Custom render function for calendar events.
   * If provided, it will override the default event rendering.
   */
  renderEvent?: (event: CalendarEvent) => React.ReactNode
  /**
   * Callback when an event is clicked.
   * Provides the clicked event object.
   */
  onEventClick?: (event: CalendarEvent) => void
  /**
   * Callback when a calendar cell is clicked.
   * Provides cell information including start/end dates and optional resourceId.
   */
  onCellClick?: (info: CellClickInfo) => void
  /**
   * Callback when the calendar view changes (month, week, day, year).
   * Useful for syncing with external state or analytics.
   */
  onViewChange?: (view: CalendarView) => void
  /**
   * Callback when a new event is added to the calendar.
   * Provides the newly created event object.
   */
  onEventAdd?: (event: CalendarEvent) => void
  /**
   * Callback when an existing event is updated.
   * Provides the updated event object.
   */
  onEventUpdate?: (event: CalendarEvent) => void
  /**
   * Callback when an event is deleted from the calendar.
   * Provides the deleted event object.
   */
  onEventDelete?: (event: CalendarEvent) => void
  /**
   * Callback when the current date changes (navigation).
   * Provides the new current date.
   */
  onDateChange?: (date: dayjs.Dayjs) => void
  /**
   * Locale to use for formatting dates and times.
   * If not provided, the default locale will be used.
   */
  locale?: string
  /**
   * Translations object for internationalization.
   * Provide either this OR translator function, not both.
   */
  translations?: Translations
  /**
   * Translator function for internationalization.
   * Provide either this OR translations object, not both.
   */
  translator?: TranslatorFunction
  /**
   * Timezone to use for displaying dates and times.
   * If not provided, the local timezone will be used.
   */
  timezone?: string
  /**
   * Whether to disable click events on calendar cells.
   * Useful for read-only views or when cell clicks are not needed.
   */
  disableCellClick?: boolean
  /**
   * Whether to disable click events on calendar events.
   * Useful for read-only views or when event clicks are not needed.
   */
  disableEventClick?: boolean
  /**
   * Whether to disable drag-and-drop functionality for calendar events.
   * Useful for read-only views or when drag-and-drop is not needed.
   */
  disableDragAndDrop?: boolean
  /**
   * Maximum number of events to display per day in month view.
   * Additional events will be hidden and can be viewed via a "more" link.
   * Defaults to 3 if not specified.
   */
  dayMaxEvents?: number
  /**
   * Vertical spacing between stacked events in pixels.
   * Controls the gap between events when multiple events are displayed in the same view.
   * Defaults to 1 pixel if not specified.
   * Recommended range: 1-8 pixels for optimal readability.
   */
  eventSpacing?: number
  /**
   * Whether to stick the view header to the top of the calendar.
   * Useful for keeping the header visible while scrolling.
   */
  stickyViewHeader?: boolean
  /**
   * Custom class name for the view header.
   * Useful for applying custom styles or themes.
   */
  viewHeaderClassName?: string
  /**
   * Custom header component to replace the default calendar header.
   * Useful for adding custom branding or additional controls.
   */
  headerComponent?: React.ReactNode
  /**
   * Custom class name for the calendar header.
   * Useful for applying custom styles to the header.
   */
  headerClassName?: string
  /**
   * Configuration for business hours.
   * Defines the working hours to be highlighted on the calendar.
   * Can be a single BusinessHours object (applies to all specified days)
   * or an array of BusinessHours objects (for different hours on different days).
   */
  businessHours?: BusinessHours | BusinessHours[]
  /**
   * Custom render function for the event form.
   * If provided, it will override the default event form component.
   * The function receives EventFormProps and should return a React node.
   */
  renderEventForm?: (props: EventFormProps) => React.ReactNode
  /**
   * Time format for displaying times in the calendar.
   * - "12-hour": Times displayed as "1:00 PM" (default)
   * - "24-hour": Times displayed as "13:00"
   */
  timeFormat?: TimeFormat
  /**
   * Custom class names for overriding default calendar element styles.
   * Allows fine-grained control over the appearance of different calendar elements.
   * @example { disabledCell: "bg-gray-100 text-gray-400" }
   */
  classesOverride?: CalendarClassesOverride
}
