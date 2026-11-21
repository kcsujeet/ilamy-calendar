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
export { IlamyCalendar } from '@/app/ilamy-calendar'
// Plugin slot catalog (host mount points)
export {
	SLOT_EVENT_FORM,
	SLOT_EVENT_MUTATION_SCOPE,
	SLOT_TOOLBAR,
} from '@/components/calendar-slots'
export type { EventFormProps } from '@/features/event-form/components/event-form'
// Public calendar context & theme hooks
export {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
} from '@/hooks/use-smart-calendar-context'
export {
	CalendarThemeProvider,
	useCalendarComponents,
	useCalendarTheme,
	useSlotProps,
} from '@/stores/calendar-theme-context'
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
} from '@/types/calendar.types'
export { defaultTranslations } from './config/translations/default'
// Translation system
export type {
	TranslationKey,
	Translations,
	TranslatorFunction,
} from './config/translations/types'
export type { CalendarView, TimeFormat } from './types'
