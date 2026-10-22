# Types and Interfaces

Type catalog for @ilamy/calendar. All field tables reflect actual source definitions.

## Type Relationship Chain

```
IlamyCalendarPropEvent          User provides (flexible date types: string | Date | dayjs)
        |
    normalization               IlamyCalendar converts start/end to dayjs objects
        |
CalendarEvent                   Internal canonical type (dayjs dates)
        |
    positioning                 features/calendar/utils/layout (geometry / vertical / horizontal)
        |
PositionedEvent                 { event: CalendarEvent } + placement fields (left/width + top/height/zIndex or row)
```

## CalendarEvent

`packages/types/src/index.ts` (`@ilamy/types`)

The core event type used throughout the library.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | yes | Unique identifier |
| `title` | `string` | yes | Display title |
| `start` | `dayjs.Dayjs` | yes | Start date/time |
| `end` | `dayjs.Dayjs` | yes | End date/time, **exclusive** (see below) |
| `color` | `string` | no | Text/border color (CSS value, hex, rgb, or class name) |
| `backgroundColor` | `string` | no | Background color |
| `description` | `string` | no | Event description |
| `location` | `string` | no | Event location |
| `allDay` | `boolean` | no | All-day event flag (default `false`) |
| `rrule` | `RRuleOptions` | no | Recurrence rule (RFC 5545) |
| `exdates` | `string[]` | no | Exception dates as ISO strings |
| `recurrenceId` | `string` | no | Original occurrence date this event modifies |
| `uid` | `string` | no | iCalendar UID for cross-system compatibility |
| `resourceId` | `string \| number` | no | Single resource assignment |
| `resourceIds` | `(string \| number)[]` | no | Multiple resource assignment |
| `data` | `Record<string, unknown>` | no | Custom application metadata |
| `editable` | `boolean` | no | Whether this event can be moved; beats the calendar's `editable` |
| `startEditable` | `boolean` | no | Whether this event can be moved; defaults to `editable` |
| `durationEditable` | `boolean` | no | Whether this event can be resized by its edges; defaults to `editable` |

### `end` is exclusive

An event runs up to, but not including, `end`, matching RFC 5545 §3.6.1 ("the DTEND property for a VEVENT calendar component specifies the non-inclusive end of the event") and the Google Calendar API, where `end` is "The (exclusive) end time of the event".

| Event | Days it covers |
|---|---|
| `2025-01-13T00:00` to `2025-01-14T00:00` | Jan 13 |
| `2025-01-13T00:00` to `2025-01-14T09:00` | Jan 13 and Jan 14 |
| All-day Jan 13, stored conventionally | `start` Jan 13, `end` Jan 14 |

This holds at every granularity: an event ending on the hour does not occupy that hour's row, and one ending at midnight does not occupy that day's column (`features/calendar/utils/layout/horizontal.ts`). The same rule makes `overlapsRange` (`@ilamy/utils/helpers`, shared by the core and both plugins) treat an event ending at a range's first instant as outside it.

Two conversions exist so users are never asked for a midnight end, which is the same split Google draws between its API and its UI:

- `buildEndDateTime` stores an all-day end as the midnight after the last covered day.
- `event-form` displays that last covered day. An all-day end that is not on a midnight boundary predates this convention and is shown untouched.

## IlamyCalendarPropEvent

`src/features/calendar/types/index.ts`

Public-facing event type that accepts flexible date inputs. Extends `CalendarEvent` but replaces `start`/`end`:

| Field | Type | Description |
|-------|------|-------------|
| `start` | `dayjs.Dayjs \| Date \| string` | Accepts any date format |
| `end` | `dayjs.Dayjs \| Date \| string` | Accepts any date format |
| *(other fields)* | *(same as CalendarEvent)* | Inherited |

## Resource

