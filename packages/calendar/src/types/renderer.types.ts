import type {
	Translations,
	TranslatorFunction,
} from '../utils/i18n/core-translations'
import type {
	BusinessHours,
	CalendarConstraint,
	CalendarEvent,
	CalendarEventInput,
	CalendarSlotProps,
	CalendarView,
	CellInfo,
	DateRange,
	EventDropInfo,
	EventSegment,
	EventsChange,
	EventsFetcher,
	HeadlessCalendarController,
	HeadlessCalendarState,
	IsoDateString,
	OpenEventFormInput,
	PublicDateInput,
	Resource,
	ResourcesFetcher,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	WeekDays,
	WeekNumberCalculation,
} from './calendar.types'
import type { CalendarPlugin } from './plugin.types'
import type { CalendarSlots } from './slot.types'

export type DomMutationScope = unknown
export type DomCalendarEvent = CalendarEvent
export type DomCalendarEventInput = CalendarEventInput

export type DomRenderCleanup = (() => void) | undefined

export interface DomEventRenderContext {
	event: DomCalendarEvent
	segment?: EventSegment
	view: CalendarView
	timezone: string
	timeFormat: TimeFormat
}

export interface DomHeaderRenderContext {
	state: HeadlessCalendarState
	title: string
	views: CalendarView[]
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	setView: (view: CalendarView) => void
	openNewEventForm: () => void
}

export interface DomResourceRenderContext {
	resource: Resource
	view: CalendarView
}

export interface DomEventFormRenderContext {
	event: DomCalendarEvent | null
	initialStart: IsoDateString
	initialEnd: IsoDateString
	initialAllDay: boolean
	initialResourceId?: string | number
	resources: Resource[]
	onSave: (event: DomCalendarEventInput, scope?: DomMutationScope) => void
	onDelete?: (event: DomCalendarEvent, scope?: DomMutationScope) => void
	onClose: () => void
}

/** Props handed to custom `renderCurrentTimeIndicator` callbacks. */
export interface RenderCurrentTimeIndicatorProps {
	currentTime: IsoDateString
	rangeStart: IsoDateString
	rangeEnd: IsoDateString
	progress: number
	axis?: 'vertical' | 'horizontal'
	resource?: Resource
	view: CalendarView
}

/** Custom class names for overriding specific built-in calendar states. */
export interface CalendarClassesOverride {
	disabledCell?: string
}

/** Live dialog & plugin state exposed by a mounted calendar instance. */
export interface MountedCalendarSnapshot {
	isEventFormOpen: boolean
	selectedEvent: DomCalendarEvent | null
	selectedDate: IsoDateString | null
	rawEvents: readonly DomCalendarEvent[]
	visibleEvents: readonly DomCalendarEvent[]
	timeFormat: TimeFormat
}

