# Drag-to-create (time-range selection) plan

**Issue:** [#209](https://github.com/kcsujeet/ilamy-calendar/issues/209) — on week/day
views, press on an empty cell, drag across cells, release to open the event
editor preselected with the dragged time range.

**Owner note (issue thread):** "plugin is the way to go" + keep core minimal.
This plan does exactly that: the only core change is two-to-four data attributes
on the shared cell; all selection / mirror / create logic lives in the plugin
(see section 4).

**Status:** Proposal. Master plan; each phase should spawn a bite-sized TDD plan
when picked up.

---

## 1. Feature spec (FullCalendar parity)

Reference: FullCalendar [selectable](https://fullcalendar.io/docs/selectable) and
its date-selection callbacks. The pieces we want:

- **`selectable`** — turns drag-to-select on (default off).
- **`select(start, end, allDay)`** — fires when a range is chosen. This is the
  hook the create behavior listens to.
- **`selectMirror`** — the visual highlight rendered under the pointer during the
  drag.
- **`selectMinDistance`** — minimum drag distance before a selection starts, so a
  plain click still reads as a single-cell click, not a 1-cell selection.
- **`selectAllow(range)`** — predicate to reject a selection (e.g. outside
  business hours).
- **`unselect()`** — clears the selection (Escape, click elsewhere).
- **`dateClick` vs `select`** — single click and drag-select stay distinct.

For #209, "create on select" = on `select`, open the event form preselected with
`{ start, end, allDay }`.

---

## 2. What we already have (and why that matters)

- **Cells already know their own time span.** `DroppableCell`
  (`packages/calendar/src/components/droppable-cell.tsx`) takes `date`, `hour?`,
  `minute?` and computes `{ start, end }` per slot (15-min day / 1-hour week /
  full-day month) via the core's DST-aware hour mapping (`docs/time-grid.md`,
  `utils/view-hours.ts`). So a drag from cell A to cell B is just
  `{ start: A.start, end: B.end }` — no new time math, and DST/business-hours
  correctness comes for free.
- **There is an overlay precedent.** `vertical-grid-events-layer.tsx` is an
  absolutely-positioned layer over the time columns. A selection mirror is a
  sibling layer drawn the same way.
- **`openEventForm(input: OpenEventFormInput)`** (context API, `OpenEventFormInput
  = Partial<CalendarEvent> & {…}`) already opens the editor with a partial event,
  so passing `{ start, end }` preselects the range.
- **`isCellDisabled(info)`** already marks non-interactive cells, so selection can
  reuse it to reject disabled slots.

## 3. The gap

- **No pointer/selection interaction.** Cells fire `onCellClick` (single cell)
  only. Nothing tracks pointerdown to drag to pointerup, and nothing distinguishes
  a drag from a click.
- **No grid-level mount point.** The slot catalog
  (`components/calendar-slots.tsx`) has only `SLOT_EVENT_FORM` and
  `SLOT_EVENT_MUTATION_SCOPE` (both dialog-level). A mirror overlay has nowhere to
  mount from a plugin.
- **Plugins have no pointer hook.** `IlamyPlugin` exposes `renderSlot`,
  `provider`, `views`, `contribute` — none give per-cell pointer events or grid
  geometry. This is why a pure-plugin attempt "touches 4 files" (issue comment):
  the plugin has to reach into grid internals.

## 4. Decision: minimal core, plugin owns everything

Goal (owner): keep core as small as possible. So core gains **no "selection"
concept, no pointer API, no new prop or callback**. The only core change makes
cells **self-describing** so a plugin can do the whole feature from the DOM plus
the existing public API.

### The single core change: self-describing cells
`DroppableCell` already builds the full `CellInfo` for its slot
(`{ start, end, resource, allDay }`, droppable-cell.tsx). Expose that as stable
data attributes so a plugin can reconstruct it from the DOM:

```tsx
<DroppableCell
  data-start={start.toISOString()}
  data-end={end.toISOString()}
  data-resource-id={resourceId}   // only on resource calendars
  data-all-day={allDay || undefined}
  ...
/>
```

Generic (any plugin/consumer can hit-test the grid), reusable, zero
feature-specific logic. This is the stable contract the plugin reads, instead of
parsing internal `data-testid` formats. The plugin reads these off the cell under
the pointer and rebuilds a `CellInfo` (resolving `resourceId` to the full
`Resource` via the public `resources` from `useIlamyCalendarContext`). The
existing `data-disabled` covers skipping unavailable cells.

### Everything else lives in the plugin
The plugin uses only its `provider` hook + public `useIlamyCalendarContext` + the
DOM:

- **Pointer tracking:** the plugin's `provider` mounts an effect that attaches
  `pointerdown` to the calendar root. It acts only on the **primary button**
  (`event.button === 0` / `isPrimary`) and only if `target.closest('[data-start]')`
  exists. Pointerdown on an event hits the events layer (a sibling over the
  columns, not a child of a cell), so `closest('[data-start]')` is null and a drag
  never starts there. That satisfies "empty cell, not one with an event" for free.
  Use `setPointerCapture` and track a single `pointerId`; clean up on
  `pointerup` AND `pointercancel` / `lostpointercapture` / window `blur` so a
  missed `pointerup` (drag out of window, alt-tab) never leaves a stuck selection.
- **Drag vs click:** the plugin applies its own `minDistance` threshold before
  activating; below it, it does nothing and the cell's own `onCellClick` fires.
- **Hit-testing during drag:** on `pointermove`, `document.elementFromPoint(x, y)`
  then `.closest('[data-start]')` gives the cell under the pointer; read
  `data-start`/`data-end` for the range. The mirror is `pointer-events: none` so
  it never intercepts the hit-test.
- **Mirror:** rendered as a portal positioned from the start/end cells'
  `getBoundingClientRect()`. No core overlay slot needed.
- **Commit:** on `pointerup`, the plugin calls `openEventForm({ start, end })`
  (with `allDay` when the drag is on the all-day row). Reverse drags normalized in
  the plugin.

Net core footprint: **two data attributes on one component.** No `selectable`
prop, no `select` callback, no slot, no plugin pointer hook. All
selection/mirror/create logic is in the plugin, which depends only on
`@ilamy/calendar`'s public API + the DOM (respects `.agents/rules/architecture.md`).

### Mirror placement: in-grid overlay slot (recommended once auto-scroll is in)
A `document.body` portal positioned from `getBoundingClientRect()` detaches from
the cells as soon as the grid scrolls (including auto-scroll during a drag). So
add one generic grid-overlay slot (`SLOT_TIME_GRID`) rendered INSIDE the grid's
scroll container and draw the mirror there: it scrolls with the content for free,
no per-scroll recomputation. Still generic (not selection-specific). A body portal
is fine only for a no-auto-scroll MVP; the slot is the real target.

### Trade-off accepted
The plugin re-derives ranges from the DOM rather than calling core's DST mapping.
That is fine: the cells already encode the correct `start`/`end` (computed by
core), so the plugin reads correct values without redoing the math. Core's only
job is keeping those attributes accurate, which it already does.

### Disambiguating intent (cell click vs event drag vs cell drag-select)
Three gestures all begin with pointerdown. They are made exclusive by **target
first, then movement** — and the existing DOM already routes by target:

- The events layer container is `pointer-events-none` and each event is
  `pointer-events-auto` (`vertical-grid-events-layer.tsx`). So pointerdown on
  empty space passes THROUGH to the cell; pointerdown on an event is captured by
  the event. Cells (droppable, not draggable) never start a `@dnd-kit` drag.

Resulting routing:

| Gesture | pointerdown target | movement | Result |
|---|---|---|---|
| Event move/resize | an event | ≥ `@dnd-kit` constraint (mouse `distance: 2`; touch `delay: 100`+`tolerance: 5`) | `@dnd-kit` drag |
| Event click (open) | an event | below constraint | `onEventClick` |
| Cell click (single create) | empty cell | below the plugin threshold | `onCellClick` (existing) |
| Cell drag-select (range create) | empty cell | ≥ the plugin threshold | plugin `onSelect`, trailing click suppressed |

Why they cannot fire together:
- **Event vs cell gestures** are disjoint by target: `@dnd-kit` only activates on
  draggables (events); the plugin gates on `target.closest('[data-start]')`, which
  is null for an event (events live in the events layer, not inside a cell). So a
  pointerdown is owned by exactly one of the two systems.
- **Cell click vs cell drag-select** share the empty-cell target, so they are
  split by movement: below the plugin's distance threshold the plugin stays
  dormant and the browser's synthesized `click` fires `onCellClick`; at/above it
  the plugin activates, and on pointerup it **suppresses the trailing click** with
  a one-shot capture-phase `click` handler (`stopImmediatePropagation()` +
  `preventDefault()`) so `onCellClick` does not also fire.

Implementation notes:
- Match the plugin's mouse distance threshold to `@dnd-kit`'s (`distance: 2`) so
  click-vs-drag feels identical whether you start on an event or an empty cell.
- The suppression handler is armed only for the gesture that actually activated a
  selection, then removed, so normal clicks are never swallowed.
- Touch is the sharp edge: a finger drag on empty cells can read as a scroll. Mirror
  `@dnd-kit`'s touch model (a short press-delay before selection activates, e.g.
  ~100ms, and `touch-action: none` on cells only while a selection is active) so
  scrolling still works and selection is deliberate. Covered in Phase 3.

