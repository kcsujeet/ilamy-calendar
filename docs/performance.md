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
- `dayEventsMap` — a `Map<string, CalendarEvent[]>` grouped by day, passed to each `GridCell` via the `precomputedEvents` prop

This reduces **48 filter passes to 6** (one per row) plus 6 small per-day groupings over an already-filtered list.

### How It Works

```
HorizontalGridRow
  ├── useProcessedWeekEvents({ days, gridType, resourceId, ... })
  │     ├── events = getEventsForDateRange(weekStart, weekEnd)  ← 1 filter pass
  │     ├── dayEventsMap = group events by day                  ← 1 small pass
  │     └── positionedEvents = getPositionedEvents(events)      ← 1 positioning pass
  │
  ├── GridCell day="Mon" precomputedEvents={dayEventsMap.get("2026-04-06")}
  ├── GridCell day="Tue" precomputedEvents={dayEventsMap.get("2026-04-07")}
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

## Engine Effect Guards

### Problem

`useCalendarEngine` has effects that sync `events`, `locale`, and `timezone` props to internal state. Without guards, these fire on every mount and when values haven't changed, triggering unnecessary re-renders that cascade through all context consumers.

### Solution

Each effect is guarded with a `useRef` to track the previous value and skip when unchanged:

```tsx
const lastTimezoneProp = useRef(timezone)

useEffect(() => {
  if (timezone && timezone !== lastTimezoneProp.current) {
    dayjs.tz.setDefault(timezone)
    setCurrentDate((prev) => prev.tz(timezone))
    setCurrentEvents((prev) => prev.map((e) => ({
      ...e,
      start: e.start.tz(timezone),
      end: e.end.tz(timezone),
    })))
    lastTimezoneProp.current = timezone
  }
}, [timezone])
```

The `isDeepEqual` check on events sync was removed — it performed a recursive deep comparison (including Dayjs value comparisons) on every events prop change. A simple reference check via the `useRef` pattern is sufficient since React's reconciliation already handles referential equality.

## Timezone Reactive Updates

When the `timezone` prop changes, the engine updates both `currentDate` and stored events with `.tz(timezone)`. This is necessary because:

- `dayjs.tz.setDefault()` only affects **new** `dayjs()` calls — it doesn't retroactively change existing Dayjs instances
- Events come from user props and don't get re-created when timezone changes
- Without `.tz()` on stored events, they would display in the original timezone forever

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

### Memoize Callback Props

Callback props like `onEventClick`, `onCellClick`, `renderEvent`, and `businessHours` are included in the context value's dependency array. Unstable references cause the entire context to recompute, triggering re-renders in all consumers:

```tsx
// Bad — new function every render
<IlamyCalendar onEventClick={(event) => handleClick(event)} />

// Good — stable reference
const handleEventClick = useCallback((event) => { ... }, [])
<IlamyCalendar onEventClick={handleEventClick} />
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
