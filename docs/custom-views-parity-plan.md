# Custom Views — FullCalendar parity plan

**Goal:** Bring ilamy's custom-view system to feature parity with FullCalendar's,
so users can define and override views from configuration (not only plugin
authors), with declarative date-range/navigation knobs and the view families
FullCalendar ships (dayGrid, timeGrid, list, multiMonth, and — stretch —
timeline).

**Status:** Proposal. This is a master plan; each phase below should spawn its
own detailed, bite-sized plan when picked up (the v2 overhaul used the same
shape). Every breaking change gets a `docs/migration-v2.md` entry.

**Principle:** We already have the right bones. `PluginView`
(`packages/types/src/index.ts`) supports `range`, `columns`, `layout`
(`vertical` ≈ timeGrid, `horizontal` ≈ dayGrid), `navigationStep`,
`renderHeader`, `supportsResources`, and `component` (the escape hatch). This
plan **extends** that contract rather than replacing it. Built-in views are
already `PluginView` entries resolved through one registry (see
`docs/custom-views.md`).

---

## 1. What FullCalendar offers (verified against their docs)

Sources: [custom-view-with-settings](https://fullcalendar.io/docs/custom-view-with-settings),
[view-specific-options](https://fullcalendar.io/docs/view-specific-options),
[dateAlignment](https://fullcalendar.io/docs/dateAlignment),
[plugin-index](https://fullcalendar.io/docs/plugin-index).

1. **Define custom views from config** via the `views` map, keyed by view name,
   with a `type` naming the base family and a date-range knob.
2. **Date-range / navigation knobs:**
   - `duration` — exact span, e.g. `{ days: 4 }` / `{ weeks: 2 }`.
   - `dayCount` — exact number of days shown, ignoring weekends/hidden days.
   - `visibleRange` — explicit range, as a value or a function of the current date.
   - `dateAlignment` — snaps the first visible day to a boundary (`week`/`month`);
     ignored when `visibleRange` is set.
   - `dateIncrement` — how far prev/next jumps.
   - `validRange` — min/max bounds for navigation.
   - `buttonText` — per-view switcher label.
3. **View-specific options:** any option can be overridden per view through the
   `views` map. Resolution is specific-view → view-family → global. Families:
   `dayGrid`, `timeGrid`, `week`, `day` (and `list`, `multiMonth`).
4. **View families / types:** dayGrid (Year/Month/Week/Day), timeGrid (Week/Day),
   list (Year/Month/Week/Day), multiMonth (Year), timeline (Year/Month/Week/Day),
   plus premium resource variants.
5. **Custom view via a JS/React class** — unlimited-flexibility escape hatch.

---

## 2. Gap analysis (FullCalendar → ilamy today)

| FullCalendar | ilamy today | Gap |
|---|---|---|
| Define views from a user-facing `views` config | Views come only from `plugins[].views` (`PluginView[]`) | **Add a user-facing `views` config** on `IlamyCalendarProps` so end users define/override views without authoring a plugin. |
| `type` = base family (dayGrid/timeGrid/list/multiMonth) | `layout: 'vertical' \| 'horizontal'` (≈ timeGrid / dayGrid) + `component` | Map families to engines; add **list** and **multiMonth** engines (today: agenda plugin ≈ list, year view ≈ multiMonth, but neither is a general engine). |
| `duration` | manual `range()` | Add declarative `duration` → derives `range` + `navigationStep`. |
| `dayCount` | manual | Add `dayCount` (respects/ignores `hiddenDays`). |
| `visibleRange` (value or fn) | `range()` (fn only, author-defined) | Accept a static value form and make it user-overridable. |
| `dateAlignment` | none | Add range alignment to `week`/`month` boundary. |
| `dateIncrement` | `navigationStep` ✓ | Rename-compatible; keep `navigationStep`, accept `dateIncrement` alias or document mapping. |
| `validRange` | none | Add navigation bounds (clamp prev/next/today + disable buttons at edges). |
| `buttonText` per view | `label` ✓ | Equivalent; ensure per-view override flows through. |
| View-specific options + family inheritance | none | **Add view-option resolution** (specific → family → global) for the options that make sense for ilamy. |
| Custom view via JS class | `component` ✓ | Equivalent escape hatch. |
| List views | agenda plugin (window-based) | Generalize into a first-class `list` engine/layout. |
| multiMonth | year view (`component`) | Generalize into a `multiMonth` engine (N months grid). |
| Timeline views | resource calendar in `orientation:'horizontal'` (resources as rows, time across) ≈ the same shape | **Stretch** — generalize our horizontal resource arrangement to a long, horizontally-scrollable span with a frozen gutter + two-tier headers. Phase it last / optional. |
| Content-injection hooks per slot | `renderEvent`, `renderHour`, `renderHeader`, `renderResource`, `renderCurrentTimeIndicator` | Add the missing granular hooks (day-cell content, day-header content, slot-label content, more-link content) to match FC's injection points. |

---

## 3. Design decisions (recommendations — confirm before building)

1. **User-facing `views` config vs plugin-only.** Recommend adding
   `views?: Record<string, UserViewConfig>` to `IlamyCalendarProps`, merged over
   the built-in + plugin `PluginView` registry by `name`. This is FullCalendar's
   headline capability and the main thing we lack. A `UserViewConfig` is a
   partial overlay (duration, dateAlignment, validRange, label, view-option
   overrides) keyed to a base `type`.
2. **`type` → engine mapping.** `timeGrid → layout:'vertical'`,
   `dayGrid → layout:'horizontal'`, `list → layout:'list'` (new),
   `multiMonth → layout:'multiMonth'` (new). Keep `layout` as the internal
   contract; `type` is the user-facing sugar that resolves to a `layout` + range
   defaults.
3. **Declarative range vs `range()`.** Add `duration`/`dayCount`/`dateAlignment`/
   `validRange`/`visibleRange` as declarative fields on `PluginView`; the core
   derives the effective `range()` + `navigationStep` from them. Authors can
   still supply a `range()` function for full control (it wins).
4. **Scope of "view-specific options."** FullCalendar lets *any* option be
   per-view. Recommend we support a curated, documented subset first
   (`firstDayOfWeek`, `slotDuration`, `businessHours`, `hiddenDays`,
   `weekViewGranularity`, `dayMaxEvents`, formatting), not a blanket override of
   every prop, to keep the resolution surface intentional.
5. **Timeline = separate epic.** It's the biggest single item (a horizontal,
   scrollable time axis with its own layout engine). Recommend treating it as an
   optional Phase 6, not a blocker for "parity" of the custom-view *system*.
6. **Breaking?** Most of this is additive (new optional fields). The `views`
   prop name does not collide (we expose `plugins`, not `views`, publicly today).
   Any change to `PluginView`'s existing fields gets a migration entry.

---

## 4. Phased plan

Each phase is independently shippable and testable. TDD per the repo rule:
update existing `*.test.tsx` files, exact assertions, integration-first.

### Phase 1 — Declarative date-range knobs on `PluginView`
**Outcome:** authors can define a view's window without hand-writing `range()`.

- Add optional `duration?: { days?: number; weeks?: number; months?: number }`,
  `dayCount?: number`, `dateAlignment?: 'week' | 'month'`,
  `validRange?: { start?: Dayjs; end?: Dayjs } | ((now: Dayjs) => …)`,
  `visibleRange?: {start,end} | ((date) => {start,end})` to `PluginView`
  (`packages/types/src/index.ts`).
- Core resolver: a `resolveViewRange(view, date, config)` helper in
  `packages/calendar/src/features/calendar/utils/` that derives the effective
  `{start,end}` and `navigationStep` from the declarative fields, honoring
  precedence: explicit `range()`/`visibleRange` > `duration`/`dayCount` (+
  `dateAlignment`) > family default. `validRange` clamps navigation.
- Wire into the engine that drives `range`, `onDateChange`, prev/next/today, and
  the event pipeline (`use-calendar-navigation`, `view-renderer`).
- **Files:** `packages/types/src/index.ts`, new range resolver +
  `use-calendar-navigation` slice, `view-renderer.tsx`.
- **Tests:** range resolution table (duration vs dayCount vs visibleRange vs
  alignment), `validRange` clamps prev/next and disables header buttons at edges.

### Phase 2 — User-facing `views` config + view-specific options
**Outcome:** end users define/override views from props (FullCalendar's headline).

- Add `views?: Record<string, UserViewConfig>` to `IlamyCalendarProps`.
  `UserViewConfig` = `{ type?: ViewFamily; duration?; dayCount?; dateAlignment?;
  validRange?; visibleRange?; label?; options?: ViewOptionOverrides }`.
- Merge precedence resolver: built-in/plugin `PluginView` ⊕ user `views[name]` ⊕
  family defaults; per-option resolution specific → family → global (Decision 4
  subset).
- Thread resolved per-view options into `use-calendar-config` so the active view
  reads its effective options.
- **Files:** `IlamyCalendarProps` types, `use-calendar-config`, a
  `resolveViewOptions` util, `view-renderer`.
- **Tests:** a config-defined `{ type:'timeGrid', duration:{days:4} }` view
  renders and navigates by 4 days; a per-view `firstDayOfWeek`/`slotDuration`
  override beats the global; family inheritance resolves.

### Phase 3 — List engine (`layout: 'list'`)
**Outcome:** first-class list views (listDay/Week/Month/Year) generalized from
the agenda plugin.

- Add a `list` layout to the shared renderer producing a grouped-by-day event
  list for the resolved range. Reuse agenda's `group-events-by-day` logic;
  promote shared pieces to where both can consume them.
- Built-in list view specs (or document deriving them via Phase 2 `views`).
- Reconcile with the existing agenda plugin (agenda = a windowed list; it can
  become a thin preset over the list engine).
- **Files:** `components/.../views/` list arrangement, renderer dispatch,
  agenda plugin refactor.
- **Tests:** list renders events grouped by day for day/week/month windows;
  empty-range message; resource-incapable (hidden on resource calendars).

### Phase 4 — multiMonth engine (`layout: 'multiMonth'`)
**Outcome:** an N-month grid (multiMonthYear and arbitrary month counts),
generalizing today's year view.

- A `multiMonth` layout rendering K month grids in a responsive grid; `duration`
  in months drives K.
- Re-express the year view as `multiMonth` with `{ months: 12 }` (or keep year
  as a preset).
- **Files:** new multiMonth arrangement + renderer dispatch; year-view refactor.
- **Tests:** 12-month render, navigation by year, month-cell click opens the day.

### Phase 5 — Content-injection hooks parity
**Outcome:** match FullCalendar's per-slot content control.

- Add the missing render hooks as props + plugin slots: day-cell content,
  day-header content, slot-label content, more-link content, no-events content.
  Align names with our existing `render*` convention.
- **Files:** `IlamyCalendarProps`, the relevant grid/cell components, slot
  catalog.
- **Tests:** each hook overrides the default render at the right mount point.

### Phase 6 (stretch) — Timeline views
**Outcome:** a long, horizontally-scrollable time axis with resources as rows.

**In our terms:** a timeline view is a *generalization of what our resource
calendar already does in `orientation: 'horizontal'`* — resources as rows, time
as columns across the top, with the `ResourcesCornerCell` + row labels acting as
the left "resource gutter" (see `resourceHorizontalRows` in
`views/resource-axis.tsx` and `week.tsx`). We already have ~70% of the concept.
What's genuinely new:
1. **A long, horizontally-scrollable span** with a *frozen* resource gutter —
   today our horizontal resource grid fits one day/week into the viewport; a
   timeline shows e.g. a whole month or year of slots and scrolls left/right
   while the resource column stays pinned (needs horizontal virtualization for
   large spans).
2. **Two-tier column headers** — e.g. day labels grouped under month labels
   across the top (today we render a single header row).
3. **A richer resource gutter** — an optional multi-column data grid on the left
   instead of a single label.

So the new engineering is the scroll/virtualization + two-tier header + data-grid
gutter, not the basic arrangement (which exists). Still the largest phase; design
separately and decide whether to ship after Phases 1–5.

---

## 5. Non-goals / explicit scoping
- Premium licensing model — N/A; everything ships in the one package via plugins.
- Pixel-identical FullCalendar markup — we use shadcn tokens (bring-your-own CSS).
- Blanket "every prop is per-view" — curated subset first (Decision 4).
- Timeline is optional (Phase 6); the custom-view *system* reaches parity at
  Phase 5.

## 6. Risks
- **View-option resolution surface** can sprawl; keep the per-view overridable
  set curated and documented.
- **Agenda ↔ list reconciliation** (Phase 3) touches a shipped plugin — guard
  with the existing agenda tests before refactoring.
- **`validRange`/navigation** interacts with every view's prev/next/today and
  the event pipeline range; centralize in one resolver, test the matrix.
- **Timeline** virtualization/perf is a project of its own.

## 7. Sequencing
Phases 1 → 2 deliver the bulk of FullCalendar's custom-view *value* (declarative
views definable from config). 3–5 add the missing engines/hooks. 6 is optional.
Recommend shipping 1 and 2 first, reassessing parity, then 3–5.
