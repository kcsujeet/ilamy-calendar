import type { RRuleOptions } from '@/features/recurrence/types'
import type dayjs from '@/lib/configs/dayjs-config'

/**
 * Core calendar event interface representing a single calendar event.
 * This is the primary data structure for calendar events.
 */
export interface CalendarEvent {
	/** Unique identifier for the event */
	id: string | number
	/** Display title of the event */
	title: string
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
	 * Recurrence rule for recurring events (RFC 5545 standard)
	 *
	 * Uses TypeScript interface for better readability, type safety, and IDE support
	 * compared to RRULE string format. Converted to rrule.js format internally.
	 *
	 * @example { freq: 'WEEKLY', interval: 1, byweekday: ['MO', 'WE', 'FR'] }
	 * @example { freq: 'DAILY', interval: 1, count: 10 }
	 * @example { freq: 'MONTHLY', interval: 1, until: new Date('2025-12-31') }
	 */
	rrule?: RRuleOptions
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
	/** Single resource assignment */
	resourceId?: string | number
	/** Multiple resource assignment (cross-resource events) */
	resourceIds?: (string | number)[]
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

/**
 * Configuration for business hours.
 * Defines the working hours to be highlighted on the calendar.
 */
export interface BusinessHours {
	/**
	 * Days of the week to apply business hours to.
	 * @default ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
	 */
	daysOfWeek?: WeekDays[]
	/**
	 * Start time for business hours in 24-hour format (0-24).
	 * @default 9
	 */
	startTime?: number
	/**
	 * End time for business hours in 24-hour format (0-24).
	 * @default 17
	 */
	endTime?: number
}
