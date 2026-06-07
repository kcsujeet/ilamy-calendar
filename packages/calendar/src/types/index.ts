/**
 * Available calendar view types. Built-in views are listed in `BUILT_IN_VIEWS`;
 * plugins may contribute additional view names, so this is a broad `string`.
 */
export type CalendarView = string

/**
 * The view names provided out of the box by the calendar core.
 */
export const BUILT_IN_VIEWS = ['day', 'week', 'month', 'year'] as const

/**
 * Union of the built-in view names.
 */
export type BuiltInView = (typeof BUILT_IN_VIEWS)[number]

/**
 * Time format options for displaying times in the calendar.
 */
export type TimeFormat = '12-hour' | '24-hour'
