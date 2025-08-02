// Main calendar component
export { IlamyCalendar } from './components/ilamy-calendar/ilamy-calendar'

// Public calendar context hook
export { useIlamyCalendarContext } from './contexts/calendar-context/context'

// RRULE-based recurrence system
export {
  generateRecurringEvents,
  isRecurringEvent,
} from './lib/recurrence-handler'
export type {
  RRuleFrequency,
  RRuleWeekday,
} from './lib/recurrence-handler/types'

// Export types
export type { CalendarEvent } from './components/types'
export type { WeekDays } from './components/types'
export type { UseIlamyCalendarContextReturn } from './contexts/calendar-context/context'
