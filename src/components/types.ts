import type dayjs from '@/lib/dayjs-config'

export interface EventRecurrence {
  /** How often the event repeats */
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  /**
   * Interval between repetitions (e.g., every 2 weeks = interval: 2, frequency: 'weekly')
   * @default 1
   */
  interval: number
  /**
   * How the recurrence should end
   */
  endType: 'never' | 'on' | 'after'
  /**
   * End date for the recurrence pattern (when endType is 'on')
   * Accepts dayjs objects, Date objects, or ISO date strings
   */
  endDate?: dayjs.Dayjs
  /**
   * Maximum number of occurrences (when endType is 'after')
   */
  count?: number
  /**
   * Days of the week for weekly recurrence
   * Uses semantic day names for better readability
   * @example ['monday', 'wednesday', 'friday'] for Mon/Wed/Fri
   */
  daysOfWeek?: WeekDays[]
  /**
   * Enhanced exceptions that support different delete operations
   * Can be simple dates (backwards compatibility) or enhanced exception objects
   */
  exceptions?: RecurrenceException[]
}

/**
 * Enhanced exception for recurring events that supports different delete operations
 */
export interface RecurrenceException {
  /** The date of the exception */
  date: dayjs.Dayjs
  /** The type of exception operation */
  type: 'this' | 'following' | 'all'
  /** When this exception was created (for tracking order) */
  createdAt: dayjs.Dayjs
}

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
   * Original start date for recurring events (used for tracking modifications)
   * @internal
   */
  originalStart?: dayjs.Dayjs
  /**
   * Original end date for recurring events (used for tracking modifications)
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
   * Recurrence configuration for repeating events
   * If present, this event will repeat according to the specified pattern
   */
  recurrence?: EventRecurrence
  /**
   * Whether this event is part of a recurring series
   * @internal Set automatically by the calendar system
   */
  isRecurring?: boolean
  /**
   * Reference to the parent event ID for recurring event instances
   * @internal Used to link recurring instances to their parent
   */
  parentEventId?: string | number
  /**
   * Whether this is a modified instance of a recurring event
   * @internal Used to track exceptions in recurring series
   */
  isException?: boolean
  /**
   * Custom data associated with the event
   * Use this to store additional metadata specific to your application
   * @example { meetingType: 'standup', attendees: ['john', 'jane'] }
   */
  // oxlint-disable-next-line no-explicit-any
  data?: Record<string, any>
}

export interface IlamyCalendarEventRecurrence
  extends Omit<EventRecurrence, 'endDate' | 'exceptions'> {
  /** How often the event repeats */
  endDate?: dayjs.Dayjs | Date | string
  /** Specific dates to exclude from the recurrence pattern */
  exceptions?: (dayjs.Dayjs | Date | string)[]
}

export interface IlamyCalendarEvent
  extends Omit<
    CalendarEvent,
    'start' | 'end' | 'recurrence' | 'originalStart' | 'originalEnd'
  > {
  /** Start date and time of the event */
  start: dayjs.Dayjs | Date | string
  /** End date and time of the event */
  end: dayjs.Dayjs | Date | string
  /**
   * Original start date for recurring events (used for tracking modifications)
   * @internal
   */
  originalStart?: dayjs.Dayjs | Date | string
  /**
   * Original end date for recurring events (used for tracking modifications)
   * @internal
   */
  originalEnd?: dayjs.Dayjs | Date | string
  /**
   * Recurrence configuration for repeating events
   * If present, this event will repeat according to the specified pattern
   */
  recurrence?: IlamyCalendarEventRecurrence
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
