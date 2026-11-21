import type { DateUnit } from '@ilamy/utils/temporal'

/**
 * Canonical ISO 8601 date-time string with offset (e.g. `'2026-03-02T09:00:00-05:00'`).
 * Immutable, JSON-serializable, and framework-agnostic (Google Calendar API convention).
 */
export type IsoDateString = string

/** Flexible date input accepted at public API boundaries. */
export type PublicDateInput = IsoDateString | Date

/**
 * Supported days of the week for calendar configuration.
 */
export type WeekDays =
	| 'sunday'
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'

/** Built-in calendar views; plugins may register additional view names. */
export type CalendarView = 'month' | 'week' | 'day' | (string & {})

export type TimeFormat = '12-hour' | '24-hour'

/** Granularity of time-grid cells in minutes. */
export type SlotDuration = 15 | 30 | 60

/** Finest snap granularity in minutes for drag, resize, and selection. */
export type SnapDuration = 15 | 30

/** How week numbers are counted: locale rules or ISO 8601. */
export type WeekNumberCalculation = 'local' | 'ISO'

/**
 * Scheduling constraint applied to event drags/resizes (`eventConstraint`) or
 * selections (`selectConstraint`). Matches FullCalendar's `'businessHours'`
 * constraint (`https://fullcalendar.io/docs/eventConstraint`).
 */
export type CalendarConstraint = 'businessHours'

/**
 * Configuration for business hours.
 *
 * Matches FullCalendar (`core/src/structs/business-hours.ts`, v7.1.1):
 * - Single object with omitted `daysOfWeek` defaults to Monday–Friday.
 * - An array entry omitting `daysOfWeek` is ignored.
 * - By default business hours only shade closed time; opt into enforcement
 *   with `eventConstraint="businessHours"` and `selectConstraint="businessHours"`.
 */
export interface BusinessHours {
	/**
	 * Days of the week business hours apply to.
	 * @default ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] (object form)
	 */
	daysOfWeek?: WeekDays[]
	/**
	 * Start time: whole 24-hour number (0–24) or `'HH:mm'` string.
	 * @default 9
	 */
	startTime?: number | string
	/**
	 * End time: whole 24-hour number (0–24, where 0 and 24 mean end-of-day) or `'HH:mm'`.
	 * @default 17
	 */
	endTime?: number | string
}

/**
 * Canonical calendar event with ISO 8601 `start` and exclusive `end` (RFC 5545 DTEND).
 */
export interface CalendarEvent {
	id: string | number
	title: string
	/** Inclusive start as an ISO 8601 string with offset. */
	start: IsoDateString
	/** Exclusive end as an ISO 8601 string with offset (RFC 5545 §3.6.1 DTEND). */
	end: IsoDateString
	/**
	 * Optional IANA time zone name (RFC 5545 §3.3.5 `TZID` / Google Calendar `timeZone`).
	 * Preserves wall-clock intent across future IANA time zone rule changes (#314)
	 * and emits `DTSTART;TZID=` + `VTIMEZONE` on iCal export.
	 */
	timezone?: string
	color?: string
	backgroundColor?: string
	description?: string
	location?: string
	/** @default false */
	allDay?: boolean
	/** Unique identifier for iCalendar interoperability. */
	uid?: string
	resourceId?: string | number
	resourceIds?: (string | number)[]
	data?: Record<string, unknown>
	/** Per-event move/resize override; beats calendar `editable`. */
	editable?: boolean
	/** Per-event move override; defaults to `editable`. */
	startEditable?: boolean
	/** Per-event resize override; defaults to `editable`. */
	durationEditable?: boolean
}

/** Public event input accepting ISO strings or native `Date` objects. */
export interface CalendarEventInput extends Omit<
	CalendarEvent,
	'start' | 'end'
> {
	start: PublicDateInput
	end: PublicDateInput
}

/** Calendar resource (person, room, equipment, etc.). */
export interface Resource {
	id: string | number
	title: string
	color?: string
	backgroundColor?: string
	businessHours?: BusinessHours | BusinessHours[]
	data?: Record<string, unknown>
}

/** Half-open date range (`start` inclusive, `end` exclusive) as ISO strings. */
export interface DateRange {
	start: IsoDateString
	end: IsoDateString
}

/** Cell coordinates passed to `onCellClick`, `isCellDisabled`, `getCellClassName`. */
export interface CellInfo {
	start: IsoDateString
	end: IsoDateString
	resource?: Resource
	allDay?: boolean
}

/** Candidate placement handed to `eventAllow`. */
export interface EventDropInfo {
	start: IsoDateString
	end: IsoDateString
	allDay: boolean
	resourceId?: string | number
}

/**
 * Wall-clock movement of an event edge: whole calendar days plus wall-clock
 * time-of-day delta in milliseconds (FullCalendar `diffDayAndTime`).
 */
export interface EventDelta {
	days: number
	milliseconds: number
}

