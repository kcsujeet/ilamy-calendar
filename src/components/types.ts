import type dayjs from '@/lib/dayjs-config'

/**
 * Core calendar event interface representing a single calendar event.
 * This is the primary data structure for calendar events.
 */
export interface CalendarEvent {
  /** Unique identifier for the event */
  id: string | number
  /** Display title of the event */
  title: string
  /**
   * Original start date (used for tracking modifications)
   * @internal
   */
  originalStart?: dayjs.Dayjs
  /**
   * Original end date (used for tracking modifications)
   * @internal
   */
  originalEnd?: dayjs.Dayjs
  /** Start date and time of the event */
  start: dayjs.Dayjs
  /** End date and time of the event */
  end: dayjs.Dayjs
  /**
   * Color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
   */
  color?: string
  /**
   * Background color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names)
   * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
   */
  backgroundColor?: string
  /** Optional description or notes for the event */
  description?: string
  /** Optional location where the event takes place */
  location?: string
  /**
   * Whether this is an all-day event
   * @default false
   */
  allDay?: boolean
  /**
   * iCalendar RRULE string for recurring events (RFC 5545 standard)
   * @example "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR"
   * @example "FREQ=DAILY;INTERVAL=1;COUNT=10"
   * @example "FREQ=MONTHLY;INTERVAL=1;UNTIL=20251231T235959Z"
   */
  rrule?: string
  /**
   * Exception dates (EXDATE) - dates to exclude from recurrence
   * Uses ISO string format for storage and transmission
   * @example ['2025-01-15T09:00:00.000Z', '2025-01-22T09:00:00.000Z']
   */
  exdates?: string[]
  /**
   * Recurrence ID (RECURRENCE-ID) - identifies modified instances
   * Points to the original occurrence date this event modifies
   * Used for events that are modifications of recurring instances
   */
  recurrenceId?: string
  /**
   * UID for iCalendar compatibility
   * Unique identifier across calendar systems
   */
  uid?: string
  /**
   * Custom data associated with the event
   * Use this to store additional metadata specific to your application
   * @example { meetingType: 'standup', attendees: ['john', 'jane'] }
   */
  // oxlint-disable-next-line no-explicit-any
  data?: Record<string, any>
}

/**
 * Extended calendar event interface with calculated positioning properties.
 * Used internally by the calendar rendering engine to position events on the grid.
 *
 * @internal This interface is used by the calendar layout system and should not be used directly
 */
export interface ProcessedCalendarEvent extends CalendarEvent {
  /** Left position as a percentage of the container width (0-100) */
  left: number
  /** Width as a percentage of the container width (0-100) */
  width: number
  /** Top position as a percentage of the container height (0-100) */
  top: number
  /** Height as a percentage of the container height (0-100) */
  height: number
}

/**
 * Supported days of the week for calendar configuration.
 * Used for setting the first day of the week and other week-related settings.
 */
export type WeekDays =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
