# Calendar Architecture Redesign — Master Plan

> **For agentic workers:** This is the master plan for review. Each phase below becomes its own
> detailed task plan (per `superpowers:writing-plans`) once approved — do not execute phases from
> this document alone. Phases use checkbox (`- [ ]`) syntax for milestone tracking.

**Goal:** Restructure `packages/calendar/src` so that views are declarative specs over shared
machinery and the resource calendar is a configuration of the one calendar — making new views,
new plugins, and resource features linear-cost instead of quadratic-cost to add.

**Release vehicle: v2.0.** This plan ships as part of the v2.0 breaking release alongside the
already-locked plugin architecture (`docs/v2-plugin-architecture.md`). Breaking the public API
is allowed where it buys simplicity; every break gets a before/after entry appended to
`docs/migration-v2.md` in the same PR that introduces it. The v2 spec's dogfooding rule (the
recurrence plugin uses ONLY public exports) is a hard constraint on every contract this plan
touches.

**Architecture:** Bulletproof React project structure
([project-structure.md](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)):
shared modules (`components/`, `hooks/`, `lib/`, `types/`) → `features/` → the app layer
(for a library: `index.ts` + the public components), with code flowing in that one direction
and no cross-feature imports. Views become thin registered specs inside the calendar feature;
resources become a first-class axis on view specs, not a parallel feature.

**Tech stack:** Unchanged — TypeScript, React 19, dayjs (via `@ilamy/utils/dayjs` shim),
@dnd-kit, rrule.js, bun + bunup. No new runtime dependencies.

---

> **Validation pass (2026-06-11):** every phase was verified against the actual code by five
> independent review passes (geometry, providers/engine, view contract, resource axis,
> build constraints). Verdict: feasible with the amendments now folded in below. The two
> design corrections that came out of it: Phase 3 generalizes the existing published
> `PluginView` contract instead of adding a parallel registry, and Phase 1's unit mismatch
> (day variant percent, week variant pixels despite its comments) is resolved by a v2 design
> change: layout returns abstract placement (`row` index, percent fractions) and renderers
> own all CSS units, so ONE `PositionedEvent` type is honest. v2.0 reframing (2026-06-11):
> this plan ships under the v2.0 breaking release with the locked plugin-architecture spec.

## Why (evidence from the codebase today)

These are observed, not hypothetical:

1. **The resource calendar is a fork.** `features/resource-calendar/contexts/.../provider.tsx`
   duplicates ~150 lines of `features/calendar/contexts/calendar-context/provider.tsx`
   (`editEvent`, `handleEventClick`, `handleDateClick`, the ~60-line `contextValue` memo +
   mirrored deps array). `use-smart-calendar-context.ts` bridges the two trees with an unsafe
   `as SmartCalendarContextType` cast. Every view exists up to 3× (regular, resource-horizontal,
   resource-vertical).
2. **Views own engine work.** Each view hand-builds `columns` arrays; the time-gutter column
   literal is pasted into 5 files; the `delay={index * 0.05}` animation constant into 5 more.
   The week-view stale-`useMemo` bug fixed in PR #190 existed *because* the view assembles
   engine state inline.
3. **Two geometry modules export incompatible types with the same name.**
   `lib/utils/position-day-events.ts` and `lib/utils/position-week-events.ts` both export
   `PositionedEvent` with different shapes; both are ~100–130-line multi-phase functions.
4. **Event filtering is scattered.** `year-view.tsx` counts month badges by filtering raw
   `events` while day dots use `getEventsForDateRange` — two code paths that can (and do)
   disagree for multi-day/plugin-transformed events.
5. **`components/` vs `features/` has no rule.** The header, grids, event form, and dnd live in
   `components/`; views and contexts in `features/`. Placement is by historical accident.
   Bulletproof React supplies the missing rule: shared folders hold only feature-agnostic code,
   everything feature-specific lives inside the feature (by-type subfolders), and features never
   import from each other. Today `features/resource-calendar` imports
   `features/calendar`'s context and engine — exactly the cross-feature entanglement the
   convention forbids.

## Guiding constraints (apply to every phase)