---

## 5. Phased plan (minimal-core)

### Phase 1 — Self-describing cells (the only core change)
- Add to `DroppableCell` (`packages/calendar/src/components/droppable-cell.tsx`),
  all sourced from the `CellInfo` it already builds: `data-start` / `data-end`
  (ISO, from `getCellTimeRange`), `data-resource-id` (only when `resourceId` is
  set), `data-all-day` (only when `allDay`). Applies to every view via the shared
  cell.
- **Tests:** a day cell exposes a 15-min range, a week cell a 1-hour range, a
  month cell a full-day range (correct ISO, incl. a DST day); a resource cell
  carries `data-resource-id`; an all-day cell carries `data-all-day`.

### Phase 2 — The drag-to-create plugin
- New plugin package `@ilamy/calendar-dragcreate`, shipped as a subpath like
  recurrence/agenda (private workspace package, bundled into the published
  `@ilamy/calendar`, exposed at `@ilamy/calendar/plugins/dragcreate`).
- Plugin `provider` attaches the pointer listeners, applies the distance
  threshold, hit-tests cells via `elementFromPoint` + `[data-start]`, renders the
  mirror portal (`pointer-events: none`), normalizes reverse drags, builds a
  `CellInfo` from the start/end cells' data attributes (resolving
  `data-resource-id` to a `Resource` via the public `resources`), and on release
  calls the default `openEventForm({ start, end, allDay, resourceId })` from
  `useIlamyCalendarContext`. Sole option: `{ onSelect? }` (see Plugin API below).
  Drag stays within one resource column (clamp on column change), so the selection
  carries a single resource.
