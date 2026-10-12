# Hooks and Context Architecture

Internal reference for the hook and context system in @ilamy/calendar.

## One-Context Architecture

```
IlamyCalendar  (resources? → the resource axis)
      |
CalendarProvider
      |
CalendarContext
      |
useSmartCalendarContext()
      |
useIlamyCalendarContext()
(public API — limited surface)
```

The single provider consumes `useCalendarContextValue()` (defined in `calendar-context/provider.tsx`) — the assembly point that calls `useCalendarEngine()` (which carries the resource axis: `resources`, `orientation`, `weekViewGranularity`, and the resource utilities) and merges in the presentation props. `IlamyResourceCalendar` is a deprecated alias of `IlamyCalendar`.

## Public API

### useIlamyCalendarContext()

`src/features/calendar/hooks/use-smart-calendar-context.ts`

The only hook exported for library consumers. Returns a curated subset of context values.

**State:**

| Field | Type | Description |
|-------|------|-------------|
| `currentDate` | `dayjs.Dayjs` | Currently displayed date |
| `view` | `CalendarView` | Active view (month/week/day/year) |
| `events` | `CalendarEvent[]` | Processed events for current view range |
| `isEventFormOpen` | `boolean` | Whether the event form is open |
| `selectedEvent` | `CalendarEvent \| null` | Currently selected/editing event |
| `selectedDate` | `dayjs.Dayjs \| null` | Currently selected date |
| `firstDayOfWeek` | `number` | First day of week (0=Sun, 1=Mon, ...) |
| `resources` | `Resource[]` | Resources (empty array in regular calendar) |
| `businessHours` | `BusinessHours \| BusinessHours[]` | Business hours config |

**CRUD:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `addEvent` | `(event: CalendarEvent) => void` | Add a new event |
| `updateEvent` | `(eventId, updates) => void` | Update an existing event |
| `deleteEvent` | `(eventId) => void` | Delete an event |
| `refetchEvents` | `() => void` | Fetch the visible range again through an `events` function, whatever `lazyFetching` says; the shown events stay until the new ones arrive. No-op for an array |
| `getEventsForResource` | `(resourceId) => CalendarEvent[]` | Get events for a resource — always defined; returns `[]` on a regular calendar |

**Navigation:**

| Method | Description |
|--------|-------------|
| `setCurrentDate(date)` | Jump to a specific date |
| `selectDate(date)` | Set current date (fires `onDateChange`) |
| `setView(view, date?)` | Switch view, optionally moving to `date` atomically (fires `onViewChange`, then one `onDateChange`) |
| `nextPeriod()` | Navigate forward by current view unit |
| `prevPeriod()` | Navigate backward by current view unit |
| `today()` | Jump to today |
| `scrollToTime(time)` | Scroll the hour grids to `'HH:mm'` or `'HH:mm:ss'`, like the `scrollTime` prop does at the start; the minute lands that far into the hour. No-op in a view without an hour axis (month) |

