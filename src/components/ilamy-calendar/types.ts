import type { CalendarEvent, WeekDays } from '@/components/types'
import React from 'react'
import type dayjs from '@/lib/dayjs-config'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'

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
  initialView?: 'month' | 'week' | 'day' | 'year'
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
   * Provides the start and end date of the clicked cell.
   */
  onCellClick?: (start: dayjs.Dayjs, end: dayjs.Dayjs) => void
  /**
   * Callback when the calendar view changes (month, week, day, year).
   * Useful for syncing with external state or analytics.
   */
  onViewChange?: (view: 'month' | 'week' | 'day' | 'year') => void
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
  dayMaxEvents?: number
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
}
