// Public entry for `@ilamy/calendar-recurrence`.
// Re-exporting from this module registers the CalendarEvent augmentation for
// consumers and keeps the `declare module` block in the emitted d.ts (a
// side-effect-only import would be tree-shaken from the declaration bundle).

export { RRule, Weekday } from 'rrule'
export type { RecurrenceAugmentation } from './augment'
export { recurrenceICalProperties } from './ical'
export { recurrencePlugin } from './recurrence-plugin'
export type { RRuleOptions } from './types'
export { generateRecurringEvents } from './utils/generate-recurring-events'
export { isRecurringEvent } from './utils/series-helpers'
