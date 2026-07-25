import type { ComponentType, ReactNode } from 'react'

// The Dayjs types are re-exported straight from `dayjs`. The configured
// instance (with its plugin augmentations like `.utc()`/`.tz()`) lives in
// `@ilamy/utils/dayjs`; importing that instance anywhere in a program loads
// those augmentations globally, so `Dayjs` here gains those methods too.
export type { Dayjs, ManipulateType } from 'dayjs'

import type { Dayjs, ManipulateType } from 'dayjs'

/**
 * Core calendar event interface representing a single calendar event.
 * This is the primary data structure for calendar events.
 */
export interface CalendarEvent {
	/** Unique identifier for the event */
	id: string | number
	/** Display title of the event */
	title: string
	/** Start date and time of the event */
	start: Dayjs
	/** End date and time of the event */
	end: Dayjs
	/**
	 * Color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names)
	 * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
	 */
	color?: string
	/**
	 * Background color for the event (supports CSS color values, hex, rgb, hsl, or CSS class names)
	 * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
	 */
	backgroundColor?: string
	/** Optional description or notes for the event */
	description?: string
	/** Optional location where the event takes place */
	location?: string
	/**
	 * Whether this is an all-day event
	 * @default false
	 */
	allDay?: boolean
	/**
	 * UID for iCalendar compatibility
	 * Unique identifier across calendar systems
	 */
	uid?: string
	/** Single resource assignment */
	resourceId?: string | number
	/** Multiple resource assignment (cross-resource events) */
	resourceIds?: (string | number)[]
	/**
	 * Custom data associated with the event
	 * Use this to store additional metadata specific to your application
	 * @example { meetingType: 'standup', attendees: ['john', 'jane'] }
	 */
	data?: Record<string, unknown>
}

/**
 * Supported days of the week for calendar configuration.
 * Used for setting the first day of the week and other week-related settings.
 */
export type WeekDays =
	| 'sunday'
	| 'monday'
	| 'tuesday'
	| 'wednesday'
	| 'thursday'
	| 'friday'
	| 'saturday'

/**
 * Configuration for business hours.
 * Defines the working hours to be highlighted on the calendar.
 */
export interface BusinessHours {
	/**
	 * Days of the week to apply business hours to.
	 * @default ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
	 */
	daysOfWeek?: WeekDays[]
	/**
	 * Start time for business hours: a whole 24-hour number (0-24) or an
	 * 'HH:mm' string for sub-hour boundaries (e.g. '09:15'). Fractional
	 * numbers round to the nearest hour — use a string for sub-hour precision.
	 * @default 9
	 */
	startTime?: number | string
	/**
	 * End time for business hours: a whole 24-hour number (0-24) or an
	 * 'HH:mm' string for sub-hour boundaries (e.g. '17:15'). Fractional
	 * numbers round to the nearest hour — use a string for sub-hour precision.
	 * @default 17
	 */
	endTime?: number | string
}

/**
 * Resource interface representing a calendar resource (person, room, equipment, etc.)
 */
export interface Resource {
	/** Unique identifier for the resource */
	id: string | number
	/** Display title of the resource */
	title: string
	/**
	 * Color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
	 * @example "#3b82f6", "blue-500", "rgb(59, 130, 246)"
	 */
	color?: string
	/**
	 * Background color for the resource (supports CSS color values, hex, rgb, hsl, or CSS class names)
	 * @example "#dbeafe", "blue-100", "rgba(59, 130, 246, 0.1)"
	 */
	backgroundColor?: string
	/**
	 * Configuration for resource-specific business hours.
	 * If provided, these will be used instead of the global business hours for this resource.
	 */
	businessHours?: BusinessHours | BusinessHours[]
	/**
	 * Custom data associated with the resource
	 * Use this to store additional metadata specific to your application
	 * @example { avatar: 'https://example.com/avatar.png', role: 'admin' }
	 */
	data?: Record<string, unknown>
}

// --- Plugin SDK contract ---------------------------------------------------

export interface PluginDateRange {
	start: Dayjs
	end: Dayjs
}

export interface PluginMutationArgs {
	event: CalendarEvent
	updates?: Partial<CalendarEvent>
	currentEvents: CalendarEvent[]
	scope: unknown
}

