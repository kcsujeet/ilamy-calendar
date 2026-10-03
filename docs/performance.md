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

### Grouped Columns (Resource Week Horizontal)

Resource week horizontal view uses "grouped" columns where each column contains multiple days (one day's hourly slots). These need their own `useProcessedWeekEvents` call since events are scoped to each day group. The `GroupedColumn` component handles this — it exists as a separate memo'd component because React hooks can't be called inside map callbacks.

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

`pointerWithinLazily` (`lib/utils/pointer-within-lazily.ts`) replaces dnd-kit's `pointerWithin`. It applies the same inclusive point-in-rect test but stops reading a cell's edges once one rules it out, then passes the survivors to `pointerWithin` itself, so hits and ranking are identical. The drag sensors' options are module constants, because dnd-kit's `useSensor` memoizes on the options object's identity.

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
