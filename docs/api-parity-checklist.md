# API Parity Checklist (vs FullCalendar)

Feature gaps compared to FullCalendar and other mature calendar libraries. Prioritized by impact.

## Tier 1: High-Impact

- [ ] **`revert()` on event drop** — `onEventUpdate` should pass a `revert()` function so consumers can undo a failed server save without re-rendering the entire event list
- [ ] **`oldEvent` in mutation callbacks** — `onEventUpdate`, `onEventDelete` should pass both old and new event state so consumers can diff changes or validate before accepting
- [ ] **Date range selection (`onSelect`)** — Fire callback when user drag-selects a date range (not just single click). Standard UX for creating multi-day events. Requires `selectable` prop
- [ ] **Lazy event loading (`events` as function)** — Allow `events` to be an async function `(range, success, failure) => void` for on-demand fetching. Critical for large datasets
- [ ] **`loading` callback** — `loading(isLoading: boolean)` fires when async event fetch starts/stops. Enables showing a spinner during data loading

## Tier 2: Important for Specific Use Cases

- [ ] **Event resize** — `onEventResize` with delta. User drags event edge to change duration. Currently only drag-to-move is supported
- [ ] **External event dragging** — `onEventReceive` / `onDrop`. Drag elements from outside the calendar onto a cell to create events. Requires interaction with external `@dnd-kit` sources
- [ ] **Pre-validation hooks** — `eventAllow(info) => boolean` and `selectAllow(info) => boolean`. Prevent invalid mutations before they happen (e.g., no events on weekends, no overlaps). Currently mutations are applied immediately with no way to prevent them
- [ ] **`delta` in DnD callbacks** — `onEventUpdate` should include `{ delta: { days: number, hours: number, minutes: number } }` so consumers don't need to manually diff old/new dates
- [ ] **`slotMinTime` / `slotMaxTime`** — Control visible time range independently of business hours. Currently `hideNonBusinessHours` is all-or-nothing

## Tier 3: Polish

- [ ] **`jsEvent` in callbacks** — Include the browser MouseEvent/PointerEvent in `onEventClick`, `onCellClick`, etc. Enables context menus, tooltips, and position-aware UI
- [ ] **`el` (DOM element) in callbacks** — Include the target DOM element in callbacks. Enables highlighting, measuring, and custom positioning
- [ ] **Nav link callbacks** — `onNavLinkDayClick(date)` and `onNavLinkWeekClick(weekStart)`. Customize what happens when clicking day/week numbers in headers (e.g., navigate to day view)
- [ ] **`allDaySlot` toggle** — Allow hiding the all-day row in day/week views
- [ ] **`slotLabelFormat` / `eventTimeFormat`** — Customize time label formatting beyond `12-hour` / `24-hour`
- [ ] **`resourcesSet` callback** — Fire when resources are initialized or changed (analogous to `datesSet` for dates)
- [ ] **Resources as function** — Allow `resources` to be an async function for lazy loading, like the proposed `events` function

## Already Implemented (Parity or Better)

- [x] `onDateChange` with visible range — matches FullCalendar's `datesSet`
- [x] `onDateChange` fires on view switch — standard behavior
- [x] `onCellClick` with `CellClickInfo` including `resourceId` — matches `dateClick`
- [x] `onEventClick` — matches `eventClick`
- [x] `onEventAdd` / `onEventUpdate` / `onEventDelete` — matches `eventAdd` / `eventChange` / `eventRemove`
- [x] `onViewChange` — matches view change callbacks
- [x] Recurring event CRUD with scope (this/following/all) — FullCalendar doesn't have this built-in
- [x] `renderEvent` / `renderResource` / `renderCurrentTimeIndicator` — flexible custom rendering
- [x] `hiddenDays` — hide specific weekdays
- [x] Resource-specific business hours
- [x] `businessHours` with split shifts
- [x] `disableCellClick` / `disableEventClick` / `disableDragAndDrop` — interaction control
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