- **Public API redesigned deliberately, not frozen.** v2.0 is a breaking release: prefer the
  simpler API over compatibility, but never break silently — each break lands with its
  `docs/migration-v2.md` entry and, where cheap, a deprecated alias for one beta cycle.
  Recommended v2 surface: ONE component — `IlamyCalendar` gains `resources`, `renderResource`,
  `orientation`, `weekViewGranularity` props; `IlamyResourceCalendar` becomes a deprecated
  alias (or is removed — owner's call, flagged in Phase 4).
- **Every phase ships independently green.** `bun run ci` (biome + build + type-check +
  154 recurrence / 767+ calendar tests) passes at the end of every phase; each phase is its own
  PR. No long-lived refactor branch.
- **TDD per CLAUDE.md.** Behavior-preserving moves are pinned by the existing suite; any new
  behavior (view resolution, resource filtering) gets failing-first tests. Never new test
  files — existing co-located suites move with their modules.
- **Strangler pattern.** New modules land alongside old ones; old ones become re-export shims,
  then get deleted only when nothing imports them. `git log` keeps file history via `git mv`.

## Target structure (Bulletproof React)

Per the Bulletproof React project-structure doc: shared top-level folders hold
feature-agnostic code only; each feature is organized internally by type
(`components/`, `contexts/`, `hooks/`, `types/`, `utils/` — only the folders it needs);
code flows one direction (shared → features → app layer); features never import from
each other. For this library the "app layer" is `index.ts` plus the public
`IlamyCalendar`/`IlamyResourceCalendar` components, where composition happens.

```
packages/calendar/src/
  components/                # SHARED, calendar-agnostic primitives only
    vertical-grid/           # time grid + gutter-column factory (defined once)
    horizontal-grid/         # date grid (rows of day cells)
    event-chip/              # draggable-event
    all-day-row/  dnd/  dialogs/  animations/  ui/
  hooks/                     # shared hooks (use-date-time-formatters, ...)
  lib/                       # React-free domain logic + preconfigured libs
    configs/                 # dayjs-config shim (exists today)
    dates/                   # date-utils.ts, view-hours.ts, business-hours.ts (moved)
    events/                  # pipeline.ts: expand (plugins) → range filter → resource filter
    layout/                  # geometry.ts: ONE PositionedEvent contract
                             #   vertical.ts   (today: position-day-events.ts)
                             #   horizontal.ts (today: position-week-events.ts)
    plugin-kernel/           # features/plugins/lib (moved, unchanged contract)
    translations/            # exists today
  types/                     # shared types (re-exports @ilamy/types)
  testing/                   # CalendarTestProvider (exists today)
  features/
    calendar/                # THE feature (resource absorbed in Phase 4)
      components/
        views/               # built-in PluginView entries: month/week/day/year + dispatcher
        header/  event-form/ # feature-specific UI (moved from shared components/)
      contexts/              # ONE provider composing the engine slices
      hooks/                 # engine slices: use-calendar-data, use-calendar-navigation,
                             #   use-calendar-config, use-calendar-interaction,
                             #   use-smart-calendar-context (selector-only, no cast)
      types/  utils/
  index.ts                   # public API + app-layer composition (v2 surface)
```

Placement rule for every file: used by nothing calendar-specific → shared top level;
calendar-specific → inside `features/calendar/` in its by-type folder. The unidirectional
rule (`lib/` never imports `features/`, features never import each other) is convention
plus review; Biome's `lint/style/noRestrictedImports` restricts import targets but cannot
express per-source-directory bans (verified against the Biome docs), so if we want a
mechanical gate it is a small grep check in CI, not a linter rule.

`packages/types`, `packages/utils`, `packages/ui`, `packages/recurrence`, `apps/demo` are
untouched except where noted.

## Key contracts (locked in by this review)

### Unified geometry (`lib/layout/geometry.ts`)

ONE positioned-event type — made possible by two v2 design changes rather than by papering
over the unit mismatch verification found (day variant emits percent, week variant emits
pixels while its own comments claim percent, `position-week-events.ts:12-13` vs `:108-110`):

1. **Layout returns placement, not CSS.** The horizontal layout function stops computing pixel
   `top`/`height` entirely and returns the abstract `row` index instead; the renderer derives
   pixels (`top = dayNumberHeight + spacing + row * (barHeight + spacing)`). This is nearly
   free: the consumer already ignores the function's `height` and uses context `eventHeight`
   (`horizontal-grid-events-layer.tsx:67-68`), so the pixel math is half-dead today. With no
   pixel fields emitted, the unit lie cannot exist — `top`/`height` are always percent, and
   only the vertical layout fills them.

2. **Composition instead of inheritance.** Today `PositionedEvent extends CalendarEvent`, so
   layout fields are spread INTO event objects — which is why UI instances leak `width`,
   `height`, `top`, `left` back into stored events and `recurrence-handler.ts:297` needs an
   `omitKeys(targetEvent, ['width','height','top','left','right'])` hack behind a
   `@ts-expect-error`. v2 nests the event instead, killing that bug class and the hack.

```ts
/** The single layout contract. Strategy determines which placement group is set. */
export interface PositionedEvent {
  event: CalendarEvent
  /** Horizontal placement, percent of the grid axis (both strategies). */
  left: number
  width: number
  /** Time-grid strategy (day/week body): vertical placement, percent of visible range. */
  top?: number
  height?: number
  zIndex?: number
  /** Row-packing strategy (month / all-day row): stacking row; renderer derives pixels. */
  row?: number
  isTruncatedStart?: boolean
  isTruncatedEnd?: boolean
}

// Inputs stay per-strategy (day grid accepts gridType 'minute' and no sizing params;
// row packing needs dayMaxEvents — its pixel knobs move to the renderer):
export function layoutVertical(input: VerticalLayoutInput): PositionedEvent[]
export function layoutHorizontal(input: HorizontalLayoutInput): PositionedEvent[]
```

`DraggableEvent`'s current `event as unknown as { isTruncatedStart?: ... }` double-cast dies
here (truncation flags are real fields), the week function's `as PositionedEvent` cast
(`position-week-events.ts:115`) goes away, and the recurrence package's omitKeys hack is
deleted. Both modules are fully internal (neither type nor function is in the public index)
with five consumer files and 46 exact-assertion tests; the consumers' `event.title` access
becomes `positioned.event.title` — internal-only churn, sanctioned by v2. The pixel-math
tests move to the renderer with the math they pin.

### View contract: generalize `PluginView` (no new registry)

Verification corrected the original design here. The codebase ALREADY has a view registry:
the published `PluginView` contract (`@ilamy/types`: `{ name, label?, component,
navigationUnit? }`), aggregated by `createPluginRuntime().getViews()`, and consulted in three
places — the mount point (`ilamy-calendar.tsx:34-44` hardcodes `builtInViews` then falls back
to `getViews()`), navigation (`use-calendar-engine.ts:212-225` consults `VIEW_UNITS` then
`getViews()`), and the view switcher (`view-controls.tsx:67-95` renders `BUILT_IN_VIEWS` then
`getViews()`). A parallel `ViewDefinition` registry would force all three to merge THREE
sources with id-collision ambiguity, and risks breaking the published plugin contract.
Instead, generalize the existing contract:

```ts
// In @ilamy/types — extends the published PluginView, backward compatible:
export interface PluginView {
  name: string
  label?: string
  navigationUnit?: ManipulateType
  /** NEW, optional: how far prev/next jumps; defaults to one navigationUnit.
   *  Custom-duration views (a 40-day grid, a 4-day timeGrid) set
   *  { amount: 40, unit: 'day' } — same semantics as FullCalendar's view
   *  duration defaulting dateIncrement. */
  navigationStep?: { amount: number; unit: ManipulateType }
  /** NEW, optional: visible range for navigation + the event pipeline.
   *  Fixes the real gap: plugin/unknown views silently fall through to the
   *  month 6x7 range today (use-calendar-engine.ts:103). */
  range?: (date: Dayjs, config: ViewConfig) => { start: Dayjs; end: Dayjs }
  /** NEW, optional: column specs + layout for the shared renderer.
   *  `component` remains the escape hatch (year view is exactly that). */
  columns?: (date: Dayjs, config: ViewConfig) => ColumnSpec[]
  layout?: 'vertical' | 'horizontal'
  renderHeader?: (ctx: ViewHeaderContext) => ReactNode
  /** NEW, optional: whether columns() composes the resource axis when
   *  `config.resources` is set. Defaults to false; the view switcher hides
   *  resource-incapable views on a resource calendar (generalizes today's
   *  hardcoded year-view suppression). */
  supportsResources?: boolean
  component: ComponentType
}
```

- The four built-ins become internal `PluginView` entries prepended in `getViews()`;
  `VIEW_UNITS`, the `builtInViews` record, and the `BUILT_IN_VIEWS` switcher special-case
  are deleted. One resolution path everywhere — including `ResourceCalendarBody`, which
  today has NO plugin-view fallback while its switcher still shows plugin buttons
  (pre-existing inconsistency this fixes).
- `ColumnSpec` is not invented; it already exists as `VerticalGridColProps` /
  `HorizontalGridRowProps`. The renderer is a three-way dispatcher (`vertical` →
  VerticalGrid, `horizontal` → HorizontalGrid, else `component`), NOT a prop unification —
  the two grids' inputs (per-column vs per-row event packing) genuinely differ.
- **`layout` vs the `orientation` prop — deliberately distinct names, shared values.**
  `layout` is the view's intrinsic declaration; the calendar-level `orientation` prop is the
  user's resource-arrangement preference. Precedence rule: no resources → engine =
  `view.layout`; resources present (and `supportsResources`) → engine = the calendar's
  `orientation` (vertical → resources as columns on VerticalGrid, horizontal → resources as
  rows on HorizontalGrid). This
  matches today's behavior, where regular month renders horizontal but resource-month-vertical
  renders on the vertical engine. One value vocabulary (`'vertical' | 'horizontal'`), two
  knobs that must not share a name, or "calendar orientation vs view orientation" becomes a
  support question. The mechanical rule the renderer implements:
  `engine = resources && view.supportsResources ? config.orientation : view.layout`. `ViewConfig`
  (the argument to `columns()`/`renderHeader()`) carries `resources` and `orientation` so
  a resource-capable view composes both arrangements; resource-incapable views are hidden
  from the switcher when resources exist. DX guard: dev-mode `console.warn` when `orientation` is passed
  without `resources` (the prop is inert in that case — say so instead of silently ignoring).
- `renderHeader` is required for the "thin spec" claim to hold: headers, not column
  assembly, are the irreducible per-view code (week's corner-cell + clickable day headers,
  five distinct resource header components).
- The two highest-value extractions need no registry at all and land first: the 5x
  copy-pasted sticky time-gutter column and the `0.05` animation-delay constant
  (6+ files) move into the grid/header components.
- **Custom-duration views are a design goal of this contract** (FullCalendar parity:
  `type` + `duration`). A 40-day grid is one `PluginView` entry: `range` returns the
  40-day window, `columns` returns its day rows/columns, `layout` picks the engine, and
  `navigationStep: { amount: 40, unit: 'day' }` makes prev/next jump a full window. The
  event pipeline is already range-driven (`getEventsForDateRange(start, end)`), and the
  resource axis multiplies whatever day-columns a view declares — so resources compose
  with custom windows for free. `navigatePeriod` must consume `navigationStep` in Phase 3 (today it
  hardcodes a single-unit step, `currentDate.add(1, unit)`).

### The resource axis (how resources stop being a fork)

**Decision (owner, 2026-06-11): resources ship in core, not as a plugin.** Resources are a
layout dimension cutting through filtering, both grid engines, the time axis (business-hour
union), dnd/testid identity, and view availability — not a slot-shaped feature like
recurrence. The shared grids are already resource-aware; a plugin would require inventing and
freezing extension points for all of the above before any second consumer exists.
`docs/v2-plugin-architecture.md`'s preamble ("later resource ... plugins") gets amended to
"possible future extraction once the v2 plugin contracts have proven themselves" as part of
this phase's docs sweep.

Verification reframed this phase: the grid layer is ALREADY unified. Shared grids, cells,
event layers, and the `keys.ts` testid/droppable factory all accept optional
`resourceId`/`resource` today; `HorizontalGrid` already has a `variant: 'regular'|'resource'`
discriminator; `filterEventsByResource` already lives in the shared pipeline. The
`features/resource-calendar/` tree is ~1,320 lines of non-test code that is mostly
axis-composition config, headers, and the duplicated provider — not a parallel renderer.

```ts
// No new type and no new word: the axis IS `Resource[]` — verified, tests assert the
// full resource object (color, backgroundColor, data, renderResource) reaches
// onCellClick and isCellDisabled. The config slice carries `resources?: Resource[]`.
```

Semantics the unified path must encode explicitly (all verified, all tested today):

- `filterEventsByResource` (the existing shared helper) = membership over
  `resourceIds ∪ {resourceId}` (cross-resource events render once per matching resource;
  no spanning rendering exists). DnD drops set `resourceId`
  and never rewrite `resourceIds` — preserve or change consciously.
- Resources absent → no filter (all events show). Resources present → unassigned events
  render nowhere.
- Visible hours = global ∪ all resources' businessHours (the union rule is pinned by
  `business-hours.test.tsx:133-178`); per-cell shading stays `useEffectiveBusinessHours`.
