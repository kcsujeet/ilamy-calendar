import type {
	BusinessHours,
	CalendarEvent,
	EventDropInfo,
	EventsChange,
	IlamyPlugin,
	Resource,
	WeekDays,
} from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import type { ReactNode } from 'react'
import type {
	Translations,
	TranslatorFunction,
} from '@/config/translations/types'
import type { EventFormProps } from '@/features/calendar/components/event-form/event-form'
import type { CalendarView, TimeFormat } from '@/types'

/**
 * Granularity of the time grid in minutes for day, week, and resource hour views.
 * Any divisor of 60 (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60); anything else falls
 * back to `60` with a console warning. `60` shows one row per hour with no sub-hour
 * lines. `30` shows two rows per hour. `15` shows four rows per hour with dashed
 * sub-hour separators.
 */
export type SlotDuration = number

/**
 * How a week number is counted: the locale's own count (`'local'`), ISO 8601
 * (`'ISO'`), or a function that receives the date the number is shown for (the
 * first day of a month row, the current date in a week header) and returns it.
 */
export type WeekNumberCalculation = 'local' | 'ISO' | ((date: Date) => number)

/**
 * Which slice of an event a `renderEvent` call is drawing.
 *
 * An event too long for the row it starts in is cut at the boundary and drawn
 * as one bar per row, each through its own `renderEvent` call. Without knowing
 * which slice it has, a custom renderer cannot tell a real end from a break —
 * so it rounds both, marks neither, and two halves of one booking read as two
 * bookings that happen to sit either side of a Sunday. The built-in renderer
 * has always had this; a custom one had no way to ask.
 *
 * Named to match FullCalendar's event render hook, which gives its renderers
 * the same two facts under the same names, so a renderer ported from there
 * behaves the same here.
 */
export interface EventSegment {
	/** This bar holds the event's real start, rather than resuming a cut one. */
	isStart: boolean
	/** This bar holds the event's real end, rather than running past it. */
	isEnd: boolean
}

/**
 * Custom class names for calendar styling.
 * Allows users to override default styles for various calendar elements.
 */
export interface CalendarClassesOverride {
	/**
	 * Class name for disabled cells (non-business hours).
	 * Replaces the DISABLED_CELL_CLASSNAME constant.
	 * @default "bg-secondary text-muted-foreground pointer-events-none"
	 * @example "bg-gray-100 text-gray-400 cursor-not-allowed"
	 */
	disabledCell?: string
}

/**
 * This interface extends the base CalendarEvent but allows more flexible date types
 * for the start and end properties. The component will automatically convert these
 * to dayjs objects internally for consistent date handling.
 *
 * @interface IlamyCalendarPropEvent
 * @extends {Omit<CalendarEvent, 'start' | 'end'>}
 */
export interface IlamyCalendarPropEvent
	extends Omit<CalendarEvent, 'start' | 'end'> {
	start: Dayjs | Date | string
	end: Dayjs | Date | string
}

/**
 * Information passed to the onCellClick callback.
 * Uses named properties for extensibility.
 */
export interface DateRange {
	start: Dayjs
	end: Dayjs
}

export interface CellInfo {
	/** Start date/time of the cell */
	start: Dayjs
	/** End date/time of the cell */
	end: Dayjs
	/** Full resource object in resource calendars; undefined in a regular calendar */
	resource?: Resource
	/** Whether this is an all-day cell (optional) */
	allDay?: boolean
}

/**
 * Input accepted by `openEventForm`. A partial event, optionally carrying the
 * full resource of the clicked cell (`CellInfo` is assignable as-is). When no
 * explicit `resourceId` is given, the carried resource's id is used.
 */
export type OpenEventFormInput = Partial<CalendarEvent> & {
	resource?: Resource
}

/**
 * Props passed to the custom render function for the current time indicator.
 * Allows users to customize how the current time indicator is displayed.
 */