/** Structured result from `applyEdit` when a mutation updates multiple stored rows. */
export interface PluginMutationResult {
	events: CalendarEvent[]
	/** Existing rows to persist via `onEventUpdate`. */
	updated: CalendarEvent[]
	/** New rows to persist via `onEventAdd`. */
	added: CalendarEvent[]
	/** Existing rows to persist via `onEventDelete`. */
	deleted: CalendarEvent[]
}

/**
 * Calendar configuration handed to a view's `columns()`/`renderHeader()`.
 * Carries the resource axis (`resources`, `orientation`) so a resource-capable
 * view can compose both arrangements. `range()` receives only the
 * `firstDayOfWeek` slice (see its own signature).
 */
export interface ViewConfig {
	firstDayOfWeek: number
	hiddenDays?: Set<number>
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	/** The resource axis. Set only when the calendar renders resources. */
	resources?: Resource[]
	/**
	 * The calendar-level resource arrangement (the user's choice): where the
	 * resource axis goes. Only meaningful when `resources` is set.
	 */
	orientation?: 'vertical' | 'horizontal'
	/**
	 * Week-view granularity when `resources` is set: 'hourly' (default) nests
	 * hour slots under each day; 'daily' shows one cell per day.
	 */
	weekViewGranularity?: 'hourly' | 'daily'
}

/**
 * One column of a 'vertical' view (time flows down the column).
 * Formalizes the calendar's existing VerticalGrid column input.
 */
export interface VerticalColumnSpec {
	/** Stable column id; drives testids and React keys. */
	id: string
	/** The date this column represents; gutter/label columns leave it unset. */
	day?: Dayjs
	/** The cells of the column: hour slots (gridType 'hour') or dates ('day'). */
	days: Dayjs[]
	gridType?: 'day' | 'hour'
	className?: string
	/** Label-only column (e.g. the time gutter): renders no events. */
	noEvents?: boolean
	renderCell?: (date: Dayjs) => ReactNode
	/**
	 * Resource-axis identity when the column belongs to one resource. The
	 * single carrier: consumers derive the id from `resource.id`.
	 */
	resource?: Resource
}

/** One cell of a 'horizontal' row. */
export interface HorizontalCellSpec {
	id: string
	day?: Dayjs
	/** A grouped cell spanning several dates (nested-axis arrangements). */
	days?: Dayjs[]
	gridType: 'day' | 'hour'
	className?: string
}

/**
 * One row of a 'horizontal' view (date cells flow across the row).
 * Formalizes the calendar's existing HorizontalGrid row input.
 */
export interface HorizontalRowSpec {
	/** Stable row id; drives testids and React keys (matches VerticalColumnSpec.id). */
	id: string
	columns?: HorizontalCellSpec[]
	className?: string
	showDayNumber?: boolean
	/** Resource-axis identity when the row belongs to one resource. */
	resource?: Resource
}

/** What a view's `columns()` returns; `layout` picks which engine consumes it. */
export type ColumnSpec = VerticalColumnSpec | HorizontalRowSpec

/** Context passed to a view's `renderHeader`. */
export interface ViewHeaderContext {
	date: Dayjs
	config: ViewConfig
}

/**
 * Describes a view type — contributed by a plugin or built into the calendar
 * core (the four built-ins are themselves `PluginView` entries). A view either
 * declares `columns` + `layout` and renders through the shared grid engines,
 * or renders entirely through `component` (the escape hatch).
 */