**From outside the calendar (the `ref`).** `IlamyCalendar` (and the deprecated `IlamyResourceCalendar`) takes `ref?: Ref<IlamyCalendarApi>`, and `ref.current` is exactly the object `useIlamyCalendarContext()` returns: one API, one set of names. It is a regular prop in React 19, so there is no `forwardRef` (https://react.dev/reference/react/forwardRef), and it is published with `useImperativeHandle(ref, createHandle, deps)` (https://react.dev/reference/react/useImperativeHandle). `useCalendarRefHandle` in `ilamy-calendar.tsx` publishes ONE handle for the calendar's life: its methods call, and its values (`currentDate`, `view`, `events`, ...) read, the latest API, so `ref.current.currentDate` is current after a navigation and a callback ref that sets state is called with the same object every time instead of looping. `ref.current.events` holds the events in the visible range, the same as the hook's `events`. Read it in handlers and effects, not while rendering. `scrollToTime` works by publishing a request (`scrollRequest` in the context) that each hour grid's `useScrollToTime` reacts to once; there is no second scroller. It acts on the view that is showing, like FullCalendar's `scrollToTime` (`api/CalendarApi.ts:83` at v7.1.1): a grid ignores requests made before it mounted, and a view without an hour axis drops it. A multi-day horizontal resource timeline looks the time up in its first day only.

Navigation calls may be sequenced inside one event handler (e.g. `selectDate(d)` then `setView('day')`, or two `nextPeriod()` calls): each call sees the previous call's result, and every `onDateChange` emission reflects the latest date + view — never a stale pre-batch value.

**Event form:**

| Method | Description |
|--------|-------------|
| `openEventForm(eventData?)` | Open form, optionally pre-filled |
| `closeEventForm()` | Close form and clear selection |

## Internal Hooks

### useSmartCalendarContext()

`src/features/calendar/hooks/use-smart-calendar-context.ts`

Unified internal hook used by all library components. Reads the one `CalendarContext`.

```typescript
// Full context
const ctx = useSmartCalendarContext()

// With selector (shapes the result only)
const { updateEvent } = useSmartCalendarContext((ctx) => ({
  updateEvent: ctx.updateEvent,
}))
```

The selector does NOT limit re-renders: the hook is `useContext`, so every consumer re-renders whenever any field of the context changes. Hot components that exist once per grid cell read the narrow `useCalendarCellContext()` instead (`features/calendar/hooks/use-calendar-cell-context.ts`; `CalendarCellContextType`: date, view, spacing, business hours, the cell callbacks and flags), which changes only when one of those fields does; an event moving changes none of them. Consumer handlers that only run on events (`onEventUpdate`, `onCellClick`, `onDateChange`, …) pass through `useLatestHandler`, so an inline handler's new identity does not rebuild either context, while the newest handler is still the one called. Render-time callbacks (`getCellClassName`, `isCellDisabled`, `renderEvent`, …) are deliberately not wrapped: cells must re-render to re-run them.

Returns `SmartCalendarContextType` = `CalendarContextType`. The resource utilities (`getEventsForResource`, `getResourceById`, ...) are always defined; `resources` itself is honestly optional (absent on a regular calendar).

### useCalendarEngine()

`src/features/calendar/hooks/use-calendar-engine.ts`

Engine composer used through `useCalendarContextValue`. Composes four slice hooks from `src/features/calendar/hooks/`, in order, plus the plugin runtime:

1. `useCalendarConfig` — `t()`, `currentLocale` state, `dayMaxEvents`, `businessHours`
2. `pluginRuntime` (`useMemo(createPluginRuntime)`) — the cross-cutting fifth dependency
3. `useCalendarNavigation` — `currentDate`/`view` state, `nextPeriod`/`prevPeriod`/`today`, view-range math. One view-resolution path: `getAllViews()` prepends the built-in `PluginView` specs (`features/calendar/components/views/`) to the plugin views; ranges and navigation steps come from each spec's `range`/`navigationStep`/`navigationUnit` (fallback: month 6x7 grid range, one-day step). See `docs/custom-views.md`.
4. `useCalendarData` — event store, prop sync, CRUD, plugin-scoped mutations (`applyScopedEdit`/`applyScopedDelete`), and `useEventsFetcher` (an `events` function: fetch, abort, `loading`, `refetchEvents`). With the recurrence plugin the function must return the series rows (and their overrides and `exdates`) whose recurrence intersects the range, not only rows whose first occurrence overlaps it: the plugin expands a series from its row, so a series left out loses its later occurrences
5. `useCalendarInteraction` — selection state, `openEventForm`/`closeEventForm` (resource-aware via `OpenEventFormInput`), `handleEventClick`/`handleDateClick`

The locale and timezone effects stay in the composer (not in any slice) because a config-prop trigger mutates navigation AND data state. The engine returns `CalendarEngineReturn & CalendarEngineHandlers`; the providers destructure the two handlers off and surface them as `onEventClick`/`onCellClick`.

### useProcessedDayEvents()

`src/features/calendar/hooks/use-processed-day-events.ts`

Computes positioned events for a single day column in day/week views.

```typescript
const positionedEvents = useProcessedDayEvents({
  days,          // dayjs[] — hour slots for this column
  gridType,      // 'day' | 'hour'
  resourceId,    // optional — filter to one resource
})
```

Filters out all-day events (those render in the all-day row). Calls `layoutVertical()` (`features/calendar/utils/layout/vertical.ts`) for layout.

### useProcessedWeekEvents()

`src/features/calendar/hooks/use-processed-week-events.ts`

Computes positioned events for multi-day spans in month/week views.

```typescript
const positionedEvents = useProcessedWeekEvents({
  days,              // dayjs[] — days in the row/week
  allDay,            // filter to all-day only
  resourceId,        // optional resource filter
  gridType,          // 'day' | 'hour'
})
```

Calls `layoutHorizontal()` (`features/calendar/utils/layout/horizontal.ts`) for multi-day row packing with `dayMaxEvents`; the events layer derives pixel offsets from the returned `row`.

### useRecurringEventActions()

`src/features/recurrence/hooks/useRecurringEventActions.ts`

Manages the scope dialog flow for recurring event edits/deletes.

```typescript
const { dialogState, openEditDialog, openDeleteDialog, closeDialog, handleConfirm } =
  useRecurringEventActions(onComplete)
```

- `openEditDialog(event, updates)` — opens scope dialog for edits
- `openDeleteDialog(event)` — opens scope dialog for deletes
- `handleConfirm(scope)` — applies the operation with chosen scope ('this'/'following'/'all')

## Data Flow

```
IlamyCalendar (or IlamyResourceCalendar)
    |
    | Props normalization:
    | - WeekDays[] → Set<number> for hiddenDays
    | - IlamyCalendarPropEvent → CalendarEvent (dates → dayjs)
    |
CalendarProvider
    |
    | useCalendarEngine() creates state + CRUD
    | Context value assembled from engine + props
    |
CalendarDndContext
    |
    | @dnd-kit wrapper: sensors, collision detection, drag handlers
    | Shows RecurrenceEditDialog for recurring event drags
    |
View components (MonthView, WeekView, DayView, YearView)
    |
    | useSmartCalendarContext() reads state
    | useProcessedDayEvents() / useProcessedWeekEvents() for layout
    |
VerticalGrid / HorizontalGrid
    |
    | Renders grid cells + positioned event overlays
```

## DnD System

`src/features/calendar/components/drag-and-drop/calendar-dnd-context.tsx`

`CalendarDndContext` wraps all view components inside the provider.

| Component | Role |
|-----------|------|
| `CalendarDndContext` | @dnd-kit `DndContext` wrapper with sensors and handlers |
| `EventDragOverlay` | Visual overlay shown while dragging |
| `dnd-utils.ts` | `getUpdatedEvent()` — computes new start/end from drop target |
| `RecurrenceEditDialog` | Scope dialog shown when dragging a recurring event |

**Sensors:** `MouseSensor` (2px activation distance), `TouchSensor` (100ms delay, 5px tolerance).

**Collision detection:** `pointerWithin` — matches the cell under the pointer.

**Drop flow:**
1. `handleDragStart` — captures the active event
2. `handleDragEnd` — calls `getUpdatedEvent()` to compute new times
3. If recurring: opens scope dialog, then calls `updateRecurringEvent()`
4. If regular: calls `updateEvent()` directly

**Resize flow:** a resize is a drag whose other end is pinned, run by the same hook. Each bar draws a `ResizeHandle` per resizable edge (`components/draggable-event/resize-handle.tsx`), a draggable of its own with data `{ type: 'calendar-event-resize', edge, granularity, sourceResourceId }`. `useCalendarDrag` reads it on drag start, maps the cell under the pointer through `calculateResizeTimes` (`drag-and-drop/dnd-utils.ts`) instead of `calculateDropTimes`, and commits `{ start, end }` through the same `commitDrop` (so a recurring occurrence opens the scope dialog). A resize that leaves no span, or hovers the other component (all-day row against time grid), shows the original and commits nothing. The consumer's `eventAllow` is asked with the resized range, but not for a resize that changes nothing. `resolveDurationEditable` gates the handles, and dnd-kit mounts when anything can move or resize. The handles are hidden under `@media (hover: none)`: touch-only devices move events but do not resize them. A resize judges closed cells (business hours, `isCellDisabled`, month padding) on the event's own lane at the hovered time.

`CalendarDndContext` mounts dnd-kit only when something can move: when the calendar-level `startEditable` is false (`editable={false}` or the deprecated `disableDragAndDrop`) and no event resolves `startEditable` true it renders children bare (no live region, no droppables). `resolveStartEditable` (`utils/resolve-editability.ts`) decides per event; a bar that cannot move is a plain clickable element with none of dnd-kit's attributes. `eventAllow` is asked in `useCalendarDrag` once per distinct placement, and again from the release itself (cached). A refused placement (a disabled cell or an `eventAllow` veto) draws no mirror and no drop tint, shows the not-allowed cursor, and a release there commits nothing.

## Key Files

| File | Role |
|------|------|
| `src/features/calendar/hooks/use-smart-calendar-context.ts` | Unified context hook + public API hook |
| `src/features/calendar/hooks/use-calendar-engine.ts` | Engine composer (slices + cross-cutting effects) |
| `src/features/calendar/hooks/use-calendar-config.ts` | Config slice (i18n, locale state, defaults) |
| `src/features/calendar/hooks/use-calendar-navigation.ts` | Navigation slice (date/view, range math) |
| `src/features/calendar/hooks/calendar-data/use-calendar-data.ts` | Data slice: composes the hooks beside it |
| `src/features/calendar/hooks/calendar-data/use-event-store.ts` | Stored rows, `events` prop sync, expansion for a date range |
| `src/features/calendar/components/ilamy-calendar.tsx` | Also `useCalendarRefHandle`: publishes the context API on the `ref` prop |
| `src/features/calendar/hooks/calendar-data/use-events-fetcher.ts` | Loads events for the visible range when `events` is a function: lazy refetch rule, abort of superseded fetches, `loading`, failures, `refetchEvents` |
| `src/features/calendar/hooks/calendar-data/use-event-mutations.ts` | Plain add / update / delete |
| `src/features/calendar/hooks/calendar-data/use-plugin-mutations.ts` | Scoped edit / delete through the managing plugin |
| `src/features/calendar/hooks/calendar-data/use-resource-lookups.ts` | Resource filters and lookups over the events in view |
| `src/features/calendar/hooks/calendar-data/event-changes.ts` | Pure helpers: build an `EventsChange` (with its `delta` and `revert`), report a mutation through the callbacks |
| `src/features/calendar/hooks/use-calendar-interaction.ts` | Interaction slice (selection, event form, click handlers) |
| `src/features/calendar/stores/calendar-context/calendar-context.ts` | `CalendarContext` + `CalendarContextType` |
| `src/features/calendar/stores/calendar-cell-context/calendar-cell-context.ts` | `CalendarCellContext` + `CalendarCellContextType` (the cell subset) |
| `src/features/calendar/stores/calendar-cell-context/calendar-cell-provider.tsx` | `CalendarCellProvider` (rendered inside `CalendarProvider`) |
| `src/features/calendar/stores/calendar-context/calendar-provider.tsx` | `CalendarProvider` |
| `src/features/calendar/hooks/use-processed-day-events.ts` | Day event positioning hook |
| `src/features/calendar/hooks/use-processed-week-events.ts` | Week event positioning hook |
| `src/features/recurrence/hooks/useRecurringEventActions.ts` | Recurring event scope dialog hook |
| `src/features/calendar/components/drag-and-drop/calendar-dnd-context.tsx` | DnD context wrapper |