export interface RenderCurrentTimeIndicatorProps {
	/** The current time as a dayjs object */
	currentTime: Dayjs
	/** The start of the visible time range */
	rangeStart: Dayjs
	/** The end of the visible time range */
	rangeEnd: Dayjs
	/** Progress percentage (0-100) representing position in the range */
	progress: number
	/**
	 * Layout axis the indicator is rendered along.
	 * - `'vertical'`: `progress` maps to a `top` offset (day/week vertical grids).
	 * - `'horizontal'`: `progress` maps to a `left` offset (horizontal resource hour grids).
	 *
	 * The library always populates this field, so consumers can treat it as
	 * always defined inside their render function.
	 *
	 * Note: distinct from the `orientation` prop on `IlamyResourceCalendar`.
	 * `orientation` chooses which view component renders the calendar; `axis` tells
	 * your render function which dimension `progress` maps to inside that view.
	 */
	axis?: 'vertical' | 'horizontal'
	/**
	 * The resource associated with this column (if in a resource-based view).
	 * Pass this to conditionally render custom indicators for specific resources.
	 */
	resource?: Resource
	/** The current calendar view (e.g. 'day', 'week') */
	view: CalendarView
}

/**
 * What the calendar asks an `events` function for: the visible range, in the
 * calendar's time zone. `end` is exclusive (the next midnight after the last
 * visible day), like an event's own `end`. In month view the range is the whole
 * grid, including the leading and trailing days of the neighbouring months.
 */
export interface EventsFetchInfo {
	/** Start of the visible range, inclusive. */
	start: Dayjs
	/** End of the visible range, exclusive. */
	end: Dayjs
	/** `start` as an ISO string. */
	startStr: string
	/** `end` as an ISO string. */
	endStr: string
	/** The `timezone` prop, when one is set. */
	timezone?: string
}

/**
 * Loads the events for a visible range. `options.signal` aborts when a newer
 * request supersedes this one, so a `fetch` can be cancelled by passing it on.
 * A result that arrives after being superseded is ignored either way.
 */
export type EventsFetcher = (
	info: EventsFetchInfo,
	options: { signal: AbortSignal }
) => Promise<IlamyCalendarPropEvent[]>

