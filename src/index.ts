// Main calendar components

// Re-export rrule.js types for convenience
export type { Frequency, Weekday } from 'rrule'
export { RRule } from 'rrule'
// Export types
export type { RRuleOptions } from '@/features/recurrence/types'
// RRULE-based recurrence system
export {
	generateRecurringEvents,
	isRecurringEvent,
} from '@/features/recurrence/utils/recurrence-handler'
export type { EventFormProps } from './components/event-form/event-form'
export type { BusinessHours, CalendarEvent, WeekDays } from './components/types'
export { IlamyCalendar } from './features/calendar/components/ilamy-calendar'
export type { UseIlamyCalendarContextReturn } from './features/calendar/contexts/calendar-context/context'
// Public calendar context hooks
export { useIlamyCalendarContext } from './features/calendar/contexts/calendar-context/context'
export type {
	CellClickInfo,
	IlamyCalendarProps,
	RenderCurrentTimeIndicatorProps,
} from './features/calendar/types'
export type { IlamyResourceCalendarProps } from './features/resource-calendar/components/ilamy-resource-calendar'
export { IlamyResourceCalendar } from './features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
export type { UseIlamyResourceCalendarContextReturn } from './features/resource-calendar/contexts/resource-calendar-context/context'
export { useIlamyResourceCalendarContext } from './features/resource-calendar/contexts/resource-calendar-context/context'
// Resource calendar types
export type { Resource } from './features/resource-calendar/types'
export { defaultTranslations } from './lib/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './lib/translations/types'
export type { CalendarView, TimeFormat } from './types'
