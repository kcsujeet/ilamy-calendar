# Hooks and Context Architecture

Internal reference for the hook and context system in @ilamy/calendar.

## Dual-Context Architecture

```
IlamyCalendar                              IlamyResourceCalendar
      |                                           |
CalendarProvider                           ResourceCalendarProvider
      |                                           |
CalendarContext                             ResourceCalendarContext
      |                                           |
      +-------------------------------------------+
                          |
              useSmartCalendarContext()
         (auto-detects which context is active)
                          |
              useIlamyCalendarContext()
              (public API — limited surface)
```

Both providers consume `useCalendarContextValue()` (defined in `calendar-context/provider.tsx`) — the single assembly point that calls `useCalendarEngine()` and merges in the presentation props. `ResourceCalendarProvider` spreads that shared value and adds the resource-specific fields on top.

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
| `getEventsForResource` | `((resourceId) => CalendarEvent[]) \| undefined` | Get events for a resource — only present on resource calendars; call as `getEventsForResource?.(id) ?? []` |

**Navigation:**

| Method | Description |
|--------|-------------|
| `setCurrentDate(date)` | Jump to a specific date |
| `selectDate(date)` | Set current date (fires `onDateChange`) |
| `setView(view)` | Switch view (fires `onViewChange`) |
| `nextPeriod()` | Navigate forward by current view unit |
| `prevPeriod()` | Navigate backward by current view unit |
| `today()` | Jump to today |

**Event form:**

| Method | Description |
|--------|-------------|
| `openEventForm(eventData?)` | Open form, optionally pre-filled |
| `closeEventForm()` | Close form and clear selection |

## Internal Hooks

### useSmartCalendarContext()

`src/features/calendar/hooks/use-smart-calendar-context.ts`

Unified internal hook used by all library components. Auto-detects whether the component is inside a `CalendarProvider` or `ResourceCalendarProvider` and returns the appropriate context.

```typescript
// Full context
const ctx = useSmartCalendarContext()

// With selector (avoids unnecessary re-renders)
const { updateEvent } = useSmartCalendarContext((ctx) => ({
  updateEvent: ctx.updateEvent,
}))
```

Returns `SmartCalendarContextType` = `CalendarContextType & Partial<ResourceContextFields>` — the resource-specific fields are honestly optional. In regular calendars they are `undefined`, and the type says so (no cast).

### useCalendarEngine()

`src/hooks/use-calendar-engine.ts`

Engine composer used (through `useCalendarContextValue`) by both providers. Composes four slice hooks from `src/features/calendar/hooks/`, in order, plus the plugin runtime:

1. `useCalendarConfig` — `t()`, `currentLocale` state, `dayMaxEvents`, `businessHours`
2. `pluginRuntime` (`useMemo(createPluginRuntime)`) — the cross-cutting fifth dependency
3. `useCalendarNavigation` — `currentDate`/`view` state, `nextPeriod`/`prevPeriod`/`today`, view-range math. One view-resolution path: `getAllViews()` prepends the built-in `PluginView` specs (`features/calendar/components/views/`) to the plugin views; ranges and navigation steps come from each spec's `range`/`navigationStep`/`navigationUnit` (fallback: month 6x7 grid range, one-day step). See `docs/custom-views.md`.
4. `useCalendarData` — event store, prop sync, CRUD, plugin-scoped mutations (`applyScopedEdit`/`applyScopedDelete`)
5. `useCalendarInteraction` — selection state, `openEventForm`/`closeEventForm` (resource-aware via `OpenEventFormInput`), `handleEventClick`/`handleDateClick`

The locale and timezone effects stay in the composer (not in any slice) because a config-prop trigger mutates navigation AND data state. The engine returns `CalendarEngineReturn & CalendarEngineHandlers`; the providers destructure the two handlers off and surface them as `onEventClick`/`onCellClick`.

### useProcessedDayEvents()

`src/features/calendar/hooks/useProcessedDayEvents.ts`

Computes positioned events for a single day column in day/week views.

```typescript
const positionedEvents = useProcessedDayEvents({
  days,          // dayjs[] — hour slots for this column
  gridType,      // 'day' | 'hour'
  resourceId,    // optional — filter to one resource
})
```

Filters out all-day events (those render in the all-day row). Calls `layoutVertical()` (`lib/layout/vertical.ts`) for layout.

### useProcessedWeekEvents()

`src/features/calendar/hooks/useProcessedWeekEvents.ts`

Computes positioned events for multi-day spans in month/week views.

```typescript
const positionedEvents = useProcessedWeekEvents({
  days,              // dayjs[] — days in the row/week
  allDay,            // filter to all-day only
  resourceId,        // optional resource filter
  gridType,          // 'day' | 'hour'
})
```

Calls `layoutHorizontal()` (`lib/layout/horizontal.ts`) for multi-day row packing with `dayMaxEvents`; the events layer derives pixel offsets from the returned `row`.

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
CalendarProvider (or ResourceCalendarProvider)
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

`src/components/drag-and-drop/calendar-dnd-context.tsx`

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
| `src/hooks/use-calendar-engine.ts` | Engine composer (slices + cross-cutting effects) |
| `src/features/calendar/hooks/use-calendar-config.ts` | Config slice (i18n, locale state, defaults) |
| `src/features/calendar/hooks/use-calendar-navigation.ts` | Navigation slice (date/view, range math) |
| `src/features/calendar/hooks/use-calendar-data.ts` | Data slice (event store, CRUD, scoped mutations) |
| `src/features/calendar/hooks/use-calendar-interaction.ts` | Interaction slice (selection, event form, click handlers) |
| `src/features/calendar/contexts/calendar-context/context.ts` | `CalendarContextType` definition |
| `src/features/calendar/contexts/calendar-context/provider.tsx` | `CalendarProvider` |
| `src/features/resource-calendar/contexts/resource-calendar-context/context.ts` | `ResourceCalendarContextType` |
| `src/features/resource-calendar/contexts/resource-calendar-context/provider.tsx` | `ResourceCalendarProvider` |
| `src/features/calendar/hooks/useProcessedDayEvents.ts` | Day event positioning hook |
| `src/features/calendar/hooks/useProcessedWeekEvents.ts` | Week event positioning hook |
| `src/features/recurrence/hooks/useRecurringEventActions.ts` | Recurring event scope dialog hook |
| `src/components/drag-and-drop/calendar-dnd-context.tsx` | DnD context wrapper |
