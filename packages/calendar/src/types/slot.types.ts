import type { TranslatorFunction } from '../utils/i18n/core-translations'
import type {
	CalendarEvent,
	CalendarEventInput,
	CalendarSlotName,
	CalendarSlotProps,
	CalendarView,
	EventSegment,
	HeadlessCalendarState,
	IsoDateString,
	PublicDateInput,
	Resource,
	SlotPropsEntry,
	TimeFormat,
} from './calendar.types'

/** Region slot names supported across every framework wrapper. */
export type SlotName =
	| 'header'
	| 'event'
	| 'resource'
	| 'eventForm'
	| 'moreEventsDialog'
	| 'recurrenceScopeDialog'

/** Recurrence mutation scope shared by dialogs and controller actions. */
export type RecurrenceScope = 'this' | 'following' | 'all'

/** Props handed to the `header` region slot. */
export interface HeaderSlotContext {
	currentDate: IsoDateString
	visibleRange: HeadlessCalendarState['visibleRange']
	view: CalendarView
	views: CalendarView[]
	title: string
	locale: string
	timezone: string
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	selectDate: (date: PublicDateInput) => void
	setView: (view: CalendarView, date?: PublicDateInput) => void
	openEventForm: (seed?: Partial<CalendarEventInput>) => void
	t: TranslatorFunction
}

/** Props handed to the `event` region slot. */
export interface EventSlotContext {
	event: CalendarEvent
	segment: EventSegment
	view: CalendarView
	timezone: string
	timeFormat: TimeFormat
	isSelected: boolean
	onClick: () => void
}

/** Props handed to the `resource` region slot. */
export interface ResourceSlotContext {
	resource: Resource
	view: CalendarView
	orientation: 'vertical' | 'horizontal'
}

/** Props handed to the `eventForm` region slot. */
export interface EventFormSlotContext {
	open: boolean
	event: CalendarEvent | null
	initialStart: IsoDateString
	initialEnd: IsoDateString
	initialAllDay: boolean
	initialResourceId?: string | number
	resources: Resource[]
	timezone: string
	locale: string
	timeFormat: TimeFormat
	onAdd: (event: CalendarEventInput) => void
	onUpdate: (id: string | number, updates: Partial<CalendarEventInput>) => void
	onDelete?: (id: string | number) => void
	onClose: () => void
	t: TranslatorFunction
}

/** Props handed to the `moreEventsDialog` region slot. */
export interface MoreEventsDialogSlotContext {
	open: boolean
	date: IsoDateString
	title: string
	events: CalendarEvent[]
	onEventClick: (event: CalendarEvent) => void
	onClose: () => void
	t: TranslatorFunction
}

/** Props handed to the `recurrenceScopeDialog` region slot. */
export interface RecurrenceScopeDialogSlotContext {
	open: boolean
	event: CalendarEvent | null
	operation: 'edit' | 'delete'
	onConfirm: (scope: RecurrenceScope) => void
	onCancel: () => void
	t: TranslatorFunction
}

/** Maps each region slot name to the props object it receives. */
export interface SlotContextMap {
	header: HeaderSlotContext
	event: EventSlotContext
	resource: ResourceSlotContext
	eventForm: EventFormSlotContext
	moreEventsDialog: MoreEventsDialogSlotContext
	recurrenceScopeDialog: RecurrenceScopeDialogSlotContext
}

/** Handle returned by mounting one region slot into a stable DOM host. */
export interface SlotMountHandle<P> {
	update: (props: P) => void
	destroy: () => void
}

/** Framework-agnostic imperative mount contract for a single region slot. */
export interface SlotMount<P> {
	mount: (host: HTMLElement, props: P) => SlotMountHandle<P>
}

/** Map of framework-agnostic region slot mounters keyed by region name. */
export type CalendarSlots = Partial<{
	[K in SlotName]: SlotMount<SlotContextMap[K]>
}>

/** Map of semantic part names to static or callback style overrides. */
export type WideCalendarSlotProps = Partial<
	Record<CalendarSlotName, SlotPropsEntry>
> &
	CalendarSlotProps
