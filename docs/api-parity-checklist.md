# API Parity Checklist (vs FullCalendar)

> The plan of record for these items and the rest of the roadmap is `docs/roadmap.md`. Tick items here as they ship.

Feature gaps compared to FullCalendar and other mature calendar libraries. Prioritized by impact.

## Tier 1: High-Impact

- [x] **`revert()` on event drop** — done: `EventsChange.revert()` on `onEventsChange` (3.3.1). Was: `onEventUpdate` should pass a `revert()` function so consumers can undo a failed server save without re-rendering the entire event list
- [x] **`oldEvent` in mutation callbacks** — done as mapped: `EventsChange.event` is the event before the change, i.e. FullCalendar's `oldEvent`; the new rows are in `updated` (3.3.1). Was: `onEventUpdate`, `onEventDelete` should pass both old and new event state so consumers can diff changes or validate before accepting
- [ ] **Date range selection (`onSelect`)** — Fire callback when user drag-selects a date range (not just single click). Standard UX for creating multi-day events. Requires `selectable` prop
- [x] **Lazy event loading (`events` as function)** — done as `events` accepting `(info, { signal }) => Promise<Event[]>` (3.3.8); `lazyFetching`, `onEventsError` and `refetchEvents()` come with it. Cut: multiple event sources and JSON-feed URLs. Was: allow `events` to be an async function for on-demand fetching
- [x] **`loading` callback** — done: `loading(isLoading)` fires when a fetch starts and when none is in flight any more (3.3.8). Was: enables showing a spinner during data loading

- [x] **Imperative `ref` API** — done as `ref` on `IlamyCalendar` whose `current` is the `useIlamyCalendarContext()` object, plus `scrollToTime(time)` (3.3.9). Ilamy's names are kept (`setCurrentDate`, `nextPeriod`, `setView`, ...). Cut: `getEventById` (find it in `events`), `select`/`unselect` (4.1.3). Was: control the calendar from outside it

## Tier 2: Important for Specific Use Cases

- [x] **Event resize** — the user drags an event's end edge (and the start edge with `eventResizableFromStart`) to change its duration, gated by `eventDurationEditable` / per-event `durationEditable` (3.3.3). Reported through `onEventsChange` with `delta` and `endDelta`, not a separate `onEventResize`
- [ ] **External event dragging** — `onEventReceive` / `onDrop`. Drag elements from outside the calendar onto a cell to create events. Requires interaction with external `@dnd-kit` sources
- [x] **`eventAllow(dropInfo, draggedEvent) => boolean`** — vetoes a candidate placement while dragging, with `editable` / `eventStartEditable` and per-event flags (3.3.2). `selectAllow` is still open (4.1.3)
- [x] **`delta` in DnD callbacks** — done: `EventsChange.delta` is `{ days, milliseconds }` on every update (3.3.1). Was: `onEventUpdate` should include `{ delta: { days: number, hours: number, minutes: number } }` so consumers don't need to manually diff old/new dates
- [x] **`slotMinTime` / `slotMaxTime`** — done: `'HH:mm'` bounds on the visible clock range of the hour grids, independent of business hours; the end is exclusive and both stay within one day (3.3.4). Was: control visible time range independently of business hours, when `hideNonBusinessHours` was all-or-nothing

## Tier 3: Polish

- [ ] **`jsEvent` in callbacks** — Include the browser MouseEvent/PointerEvent in `onEventClick`, `onCellClick`, etc. Enables context menus, tooltips, and position-aware UI
- [ ] **`el` (DOM element) in callbacks** — Include the target DOM element in callbacks. Enables highlighting, measuring, and custom positioning
- [ ] **Nav link callbacks** — `onNavLinkDayClick(date)` and `onNavLinkWeekClick(weekStart)`. Customize what happens when clicking day/week numbers in headers (e.g., navigate to day view)
- [x] **`allDaySlot` toggle** — done: `allDaySlot={false}` removes the all-day row in day, week and vertical resource views, and all-day events are then not shown there (3.3.7)
- [x] **`slotLabelFormat` / `eventTimeFormat`** — done as `slotHeaderFormat` (FullCalendar v7's name for v6's `slotLabelFormat`), `eventTimeFormat`, `displayEventTime`, `displayEventEnd`, `dayHeaderFormat` and `titleFormat`, all as `Intl.DateTimeFormatOptions` (3.3.6). No format strings, functions or `meridiem`/`omitZeroMinute`; `renderHour` and `renderEvent` cover custom output
- [x] **`resourcesSet` callback** — done: `resourcesSet(resources)` fires after the list is set and after every change (an array prop whose content changed, or a fetch result), not on a re-render that changes nothing (3.3.10)
- [x] **Resources as function** — done as `resources` accepting `(info, { signal }) => Promise<Resource[]>`; `refetchResourcesOnNavigate`, `onResourcesError` and `refetchResources()` come with it (3.3.10). Cut: JSON-feed URLs and the `(fetchInfo, success, failure)` callback form

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
- [x] `slotDuration` (`15 | 30 | 60`) and `snapDuration` (`15 | 30`, finer than the cell, for drag, resize and drag-to-create, vertical grid and horizontal resource timeline) — FullCalendar's `slotDuration`/`snapDuration` for hour-resolution views; `slotLabelInterval`/`slotHeaderInterval` and slots longer than an hour are cut, as are other slot and snap sizes (see roadmap 3.3.5)
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