export interface IlamyCalendarProps {
	/**
	 * The events to display: an array, or a function the calendar calls with the
	 * visible range to load them on demand (see `EventsFetcher`).
	 *
	 * With a function, the calendar refetches when the visible range leaves the
	 * last fetched one (unless `lazyFetching` is off), when `timezone` changes,
	 * and when `refetchEvents()` is called. A new function identity does NOT
	 * refetch: an inline function would refetch on every render. Call
	 * `refetchEvents()` when your query changes. Edits made in the calendar are
	 * applied immediately and reported through the `onEvent*` callbacks; the next
	 * fetch replaces them with exactly what your function returns.
	 */
	events?: IlamyCalendarPropEvent[] | EventsFetcher
	/**
	 * With an `events` function: fetch only when the visible range is not inside
	 * the range last fetched. When `false`, every navigation fetches.
	 * @default true
	 */
	lazyFetching?: boolean
	/**
	 * With an `events` function: called with `true` when a fetch starts and
	 * `false` when none is in flight any more. Fires on those transitions only.
	 */
	loading?: (isLoading: boolean) => void
	/**
	 * With an `events` function: called when a fetch fails. The events already
	 * shown stay, and the next navigation retries. Without it, the error goes to
	 * `console.error`.
	 */
	onEventsError?: (error: unknown) => void
	/**
	 * The first day of the week to display in the calendar.
	 * Can be 'sunday', 'monday', etc. Defaults to 'sunday'.
	 */
	firstDayOfWeek?: WeekDays
	/**
	 * The initial view to display when the calendar loads.
	 * Defaults to 'month'.
	 */
	initialView?: CalendarView
	/**
	 * The initial date to display when the calendar loads.
	 * If not provided, the calendar will default to today's date.
	 */
	initialDate?: Dayjs | Date | string
	/**
	 * Custom render function for calendar events.
	 * If provided, it will override the default event rendering.
	 *
	 * The default content keeps its title in view while a long event is
	 * scrolled partly out of the grid; custom content does not. To opt a
	 * custom title in, make it sticky with `left: var(--ilamy-sticky-left)`
	 * and `top: var(--ilamy-sticky-top)`, which each grid publishes to clear
	 * its own sticky column and header.
	 */
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
	/**
	 * Callback when an event is clicked.
	 * Provides the clicked event object.
	 */
	onEventClick?: (event: CalendarEvent) => void
	/**
	 * Callback when a calendar cell is clicked.
	 * Provides cell information including start/end dates and optional resourceId.
	 */
	onCellClick?: (info: CellInfo) => void
	/**
	 * Predicate to disable individual cells based on custom logic (holidays,
	 * days-off, past dates, on-call windows, etc.). Return `true` to disable a
	 * cell — disabled cells block event creation clicks, reject drag-drops, and
	 * are grayed out. Composes with `businessHours` (a cell is disabled if either
	 * business hours or this predicate disables it).
	 */
	isCellDisabled?: (info: CellInfo) => boolean
	/**
	 * Returns extra CSS classes for a cell based on custom logic (unavailability
	 * styling, on-call windows, etc.). Unlike `isCellDisabled`, this is purely
	 * visual — cells remain clickable and accept drag-drops.
	 */
	getCellClassName?: (info: CellInfo) => string
	/**
	 * Callback when the calendar view changes (month, week, day, year).
	 * Useful for syncing with external state or analytics.
	 */
	onViewChange?: (view: CalendarView) => void
	/**
	 * Callback when a new event is added to the calendar.
	 * Provides the newly created event object.
	 */
	onEventAdd?: (event: CalendarEvent) => void
	/**
	 * Callback when an existing event is updated.
	 * Provides the updated event object.
	 */
	onEventUpdate?: (event: CalendarEvent) => void
	/**
	 * Callback when an event is deleted from the calendar.
	 * Provides the deleted event object.
	 */
	onEventDelete?: (event: CalendarEvent) => void
	/**
	 * Callback once per user action, with every stored row it touched: what
	 * `onEventAdd`, `onEventUpdate` and `onEventDelete` report one row at a time.
	 * Use it to save a recurring edit (series, override, deleted overrides) as
	 * one unit. The per-row callbacks still fire; use one or the other.
	 */
	onEventsChange?: (change: EventsChange) => void
	/**
	 * Callback when the current date changes (navigation).
	 * Provides the new current date and the current visible range.
	 */
	onDateChange?: (date: Dayjs, range: DateRange) => void
	/**
	 * Locale to use for formatting dates and times.
	 * If not provided, the default locale will be used.
	 */
	locale?: string
	/**
	 * Translations object for internationalization.
	 * Provide either this OR translator function, not both.
	 */
	translations?: Translations
	/**
	 * Translator function for internationalization.
	 * Provide either this OR translations object, not both.
	 */
	translator?: TranslatorFunction
	/**
	 * Timezone to use for displaying dates and times.
	 * If not provided, the local timezone will be used.
	 */
	timezone?: string
	/**
	 * Whether to disable click events on calendar cells.
	 * Useful for read-only views or when cell clicks are not needed.
	 */
	disableCellClick?: boolean
	/**
	 * Whether to disable click events on calendar events.
	 * Useful for read-only views or when event clicks are not needed.
	 */
	disableEventClick?: boolean
	/**
	 * Whether to disable drag-and-drop functionality for calendar events.
	 * Only sets the `editable` default, so an explicit `eventStartEditable`
	 * still enables moving.
	 * @deprecated Use `editable={false}`. Kept until 4.0.
	 */
	disableDragAndDrop?: boolean
	/**
	 * Whether events can be moved. A per-event `editable` beats it, and
	 * `eventStartEditable` beats it for moving.
	 *
	 * Deliberate deviation: FullCalendar defaults `editable` to `false`
	 * (`options.ts:495`, v7.1.1). Drag is on by default here, so this defaults
	 * to `true` until 4.0, when flipping it can be a breaking change.
	 * @default true
	 */
	editable?: boolean
	/**
	 * Whether events can be moved.
	 * @default editable
	 */
	eventStartEditable?: boolean
	/**
	 * Whether events can be resized by dragging an edge. Resize needs a mouse
	 * or a pen: on touch-only devices events can be moved but not resized until
	 * event selection lands. A per-event `durationEditable` beats it. The end edge always shows a handle when
	 * allowed; the start edge needs `eventResizableFromStart`.
	 * @default editable
	 */
	eventDurationEditable?: boolean
	/**
	 * Also show a resize handle on the start edge of an event.
	 * @default false
	 */
	eventResizableFromStart?: boolean
	/**
	 * Vetoes a candidate placement while an event is dragged or resized. Called when the
	 * hovered placement changes, not on every pointer move; returning `false`
	 * shows the not-allowed cursor and a release there changes nothing.
	 * `draggedEvent` is the event as it was before the drag. It does not apply
	 * to the event form or to drag-to-create (FullCalendar's `selectAllow`).
	 */
	eventAllow?: (dropInfo: EventDropInfo, draggedEvent: CalendarEvent) => boolean
	/**
	 * Maximum number of events to display in one grid cell: a day in month
	 * view, an hour in the resource day view.
	 * Additional events will be hidden and can be viewed via a "more" link.
	 * Defaults to 4 if not specified.
	 */
	dayMaxEvents?: number
	/**
	 * Vertical spacing between stacked events in pixels.
	 * Controls the gap between events when multiple events are displayed in the same view.
	 * Defaults to 1 pixel if not specified.
	 * Recommended range: 1-8 pixels for optimal readability.
	 */
	eventSpacing?: number
	/**
	 * Height of event bars in horizontal grid views (month view, resource month, resource week horizontal) in pixels.
	 * Increase this to show more content per event (e.g., title + time on separate lines).
	 * Does not affect day/week views, which use percentage-based heights that scale with event duration.
	 * Defaults to 24 pixels if not specified.
	 */
	eventHeight?: number
	/**
	 * Whether to stick the view header to the top of the calendar.
	 * Useful for keeping the header visible while scrolling.
	 */
	stickyViewHeader?: boolean
	/**
	 * Custom class name for the view header.
	 * Useful for applying custom styles or themes.
	 */
	viewHeaderClassName?: string
	/**
	 * Custom header component to replace the default calendar header.
	 * Useful for adding custom branding or additional controls.
	 */
	headerComponent?: ReactNode
	/**
	 * Custom class name for the calendar header.
	 * Useful for applying custom styles to the header.
	 */
	headerClassName?: string
	/**
	 * Configuration for business hours.
	 * Defines the working hours to be highlighted on the calendar.
	 * Can be a single BusinessHours object (applies to all specified days)
	 * or an array of BusinessHours objects (for different hours on different days).
	 */
	businessHours?: BusinessHours | BusinessHours[]
	/**
	 * Custom render function for the event form.
	 * If provided, it will override the default event form component.
	 * The function receives EventFormProps and should return a React node.
	 */
	renderEventForm?: (props: EventFormProps) => ReactNode
	/**
	 * Called when the "+N more" overflow indicator in a month/grid cell is
	 * clicked, receiving the cell's day and its full list of events.
	 * If provided, it overrides the built-in "all events" dialog, letting you
	 * render your own popover/dialog. When omitted, the default dialog opens.
	 */
	onMoreEventsClick?: (day: Dayjs, events: CalendarEvent[]) => void
	/**
	 * Time format for displaying times in the calendar.
	 * - "12-hour": Times displayed as "1:00 PM" (default)
	 * - "24-hour": Times displayed as "13:00"
	 */
	timeFormat?: TimeFormat
	/**
	 * How the labels in the time gutter are written, as `Intl.DateTimeFormat`
	 * options, formatted with the calendar's `locale` and `timezone`. When the
	 * options carry neither `hour12` nor `hourCycle`, a `timeFormat` you passed
	 * decides; without one, the locale does.
	 * Unset keeps the built-in label. `renderHour` takes precedence.
	 *
	 * Only the `Intl.DateTimeFormatOptions` form is supported: no format
	 * strings, no functions, and none of FullCalendar's extras (`meridiem`,
	 * `omitZeroMinute`). Use `renderHour` for anything else.
	 * (FullCalendar v7 calls this `slotHeaderFormat` too.)
	 */
	slotHeaderFormat?: Intl.DateTimeFormatOptions
	/**
	 * How the time on an event bar is written, as `Intl.DateTimeFormat`
	 * options. Same rules as `slotHeaderFormat`. Setting it shows the time
	 * unless `displayEventTime` is `false`. `renderEvent` takes precedence.
	 */
	eventTimeFormat?: Intl.DateTimeFormatOptions
	/**
	 * Whether the built-in event bar shows the event's time. All-day events
	 * never do. Unset: shown only when `eventTimeFormat` is set, so existing
	 * calendars look as they did. Shown with no `eventTimeFormat`, it reads
	 * like "9:30 AM".
	 *
	 * FullCalendar defaults this to on; flipping it here is a 4.0 candidate.
	 */
	displayEventTime?: boolean
	/**
	 * Whether the time on an event bar runs to the end ("9:30 – 10:30").
	 * Needs the time to be shown. FullCalendar defaults the end on when the
	 * event has one; flipping it here is a 4.0 candidate.
	 * @default false
	 */
	displayEventEnd?: boolean
	/**
	 * How a day header is written, as `Intl.DateTimeFormat` options. When set,
	 * the formatted text is the whole header: `{ weekday: 'long' }` gives
	 * "Wednesday" with no day number, and `{ weekday: 'short', day: 'numeric' }`
	 * gives "Wed 12". Applies to the week, day, month and resource headers
	 * (not the agenda plugin). Unset keeps the weekday over the day number.
	 */
	dayHeaderFormat?: Intl.DateTimeFormatOptions
	/**
	 * How the toolbar title is written, as `Intl.DateTimeFormat` options.
	 * A range (week, custom window) is written with `formatRange`. Unset keeps
	 * the built-in title for each view.
	 */
	titleFormat?: Intl.DateTimeFormatOptions
	/**
	 * Whether to hide non-business hours in Day and Week views.
	 * Requires businessHours to be configured.
	 * @default false
	 */
	hideNonBusinessHours?: boolean
	/**
	 * First visible time in the hour grids (day, week, and the resource hour
	 * views in both orientations), `'HH:mm'` or `'HH:mm:ss'`. A bound that falls
	 * inside an hour shows that whole hour. Month, year, agenda and
	 * `weekViewGranularity: 'daily'` ignore it.
	 *
	 * An event outside the range is not drawn; one that crosses its edge is
	 * clipped to it and keeps its real start and end times. Combined with
	 * `hideNonBusinessHours`, the grid shows the overlap of the two ranges.
	 *
	 * Between `'00:00'` and `'24:00'` only. An invalid value, or a range whose
	 * end is not after its start, shows the whole day and logs one
	 * `console.warn` naming the prop.
	 *
	 * @default '00:00'
	 * @example slotMinTime="08:00"
	 */
	slotMinTime?: string
	/**
	 * End of the visible time in the hour grids, exclusive: `'18:00'` shows the
	 * 5 PM row and stops there. `'HH:mm'` or `'HH:mm:ss'` up to `'24:00'`. See
	 * `slotMinTime`.
	 *
	 * @default '24:00'
	 * @example slotMaxTime="18:00"
	 */
	slotMaxTime?: string
	/**
	 * Whether to hide the iCalendar export button in the calendar header.
	 * Applies to both desktop and mobile header layouts.
	 * @default false
	 */
	hideExportButton?: boolean
	/**
	 * Custom class names for overriding default calendar element styles.
	 * Allows fine-grained control over the appearance of different calendar elements.
	 * @example { disabledCell: "bg-gray-100 text-gray-400" }
	 */
	classesOverride?: CalendarClassesOverride
	/**
	 * Custom render function for the current time indicator.
	 * If provided, replaces the default red line indicator.
	 * Useful for adding custom time labels or styling.
	 *
	 * Branch on `axis` to position correctly across vertical day/week grids
	 * (`axis === 'vertical'` → use `top`) and horizontal resource hour grids
	 * (`axis === 'horizontal'` → use `left`).
	 *
	 * @example
	 * ```tsx
	 * renderCurrentTimeIndicator={({ currentTime, progress, resource, view, axis }) => {
	 *   // Only show the time badge for the first resource in Day view (to avoid repetition)
	 *   const isPrimary = !resource || resource.id === 'room-a'
	 *   const showBadge = view === 'day' ? isPrimary : true
	 *
	 *   if (axis === 'horizontal') {
	 *     return (
	 *       <div style={{ left: `${progress}%` }} className="absolute top-0 bottom-0">
	 *         <div className="w-0.5 h-full bg-red-500" />
	 *       </div>
	 *     )
	 *   }
	 *
	 *   return (
	 *     <div style={{ top: `${progress}%` }} className="absolute left-0 right-0">
	 *       <div className="h-0.5 bg-red-500" />
	 *       {showBadge && (
	 *         <span className="absolute left-0 bg-red-500 text-white text-[10px] px-1 rounded-r-sm">
	 *           {currentTime.format('h:mm A')}
	 *         </span>
	 *       )}
	 *     </div>
	 *   )
	 * }}
	 * ```
	 */
	renderCurrentTimeIndicator?: (
		props: RenderCurrentTimeIndicatorProps
	) => ReactNode
	/**
	 * Days of the week to hide. A hidden day gets no column or row, so the
	 * remaining days share the space.
	 *
	 * Applies to the month, week and day views, with or without `resources`, in
	 * every orientation and granularity. The day view skips hidden days when you
	 * step to the previous or next day, and opens on the next visible day if it
	 * is given a hidden one.
	 *
	 * An event that runs across a hidden day is drawn as one bar over the visible
	 * days it covers; one that starts or ends on a hidden day is clamped to the
	 * nearest visible day (`EventSegment.isStart` / `isEnd` are false there), and
	 * one that lies wholly on hidden days is not drawn.
	 *
	 * Does NOT apply to the year view, which shows every day of each month, or to
	 * the agenda plugin, which lists events rather than days.
	 *
	 * Hiding all seven days is ignored, with a warning in development.
	 *
	 * @default []
	 * @example ['saturday', 'sunday'] // Hide weekends
	 */
	hiddenDays?: WeekDays[]
	/**
	 * Whether to show Saturday and Sunday. `false` is the same as adding both
	 * to `hiddenDays`, and is added to it when both are set.
	 *
	 * @default true
	 */
	weekends?: boolean
	/**
	 * Custom render function for the hour labels in the gutter/header.
	 * Receives a Dayjs object for the hour and should return a React node.
	 */
	renderHour?: (date: Dayjs) => ReactNode
	/**
	 * Granularity of the time grid in minutes for day, week, and resource hour views.
	 * Any divisor of 60: `1`, `2`, `3`, `4`, `5`, `6`, `10`, `12`, `15`, `20`, `30` or
	 * `60`. Any other value falls back to `60` and logs one `console.warn`.
	 *
	 * - `60` (default): one row per hour, no sub-hour lines.
	 * - `30`: two rows per hour (top of hour, half hour).
	 * - `15`: four rows per hour with dashed sub-hour separators.
	 * - `20`: three rows per hour.
	 *
	 * @default 60
	 */
	slotDuration?: SlotDuration
	/**
	 * The size, in minutes, a dragged or resized event (and a drag-to-create
	 * selection) snaps to. May be finer than `slotDuration`: with `slotDuration={60}`
	 * and `snapDuration={15}` an event dropped halfway down an hour row lands on
	 * `:30`. Defaults to the size of the cell under the pointer, which is
	 * `slotDuration` in the vertical time grid and one hour in the horizontal
	 * resource timeline. A value that does not divide the cell falls back to the
	 * cell, silently.
	 */
	snapDuration?: number
	/**
	 * Initial scroll position for hour-resolution views (day, week, resource
	 * day, resource week, in both orientations). Accepts `"HH:mm"` or
	 * `"HH:mm:ss"`. The grid scrolls to the exact minute: `"08:30"` lands
	 * halfway into the 08:00 row. The scroll target is clamped to the nearest
	 * visible row (landing on its edge) when `hideNonBusinessHours` hides the
	 * requested hour.
	 *
	 * Reapplied whenever the visible date range changes (navigation, view
	 * switch), the rendered hours change, or `scrollTime` itself changes, as
	 * FullCalendar does.
	 * Ordinary re-renders leave the user's own scroll position alone.
	 * `scrollToNow` takes precedence while the current moment is on screen.
	 *
	 * Independent of `businessHours`: you can show all 24 hours and still
	 * focus on 08:00 on load.
	 *
	 * **Requires a fixed calendar height** so the internal time grid has a
	 * scroll container to scroll within. If the calendar host element has
	 * `height: auto`, the time grid grows to fit all hours and there is
	 * nothing to scroll — this prop becomes a silent no-op.
	 *
	 * @example
	 * ```tsx
	 * <IlamyCalendar
	 *   businessHours={{ daysOfWeek: [1,2,3,4,5], startTime: 0, endTime: 24 }}
	 *   scrollTime="08:00:00"
	 * />
	 * ```
	 */
	scrollTime?: string
	/**
	 * Open every scrolling grid on the current moment rather than its start:
	 * the current moment in time grids (day, week, resource day, hourly
	 * resource week), down to the minute, and today's column or row in day grids (resource month, daily
	 * resource week, #285). Month and year grids do not scroll, so it does
	 * nothing there.
	 *
	 * Applies only while now is on screen. On a range without it (after
	 * navigating away, or when the current hour or day is hidden) the grid
	 * falls back to `scrollTime`, or to its start. Like `scrollTime`, it is
	 * applied when the range, rendered hours, or this prop changes. Clock
	 * movement alone never changes the scroll position. "Now" is the current
	 * instant; the calendar's `timezone` only decides how it is drawn.
	 *
	 * Now is lined up with the leading edge, like `scrollTime`. Late in the day
	 * or month there is not enough grid left to do that, and the browser stops
	 * at its maximum scroll: now stays on screen, short of the edge. FullCalendar
	 * behaves the same.
	 *
	 * Neither FullCalendar nor RFC 5545 defines this. FullCalendar's timeline
	 * opens on the range start plus `scrollTime`, and its users reach today by
	 * setting `scrollTime` themselves; this is that, done for them.
	 *
	 * @default false
	 */
	scrollToNow?: boolean
	/**
	 * Whether day, week and resource time grids draw the all-day row above the
	 * hours. When `false` the row is removed and all-day events are not shown in
	 * those views. Month, year and agenda views are unaffected.
	 *
	 * @default true
	 */
	allDaySlot?: boolean
	/**
	 * Whether time grids draw a line at the current time.
	 *
	 * @default true
	 */
	nowIndicator?: boolean
	/**
	 * Whether week numbers are shown.
	 *
	 * - unset (default): the week number appears in the corner of the week and
	 *   resource week headers, and month view shows none.
	 * - `true`: additionally shows a number in each row of the month view,
	 *   counted from the row's first day.
	 * - `false`: shows week numbers nowhere.
	 */
	weekNumbers?: boolean
	/**
	 * How week numbers are counted.
	 *
	 * - `'local'` (default): the locale's own count.
	 * - `'ISO'`: ISO 8601, week 1 being the week holding the year's first
	 *   Thursday. It only changes the number: it does not make weeks start on
	 *   Monday. Use `firstDayOfWeek` for that.
	 * - a function: called with the date a week number is shown for (the first
	 *   day of a month row, the current date in a week header) and returns the
	 *   number to show. It receives that instant as a JavaScript `Date`, so
	 *   under a configured `timezone` its local fields follow the machine's
	 *   zone, not the calendar's.
	 *
	 * @default 'local'
	 */
	weekNumberCalculation?: WeekNumberCalculation
	/**
	 * Optional plugins that add behavior/UI (e.g. recurrence). The core ships
	 * with no plugins by default — pass `recurrencePlugin()` to enable recurring
	 * events.
	 */
	plugins?: IlamyPlugin[]
	/**
	 * Resources (people, rooms, equipment) to display as a resource axis.
	 * When set: events are shown per matching resource (`resourceIds`, falling
	 * back to `resourceId`); events with no resource assignment are hidden; the
	 * year view is hidden from the view switcher.
	 */
	resources?: Resource[]
	/** Custom render function for resource header cells. */
	renderResource?: (resource: Resource) => ReactNode
	/**
	 * How resources are arranged. Only applies when `resources` is set.
	 * - "horizontal": resources are rows, time is columns (default)
	 * - "vertical": resources are columns, time is rows
	 */
	orientation?: 'horizontal' | 'vertical'
	/**
	 * Granularity of week-view time slots when `resources` is set.
	 * - "hourly": one column per hour (default)
	 * - "daily": one column per day
	 */
	weekViewGranularity?: 'hourly' | 'daily'
}
