// Shared contract types (slot context shapes, event model, Resource, styling)
export type {
	BusinessHours,
	CalendarConstraint,
	CalendarEvent,
	CalendarEventInput,
	CalendarSlotName,
	CalendarSlotProps,
	ColumnSpec,
	DateRange,
	DateUnit,
	EventDelta,
	EventDropInfo,
	EventFormSlotContext,
	EventMutationScopeSlotContext,
	EventsChange,
	HorizontalCellSpec,
	HorizontalRowSpec,
	IlamyPlugin,
	IsoDateString,
	NavigationStep,
	PluginDateRange,
	PluginMutationArgs,
	PluginMutationResult,
	PluginView,
	PublicDateInput,
	Resource,
	SlotStyleProps,
	StyleRecord,
	ToolbarSlotContext,
	VerticalColumnSpec,
	ViewConfig,
	ViewHeaderContext,
	WeekDays,
} from '@ilamy/types'
export { defaultTranslations } from './config/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './config/translations/types'
// Plugin slot catalog (host mount points)
export {
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
	SLOT_TOOLBAR,
} from './features/calendar/components/calendar-slots'
export type { EventFormProps } from './features/calendar/components/event-form/event-form'
export { IlamyCalendar } from './features/calendar/components/ilamy-calendar'
// Public calendar context & theme hooks
export {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
} from './features/calendar/hooks/use-smart-calendar-context'
export {
	CalendarThemeProvider,
	useCalendarComponents,
	useCalendarTheme,
	useSlotProps,
} from './features/calendar/stores/calendar-theme-context'
export type {
	CalendarButtonProps,
	CalendarCheckboxProps,
	CalendarClassesOverride,
	CalendarComponents,
	CalendarDialogProps,
	CalendarInputProps,
	CalendarLabelProps,
	CalendarPopoverProps,
	CalendarSelectOption,
	CalendarSelectProps,
	CalendarTextareaProps,
	CalendarThemeAdapter,
	CellInfo,
	EventSegment,
	EventsFetcher,
	EventsFetchInfo,
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
	OpenEventFormInput,
	RenderCurrentTimeIndicatorProps,
	ResourcesFetcher,
	SlotDuration,
	SnapDuration,
	WeekNumberCalculation,
} from './features/calendar/types'
export type { CalendarView, TimeFormat } from './types'
