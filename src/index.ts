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
export type {
	CellClickInfo,
	IlamyCalendarProps,
	RenderCurrentTimeIndicatorProps,
} from './features/calendar/types'
export type { IlamyResourceCalendarProps } from './features/resource-calendar/components/ilamy-resource-calendar'
export { IlamyResourceCalendar } from './features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
// Resource calendar types
export type { Resource } from './features/resource-calendar/types'
// Public calendar context hooks
export {
	type UseIlamyCalendarContextReturn,
	useIlamyCalendarContext,
} from './hooks/use-smart-calendar-context'
export { defaultTranslations } from './lib/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './lib/translations/types'
export type { CalendarView, TimeFormat } from './types'
