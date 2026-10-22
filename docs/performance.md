# Performance Guide

This document explains the rendering performance considerations in `@ilamy/calendar` and the architectural decisions behind them.

## Overview

The calendar renders large component trees — a resource month view has 6 resource rows × 30 day cells = 180+ cells, each with event layers and drag-and-drop support. Without optimization, this can cause multi-second renders.

## Row-Level Event Computation Sharing

### Problem

In month view, both GridCells (42 total) and event overlay layers (6 total) independently called `getEventsForDateRange`, totaling **48 filter passes** over all processed events per render.

### Solution

`useProcessedWeekEvents` is called once at the `HorizontalGridRow` level. It returns:

- `positionedEvents` — passed to `HorizontalGridEventsLayer` for the event overlay
- `columnEventsMap` — a `Map<string, CalendarEvent[]>` grouped by the column's own unit (a day, or an hour on an hour grid), passed to each `GridCell` via the `precomputedEvents` prop

This reduces **48 filter passes to 6** (one per row) plus 6 small per-day groupings over an already-filtered list.

### How It Works

```
HorizontalGridRow
  ├── useProcessedWeekEvents({ days, gridType, resourceId, ... })
  │     ├── events = getEventsForDateRange(weekStart, weekEnd)  ← 1 filter pass
  │     ├── columnEventsMap = group events per column           ← 1 small pass
  │     └── positionedEvents = layoutHorizontal(events)         ← 1 positioning pass
  │
  ├── GridCell day="Mon" precomputedEvents={columnEventsMap.get(key(mon))}
  ├── GridCell day="Tue" precomputedEvents={columnEventsMap.get(key(tue))}
  ├── ...                                                       ← no filtering
  │
  └── HorizontalGridEventsLayer positionedEvents={positionedEvents}
                                                                ← no hook call
```

### One Expansion Per Range, One Pass Per Resource Axis

The section above shares work between the cells of a row. A resource calendar has R rows, and each asked `getEventsForDateRange` for the same range, so the plugin chain (`transformEvents`; with recurrence, O(N + series x N)) ran R times per render and again for every row after any add, edit or drag commit. Three pieces now keep the pipeline linear:

- **`useEventStore` keeps the answer per range** (`hooks/calendar-data/use-event-store.ts`). The cache is rebuilt whenever the stored events or the plugin runtime change, keyed on each bound's instant and UTC offset, and holds at most `MAX_CACHED_RANGES` ranges. Callers get the same array back for the same range, so they must not mutate it (none does): `shareInDevBuild` freezes it, and each resource bucket, in a development build, so a mutation throws where it happens; a production build returns the lists as they are. Plugins' `transformEvents` must therefore be pure in `(events, range)`.
- **`bucketEventsByResource`** (`utils/event-buckets.ts`) groups a range's events by resource in one pass (the `filterEventsForResource` membership rule: `resourceIds` wins over `resourceId`, `0` is a real id). It is keyed on the events array, so the R rows reading one range share one O(N) pass and each takes its bucket. `useProcessedWeekEvents` and `useProcessedDayEvents` read it through `getResourceEvents`.
- **`getColumnBounds`** reads a column's `startOf`/`endOf` once per Dayjs instance and default zone (a `WeakMap`; an instance with no zone of its own is bounded in the zone `dayjs.tz.setDefault` last set, which `getDefaultZone()` reads once per row), and `bucketEventsByColumn` tests each event against plain instants, the `overlapsRange` rule without a zone conversion per column. Resource rows are built from the same column instances (`resourceHorizontalRows`), so row 2 onwards reads the bounds row 1 computed.

The recurrence plugin groups overrides by series once per events array (`getOverridesBySeries` in `generate-recurring-events.ts`) instead of filtering the whole list for every series, so an expansion is O(N + series), not O(series x N).

Measured with Bun micro-benchmarks, one full render of every row (see the dev log of the change for the scripts): 500 rows x 5,200 events / 200 daily series fell from about 3,050 ms (before) to about 9 ms, and 100 rows x 168 hour columns x 10 events in `America/New_York` from about 5,600 ms to about 10 ms.

### Grouped Columns (Resource Week Horizontal)