export interface DomCalendarOptions {
	controller?: HeadlessCalendarController
	plugins?: readonly CalendarPlugin[]
	events?: DomCalendarEventInput[] | EventsFetcher
	lazyFetching?: boolean
	loading?: (isLoading: boolean) => void
	onEventsError?: (error: unknown) => void
	resources?: Resource[] | ResourcesFetcher
	refetchResourcesOnNavigate?: boolean
	resourcesSet?: (resources: Resource[]) => void
	onResourcesError?: (error: unknown) => void
	initialView?: CalendarView
	initialDate?: PublicDateInput
	views?: CalendarView[]
	firstDayOfWeek?: WeekDays
	hiddenDays?: WeekDays[]
	weekends?: boolean
	timezone?: string
	locale?: string
	translations?: Partial<Translations> | Record<string, string>
	translator?: TranslatorFunction
	timeFormat?: TimeFormat
	slotHeaderFormat?: Intl.DateTimeFormatOptions
	eventTimeFormat?: Intl.DateTimeFormatOptions
	dayHeaderFormat?: Intl.DateTimeFormatOptions
	titleFormat?: Intl.DateTimeFormatOptions
	dayMaxEvents?: number
	eventHeight?: number
	eventSpacing?: number
	slotDuration?: SlotDuration
	snapDuration?: SnapDuration
	slotMinTime?: string
	slotMaxTime?: string
	scrollTime?: string
	scrollToNow?: boolean
	allDaySlot?: boolean
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	eventConstraint?: CalendarConstraint
	selectConstraint?: CalendarConstraint
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
	eventResizableFromStart?: boolean
	nowIndicator?: boolean
	displayEventTime?: boolean
	displayEventEnd?: boolean
	weekNumbers?: boolean
	weekNumberCalculation?: WeekNumberCalculation
	orientation?: 'vertical' | 'horizontal'
	weekViewGranularity?: 'hourly' | 'daily'
	stickyViewHeader?: boolean
	viewHeaderClassName?: string
	headerClassName?: string
	disableCellClick?: boolean
	disableEventClick?: boolean
	unstyled?: boolean
	slotProps?: CalendarSlotProps
	slots?: CalendarSlots
	className?: string
	classesOverride?: CalendarClassesOverride
	eventAllow?: (dropInfo: EventDropInfo, event: CalendarEvent) => boolean
	isCellDisabled?: (cell: CellInfo) => boolean
	getCellClassName?: (cell: CellInfo) => string | undefined
	renderEvent?: (
		container: HTMLElement,
		context: DomEventRenderContext
	) => DomRenderCleanup
	renderHeader?: (
		container: HTMLElement,
		context: DomHeaderRenderContext
	) => DomRenderCleanup
	renderResource?: (
		container: HTMLElement,
		context: DomResourceRenderContext
	) => DomRenderCleanup
	renderEventForm?: (
		container: HTMLElement,
		context: DomEventFormRenderContext
	) => DomRenderCleanup
	renderHour?: (container: HTMLElement, date: IsoDateString) => DomRenderCleanup
	renderCurrentTimeIndicator?: (
		container: HTMLElement,
		props: RenderCurrentTimeIndicatorProps
	) => DomRenderCleanup
	onMoreEventsClick?: (day: IsoDateString, events: CalendarEvent[]) => void
	onEventClick?: (event: DomCalendarEvent) => void
	onCellClick?: (cell: CellInfo) => void
	onEventAdd?: (event: DomCalendarEvent) => void
	onEventUpdate?: (event: DomCalendarEvent) => void
	onEventDelete?: (event: DomCalendarEvent) => void
	onEventsChange?: (change: EventsChange) => void
	onRangeSelect?: (selection: CellInfo) => void
	onViewChange?: (view: CalendarView) => void
	onDateChange?: (date: IsoDateString, range: DateRange) => void
}

export interface MountedCalendar {
	update: (nextOptions: Partial<DomCalendarOptions>) => void
	destroy: () => void
	controller: HeadlessCalendarController
	scrollToTime: (time: string) => void
	refetchEvents: () => void
	refetchResources: () => void
	openEventForm: (input?: OpenEventFormInput) => void
	closeEventForm: () => void
	addEvent: (input: DomCalendarEventInput) => DomCalendarEvent
	updateEvent: (
		eventId: string | number,
		updates: Partial<DomCalendarEventInput>
	) => DomCalendarEvent | undefined
	deleteEvent: (eventId: string | number) => DomCalendarEvent | undefined
	applyScopedEdit: (
		event: DomCalendarEvent,
		updates: Partial<DomCalendarEventInput>,
		scope: DomMutationScope
	) => DomCalendarEvent | undefined
	applyScopedDelete: (
		event: DomCalendarEvent,
		scope: DomMutationScope
	) => DomCalendarEvent | undefined
	getEventManager: (event: DomCalendarEvent) => CalendarPlugin | undefined
	collectPlugin: (point: string, context: unknown) => unknown[]
	getSnapshot: () => MountedCalendarSnapshot
	subscribeSnapshot: (listener: () => void) => () => void
}
