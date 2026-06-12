/**
 * Available calendar view types. The built-in views (day, week, month, year)
 * are `PluginView` specs in `features/calendar/components/views`; plugins may
 * contribute additional view names, so this is a broad `string`.
 */
export type CalendarView = string

/**
 * Time format options for displaying times in the calendar.
 */
export type TimeFormat = '12-hour' | '24-hour'