- Orientation is a dispatch between the two existing grid engines (horizontal =
  resources-as-rows on HorizontalGrid with pixel row stacking; vertical =
  resources-as-columns on VerticalGrid with
  percent time geometry). There is no transpose; both engines stay.
- Hourly week mode is nested axes (grouped day columns with two-level headers, or
  resource x day cartesian columns), plus `weekViewGranularity: 'hourly'|'daily'` with the
  documented hiddenDays-ignored-in-daily-mode caveat.
- Year view stays suppressed when resources are present (today's `resources.length > 0`
  sniff in view-controls becomes the general `supportsResources` check).
- `getEventsForResource` is public API through `useIlamyCalendarContext()` and moves into
  the unified provider verbatim; click-to-create keeps injecting the cell's resource.

v2 surface decision (owner's call, recorded in the migration guide): `IlamyCalendar` absorbs
`resources`, `renderResource`, `orientation`, `weekViewGranularity` as first-class props, and
`IlamyResourceCalendar` either ships as a deprecated one-line alias for the beta cycle or is
removed at 2.0. The deletable mass is the 291-line provider, the per-view composition files,
and the headers (the wrapper itself is already only 51 lines).

### Event pipeline (`lib/events/pipeline.ts`)

```ts
// The ONLY path from raw events to renderable events:
raw events → pluginRuntime.transformEvents(range)  // recurrence expansion etc.
           → clampToRange(start, end)
           → filterEventsByResource(resourceId?)    // optional
// Every consumer (cells, badges, year dots, all-day row, export) reads from a
// pipeline stage — no view filters `events` directly ever again.
```

---

## Phases

Each phase = one PR, independently shippable, `bun run ci` green, dev log updated.
Detailed step-by-step task plans (with code, per writing-plans) are produced per phase
after this master plan is approved.

### Phase 0 — Cheap wins (½ day) — detailed task plan: `docs/v2-overhaul-phase-0-plan.md`

**Files:** `lib/translations/types.ts`, `lib/translations/default.ts`

- [ ] Derive the type: `export type Translations = Record<keyof typeof defaultTranslations, string>`
      (deletes the hand-maintained 94-key mirror; `TranslationKey = keyof typeof defaultTranslations`).
- [ ] v2 breaking type fixes: `Record<string, any> → Record<string, unknown>` on published
      `CalendarEvent.data` and `Resource.data`; delete the unused public `Resource.position`
      field (zero usages in src). Both get `docs/migration-v2.md` entries.
- [ ] Delete dead exports found in review: `month-view/types.ts` unused types, `MonthView`'s
      unread `dayMaxEvents` prop, `day-number.tsx` unused `locale` prop, `@ilamy/ui` `Badge`
      and `InputGroup` (zero consumers), `apps/demo/src/index.tsx` (dead entry point), and
      `ProcessedCalendarEvent` in `components/types.ts:20` (a third near-duplicate positioned
      event type with zero usages).

**Exit:** type-check proves no consumer needed the deleted surface; bundle slightly smaller.

### Phase 1 — Unified geometry: `lib/layout` (1–2 days)

**Files:** Create `lib/layout/{geometry.ts,vertical.ts,horizontal.ts}` (+ moved tests);
`lib/utils/position-day-events.ts` and `position-week-events.ts` become re-export shims, then
are deleted once `week-view`, `day-view`, `all-day-row`, `useProcessedDayEvents`,
`useProcessedWeekEvents`, and resource equivalents import from `lib/layout`.

- [ ] Move both existing test suites with their modules (46 exact-assertion tests pin
      behavior, including `zIndex` sequencing); add the factory-helper structure the test
      style guide requires.
- [ ] Implement `layoutVertical` and `layoutHorizontal` against the single contract above:
      composition (`{ event, ...placement }`), truncation flags and `zIndex` typed,
      `position` renamed to `row` (updating the React key in
      `horizontal-grid-events-layer.tsx:54`), and the horizontal-layout pixel math moved into the
      renderer (its tests move with it).
- [ ] Delete the `omitKeys(...['width','height','top','left','right'])` hack and its
      `@ts-expect-error` in `recurrence-handler.ts:296-297` — layout fields no longer exist
      on event objects to leak.
- [ ] Split the two ~100/130-line functions into named phases (cluster → geometry → place)
      while tests stay green.
- [ ] Swap the five consumer files; delete shims and the dead `ProcessedCalendarEvent`.

**Exit:** no duplicate same-named positioned-event types; `DraggableEvent` double-cast and
the week function's `as` cast removed; geometry tests run with zero DOM (pure functions).

### Phase 2 — One provider: engine slices (2–3 days)

**Files:** Create `features/calendar/hooks/use-calendar-{data,navigation,config,interaction}.ts`
(the engine split into slices); slim `features/calendar/contexts/calendar-context/provider.tsx`
to compose them; `features/resource-calendar/contexts/resource-calendar-context/provider.tsx`
shrinks to prop-mapping over the same slices (cross-feature import, tolerated only until
Phase 4 deletes the feature); `use-smart-calendar-context.ts` loses the cast and moves to
`features/calendar/hooks/`.

- [ ] FIRST: write resource-provider tests pinning the `handleDateClick` fallback (newEvent
      shape, `resourceId` injection, the `allDay: false` hardcode) and click-disable
      semantics. The resource context has NO provider-level tests today, and the subtlest
      divergences live exactly there.
- [ ] Extract the duplicated ~150-190 lines (`editEvent` and `handleEventClick` are verbatim
      identical; `handleDateClick` and context assembly are near-identical) into the slices.
- [ ] Unify `handleDateClick` by extending the engine's `openEventForm` to carry resource
      info (`CellInfo.resource` is silently dropped by the engine path today) and decide the
      `allDay` semantics deliberately — the resource copy hardcodes `allDay: false` while the
      engine respects the cell's flag. This is a behavior decision, not a pure refactor.
- [ ] The slices are plain hooks composed in order (config → pluginRuntime → navigation →
      data → interaction) inside ONE provider, passing values as parameters each render.
      `pluginRuntime` is a named fifth cross-cutting dependency (data, navigation, AND the
      provider's renderSlot/getProviders all consume it). The timezone effect
      (`use-calendar-engine.ts:186-199`) mutates navigation AND data state from a config
      trigger — it stays in the composer rather than being mechanically sliced.
- [ ] `useSmartCalendarContext` becomes a typed selector over the one provider; resource
      fields become honestly optional. This exposes a pre-existing public-type lie:
      `IlamyCalendarApi.getEventsForResource` is required-but-runtime-undefined on regular
      calendars — provide a stub or make it optional, and add `?.` at `grid-cell.tsx:84` and
      the two processed-events hooks.

**Exit:** zero duplicated provider lines; both public components still pass their full
suites; the merged context value is shape-identical so rerender behavior is unchanged.

### Phase 3 — Generalize the plugin view contract + port views (3–4 days)

**Files:** Extend `PluginView` in `packages/types` (optional `range`/`columns`/`layout`/
`renderHeader`, backward compatible); create `features/calendar/components/views/{day,week,month,year}.tsx`
as built-in `PluginView` entries prepended in `getViews()`; `components/vertical-grid/gutter.ts`
(single gutter-column factory, shared); a three-way view dispatcher replaces the hardcoded
`builtInViews` record in `ilamy-calendar.tsx`; the navigation slice deletes `VIEW_UNITS` and
the month-range fallthrough in favor of `view.range?.(...)`.

- [ ] Land the gutter-column factory and the animation-delay constant first — pure
      deduplication across 5-6 files each, no contract change needed.
- [ ] Extend `PluginView` + dispatcher with `day` ported first (simplest; proves the shape).
- [ ] `week` ports next using `renderHeader` for its corner-cell + clickable day headers.
- [ ] `month` ports onto the `horizontal` layout; `year` stays a `component` escape hatch but pulls
      counts/dots from the event pipeline (kills the badge-vs-dots divergence).
- [ ] Delete `VIEW_UNITS`, `builtInViews`, and the `BUILT_IN_VIEWS` switcher special-case;
      `ResourceCalendarBody` gains the plugin-view fallback it is missing today.
- [ ] **Documentation deliverable (mandatory before this phase merges — the owner found the
      triad confusing, so users will too):** write `docs/custom-views.md`, the view-author
      guide. Must cover: `layout` vs `orientation` vs `supportsResources` with the
      ASCII-diagram explanation and decision table from the design discussion ("layout = the
      view's shape, author's choice; orientation = where your resources go, user's choice;
      supportsResources = whether the author built the resource arrangements"); the engine
      rule and the what-breaks-without-each-field rationale; a full worked example building
      the 40-day custom view (range, columns, navigationStep, header) with and without
      resources. Audience separation is the core principle: calendar users only ever read
      about `orientation`; `layout`/`supportsResources` appear only in the author guide.
      Plus TSDoc on the props themselves: `orientation` says "only applies when `resources`
      is set", `layout` says "engine used when the calendar has no resources".

**Exit:** one view-resolution path for built-in and plugin views alike; adding a hypothetical
agenda view = one `PluginView` entry; all gutter and delay-constant copies are gone; the
published plugin contract is extended, never broken.

### Phase 4 — Resources in the core calendar (3–5 days, the big deletion)

**Files:** Config slice gains `resources`; `lib/events/pipeline.ts` absorbs `filterEventsByResource`;
`ViewRenderer` gains resource orientation (vertical/horizontal); `IlamyCalendar` absorbs the
resource props (app-layer composition, per Bulletproof) and `IlamyResourceCalendar` becomes a
deprecated alias or is removed (migration-guide entry either way); the whole
`features/resource-calendar/` feature is deleted as each part is absorbed.

- [ ] Resource-aware dispatch behind the existing resource test suites. They are the spec, with
      one correction from verification: six of the seven suites import the internal
      components/provider directly, so "pass verbatim" is impossible — their imports get
      rewritten against the unified path while every assertion stays byte-identical
      (testids come from the shared `keys.ts` factory and must reproduce exactly, including
      resource rows as DOM ancestors of their cells).
- [ ] Per-resource business hours flow through the config slice: the union rule for visible
      hours AND per-cell `useEffectiveBusinessHours` shading, both pinned by
      `business-hours.test.tsx`.
- [ ] Delete `features/resource-calendar` piecemeal: day views → week views → month views →
      context. Each deletion lands only when its tests pass against the unified path.
- [ ] Final move: apply the Bulletproof placement rule everywhere with `git mv`
      (history-preserving) — feature-specific code (views, header, event-form, engine hooks,
      provider) into `features/calendar/` by-type folders; only calendar-agnostic primitives
      stay in shared `components/`/`hooks/`/`lib/`; update `@/` imports mechanically.

**Exit:** one component serves both calendars (`IlamyResourceCalendar` reduced to a deprecated
alias or gone); no cross-feature imports remain; "where does X live?" is answered by the
shared-vs-feature rule.

---

## Explicitly out of scope (separate decisions)

- ~~`Record<string, any> → unknown` on published `CalendarEvent.data` / `Resource.data`~~ —
  now IN scope: v2.0 is the semver moment. Added to Phase 0 with a migration-guide entry.
- Bare `YYYY-MM-DD` test-date conversion — changes parse-timezone semantics; per-assertion
  review, own branch.
- The demo app's 50-prop threading — worth a settings-object refactor, but it ships nothing
  and shouldn't ride along with library phases.
- Any framework-agnostic "headless core for Vue/Svelte" ambition — `lib/` being React-free
  is a discipline boundary, not a multi-framework commitment (YAGNI).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Behavior drift during view ports | Existing integration suites (921 tests, testid-based) are the spec; ports must pass them unmodified before any test is "adapted". A test change in a port PR is a review flag. |
| Resource semantics differ subtly from regular views (business hours, dnd ids, testids) | Phase 4 deletes nothing until the unified path passes the resource suites verbatim; testids are part of the public-ish testing harness and must not change. |
| Long-lived branch rot | Forbidden by design: 5 phases = 5 sequential PRs to main, each independently green. |
| Plugin contract breakage | `PluginView` is only ever EXTENDED with optional fields; today's shape keeps working unchanged, so existing plugins (recurrence) need zero changes until they opt in. |
| Import-path churn breaking the published build | bunup `noExternal` bundles by tsconfig `paths`; phase PRs run `bun run ci` which builds before type-check/test — the demo consuming `dist` is the canary. |

## Mechanical landmines (verified against build config)

Hard constraints every phase must respect:

- **Three files never move:** `src/index.ts`, `src/testing/index.tsx`, `src/plugins/recurrence.ts`.
  bunup's entry array (`bunup.config.ts:10`) and the package.json exports map both encode
  these exact paths; dist layout, the demo's Tailwind `@source` glob, and the recurrence
  augmentation all key off the resulting dist, not src internals — so everything ELSE in src
  moves freely.
- **`lib/configs/dayjs-config.ts` stays put** (the target structure already keeps it). If it
  ever moves: `biome.json:54-59` (rule message) and `:94` (the `noRestrictedImports`
  exemption glob) plus the test preload `packages/calendar/testing-library.ts:6` must move
  with it, or lint and the entire test suite break silently.
- **`src/testing/index.tsx` imports the provider by internal path** — when the provider
  moves in Phase 2/4, this entry file's import must be updated (it is the `./testing`
  public entry).
- **Rebuild dist inside each phase PR** before running recurrence/demo checks: those
  packages resolve `@ilamy/calendar` through built `dist/*.d.ts` (their tsconfigs have no
  path mapping), so local type-check against a stale dist shows phantom errors.
- **Docs + agent-instruction sweep per phase:** `docs/time-grid.md` (10 path refs),
  `hooks-and-context.md` (17), `types-and-interfaces.md` (17), `testing-guide.md` (9),
  `export-ical.md` (4), the architecture/v2 docs, AGENTS.md's Key Paths section,
  `.agents/commands/load-context.md`, and `.agents/skills/code-review/SKILL.md:180`.
  (`resource-calendar.md` and `translation-usage.md` carry no paths.)
- Cross-package deep imports are limited to `@ilamy/calendar/testing` (3 recurrence test
  files) and `@ilamy/calendar/plugins/recurrence` (demo) — both pinned by the immovable
  entries above. Zero relative reach-ins exist.

## Sizing & order

Total ≈ 2–3 weeks of focused work. Order is fixed (each phase builds on the previous), but
the project is pausable after any phase with the codebase strictly better than before —
no phase leaves scaffolding that requires the next phase to justify it.

## Process per phase (per CLAUDE.md)

1. Detailed task plan written and reviewed (granular TDD steps with code, per writing-plans).
2. Feature branch; failing tests first for new behavior; `bun run ci` before review.
3. Every public-API break in the phase gets its before/after entry appended to
   `docs/migration-v2.md` in the same PR.
4. Dev log entry in `docs/logs/`; PR with explicit approval before posting/merging.
5. Releases ride `2.0.0-beta.N` tags off main until the overhaul completes; v1 patch fixes
   (if any) branch from the last 1.x tag.