export interface PluginView {
	/** Unique view id, e.g. 'resource-week'. */
	name: string
	/** View-switcher label (or a translation key; unknown keys render as-is). */
	label?: string
	/**
	 * View-switcher icon (a component taking `className`, e.g. a lucide icon).
	 * Always shown in the switcher; the label appears beside it only when the
	 * view is selected, and as a hover tooltip otherwise.
	 */
	icon: ComponentType<{ className?: string }>
	/**
	 * The escape hatch: renders the whole view when `columns`/`layout` are
	 * absent. Spec-driven views omit it. A view with neither renders nothing
	 * (dev builds log a warning).
	 */
	component?: ComponentType
	/** How far prev/next steps when `navigationStep` is absent ('week', 'month', …). */
	navigationUnit?: ManipulateType
	/**
	 * How far prev/next jumps; defaults to one `navigationUnit`. Custom-duration
	 * views (a 40-day grid, a 4-day vertical view) set `{ amount: 40, unit: 'day' }`
	 * so navigation moves a full window.
	 *
	 * This also selects the header title/date-picker form (the core derives it
	 * generically, never by view name): a single `day`/`week`/`month`/`year` step
	 * borrows that grid's picker and title; any other step (amount > 1, or a custom
	 * unit) shows the day picker over the view's `range`. A third-party view gets
	 * the right picker for free just by declaring how it navigates.
	 */
	navigationStep?: { amount: number; unit: ManipulateType }
	/**
	 * Visible range for navigation callbacks and the event pipeline. Views
	 * without `range` fall back to the month 6x7 grid range. Receives only the
	 * `firstDayOfWeek` slice of the config; the full axis config reaches
	 * `columns()`/`renderHeader()`.
	 */
	range?: (
		date: Dayjs,
		config: Pick<ViewConfig, 'firstDayOfWeek'>
	) => { start: Dayjs; end: Dayjs }
	/**
	 * Column/row specs for the shared renderer. Return `VerticalColumnSpec[]`
	 * when `layout` is 'vertical', `HorizontalRowSpec[]` when 'horizontal'.
	 * Omit (together with `layout`) to render `component` instead.
	 */
	columns?: (
		date: Dayjs,
		config: ViewConfig
	) => VerticalColumnSpec[] | HorizontalRowSpec[]
	/**
	 * The view's intrinsic shape (the author's choice): which engine renders it
	 * when the calendar has NO resources. 'vertical' = time flows down;
	 * 'horizontal' = date cells flow across in stacked rows. With resources on
	 * a resource-capable view, the calendar-level `orientation` wins instead:
	 * `engine = resources && supportsResources ? orientation : layout`.
	 */
	layout?: 'vertical' | 'horizontal'
	/** Header row content rendered above the grid by the shared renderer. */
	renderHeader?: (ctx: ViewHeaderContext) => ReactNode
	/**
	 * Whether `columns()` composes the resource axis when `config.resources`
	 * is set. Defaults to false; the view switcher hides resource-incapable
	 * views on a resource calendar.
	 */
	supportsResources?: boolean
}

/**
 * A calendar plugin contributes optional behavior and UI through generic hooks
 * named after pipeline moments and mount points, never after a feature. The
 * core stays agnostic of any specific plugin (e.g. recurrence).
 *
 * Hooks follow the Rollup/Vite execution kinds:
 * - `transformEvents` is sequential: each plugin receives the previous
 *   plugin's output, forming a transform chain.
 * - `managesEvent` is first-match: the first plugin whose managesEvent returns
 *   true owns its scoped mutations.
 * - `renderSlot` is additive: every plugin may contribute to a mount point.
 *
 * `slotName` is an opaque string identifier and `context` is opaque to the
 * core. The built-in slot names and their context shapes live in the calendar
 * core, which this contract does NOT depend on, so adding a slot never changes
 * this interface. A plugin narrows `context` by `slotName` at its boundary.
 *
 * `scope` is opaque to the core: the owner produces it (via the mutation-scope
 * slot) and consumes it in `applyEdit` / `applyDelete`. A plugin that provides
 * `applyEdit` / `applyDelete` should also render the mutation-scope slot so the
 * core can gather that scope before mutating.
 */
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
	/**
	 * Contributes arbitrary data to a named point. Additive: all plugins may
	 * contribute to the same point; the runtime aggregates all results via
	 * `collect`. Parallel to `renderSlot` but for data rather than UI nodes.
	 */
	contribute?: (point: string, context: unknown) => unknown[]
	/**
	 * Registers new view types that the calendar can switch to. Each entry in
	 * the array describes one view (id, component, navigation unit, …).
	 */
	views?: PluginView[]
	/**
	 * Wraps the calendar subtree so the plugin's own React context is available
	 * to its views, slots, and components. Rendered as the outermost wrapper
	 * among all plugin providers.
	 */
	provider?: ComponentType<{ children: ReactNode }>
}

// --- Host slot contracts ---------------------------------------------------

/** Context passed to the `event-form` slot (inside the create/edit form). */
export interface EventFormSlotContext {
	event: CalendarEvent
	onChange: (updates: Partial<CalendarEvent>) => void
}

/**
 * Context passed to the `event-mutation-scope` slot. The owning plugin renders
 * UI to gather its opaque `scope`, then calls `resolve(scope)` (or `cancel`).
 */
export interface EventMutationScopeSlotContext {
	event: CalendarEvent
	operation: 'edit' | 'delete'
	resolve: (scope: unknown) => void
	cancel: () => void
}
