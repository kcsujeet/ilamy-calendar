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
4. `useCalendarData` — event store, prop sync, CRUD, plugin-scoped mutations (`applyScopedEdit`/`applyScopedDelete`)
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

If `disableDragAndDrop` is `true`, `CalendarDndContext` renders children without any DnD wrapper.

## Key Files

| File | Role |
|------|------|
| `src/features/calendar/hooks/use-smart-calendar-context.ts` | Unified context hook + public API hook |
| `src/features/calendar/hooks/use-calendar-engine.ts` | Engine composer (slices + cross-cutting effects) |
| `src/features/calendar/hooks/use-calendar-config.ts` | Config slice (i18n, locale state, defaults) |
| `src/features/calendar/hooks/use-calendar-navigation.ts` | Navigation slice (date/view, range math) |
| `src/features/calendar/hooks/calendar-data/use-calendar-data.ts` | Data slice: composes the hooks beside it |
| `src/features/calendar/hooks/calendar-data/use-event-store.ts` | Stored rows, `events` prop sync, expansion for a date range |
| `src/features/calendar/hooks/calendar-data/use-event-mutations.ts` | Plain add / update / delete |
| `src/features/calendar/hooks/calendar-data/use-plugin-mutations.ts` | Scoped edit / delete through the managing plugin |
| `src/features/calendar/hooks/calendar-data/use-resource-lookups.ts` | Resource filters and lookups over the events in view |
| `src/features/calendar/hooks/calendar-data/event-changes.ts` | Pure helpers: build an `EventsChange`, report a mutation through the callbacks |
| `src/features/calendar/hooks/use-calendar-interaction.ts` | Interaction slice (selection, event form, click handlers) |
| `src/features/calendar/stores/calendar-context/calendar-context.ts` | `CalendarContext` + `CalendarContextType` |
| `src/features/calendar/stores/calendar-cell-context/calendar-cell-context.ts` | `CalendarCellContext` + `CalendarCellContextType` (the cell subset) |
| `src/features/calendar/stores/calendar-cell-context/calendar-cell-provider.tsx` | `CalendarCellProvider` (rendered inside `CalendarProvider`) |
| `src/features/calendar/stores/calendar-context/calendar-provider.tsx` | `CalendarProvider` |
| `src/features/calendar/hooks/use-processed-day-events.ts` | Day event positioning hook |
| `src/features/calendar/hooks/use-processed-week-events.ts` | Week event positioning hook |
| `src/features/recurrence/hooks/useRecurringEventActions.ts` | Recurring event scope dialog hook |
| `src/features/calendar/components/drag-and-drop/calendar-dnd-context.tsx` | DnD context wrapper |