- Reads only the public API; no core internals (`.agents/rules/architecture.md`).
- **Tests:** with the plugin registered, a multi-cell drag opens the event form
  preselected with the dragged range; a click under `minDistance` does NOT open it
  and the normal `onCellClick` still fires; pointerdown on an existing event does
  not start a drag; reverse drag normalizes start/end.

#### Plugin API (one option; the rest is YAGNI until asked)
`dragCreatePlugin(options)` — keep the surface tiny. Issue #209 needs exactly one
thing (drag, open the editor with the range), so the only public option is the
extensibility hook the owner asked for:

- `onSelect?(selection, ctx)` — fires on a committed drag. **`selection` is a
  `CellInfo`** (`{ start, end, resource?, allDay? }`), the same shape `onCellClick`
  already gives consumers, just spanning the dragged range (start = first cell's
  start, end = last cell's end, `resource` = the dragged column's resource on a
  resource calendar, `allDay` when the drag is on the all-day row). `ctx` is
  `{ openEventForm }`. **Omitted:** the default opens the event form with the
  range, passing the resource through:
  `openEventForm({ start, end, allDay, resourceId: selection.resource?.id })` (so
  the new event lands on the right resource, matching the #213 form behavior).
  **Provided:** it replaces the default. Call `ctx.openEventForm(...)` to still
  open the form, or do anything else (custom modal, direct `addEvent`, analytics).

  Reusing `CellInfo` (not a bespoke `{ start, end, allDay }`) keeps the selection
  payload consistent with `onCellClick`/`isCellDisabled`: consumers learn one cell
  shape, and resource calendars get resource info for free.

Kept internal (not options): the click-vs-drag distance threshold (a constant; a
click must still fire `onCellClick`, not a 1-cell selection) and the selection
mirror (always shown; drag-select with no feedback is not a real use case).

Deliberately NOT added until a real need appears (YAGNI): `allow(range)` (disabled
cells are already skipped via `data-disabled`), `minDistance`/`mirror` as options,
and `onSelectStart`/`onSelecting`/`onUnselect` notifications. FullCalendar exposes
these ([selectable](https://fullcalendar.io/docs/selectable)); we add the matching
plugin option only when someone hits the case, not preemptively.

Zero core surface: the plugin reads `openEventForm` from `useIlamyCalendarContext`
inside its `provider` and passes it to `onSelect`. The default (open the form) is
itself just the default `onSelect`, so overriding and extending are the same
mechanism.

### Phase 3 — All-day row + edge cases
- Drag across the all-day bar yields `allDay: true` with day-granular start/end.
- Touch/pen pointer support (use Pointer Events, not mouse-only), auto-scroll when
  dragging past the viewport edge, and a `minDistance` default that feels right on
  touch.

### Phase 4 (optional) — Month / horizontal grid
- Extend selection to the month grid (drag across day cells → multi-day all-day
  range). Larger; the issue only asks for week/day, so defer.

---

## 6. The single-region invariant (boundaries)
A selection becomes ONE event that is either `allDay: true` or `allDay: false`
with one coherent range and (on a resource calendar) one resource. A drag that
crosses a region boundary must NOT produce a mixed selection. FullCalendar's docs
don't spell out the cross-boundary drag UX, but its documented `select` callback
reports a single `allDay` flag, so a selection is inherently one-or-the-other; we
make that explicit.

Rule: the selection's region is fixed by the **start** cell, and the drag
**clamps** to that region. The plugin records the start cell's `data-all-day`,
`data-resource-id`, and (timed grid) day column, and while dragging it ignores any
cell whose region differs, keeping the last valid same-region cell.

- **All-day cell → timed cell (the asked case):** clamps. Start on the all-day row
  → `allDay: true`, extends only across all-day cells; dragging down into the timed
  grid does not extend past the all-day boundary. Start on a timed cell → the
  all-day row is ignored. No mixed all-day/timed selection. The selection's
  `allDay` is the start cell's.
- **Resource column → another column (resource calendar):** clamps to the start
  resource; the selection carries one `resource`.
- **Day column → another day column (regular timed week):** decision for MVP —
  clamp to the start day (single-day timed range, the common case in #209). Allow
  multi-day timed ranges later if requested (FullCalendar permits them).

## 7. Other edge cases to nail (test matrix)

**Pointer lifecycle**
- Click vs drag: a click (under the plugin's threshold) keeps firing `onCellClick`,
  not a 1-cell selection.
- Non-primary button (right/middle) does not start a selection; `contextmenu`
  cancels an active one.
- Abnormal end: `pointercancel` / `lostpointercapture` / window `blur` /
  alt-tab while dragging cleans up the mirror and fires no `onSelect`.
- Multi-touch: a second finger mid-drag is ignored (track one `pointerId`).
- Escape mid-drag (before release) cancels; Escape / click-away after release also
  cancels with no `onSelect`.
- Fast drag skipping cells: range is `firstCell.start → currentCell.end`, so
  skipped intermediate cells do not matter (explicit test).

**Geometry / scroll**
- Auto-scroll at the grid's top/bottom edge extends the selection beyond the
  viewport; the mirror stays aligned (it lives in the grid scroll container).
- Mid-drag user scroll keeps the mirror aligned to the cells.
- RTL: range is time-based (correct); mirror geometry / column detection respects
  RTL.
- Pointerup released off-grid: commit the last valid same-region cell, do not throw.

**State changes mid-drag**
- View / navigation change (prev/next, switch view) cancels the in-flight
  selection.

**Range / region**
- Disabled cells: the plugin skips cells whose `data-disabled` is `true` (set by
  `DroppableCell`); a drag through a disabled cell clamps at it.
- Hidden hours (`hideNonBusinessHours`) inside the span: `start → end` includes the
  hidden gap (the event spans it); confirm that semantic.
- `slotDuration` 15/30/60: minimum selection is one slot; range math is
  granularity-agnostic (test each).
- DST day: range read from the cells' own `data-start`/`data-end` stays correct
  (explicit test).
- Single-cell / out-and-back drag: one-slot range, `end > start` always; the
  trailing click is still suppressed.

**Commit / environment**
- `onSelect` / `openEventForm` throwing cleans up in a `finally` (no stuck mirror).
- Open modal/form blocks pointerdown from reaching cells (no selection while a
  dialog is up); verify.
- SSR: pointer/DOM logic is client-only; data attributes render server-side fine.
- Plugin not registered: cells carry only harmless extra data attributes, no
  behavior.
- A11y: drag-create is an enhancement; keyboard users keep single-cell create via
  `onCellClick`. The mirror is `aria-hidden`.

## 8. Out of scope (for now)
- Month/horizontal drag-select and horizontal resource orientation (resources as
  rows) — Phase 4, deferred. MVP is the vertical week/day grid.
- Multi-day timed ranges (cross-day in the timed grid); MVP clamps to one day.
- `selectOverlap` (preventing selection over existing events); MVP allows overlap.
- Resizing / moving the selection after release (the editor handles the range).
- Multi-range selection.
- Keyboard drag-create (a11y enhancement); single-cell create via `onCellClick`
  remains the keyboard path.

## 9. Risks
- **Click/drag disambiguation** is the most bug-prone part. The plugin's
  `minDistance` plus a pointer-move threshold before activating; cover with tests.
- **Hit-testing:** the plugin uses one grid-level `pointermove` +
  `elementFromPoint` + `[data-start]` (not per-cell listeners). The mirror must be
  `pointer-events: none` or it shadows the hit-test.
- **Resource columns:** keep the drag within one column; cross-column drags should
  clamp, not span resources (needs a `data-resource-id` on cells, a second small
  attribute, only for resource support).
- **Touch:** mouse-only handlers will not work on tablets; use Pointer Events from
  the start.
- **events-layer overlap mid-drag:** while dragging over a cell that has an event,
  `elementFromPoint` may return the event element (events layer sits above cells).
  The plugin falls back to the last valid `[data-start]` cell, or disables the
  events layer's pointer-events during an active drag.
