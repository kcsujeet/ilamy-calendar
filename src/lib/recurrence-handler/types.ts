import type { Options } from 'rrule'

/**
 * Re-export rrule.js Options with practical TypeScript interface.
 * Makes all properties optional except freq and dtstart (which are required by RFC 5545).
 * This allows clean object creation without needing explicit null values.
 *
 * @see https://tools.ietf.org/html/rfc5545 - RFC 5545 iCalendar specification
 * @see https://github.com/jakubroztocil/rrule - rrule.js library documentation
 */
export type RRuleOptions = {
  /**
   * The frequency of the event. Must be one of the following: DAILY, WEEKLY, MONTHLY, etc.
   */
  freq: Options['freq'] // Required: DAILY, WEEKLY, MONTHLY, etc.
  /**
   * The start date of the recurrence rule. This defines when the recurrence pattern begins.
   * Required for proper RRULE functionality according to RFC 5545.
   * @important Same as the event start date.
   */
  dtstart: Date
} & Partial<Omit<Options, 'freq' | 'dtstart'>> // All other properties optional
