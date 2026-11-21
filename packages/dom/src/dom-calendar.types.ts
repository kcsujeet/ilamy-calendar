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
	HeadlessCalendarController,
	HeadlessCalendarState,
	IsoDateString,
	PublicDateInput,
	Resource,
	SlotDuration,
	SnapDuration,
	TimeFormat,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/core'
import type { Frequency, Options as RRuleOptions } from 'rrule'

export type DomMutationScope = 'this' | 'following' | 'all'

export type DomRRuleOptions = Partial<RRuleOptions> & {
	freq: Frequency
	dtstart: Date
}

export type DomRRuleInput = Partial<RRuleOptions> & {
	freq: Frequency
	dtstart?: Date
}

export interface DomCalendarEvent extends CalendarEvent {
	rrule?: DomRRuleOptions
	exdates?: string[]
	recurrenceId?: string
}

export interface DomCalendarEventInput
	extends Omit<CalendarEventInput, 'rrule'> {
	rrule?: DomRRuleInput
	exdates?: string[]
	recurrenceId?: string
}

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
	exportIcal: () => void
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

export interface DomCalendarOptions {
	events?: DomCalendarEventInput[]
	resources?: Resource[]
	initialView?: CalendarView
	initialDate?: PublicDateInput
	views?: CalendarView[]
	firstDayOfWeek?: WeekDays
	hiddenDays?: WeekDays[]
	weekends?: boolean
	timezone?: string
	locale?: string
	timeFormat?: TimeFormat
	dayMaxEvents?: number
	slotDuration?: SlotDuration
	snapDuration?: SnapDuration
	slotMinTime?: string
	slotMaxTime?: string
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	eventConstraint?: CalendarConstraint
	selectConstraint?: CalendarConstraint
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
	nowIndicator?: boolean
	displayEventTime?: boolean
	displayEventEnd?: boolean
	weekNumbers?: boolean
	weekNumberCalculation?: WeekNumberCalculation
	orientation?: 'vertical' | 'horizontal'
	weekViewGranularity?: 'hourly' | 'daily'
	enableDragToCreate?: boolean
	enableIcalExport?: boolean
	enableYearView?: boolean
	enableAgendaView?: boolean
	agendaWindow?: 'day' | 'week' | 'month' | number
	stickyViewHeader?: boolean
	disableCellClick?: boolean
	disableEventClick?: boolean
	unstyled?: boolean
	slotProps?: CalendarSlotProps
	className?: string
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
	exportIcal: (filename?: string) => string
}

export interface DomRuntime {
	root: HTMLElement
	controller: HeadlessCalendarController
	getOptions: () => DomCalendarOptions
	registerCleanup: (cleanup: () => void) => void
	getVisibleEvents: () => DomCalendarEvent[]
	openCreateDialog: (cell: CellInfo) => void
	openEditDialog: (event: DomCalendarEvent) => void
	openOverflowDialog: (title: string, events: DomCalendarEvent[]) => void
	commitAdd: (input: DomCalendarEventInput) => DomCalendarEvent
	commitUpdate: (
		event: DomCalendarEvent,
		updates: Partial<DomCalendarEventInput>,
		scope?: DomMutationScope,
		deltas?: {
			delta?: { days: number; milliseconds: number }
			endDelta?: { days: number; milliseconds: number }
		}
	) => DomCalendarEvent | undefined
	commitDelete: (
		event: DomCalendarEvent,
		scope?: DomMutationScope
	) => DomCalendarEvent | undefined
	downloadIcal: (filename?: string) => string
	rerender: () => void
}
