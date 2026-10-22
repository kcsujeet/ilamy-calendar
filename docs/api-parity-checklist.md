# API Parity Checklist (vs FullCalendar)

> The plan of record for these items and the rest of the roadmap is `docs/roadmap.md`. Tick items here as they ship.

Feature gaps compared to FullCalendar and other mature calendar libraries. Prioritized by impact.

## Tier 1: High-Impact

- [x] **`revert()` on event drop** — done: `EventsChange.revert()` on `onEventsChange` (3.3.1). Was: `onEventUpdate` should pass a `revert()` function so consumers can undo a failed server save without re-rendering the entire event list
- [x] **`oldEvent` in mutation callbacks** — done as mapped: `EventsChange.event` is the event before the change, i.e. FullCalendar's `oldEvent`; the new rows are in `updated` (3.3.1). Was: `onEventUpdate`, `onEventDelete` should pass both old and new event state so consumers can diff changes or validate before accepting
- [ ] **Date range selection (`onSelect`)** — Fire callback when user drag-selects a date range (not just single click). Standard UX for creating multi-day events. Requires `selectable` prop
- [ ] **Lazy event loading (`events` as function)** — Allow `events` to be an async function `(range, success, failure) => void` for on-demand fetching. Critical for large datasets
- [ ] **`loading` callback** — `loading(isLoading: boolean)` fires when async event fetch starts/stops. Enables showing a spinner during data loading

## Tier 2: Important for Specific Use Cases

- [ ] **Event resize** — `onEventResize` with delta. User drags event edge to change duration. Currently only drag-to-move is supported
- [ ] **External event dragging** — `onEventReceive` / `onDrop`. Drag elements from outside the calendar onto a cell to create events. Requires interaction with external `@dnd-kit` sources
- [x] **`eventAllow(dropInfo, draggedEvent) => boolean`** — vetoes a candidate placement while dragging, with `editable` / `eventStartEditable` and per-event flags (3.3.2). `selectAllow` is still open (4.1.3)
- [x] **`delta` in DnD callbacks** — done: `EventsChange.delta` is `{ days, milliseconds }` on every update (3.3.1). Was: `onEventUpdate` should include `{ delta: { days: number, hours: number, minutes: number } }` so consumers don't need to manually diff old/new dates
- [ ] **`slotMinTime` / `slotMaxTime`** — Control visible time range independently of business hours. Currently `hideNonBusinessHours` is all-or-nothing

## Tier 3: Polish

- [ ] **`jsEvent` in callbacks** — Include the browser MouseEvent/PointerEvent in `onEventClick`, `onCellClick`, etc. Enables context menus, tooltips, and position-aware UI
- [ ] **`el` (DOM element) in callbacks** — Include the target DOM element in callbacks. Enables highlighting, measuring, and custom positioning
- [ ] **Nav link callbacks** — `onNavLinkDayClick(date)` and `onNavLinkWeekClick(weekStart)`. Customize what happens when clicking day/week numbers in headers (e.g., navigate to day view)
- [x] **`allDaySlot` toggle** — done: `allDaySlot={false}` removes the all-day row in day, week and vertical resource views, and all-day events are then not shown there (3.3.7)
- [x] **`slotLabelFormat` / `eventTimeFormat`** — done as `slotHeaderFormat` (FullCalendar v7's name for v6's `slotLabelFormat`), `eventTimeFormat`, `displayEventTime`, `displayEventEnd`, `dayHeaderFormat` and `titleFormat`, all as `Intl.DateTimeFormatOptions` (3.3.6). No format strings, functions or `meridiem`/`omitZeroMinute`; `renderHour` and `renderEvent` cover custom output
- [ ] **`resourcesSet` callback** — Fire when resources are initialized or changed (analogous to `datesSet` for dates)
- [ ] **Resources as function** — Allow `resources` to be an async function for lazy loading, like the proposed `events` function

## Already Implemented (Parity or Better)

- [x] `onDateChange` with visible range — matches FullCalendar's `datesSet`
- [x] `onDateChange` fires on view switch — standard behavior
- [x] `onCellClick` with `CellClickInfo` including `resourceId` — matches `dateClick`
- [x] `onEventClick` — matches `eventClick`
- [x] `onEventAdd` / `onEventUpdate` / `onEventDelete` — matches `eventAdd` / `eventChange` / `eventRemove`
- [x] `onEventsChange` — one callback per user action with every row it touched, like FullCalendar's `eventChange` with `relatedEvents` (#309). It also carries `delta` and `revert()` (3.3.1)
- [x] `onViewChange` — matches view change callbacks
- [x] Recurring event CRUD with scope (this/following/all) — FullCalendar doesn't have this built-in
- [x] `renderEvent` / `renderResource` / `renderCurrentTimeIndicator` — flexible custom rendering
- [x] `slotDuration` (15/30/60 minutes) — matches FullCalendar's `slotDuration` for hour-resolution views
- [x] `hiddenDays` — hide specific weekdays
- [x] Resource-specific business hours
- [x] `businessHours` with split shifts
- [x] `disableCellClick` / `disableEventClick` — interaction control (`disableDragAndDrop` is a deprecated alias of `editable={false}`)
- [x] `firstDayOfWeek` — configurable week start
- [x] Full timezone support via `timezone` prop
- [x] i18n via `translations` / `translator` props

## References

- [FullCalendar eventDrop](https://fullcalendar.io/docs/eventDrop)
- [FullCalendar select callback](https://fullcalendar.io/docs/select-callback)
- [FullCalendar datesSet](https://fullcalendar.io/docs/datesSet)
- [FullCalendar events function](https://fullcalendar.io/docs/events-function)
- [FullCalendar loading](https://fullcalendar.io/docs/loading)
- [FullCalendar eventResize](https://fullcalendar.io/docs/eventResize)
- [FullCalendar external dragging](https://fullcalendar.io/docs/external-dragging)
- [React Big Calendar onRangeChange](https://github.com/jquense/react-big-calendar/pull/641)
