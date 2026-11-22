// React plugin/slot contract types
export type {
	ColumnSpec,
	EventFormSlotContext,
	EventMutationScopeSlotContext,
	HorizontalCellSpec,
	HorizontalRowSpec,
	IlamyPlugin,
	PluginView,
	ToolbarSlotContext,
	VerticalColumnSpec,
	ViewHeaderContext,
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
// React component & prop types
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
	EventsFetcher,
	EventsFetchInfo,
	IlamyCalendarPropEvent,
	IlamyCalendarProps,
	OpenEventFormInput,
	RenderCurrentTimeIndicatorProps,
	ResourcesFetcher,
} from '@/types/calendar.types'