Resource week horizontal view uses "grouped" columns where each column contains multiple days (one day's hourly slots). These need their own `useProcessedWeekEvents` call since events are scoped to each day group. The `GroupedColumn` component handles this — it exists as a separate memo'd component because React hooks can't be called inside map callbacks.

## Hour Rows Are Derived Once Per Day

`getDayHours` used to parse a wall-clock string and call `.tz()` for each of the 24 rows (about 45 us each, 1.8 to 3.1 ms a day, against 0.06 to 0.11 ms before). The vertical resource week asked for that once per resource per day, so 50 resources cost over a second a render.

The rule: **a day's hour rows are derived once per day, not parsed per row, and a view builds each visible day's rows once per render, not once per resource.**

- `getDayHours` parses only the day's first row and moves it on by whole hours, falling back to one parse per row only on a day near a clock change (`docs/time-grid.md`).
- `resourceWeekVerticalColumns` builds one hour list per visible day and every resource's column shares it; the resources' business hours are collected once per render and passed in, not re-collected per day.
- `ViewRenderer` memoizes the header element on `[view, currentDate, config]`, like the column specs, so a context change that touches neither does not rebuild the header's rows.

`bun scripts/bench-day-hours.tsx` (run it under `TZ=UTC` and `TZ=America/New_York America/New_York`) exits non-zero when building every column of a 50-resource vertical week exceeds 10 ms, or `getDayHours` exceeds 0.25 ms a day.

## Event Key Strategy

Event wrapper elements use `event.id + resourceId` as React keys rather than including date/position information. This ensures that recurring events (like "Daily Standup") that persist across month navigation **reconcile** instead of unmounting/remounting. This avoids unnecessary `useDraggable` re-registration cascades through DndContext.

```tsx
// Good — stable across navigation
const eventKey = `${event.id}-${resourceId ?? 'no-resource'}`

// Avoid — changes on every navigation, forces remount
const eventKey = `${event.id}-${position}-${weekStart.toISOString()}-${resourceId}`
```

## Cell Key Strategy

Every grid cell is a `@dnd-kit/core` droppable, and dnd-kit copies its whole droppable map on each register and unregister (`core.esm.js` `RegisterDroppable`/`UnregisterDroppable`, v6.3.1). Registering N cells is therefore O(N²), so a cell must never remount just because the date it shows changed (#300).

- Cells, columns and rows are keyed by **position** (`keys.listKey('col', index)`), or by resource id for a resource row. Never by date: navigation then hands each kept cell its new date as a prop.
- `DroppableCell` takes its droppable id from `useId()`, not from its date. The drop reads the date from the droppable's `data`, which `useDroppable` refreshes on every render.
- No container above the cells is keyed by the date either. `HorizontalGrid` once keyed its body by `currentDate.format('YYYY-MM')`, which remounted every cell on each new month.

`navigation keeps every cell mounted (#300)` in `ilamy-calendar.test.tsx` covers every view and orientation; the e2e harness checks the same in a real browser.

## Engine Effect Guards

### Problem

`useCalendarEngine` has effects that sync `events`, `locale`, and `timezone` props to internal state. Without guards, these fire on every mount and when values haven't changed, triggering unnecessary re-renders that cascade through all context consumers.

### Solution

Each effect is guarded with a `useRef` to track the previous value and skip when unchanged:

```tsx
// Seed with `undefined`, never with the prop — see the warning below.
const lastTimezoneProp = useRef<string | undefined>(undefined)

useEffect(() => {
  if (timezone !== lastTimezoneProp.current) {
    dayjs.tz.setDefault(timezone)
    const toCalendarZone = (date: Dayjs) =>
      timezone ? date.tz(timezone) : date.local()
    setCurrentDate(toCalendarZone)
    setCurrentEvents((prev) => prev.map((e) => ({
      ...e,
      start: toCalendarZone(e.start),
      end: toCalendarZone(e.end),
    })))
    lastTimezoneProp.current = timezone
  }
}, [timezone])
```

> **A guard that skips mount is a bug, not an optimization.** This effect used to
> seed the ref with the prop (`useRef(timezone)`) and test `if (timezone && …)`.
> Both parts silently disabled it: seeding with the prop makes the guard false on
> the mount render, so `dayjs.tz.setDefault` never ran unless the prop later
> changed, and the truthiness test meant removing the prop never restored the
> machine's zone (#247). Guard against *unchanged* values, not against the first
> value. When adding a guard here, check that a fresh mount still does its work.

The `isDeepEqual` check on events sync was removed — it performed a recursive deep comparison (including Dayjs value comparisons) on every events prop change. A simple reference check via the `useRef` pattern is sufficient since React's reconciliation already handles referential equality.

## Narrow Cell Context

Grid cells read `CalendarCellContext` (`features/calendar/stores/calendar-cell-context/`), a memoized subset of the calendar context: the date, view, spacing, business hours and the cell callbacks and flags. An event change rebuilds the full context but not this one, so it no longer re-renders every time slot. Cells that draw events (`grid-cell-events.tsx`) still read the full context.

## Recurrence Expansion Cache

`generateRecurringEvents` keeps a memo per series, in a `WeakMap` keyed on the event object and rebuilt when its `rrule`, `start` or UNTIL changes. It walks the rule once over the requested range plus 42 days either side (`WINDOW_MARGIN_DAYS`) and answers every column and nearby navigation from that window, filtering it exactly as rrule's `between()` does. Converted instants are cached too, up to 4096 per series (`MAX_MEMOIZED_OCCURRENCES`), after which the cache starts over.

## Hit-Testing During a Drag

`pointerWithinLazily` (`features/calendar/utils/pointer-within-lazily.ts`) replaces dnd-kit's `pointerWithin`. It applies the same inclusive point-in-rect test but stops reading a cell's edges once one rules it out, then passes the survivors to `pointerWithin` itself, so hits and ranking are identical. The drag sensors' options are module constants, because dnd-kit's `useSensor` memoizes on the options object's identity.

## Placing Events on a Row's Columns

`layoutHorizontal` (and the day-grid branch of `layoutVertical`) places an event by measuring it against the row's columns. Doing that per event, per column, is O(events x columns) and builds Dayjs objects in the hot loop, which is costly: a zone-aware `startOf` is about ten times a plain one, and an hour axis has 168 columns.

The columns are measured **once per layout call** instead (`utils/layout/day-columns.ts`, `hour-columns.ts`), into plain millisecond arrays, and each event is then placed by binary search (`column-search.ts`), O(events x log columns), with no Dayjs created per event:

- **Day axis.** Each column's day is the half-open range `[dayStart, dayEnd)`. The first column an event reaches is the first whose day ends after the event starts; the last is the last whose day starts at or before the event's last instant (`end` is exclusive, #248). Truncation is whether those columns' days lie beyond the event's. Each `dayStart` is the column's own `startOf('day')`, once per column per layout: a column must never be trusted to read midnight, because `getWeekDays`/`getMonthWeeks` build columns with `.add(n, 'day')` and in a clock-change week they carry a stale offset, read midnight and sit an hour off it (a shortcut that trusted them put all-day bars one column too wide, covered by the `getMonthWeeks` tests in `horizontal.test.ts` and `clock-change-week.spec.ts`). A day ends where the next column's starts unless a hidden day (or the grid's end) follows.
- **Hour axis.** Each column is its wall-clock reading in ms (`wall-clock.ts`, the same reading as `wallClockDiff`, #311). The columns an event overlaps are one run in clock order, found by two searches. On a day the clocks change, two columns can share an instant and the later one wins, as before.
- **Multi-unit or single-unit** (which loop places the event) comes out of the same measurements, so the old per-event `startOf`/`subtract` is gone too. Only an hour-axis event that straddles a clock change still asks dayjs.

Measured with `bun` micro-benchmarks (minimum of 4 runs, busy machine), ms:

| Scenario | main, no tz | stack before, no tz | now, no tz | main, New York | stack before, New York | now, New York |
|---|---|---|---|---|---|---|
| hour axis, 500 rows x 3 events | 28.9 | 288.7 | 10.2 | 544.1 | 523.3 | 10.4 |
| hour axis, 100 events in one row | 1.6 | 19.1 | 0.13 | 33.2 | 34.5 | 0.13 |
| day axis, 7 cols, 500 rows x 5 events | 31.1 | 42.1 | 7.5 | 864.5 | 1336.1 | 169.3 |
| resource month, 31 cols, 100 rows x 31 events | 40.7 | 153.5 | 5.3 | 1050.5 | 4758.5 | 136.5 |

A change here must keep the layout tests passing and not call `startOf`, `diff` or `wallClockDiff` per event.

## Timezone Reactive Updates

When the `timezone` prop changes, the engine updates both `currentDate` and stored events with `.tz(timezone)`. This is necessary because:

- `dayjs.tz.setDefault()` only affects **new** `dayjs()` calls — it doesn't retroactively change existing Dayjs instances
- Events come from user props and don't get re-created when timezone changes
- Without `.tz()` on stored events, they would display in the original timezone forever
- The same applies on **mount**, not just on change: the first render resolves dates before this effect runs, so the conversion is what puts them on the calendar's clock. That is the tradeoff for keeping the global write out of render, where it would also execute during SSR. See `docs/timezones.md`.

## Tips for Consumers

### Memoize Event Arrays

The calendar compares event arrays by reference. If you create a new array on every render, the engine re-processes all events:

```tsx
// Bad — new array every render
<IlamyCalendar events={events.map(e => ({ ...e }))} />

// Good — stable reference
const memoizedEvents = useMemo(() => normalizeEvents(events), [events])
<IlamyCalendar events={memoizedEvents} />
```

### Event Handlers Can Be Inline

Handlers the calendar calls in response to an action (`onEventAdd`, `onEventUpdate`, `onEventDelete`, `onEventsChange`, `onEventClick`, `onCellClick`, `onDateChange`, `onViewChange`, `onMoreEventsClick`) go through `useLatestHandler` (`use-calendar-engine.ts`, `calendar-provider.tsx`): their identity never changes and they always call your newest function, so an inline handler does not rebuild the context.

### Memoize Render-Time Callbacks

Callbacks the calendar calls while rendering (`renderEvent`, `getCellClassName`, `isCellDisabled`) are not wrapped, so a new output shows up as soon as it changes. Their identity is a dependency: a new function every render recomputes the context and re-renders the cells that read it.

```tsx
// Bad — new function every render
<IlamyCalendar getCellClassName={(info) => classFor(info)} />

// Good — stable reference
const getCellClassName = useCallback((info) => classFor(info), [])
<IlamyCalendar getCellClassName={getCellClassName} />
```

### Business Hours as a Constant

If your business hours don't change, define them outside the component or memoize:

```tsx
// Good — defined outside component, stable reference
const BUSINESS_HOURS = [
  { daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], startTime: 9, endTime: 17 }
]

function MyCalendar() {
  return <IlamyCalendar businessHours={BUSINESS_HOURS} />
}
```
