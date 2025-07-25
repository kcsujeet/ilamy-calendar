import type dayjs from 'dayjs'

/**
 * Scope options for recurring event operations (Google Calendar style)
 * Determines how many events in a recurring series should be affected
 */
export type RecurrenceEditScope =
  | 'this' // Only this specific event instance
  | 'following' // This event and all following events in the series
  | 'all' // All events in the recurring series

/**
 * Options for editing recurring events
 */
export interface RecurrenceEditOptions {
  scope: RecurrenceEditScope
  eventDate: dayjs.Dayjs // The date of the specific event being edited
}
