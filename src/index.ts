// Main calendar components
export { IlamyCalendar } from './features/calendar/components/ilamy-calendar'
export { IlamyResourceCalendar } from './features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'

// Public calendar context hooks
export { useIlamyCalendarContext } from './features/calendar/contexts/calendar-context/context'
export { useIlamyResourceCalendarContext } from './contexts/ilamy-resource-calendar-context/context'

// RRULE-based recurrence system
export {
  generateRecurringEvents,
  isRecurringEvent,
} from './lib/recurrence-handler'

// Export types
export type { RRuleOptions } from './lib/recurrence-handler/types'
export type { CalendarEvent } from './components/types'
export type { IlamyCalendarProps } from './features/calendar/types'
export type { IlamyResourceCalendarProps } from './features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
export type { WeekDays } from './components/types'
export type { UseIlamyCalendarContextReturn } from './features/calendar/contexts/calendar-context/context'
export type { UseIlamyResourceCalendarContextReturn } from './contexts/ilamy-resource-calendar-context/context'

// Resource calendar types
export type {
  Resource,
  ResourceCalendarEvent,
} from './features/resource-calendar/types'
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
