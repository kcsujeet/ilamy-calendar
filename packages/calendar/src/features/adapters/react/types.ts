import type { ComponentType, ReactNode, Ref } from 'react'
import type {
	BusinessHours,
	CalendarConstraint,
	CalendarEvent,
	CalendarEventInput,
	CalendarPlugin,
	CalendarPluginView,
	CalendarSlotProps,
	CalendarView,
	DateRange,
	DomCalendarOptions,
	EventSegment,
	IsoDateString,
	OpenEventFormInput,
	PublicDateInput,
	RenderCurrentTimeIndicatorProps,
	Resource,
	SlotContextMap,
	SlotName,
	TimeFormat,
	TranslatorFunction,
} from '../../../index'

export type {
	CalendarClassesOverride,
	CalendarConstraint,
	CalendarSlotProps,
	CellInfo,
	DateRange,
	EventFormSlotContext,
	EventSegment,
	EventSlotContext,
	EventsFetcher,
	EventsFetchInfo,
	HeaderSlotContext,
	MoreEventsDialogSlotContext,
	OpenEventFormInput,
	PluginEventFormContext,
	RecurrenceScopeDialogSlotContext,
	RenderCurrentTimeIndicatorProps,
	ResourceSlotContext,
	ResourcesFetcher,
	SlotContextMap,
	SlotDuration,
	SlotName,
	SnapDuration,
	WeekNumberCalculation,
} from '../../../index'

export type IlamyPlugin = CalendarPlugin
export type PluginView = CalendarPluginView
export type IlamyCalendarPropEvent = CalendarEventInput

/** Region slot components keyed by region slot name. */
export type ReactCalendarSlots = Partial<{
	[K in SlotName]: ComponentType<SlotContextMap[K]>
}>

/** Props handed to v3 `renderEventForm` React callbacks. */
export interface EventFormProps {
	open?: boolean
	selectedEvent?: CalendarEvent | null
	onAdd?: (event: CalendarEvent) => void
	onUpdate?: (event: CalendarEvent) => void
	onDelete?: (event: CalendarEvent) => void
	onClose: () => void
}

/** Theme bundle accepted via spread (`<IlamyCalendar {...muiTheme} />`). */
export interface CalendarThemeAdapter {
	unstyled?: boolean
	slotProps?: CalendarSlotProps
}

/** Public API exposed by `useIlamyCalendarContext()` and `ref.current`. */
export interface IlamyCalendarApi {
	readonly currentDate: IsoDateString
	readonly currentRange: DateRange
	readonly view: CalendarView
	readonly events: CalendarEvent[]
	readonly rawEvents: CalendarEvent[]
	readonly refetchEvents: () => void
	readonly scrollToTime: (time: string) => void
	readonly refetchResources: () => void
	readonly isEventFormOpen: boolean
	readonly selectedEvent: CalendarEvent | null
	readonly selectedDate: IsoDateString | null
	readonly firstDayOfWeek: number
	readonly resources: Resource[]
	readonly hasResourceAxis: boolean
	readonly orientation: 'horizontal' | 'vertical'
	readonly setCurrentDate: (date: PublicDateInput) => void
	readonly selectDate: (date: PublicDateInput) => void
	readonly setView: (view: CalendarView, date?: PublicDateInput) => void
	readonly nextPeriod: () => void
	readonly prevPeriod: () => void
	readonly today: () => void
	readonly addEvent: (event: CalendarEventInput) => void
	readonly updateEvent: (
		eventId: string | number,
		event: Partial<CalendarEventInput>
	) => void
	readonly deleteEvent: (eventId: string | number) => void
	readonly openEventForm: (eventData?: OpenEventFormInput) => void
	readonly closeEventForm: () => void
	readonly onEventClick: (event: CalendarEvent) => void
	readonly renderEvent?: (
		event: CalendarEvent,
		segment: EventSegment
	) => ReactNode
	readonly renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	readonly getEventsForResource: (
		resourceId: string | number
	) => CalendarEvent[]
	readonly businessHours?: BusinessHours | BusinessHours[]
	readonly eventConstraint?: CalendarConstraint
	readonly selectConstraint?: CalendarConstraint
	readonly t: TranslatorFunction
	readonly timeFormat: TimeFormat
	readonly timezone?: string
	readonly currentLocale: string
	readonly getEventsForDateRange: (
		start: PublicDateInput,
		end: PublicDateInput
	) => CalendarEvent[]
	readonly applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEventInput>,
		scope: unknown
	) => void
	readonly applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
	readonly getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
	readonly renderSlot: (slotName: string, context: unknown) => ReactNode[]
	readonly collect: (point: string, context: unknown) => unknown[]
	readonly getViews: () => PluginView[]
}

/** Props accepted by React 19 `<IlamyCalendar />`. */
export interface IlamyCalendarProps extends Omit<
	DomCalendarOptions,
	| 'slots'
	| 'controller'
	| 'renderEvent'
	| 'renderHeader'
	| 'renderResource'
	| 'renderEventForm'
	| 'renderHour'
	| 'renderCurrentTimeIndicator'
> {
	ref?: Ref<IlamyCalendarApi>
	slots?: ReactCalendarSlots
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
	headerComponent?: ReactNode
	renderResource?: (resource: Resource) => ReactNode
	renderEventForm?: (props: EventFormProps) => ReactNode
	renderHour?: (date: IsoDateString) => ReactNode
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	children?: ReactNode
}
