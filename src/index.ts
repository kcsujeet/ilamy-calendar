// Main calendar component
export { IlamyCalendar } from './components/ilamy-calendar/ilamy-calendar'

// Public calendar context hook
export { useIlamyCalendarContext } from './contexts/calendar-context/context'

// RRULE-based recurrence system
export {
  generateRecurringEvents,
  isRecurringEvent,
} from './lib/recurrence-handler'

// Export types
export type { RRuleOptions } from './lib/recurrence-handler/types'
export type { CalendarEvent } from './components/types'
export type { IlamyCalendarProps } from './components/ilamy-calendar/types'
export type { WeekDays } from './components/types'
export type { UseIlamyCalendarContextReturn } from './contexts/calendar-context/context'
// Re-export rrule.js types for convenience
export type { Frequency, Weekday } from 'rrule'
export { RRule } from 'rrule'

// Translation system
export type {
  Translations,
  TranslationKey,
  TranslatorFunction,
} from './lib/translations/types'
export { defaultTranslations } from './lib/translations/default'