`packages/types/src/index.ts` (re-exported from `src/features/calendar/types/index.ts`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string \| number` | yes | Unique resource identifier |
| `title` | `string` | yes | Display title |
| `color` | `string` | no | Resource color |
| `backgroundColor` | `string` | no | Resource background color |
| `businessHours` | `BusinessHours | BusinessHours[]` | no | Resource-specific business hours (overrides global) |
| `data` | `Record<string, unknown>` | no | Custom resource metadata |

## PluginView (view contract)

`packages/types/src/index.ts`

Describes a view — contributed by a plugin or built into the core (the four built-ins are
`PluginView` specs in `src/features/calendar/components/views/`, resolved through one path).
Core fields: `name`, `label?`, `component`, `navigationUnit?`. Optional view-spec fields:
`navigationStep?`, `range?`, `columns?` (returns `VerticalColumnSpec[]` or
`HorizontalRowSpec[]`), `layout?` (`'vertical' | 'horizontal'`), `renderHeader?`,
`supportsResources?`. A view declares `columns` + `layout` to render through the shared
grid engines, or just `component` (the escape hatch). Supporting types: `ViewConfig`,
`ColumnSpec`, `VerticalColumnSpec`, `HorizontalCellSpec`, `HorizontalRowSpec`,
`ViewHeaderContext` — all exported from `@ilamy/calendar`. Authoring guide:
`docs/custom-views.md`.

## IlamyCalendarProps

`src/features/calendar/types/index.ts`

Top-level props for `<IlamyCalendar>`. Key props summarized below — see source JSDoc for full descriptions.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `events` | `IlamyCalendarPropEvent[] \| EventsFetcher` | `[]` | Events to display, or a function that loads them for the visible range (see [Events as a function](#events-as-a-function)) |
| `lazyFetching` | `boolean` | `true` | With an `events` function: fetch only when the visible range leaves the last fetched range |
| `loading` | `(isLoading: boolean) => void` | — | With an `events` function: `true` when a fetch starts, `false` when none is in flight any more; fires on transitions only |
| `onEventsError` | `(error: unknown) => void` | `console.error` | With an `events` function: a fetch failed; the shown events stay |
| `firstDayOfWeek` | `WeekDays` | `'sunday'` | First day of week |
| `initialView` | `CalendarView` | `'month'` | Starting view |
| `initialDate` | `dayjs \| Date \| string` | today | Starting date |
| `renderEvent` | `(event, segment) => ReactNode` | — | Custom event renderer; `segment` is an `EventSegment` |
| `onEventClick` | `(event) => void` | — | Event click callback |
| `onCellClick` | `(info: CellClickInfo) => void` | — | Cell click callback |
| `onViewChange` | `(view) => void` | — | View change callback |
| `onEventAdd` | `(event) => void` | — | Event add callback |
| `onEventUpdate` | `(event) => void` | — | Event update callback |
| `onEventDelete` | `(event) => void` | — | Event delete callback |
| `onEventsChange` | `(change: EventsChange) => void` | — | Once per user action, with the `added` / `updated` / `deleted` rows it touched (#309) |
| `onDateChange` | `(date: Dayjs, range: { start: Dayjs; end: Dayjs }) => void` | — | Date navigation callback |
| `locale` | `string` | — | dayjs locale |
| `timezone` | `string` | — | dayjs timezone |
| `translations` | `Translations` | — | Translation object |
| `translator` | `TranslatorFunction` | — | Translator function |
| `timeFormat` | `TimeFormat` | `'12-hour'` | Time display format |
| `slotHeaderFormat` | `Intl.DateTimeFormatOptions` | - | Gutter labels, in the calendar's `locale` and `timezone`. a `timeFormat` you passed fills `hour12` when the options omit `hour12`/`hourCycle`; without one the locale decides. `renderHour` wins |
| `eventTimeFormat` | `Intl.DateTimeFormatOptions` | - | Time on the event bar. Setting it shows the time unless `displayEventTime` is `false`. `renderEvent` wins |
| `displayEventTime` | `boolean` | shown only when `eventTimeFormat` is set | Whether the default event bar shows a time. All-day events never do. FullCalendar defaults it on; flipping is a 4.0 candidate |
| `displayEventEnd` | `boolean` | `false` | Whether the bar's time runs to the end (`09:30 – 10:30`) |
| `dayHeaderFormat` | `Intl.DateTimeFormatOptions` | weekday over day number | When set, the formatted text is the whole day header (`{weekday:'long'}` gives "Wednesday", no number). Week, day, month and resource headers; not agenda |
| `titleFormat` | `Intl.DateTimeFormatOptions` | per view | The toolbar title; a range is written with `formatRange` |
| `businessHours` | `BusinessHours \| BusinessHours[]` | — | Working hours config |
| `hideExportButton` | `boolean` | `false` | Hide the iCalendar export button in the default header (desktop and mobile) |
| `hideNonBusinessHours` | `boolean` | `false` | Hide off-hours in day/week views |
| `slotMinTime` | `string` | `'00:00'` | First visible time in hour grids, `'HH:mm'` or `'HH:mm:ss'` |
| `slotMaxTime` | `string` | `'24:00'` | End of the visible time in hour grids, exclusive, up to `'24:00'`. Invalid values (or an end not after the start) show the whole day and log one `console.warn` |
| `slotDuration` | `number` | `60` | Time-grid granularity (minutes): any divisor of 60 (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60). Any other value falls back to `60` and logs one `console.warn`. `60` gives one row per hour with no sub-hour lines; `30` two; `15` four with dashed separators. Applies to day, week, and resource vertical views; the horizontal resource timeline keeps hour columns. |
| `snapDuration` | `number` | the cell's size | Minutes a dragged or resized event, and a drag-to-create selection, snaps to. May be finer than `slotDuration` (`slotDuration={60} snapDuration={15}`): the position of the pointer inside the cell picks the quarter hour. Works in the vertical time grid and in the horizontal resource timeline (hour columns). A value that does not divide the cell falls back to the cell's size, silently. This is decided per cell: `slotDuration={15}` with `snapDuration={10}` falls back to 15 in the vertical grid but snaps to 10 in the hourly horizontal timeline. |
| `hiddenDays` | `WeekDays[]` | `[]` | Days of the week to hide, in the month, week and day views, with or without `resources`, in every orientation and granularity. Not applied to the year view or the agenda plugin. Hiding all seven is ignored with a dev warning. |
| `weekends` | `boolean` | `true` | `false` hides Saturday and Sunday, as adding both to `hiddenDays` does (the two combine). |
| `allDaySlot` | `boolean` | `true` | Draw the all-day row in day, week and resource time grids. `false` removes it and all-day events are not shown in those views. |
| `nowIndicator` | `boolean` | `true` | Draw the current-time line in time grids. |
| `weekNumbers` | `boolean` | unset | Unset: week number in the week and resource week header corner, none in month view. `true`: also a number in each month row, from the row's first day. `false`: nowhere. |
| `weekNumberCalculation` | `WeekNumberCalculation` | `'local'` | `'local'` (the locale's count, dayjs `week()`), `'ISO'` (ISO 8601; changes only the number, not the first day of the week) or `(date: Date) => number` (receives the instant as a `Date`). |
| `disableCellClick` | `boolean` | — | Disable cell clicks |
| `disableEventClick` | `boolean` | — | Disable event clicks |
| `disableDragAndDrop` | `boolean` | — | **Deprecated**, use `editable={false}`. Only sets the `editable` default, so an explicit `eventStartEditable` still enables moving. Kept until 4.0 |
| `editable` | `boolean` | `true` | Events can be moved |
| `eventStartEditable` | `boolean` | `editable` | Events can be moved |
| `eventDurationEditable` | `boolean` | `editable` | Events can be resized by dragging an edge |
| `eventResizableFromStart` | `boolean` | `false` | Also show a resize handle on the start edge. The end handle shows whenever resizing is allowed. Resize needs a mouse or pen: on touch-only devices events can be moved but not resized until event selection lands |
| `eventAllow` | `(dropInfo: EventDropInfo, draggedEvent: CalendarEvent) => boolean` | — | Veto a candidate placement while dragging or resizing. `EventDropInfo` is `{ start, end, allDay, resourceId? }`; `draggedEvent` is the event before the drag. Asked once per placement change, not per pointer move. Not applied to the event form or drag-to-create |
| `dayMaxEvents` | `number` | `4` | Max events per day in month view |
| `onMoreEventsClick` | `(day: Dayjs, events: CalendarEvent[]) => void` | — | Called when the "+N more" overflow indicator is clicked, with the cell's day and full event list. Overrides the built-in all-events dialog when provided |
| `eventSpacing` | `number` | `1` | Gap between stacked events (px) |
| `stickyViewHeader` | `boolean` | `true` | Sticky day/week headers |
| `headerComponent` | `ReactNode` | — | Custom header replacement |
| `renderEventForm` | `(props) => ReactNode` | — | Custom event form |
| `renderCurrentTimeIndicator` | `(props) => ReactNode` | — | Custom time indicator |
| `classesOverride` | `CalendarClassesOverride` | — | CSS class overrides |

### Events as a function

```ts
interface EventsFetchInfo {
  start: Dayjs      // inclusive, in the calendar's zone
  end: Dayjs        // exclusive: the next midnight after the last visible day
  startStr: string  // ISO
  endStr: string    // ISO
  timezone?: string // the `timezone` prop
}
type EventsFetcher = (
  info: EventsFetchInfo,
  options: { signal: AbortSignal }
) => Promise<IlamyCalendarPropEvent[]>
```

The range is the whole visible grid (a month includes the leading and trailing days of the neighbouring months), as in FullCalendar (`reducers/eventSources.ts:13,29` in v7.1.1); `end` is exclusive like an event's `end`.

Rules, each following FullCalendar v7.1.1 (`packages/preact/src/reducers/eventSources.ts`) unless marked as a deviation:

- **Refetch** when nothing was fetched yet, when a fetch is in flight, when the visible range is not inside the last fetched one, or when `timezone` changes. `lazyFetching={false}` fetches on every navigation (`:70-80,125-134`).
- **Superseded fetches** are ignored when they land (`:161,216-241`). *Beyond FullCalendar:* the calendar also aborts them through `signal`, so a `fetch(url, { signal })` is cancelled.
- **`loading`** fires on transitions of "a fetch is in flight" (`CalendarDataManager.ts:322-328,709-717`). An array `events` never triggers it.
- **Failure** keeps the events on screen, calls `onEventsError` (or `console.error` without it) and does not record the range, so the next navigation retries (`:189-205,58-60`).
- **`refetchEvents()`** on `useIlamyCalendarContext()` refetches the visible range regardless of `lazyFetching`; the old events stay until the new ones arrive (`CalendarApiImpl.ts:509-511`).
- **Mutations** are applied in the calendar immediately and reported through the usual callbacks. The next fetch replaces the calendar's events with exactly what the function returns. *Deviation:* FullCalendar keeps source-less client-added events across a refetch; ilamy has one source, so keeping them would duplicate events the server now returns.
- **Function identity**: a new function does not refetch (an inline `events={() => ...}` would refetch on every render). The latest function is the one called. Call `refetchEvents()` when your query changes.
- **Not supported:** multiple event sources and JSON-feed URLs (a feed plugin is roadmap 4.3.9).

With a `timezone` prop the first fetch can be aborted and repeated once, because the zone is applied right after mount (`docs/timezones.md`).

## IlamyResourceCalendarProps (deprecated alias)

`src/features/calendar/components/ilamy-resource-calendar.tsx`

Deprecated alias of `IlamyCalendarProps` — the resource axis lives on `IlamyCalendar`
directly (`resources`, `renderResource`, `orientation`, `weekViewGranularity`):

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `resources` | `Resource[]` | `undefined` | Resource definitions |
| `renderResource` | `(resource) => ReactNode` | — | Custom resource renderer |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Where the resource axis goes |
| `weekViewGranularity` | `'hourly' \| 'daily'` | `'hourly'` | Week-view slot granularity with resources |

## Recurrence Types

`src/features/recurrence/types/index.ts`

### RRuleOptions

```typescript
type RRuleOptions = {
  freq: Options['freq']    // Required: RRule.DAILY, RRule.WEEKLY, etc.
  dtstart: Date            // Required: recurrence start date
} & Partial<Omit<Options, 'freq' | 'dtstart'>>
// Optional: interval, count, until, byweekday, bymonthday, bymonth, etc.
```

### RecurrenceEditScope

```typescript
type RecurrenceEditScope = 'this' | 'following' | 'all'
```

Exported from `@ilamy/calendar/plugins/recurrence`; it is what `EventsChange.scope` holds for a recurring edit.

### Event Type Identification

| Type | Has `rrule` | Has `recurrenceId` | ID pattern |
|------|-------------|-------------------|------------|
| Base event | yes | no | any |
| Generated instance | no | no | `originalId_number` |
| Modified instance | no | yes | any |

Use `isRecurringEvent(event)` to check if an event is part of a recurring series.

## Union Types

`src/types/index.ts`

```typescript
type CalendarView = 'month' | 'week' | 'day' | 'year'
type TimeFormat = '12-hour' | '24-hour'
```

`packages/types/src/index.ts` (`@ilamy/types`)

```typescript
type WeekDays = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'
```

## BusinessHours

`packages/types/src/index.ts` (`@ilamy/types`)

```typescript
interface BusinessHours {
  daysOfWeek?: WeekDays[]        // Default: every day (FullCalendar defaults to Mon-Fri; we do not)
  startTime?: number | string    // Default: 9 (24-hour number, or 'HH:mm' e.g. '09:15')
  endTime?: number | string      // Default: 17 (0 and 24 both mean midnight)
}
```

An `endTime` of `0` means midnight at the **end** of the day, the same instant as `24`, because a picker offering "12 AM" as the closing hour sends the former. Read literally as `00:00` it would close the day before it opened, which left the event form with no selectable time at all. An empty range is therefore one whose end does not follow its start, such as `9` to `9`.

Can be a single object or an array for different hours on different days.
Sub-hour boundaries use `'HH:mm'` strings; fractional numbers are not
supported (they round to the nearest whole hour — `9.25` is NOT 9:15).
Malformed or out-of-range strings (`'9:99'`, `'25:00'`) fall back to the
9/17 defaults; `'24:00'` is a valid end-of-day. A grid slot counts as
business only when it fits entirely inside a single config's range, so on
grids coarser than the boundary (e.g. hour cells with a 9:15 start) the
partial slot is treated as non-business — set `slotDuration` to match the
finest boundary for exact behavior. Ranges are checked independently:
adjacent/touching ranges do not merge, so a slot straddling their seam is
non-business.

## CellClickInfo

`src/features/calendar/types/index.ts`

```typescript
interface CellClickInfo {
  start: dayjs.Dayjs
  end: dayjs.Dayjs
  resourceId?: string | number
  allDay?: boolean
}
```

## EventsChange

`@ilamy/types` (re-exported from `@ilamy/calendar`). Passed to `onEventsChange` once per user action (#309).

```typescript
interface EventsChange {
  action: 'add' | 'update' | 'delete'
  event: CalendarEvent      // the event the user acted on, as it was shown before the change; the changed rows are in updated
  scope?: unknown           // the plugin's scope; RecurrenceEditScope for recurrence
  added: CalendarEvent[]    // the rows onEventAdd receives
  updated: CalendarEvent[]  // the rows onEventUpdate receives
  deleted: CalendarEvent[]  // the rows onEventDelete receives
  delta?: EventDelta        // 'update' only: how far the start moved (zero if it did not)
  endDelta?: EventDelta     // 'update' only: how far the end moved (zero if it did not)
  revert: () => void        // undoes the whole action in the calendar's store; fires no callbacks
}

interface EventDelta {
  days: number          // whole calendar days, in the calendar's zone
  milliseconds: number  // change in the wall-clock time of day
}
```

`delta` is the difference of the two calendar days plus the difference of the two wall-clock times (as
FullCalendar's `diffDayAndTime` counts it, `headless-calendar/src/marker.ts:48-58`, v7.1.1), so a move across
a clock change keeps the event at the same time of day. Both starts are read in the calendar's zone from their
instants. A timed event that became all-day is measured from the start of its own day
(`EventDragging.ts:454`, v7.1.1); an all-day event moved to a timed slot from its midnight start.

`endDelta` is the same measure for the end. A resize from the end edge sets only `endDelta`, a resize from the
start edge only `delta`, and a move sets both to the same amount, except that a timed event moved onto the
all-day row has `delta` measured from the start of its day, so the two can differ. FullCalendar reports a resize through a separate `eventResize`
callback with `startDelta` and `endDelta` (`EventResizing.ts:222-229`, v7.1.1); ilamy reports every action once,
through `onEventsChange` (#309), so `delta` plays the part of `startDelta` and there is no second callback.

`revert` removes `added`, restores the previous version of every row in `updated` and puts `deleted` back
where it was. If a later action edited one of those rows, that edit is overwritten (a store merge, as
FullCalendar's revert is); rows other actions added or changed are kept. Calling it a second time does
nothing. A consumer that controls `events` and has already saved the change reverts its own state instead.

## SlotDuration

`src/features/calendar/types/index.ts`

```typescript
type SlotDuration = number
```

The granularity of a time grid in minutes, and the type of the `slotDuration` prop. It is
`number`, but only a divisor of 60 is drawn: anything else falls back to 60 with one
`console.warn`. The alias is exported so a consumer can name what they thread through their own
components.

`snapDuration` is a plain `number` and is resolved per cell, not once: a cell of the vertical grid is
`slotDuration` long and a column of the horizontal resource timeline is an hour, so `slotDuration={15}`
with `snapDuration={10}` falls back to 15 in the vertical grid (10 does not divide 15) but snaps to 10 in
the hourly horizontal timeline.

## EventSegment

`src/features/calendar/types/index.ts`

Second argument to `renderEvent`. An event longer than the row or day column it
starts in is drawn as one bar per row, and `renderEvent` runs once per bar; this
says which slice the current bar holds.

```typescript
interface EventSegment {
  isStart: boolean
  isEnd: boolean
}
```

`isStart` is `true` when the bar holds the event's real start rather than
resuming a cut one, `isEnd` when it holds the real end rather than running past
it. Both are `true` for an event that fits in one row. The names and their
meaning match FullCalendar's event render hook.

A custom `renderEvent` title does not stick on scroll the way the default one
does. It opts in by reading `--ilamy-sticky-left` / `--ilamy-sticky-top`, which
each grid publishes on its scroll viewport (`src/features/calendar/hooks/use-sticky-insets.ts`).
See "Keeping the title in view" in the website's calendar docs.

## Key File Locations

| Type | File |
|------|------|
| `CalendarEvent`, `WeekDays`, `BusinessHours` | `packages/types/src/index.ts` (`@ilamy/types`) |
| `EventSegment`, `SlotDuration` | `packages/calendar/src/features/calendar/types/index.ts` |
| `IlamyCalendarProps`, `IlamyCalendarPropEvent`, `CellClickInfo`, `CalendarClassesOverride` | `src/features/calendar/types/index.ts` |
| `Resource` | `packages/types/src/index.ts` (`@ilamy/types`) |
| `RRuleOptions`, `RecurrenceEditScope`, `RecurrenceEditOptions` | `src/features/recurrence/types/index.ts` |
| `CalendarView`, `TimeFormat` | `src/types/index.ts` |
| `CalendarContextType` | `src/features/calendar/stores/calendar-context/calendar-context.ts` |
| `Translations`, `TranslatorFunction` | `src/config/translations/types.ts` |
