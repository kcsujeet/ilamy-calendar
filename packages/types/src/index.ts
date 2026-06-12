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
	 * Start time for business hours in 24-hour format (0-24).
	 * @default 9
	 */
	startTime?: number
	/**
	 * End time for business hours in 24-hour format (0-24).
	 * @default 17
	 */
	endTime?: number
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

/**
 * Describes a view type contributed by a plugin. The component reads calendar
 * state via `useIlamyCalendarContext()`. `navigationUnit` controls how next/prev
 * steps for the view ('week', 'month', 'day', …).
 */
export interface PluginView {
	/** Unique view id, e.g. 'resource-week'. */
	name: string
	/** View-switcher label (or a translation key). */
	label?: string
	/** Renders the view; reads state via useIlamyCalendarContext(). */
	component: ComponentType
	/** How next/prev steps for this view ('week', 'month', 'day', …). */
	navigationUnit?: ManipulateType
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
	applyEdit?: (args: PluginMutationArgs) => CalendarEvent[]
	applyDelete?: (args: PluginMutationArgs) => CalendarEvent[]
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
