import type {
	CalendarEvent,
	DateUnit,
	IsoDateString,
	NavigationStep,
	PluginDateRange,
	PluginMutationArgs,
	PluginMutationResult,
	Resource,
	ViewConfig,
} from '@ilamy/calendar'
import type { ComponentType, ReactNode } from 'react'

// Re-export framework-agnostic domain types from `@ilamy/calendar` (root core)
// so `@ilamy/calendar/react` and plugins share the single canonical `CalendarEvent`
// interface for TypeScript declaration merging (e.g. `recurrencePlugin`).
export type {
	BusinessHours,
	CalendarConstraint,
	CalendarEditFlags,
	CalendarEvent,
	CalendarEventInput,
	CalendarSlotName,
	CalendarSlotProps,
	CalendarView,
	CellInfo,
	DateRange,
	DateUnit,
	EventDelta,
	EventDropInfo,
	EventSegment,
	EventsChange,
	HeadlessCalendarController,
	HeadlessCalendarOptions,
	HeadlessCalendarState,
	IsoDateString,
	NavigationStep,
	PluginDateRange,
	PluginMutationArgs,
	PluginMutationResult,
	PublicDateInput,
	Resource,
	SlotDuration,
	SlotStyleProps,
	SnapDuration,
	StyleRecord,
	TimeFormat,
	Translations,
	TranslatorFunction,
	ViewConfig,
	WeekDays,
	WeekNumberCalculation,
} from '@ilamy/calendar'

// --- React Plugin UI contract ----------------------------------------------

/** One column of a vertical time-grid view. */
export interface VerticalColumnSpec {
	/** Stable column id; drives testids and React keys. */
	id: string
	/** The ISO date this column represents; gutter/label columns leave it unset. */
	day?: IsoDateString
	/** Cell ISO instants of the column: hour slots ('hour') or dates ('day'). */
	days: IsoDateString[]
	gridType?: 'day' | 'hour'
	className?: string
	/** Label-only column (e.g. the time gutter): renders no events. */
	noEvents?: boolean
	renderCell?: (date: IsoDateString) => ReactNode
	resource?: Resource
}

/** One cell of a horizontal row. */
export interface HorizontalCellSpec {
	id: string
	day?: IsoDateString
	days?: IsoDateString[]
	gridType: 'day' | 'hour'
	className?: string
}

/** One row of a horizontal date-grid view. */
export interface HorizontalRowSpec {
	id: string
	columns?: HorizontalCellSpec[]
	className?: string
	showDayNumber?: boolean
	showWeekNumber?: boolean
	resource?: Resource
}

export type ColumnSpec = VerticalColumnSpec | HorizontalRowSpec

/** Context passed to a view's `renderHeader`. */
export interface ViewHeaderContext {
	date: IsoDateString
	config: ViewConfig
}

/** Describes a calendar view contributed by a plugin or built into core. */
export interface PluginView {
	name: string
	label?: string
	icon: ComponentType<{ className?: string }>
	component?: ComponentType
	navigationUnit?: DateUnit
	navigationStep?: NavigationStep
	range?: (
		date: IsoDateString,
		config: Pick<ViewConfig, 'firstDayOfWeek' | 'timezone' | 'hiddenDays'>
	) => { start: IsoDateString; end: IsoDateString }
	columns?: (
		date: IsoDateString,
		config: ViewConfig
	) => VerticalColumnSpec[] | HorizontalRowSpec[]
	layout?: 'vertical' | 'horizontal'
	renderHeader?: (ctx: ViewHeaderContext) => ReactNode
	supportsResources?: boolean
}

/** React calendar plugin contract. */
export interface IlamyPlugin {
	name: string
	transformEvents?: (
		events: CalendarEvent[],
		range: PluginDateRange
	) => CalendarEvent[]
	managesEvent?: (event: CalendarEvent) => boolean
	applyEdit?: (
		args: PluginMutationArgs
	) => CalendarEvent[] | PluginMutationResult
	applyDelete?: (
		args: PluginMutationArgs
	) => CalendarEvent[] | PluginMutationResult
	renderSlot?: (slotName: string, context: unknown) => ReactNode
	contribute?: (point: string, context: unknown) => unknown[]
	views?: PluginView[]
	provider?: ComponentType<{ children: ReactNode }>
}

// --- Host slot contracts ---------------------------------------------------

export interface EventFormSlotContext {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

export interface EventMutationScopeSlotContext {
	event: CalendarEvent
	operation: 'edit' | 'delete'
	resolve: (scope: unknown) => void
	cancel: () => void
}

/** Context passed to the `toolbar` slot (`SLOT_TOOLBAR`) in the calendar header. */
export interface ToolbarSlotContext {
	/** `'desktop'` for the header bar, `'mobile'` for the collapsed menu. */
	placement: 'desktop' | 'mobile'
}
