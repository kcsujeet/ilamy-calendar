// Plugin slot catalog (host mount points + their context shapes)
export {
	type EventFormSlotContext,
	type EventMutationScopeSlotContext,
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
} from './components/calendar-slots'
export type { EventFormProps } from './components/event-form/event-form'
export type { BusinessHours, CalendarEvent, WeekDays } from './components/types'
export { IlamyCalendar } from './features/calendar/components/ilamy-calendar'
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
// Plugin SDK contract types
export type {
	ColumnSpec,
	HorizontalCellSpec,
	HorizontalRowSpec,
	IlamyPlugin,
	PluginDateRange,
	PluginMutationArgs,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
	ViewHeaderContext,
} from './features/plugins/lib/types'
export type { IlamyResourceCalendarProps } from './features/resource-calendar/components/ilamy-resource-calendar'
export { IlamyResourceCalendar } from './features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar'
// Resource calendar types
export type { Resource } from './features/resource-calendar/types'
export type { Dayjs, ManipulateType } from './lib/configs/dayjs-config'
// Public dayjs (configured instance) for plugin date math
export { default as dayjs } from './lib/configs/dayjs-config'
export { defaultTranslations } from './lib/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './lib/translations/types'
export type { CalendarView, TimeFormat } from './types'
