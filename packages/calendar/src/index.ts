// Plugin slot catalog (host mount points)

// Shared contract types (slot context shapes, event model, Resource)
// Plugin SDK contract types
export type {
	BusinessHours,
	CalendarEvent,
	ColumnSpec,
	EventFormSlotContext,
	EventMutationScopeSlotContext,
	HorizontalCellSpec,
	HorizontalRowSpec,
	IlamyPlugin,
	PluginDateRange,
	PluginMutationArgs,
	PluginView,
	Resource,
	VerticalColumnSpec,
	ViewConfig,
	ViewHeaderContext,
	WeekDays,
} from '@ilamy/types'
export type { Dayjs, ManipulateType } from '@ilamy/utils/dayjs'
// Public dayjs (configured instance) for plugin date math
export { default as dayjs } from '@ilamy/utils/dayjs'
export {
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
} from './components/calendar-slots'
export type { EventFormProps } from './features/calendar/components/event-form/event-form'
export { IlamyCalendar } from './features/calendar/components/ilamy-calendar'
// Deprecated alias kept for the beta cycle — IlamyCalendar carries the
// resource axis directly.
export {
	IlamyResourceCalendar,
	type IlamyResourceCalendarProps,
} from './features/calendar/components/ilamy-resource-calendar'
// Public calendar context hooks
export {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
} from './features/calendar/hooks/use-smart-calendar-context'
export type {
	CalendarClassesOverride,
	CellInfo,
	IlamyCalendarProps,
	OpenEventFormInput,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from './features/calendar/types'
export { defaultTranslations } from './lib/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './lib/translations/types'
export type { CalendarView, TimeFormat } from './types'
