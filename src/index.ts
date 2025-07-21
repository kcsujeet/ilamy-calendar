// Main calendar component
export { IlamyCalendar } from './components/ilamy-calendar/ilamy-calendar'

// Public calendar context hook
export { usePublicCalendarContext as useIlamyCalendarContext } from './contexts/calendar-context/context'

// export types
export type { IlamyCalendarEvent as CalendarEvent } from './components/types'
export type { WeekDays } from './components/types'
export type { IlamyCalendarEventRecurrence as EventRecurrence } from './components/types'