/** One user action and every stored row it touched (`onEventsChange`). */
export interface EventsChange {
	action: 'add' | 'update' | 'delete'
	event: CalendarEvent
	scope?: unknown
	added: CalendarEvent[]
	updated: CalendarEvent[]
	deleted: CalendarEvent[]
	delta?: EventDelta
	endDelta?: EventDelta
	revert: () => void
}

/** Slice metadata for a multi-row/clipped event bar (matches FullCalendar). */
export interface EventSegment {
	isStart: boolean
	isEnd: boolean
}

/** Date range passed into plugin pipelines. */
export interface PluginDateRange {
	start: IsoDateString
	end: IsoDateString
	timezone?: string
}

export interface PluginMutationArgs {
	event: CalendarEvent
	updates?: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: unknown
	timezone?: string
}

export interface PluginMutationResult {
	events: CalendarEvent[]
	updated: CalendarEvent[]
	added: CalendarEvent[]
	deleted: CalendarEvent[]
	appliedUpdates?: Partial<CalendarEvent>
}

export interface ViewConfig {
	firstDayOfWeek: number
	timezone?: string
	locale?: string
	hiddenDays?: Set<number>
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	slotMinTime?: string
	slotMaxTime?: string
	resources?: Resource[]
	hasResourceAxis?: boolean
	orientation?: 'vertical' | 'horizontal'
	weekViewGranularity?: 'hourly' | 'daily'
}

export interface CalendarEditFlags {
	editable?: boolean
	eventStartEditable?: boolean
	eventDurationEditable?: boolean
}

/**
 * Inline style record compatible with React, Vue, Svelte, Solid, and StyleX
 * without depending on React's `CSSProperties`.
 */
export type StyleRecord = Record<string, string | number | undefined>

/**
 * Per-slot styling hook accepted by every semantic part of the calendar UI.
 * Directly compatible with Tailwind class strings, CSS Modules, MUI `useTheme()`,
 * and StyleX (`stylex.props(...)` returns `{ className, style }`).
 */
export interface SlotStyleProps {
	className?: string
	style?: StyleRecord
}

/** Semantic visual parts customizable via `slotProps`. */
export type CalendarSlotName =
	| 'root'
	| 'header'
	| 'toolbar'
	| 'navButton'
	| 'viewButton'
	| 'viewButtonActive'
	| 'grid'
	| 'dayHeader'
	| 'cell'
	| 'cellToday'
	| 'cellDisabled'
	| 'cellNonBusiness'
	| 'allDayRow'
	| 'eventBar'
	| 'resizeHandle'
	| 'nowIndicator'
	| 'moreLink'
	| 'resourceHeader'

export type CalendarSlotProps = Partial<
	Record<CalendarSlotName, SlotStyleProps>
>

/** Pure navigation step descriptor (replaces dayjs `ManipulateType`). */
export interface NavigationStep {
	amount: number
	unit: DateUnit
}

/** Snapshot of headless calendar state consumed by any UI framework adapter. */
export interface HeadlessCalendarState {
	currentDate: IsoDateString
	view: CalendarView
	events: CalendarEvent[]
	resources: Resource[]
	timezone: string
	locale: string
	firstDayOfWeek: number
	hiddenDays: Set<number> | undefined
	visibleRange: DateRange
}

export interface HeadlessCalendarOptions {
	initialDate?: PublicDateInput
	initialView?: CalendarView
	events?: CalendarEventInput[]
	resources?: Resource[]
	timezone?: string
	locale?: string
	firstDayOfWeek?: WeekDays
	hiddenDays?: WeekDays[]
	weekends?: boolean
	onDateChange?: (date: IsoDateString, range: DateRange) => void
	onViewChange?: (view: CalendarView) => void
}

/** Pure action methods exposed by a headless calendar controller. */
export type HeadlessCalendarActions = Omit<
	HeadlessCalendarController,
	'getState' | 'subscribe'
>

/** Framework-agnostic controller wrapped by React/Vue/Svelte/Solid adapters. */
export interface HeadlessCalendarController {
	getState: () => HeadlessCalendarState
	subscribe: (listener: () => void) => () => void
	setCurrentDate: (date: PublicDateInput) => void
	selectDate: (date: PublicDateInput) => void
	setView: (view: CalendarView, date?: PublicDateInput) => void
	nextPeriod: (step?: NavigationStep) => void
	prevPeriod: (step?: NavigationStep) => void
	today: () => void
	setEvents: (events: CalendarEventInput[]) => void
	addEvent: (event: CalendarEventInput) => CalendarEvent
	updateEvent: (
		id: string | number,
		updates: Partial<CalendarEventInput>
	) => CalendarEvent | undefined
	deleteEvent: (id: string | number) => CalendarEvent | undefined
	setResources: (resources: Resource[]) => void
	updateConfig: (config: Partial<HeadlessCalendarOptions>) => void
	getEventsInRange: (
		start: PublicDateInput,
		end: PublicDateInput
	) => CalendarEvent[]
}
