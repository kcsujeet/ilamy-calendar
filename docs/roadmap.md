# Roadmap

> **For agentic workers:** This is the master plan. Each feature below becomes its own detailed
> task plan (per `superpowers:writing-plans`, saved to `docs/superpowers/plans/`) when its
> release starts. Do not build from this document alone: the API sketches are starting points,
> and each one is checked against the standard it cites before its task plan is written.
> Read **Delivery process** before taking any task.

**Goal:** Make `@ilamy/calendar` a complete, open-source (MIT) scheduling calendar with a
framework-agnostic headless core (`@ilamy/calendar` root), a single zero-dependency DOM renderer &
pointer engine (`./dom`) wrapped by symmetric thin framework adapters (`react`, `vue`, `svelte`,
`solid`, `angular`), one layered CSS token contract (`@ilamy/calendar/styles.css`) + pure
token-only theme mappers (`./styles/stylex`, `./styles/mui`), framework-agnostic DOM plugins, and
minimal migration friction from v3.

**Release shape:** 3.3 is the last minor before 4.0 (additive), and **4.0 is the single major
release** consolidating Temporal dates, the layered CSS token architecture, symmetric
multi-framework wrappers, scheduling rules, scheduler/resources, accessibility, RTL, print, and
interop. Bug fixes and small requests ship as patches without waiting on a planned release.
`docs/migration-v4.md` is the upgrade path from 3.x to 4.0.

### Phase map

| Release | Kind | Theme | Status |
|---|---|---|---|
| 3.3 | additive minor | Editing, time axis, formats, display toggles, async data, `ref` API, deprecations and migration docs | Shipped (`v3.3.0`, `v3.3.1`) |
| 4.0 | major | Temporal date core, ISO/`Date` public dates, layered CSS token contract (`styles.css`), single `lib/dom` renderer + pointer engine wrapped by all 5 frameworks (`/react`, `/vue`, `/svelte`, `/solid`, `/angular`, `/dom`), framework-agnostic plugins, pure token-only theme mappers (`./styles/stylex`, `./styles/mui`), zero UI-library/`@dnd-kit` dependencies + collapsed 2-package monorepo, standard defaults, scheduling rules, scheduler/virtualisation, accessibility, RTL, print, interop | In progress |

**Behaviour references:** as CLAUDE.md requires, RFC 5545 first, then the established calendar
conventions: FullCalendar (read at v7.1.1, https://fullcalendar.io/docs/all and its source) and
Google Calendar. Each feature's task plan cites the exact page or `file:line` it follows.

**Inputs:** a sweep on 2026-10-11 of the v3.2.1 code, established calendar conventions and all
109 issues on kcsujeet/ilamy-calendar. Supersedes `docs/feature-checklist.md` as
the plan of record; every item on that checklist is mapped to a release below.

---

## Where we stand (v3.2.1)

**Strengths every release protects:**

- Resource views in both orientations (vertical columns, and horizontal rows that act as a
  resource timeline), under MIT.
- RFC 5545 recurrence with per-occurrence overrides (`recurrenceId`), this/following/all scopes
  and a rule editor.
- Zone-correct clock math, with the known dayjs gap recorded in `docs/timezones.md`.

---

## Core vs plugin

The core stays small. **Rule:** a feature is a plugin when it can be built on the public
plugin contract (`IlamyPlugin`, canonical `packages/calendar/src/types/` in the v4.0 target layout) plus a small, general hook
that other plugins could also use. It stays in core only when it is woven into the core's
layout or interaction engine, or when it is a baseline every user is owed (accessibility,
RTL, print, correct dates).

**Contract today:** `transformEvents`, `managesEvent`, `applyEdit`, `applyDelete`,
`renderSlot`, `contribute`, `views`, `provider`. **Hooks the plan adds** (in 4.0;
each one lands with the first real plugin that needs it, because an unused public hook is a
liability and adding a hook later is non-breaking):

| Hook | Shape (sketch) | Used by |
|---|---|---|
| `allowPlacement` | `(candidate: PlacementCandidate) => boolean` aggregated with AND across plugins and the `eventAllow` prop | constraints, overlap, selection rules, external drag |
| Grid layers | `renderSlot('grid-layer', { range, resource, axis })` drawn under the events layer of every grid | background events, inverse-background, highlights |
| Event bar decorations | `renderSlot('event-bar', { event, segment })` | badges, custom affordances |
| Toolbar items | `contribute('toolbar-items', ctx)` | export button, plugin buttons |
| Event sources | `contribute('event-sources', range)` returning fetchers | ICS feed, Google Calendar |
| Resource transforms | `transformResources?(resources) => Resource[]` | scheduler hierarchy, ordering |

Each hook ships in the same PR as its first real plugin in 4.0, with unit tests and an
e2e spec through that plugin. No hook is added to the contract ahead of a plugin that uses it.

**Placement of every feature** is stated in its row below (Core / Plugin `name`).

---

## Global constraints (every release, every feature)

- **No breaking change outside 4.0.** A minor adds optional props, fields, callbacks or
  hooks whose defaults reproduce today's behaviour exactly. Widening a type is allowed;
  narrowing one is not.
- **A new name for an old thing lands as an alias, not a rename.** The old name keeps working
  until 4.0 and gains a `@deprecated` TSDoc tag naming the replacement. No runtime warnings.
- **Match the standard and cite it.** Before a feature's task plan is written, the manager
  reads the reference docs (FullCalendar v7.1.1 docs and source where they are vague) for every
  convention it follows and records the URL or `file:line`. RFC 5545 beats FullCalendar; Google
  Calendar decides where both are silent; where all three are silent the plan says so and
  justifies the choice (CLAUDE.md Hard Rules).
- **Prefer the conventional option names** (as used by FullCalendar) for new options unless an
  ilamy name already covers the concept (see D6), so the API is familiar.
- **New option values survive the Temporal migration:** clock times as `'HH:mm'`, durations as
  minutes or `'HH:mm'`, formats as `Intl.DateTimeFormatOptions`. 3.x callback dates stay
  `Dayjs` for consistency and convert in 4.0 with everything else.
- **TDD, both layers.** Failing-first unit tests and an e2e spec through `apps/e2e` (a query
  parameter in `harness-config.ts` first; a new fixture in `scenarios.ts` only when genuinely
  new). Geometry, pointers and measurement are e2e or unverified.
- **Prove each fix by reverting it** (`.agents/rules/change-impact.md`).
- **One feature, one branch, one PR.** A minor ships only when all of its features are merged.
- **Every feature updates:** its `docs/*.md`, the website docs page, `CHANGELOG`, the dev log,
  default English strings for new UI text, and `docs/feature-checklist.md`.
- **Simplicity first.** An option only a power user would miss may be cut; the
  cut is recorded in the feature's task plan.
- **Scope rule:** every new option must pass "real need versus performance, API and
  maintenance cost" before it is added. Example: slots stay 15, 30 and 60 minutes (finer
  slots multiply cells, droppables and layout work, and `snapDuration` already covers
  quarter-hour placement). A cut is recorded in the feature's row.
- **Bundle budget:** measured on the core closure, that is `dist/index.js` plus every chunk it
  imports, gzipped, never on the entry file alone. Report it before and after each feature;
  core growth over 2% for one feature needs a stated reason. Plugins are measured separately.
  3.3 grew the core closure by about 22.8% (42.1 KB to 51.7 KB gzip); that is accepted for the
  features it buys, and the core shrinks in 4.0 through the planned plugin moves (D7).
  Lazy-loading features behind new entry points was considered and rejected: 3 to 4 KB does not
  justify a split public API.

### Performance budgets

Absolute numbers, not "no regression versus `main`", measured in the e2e harness or a
benchmark script and recorded in the PR:

- **Continuous interactions** (drag, resize, scroll, auto-scroll): at most 10 ms of work per
  frame and never above 16 ms, per the RAIL guidance (https://web.dev/articles/rail).
- **Discrete interactions** (click, navigate, change view, open the form): at most 100 ms to the
  next paint at 1x and at most 200 ms at 4x CPU throttling, the "good" Interaction to Next Paint
  threshold (https://web.dev/articles/inp).

---

## Delivery process

The work runs without the owner in the loop. The main session is the **engineering manager**;
every other role is a Sonnet sub-agent. The owner is consulted only for the items listed
under **Escalation**.

### Roles

| Role | Who | Does | May not |
|---|---|---|---|
| Manager | main session (Opus) | Writes each feature's task plan with verified citations; dispatches; runs final verification; commits, pushes and opens the PR; writes the dev log; keeps this plan current | Delegate final verification; merge |
| Engineer | Sonnet, own git worktree | Implements the task plan by TDD (unit + e2e), runs the gates, reports the diff with test output and the revert proof | Commit; change scope; touch other features' files |
| QA | Sonnet, several in parallel, one per persona | Exercises the feature through the e2e harness as its persona, writes each finding as a failing Playwright spec plus repro steps | Edit `src/` |
| Reviewer | the `kc-gates:kc-code-review` gates (`.claude/review-conventions.md` included) | Grades the diff per rule | Fix code |
| Spec auditor | Sonnet | Checks the implementation against the cited FullCalendar/RFC behaviour, line by line | Edit code |

### Per-feature loop

1. **Plan** (manager): task plan in `docs/superpowers/plans/`, with API, citations,
   acceptance criteria, the personas that must sign off, and a placement (core/plugin) decision.
2. **Build** (engineer): branch `roadmap/<release>-<feature>` in a worktree; failing tests
   first; implementation; `bun run ci` and `bun run e2e` green; revert proof recorded.
3. **QA** (personas, parallel): each persona runs its activity script against the branch.
   Every finding is a failing spec. Findings go back to the engineer; QA reruns until clean.
4. **Review** (gates + spec auditor, parallel): FAIL verdicts go back to the engineer.
5. **Final verification** (manager), all of it personally, none of it delegated:
   - read the full diff;
   - rerun `bun run ci` and `bun run e2e` from a clean install in the worktree;
   - rerun the e2e suite with the machine zone set to a non-UTC zone (`TZ=America/Vancouver`)
     when the feature touches dates;
   - revert the core fix and watch its tests fail, then restore;
   - drive the feature's main path in the browser harness;
   - confirm every QA finding is now a passing spec, and no spec was weakened or deleted;
   - confirm the docs, the changelog entry and the dev log are written.
6. **Ship** (manager): commit on the feature branch, push it, and open a PR against `main`
   whose body states the feature, the citations, the evidence from step 5 and the linked
   issue. Never commit to `main`; never leave work as a local-only commit. **The owner merges.**
   A PR the owner sends back re-enters the loop at step 2.

A feature is done only when step 5 passes in full. "Tests are green" is not done.

### QA personas

Each persona has a fixed activity script, so its coverage is repeatable. Scripts live in
`apps/e2e/tests/personas/` and grow as features land; a persona's findings are promoted into
the regular spec files once fixed.

| Persona | Setup | Activities |
|---|---|---|
| Office scheduler | week/day views, recurrence plugin, 30-min slots | create by click and by drag; edit in the form; move; resize; recurring create; edit and delete with each scope; undo via `revert` |
| Resource dispatcher | horizontal and vertical resource views, 50+ resources, 15-min slots | move across resources; multi-resource events; overlap rules; scroll and sticky labels; hierarchy expand/collapse |
| Mobile user | 375×812 viewport, touch | long-press move and create; scroll without accidental drags; "+N more"; form usability |
| Keyboard and screen-reader user | keyboard only, Axe | tab order; arrow navigation; open, move and resize by keyboard; live-region announcements; zero Axe violations |
| International user | `de-DE`, `ar` (RTL), 24h, `timezone` prop, machine zone `America/Havana` | DST-change weeks; first day Monday; RTL mirroring; translated strings; zone-correct times |
| Integrator | harness props driven by URL | async fetcher with slow and failing responses; `ref` API; reject a save and call `revert`; plugin combinations; SSR build of `examples/` |
| Edge-case hunter | month and week views | all-day ↔ timed drags; events across midnight, weeks and months; exclusive end at midnight; `dayMaxEvents` overflow; hidden days; zero-length and very long events |
| Upgrader | a v3.2.1 configuration | every existing prop at its old value renders and behaves exactly as before; deprecated aliases still work |

### Infrastructure prerequisites (first task, before any feature)

- **Parallel-safe e2e:** `apps/e2e/playwright.config.ts` pins port 4200 with `--strictPort`,
  so two worktrees running e2e at once collide. Make the port come from an env var
  (default 4200) and give each worktree its own.
- **Persona folder:** `apps/e2e/tests/personas/` with the shared setup each persona needs.
- **Agent rules:** CLAUDE.md records the delivery process and where autonomy ends (feature
  branches and PRs, owner merges), so every sub-agent reads the same rules.

### Escalation (the only reasons to involve the owner)

- An open decision (D2–D10 below) whose release has started.
- A standard that is genuinely ambiguous after FullCalendar, RFC 5545 and Google Calendar are
  checked.
- Anything outward-facing beyond feature-branch PRs: merging, commenting on or closing
  issues, posting reviews, publishing to npm, deploying the website. Pushing a
  `roadmap/*` branch and opening its PR is pre-approved and is not an escalation.
- Anything destructive outside a feature branch.

---

## Release 3.3 — editing and time axis

Mostly what current users have asked for: kcsujeet/ilamy-calendar#93 (resize),
kcsujeet/ilamy-calendar#101 (15-minute snapping in resource views), #7, #40, #50, #86, #107,
#138 (visible hours and slot options).

Status: every PR below is an open, stacked PR (#335 to #359) awaiting the owner's merge;
"Shipped" means built, reviewed and verified in the stack.

| # | Feature | Placement | PR | Notes |
|---|---|---|---|---|
| 3.3.0 | **Truthful docs** | — | Shipped: #337 | `README.md:53` and `packages/calendar/README.md:53` claim resize; the README claims overlap prevention; audit "100% test coverage" and "100+ locales". Same audit on `apps/website`. Done in #337; ships with 3.3, or earlier as a 3.2.x patch if the owner wants the corrected claims out first. |
| 3.3.1 | **Change info** | Core | Shipped: #342 | Add `delta` (`{ days, milliseconds }`, whole calendar days plus wall-clock time) and `revert()` to `EventsChange` (`packages/types/src/index.ts:170`). `revert` restores every row of the action, recurring scopes included (#309), and fires no callbacks. No `oldEvent` field: `EventsChange.event` is already the pre-change event; the docs state the mapping. Touch: `hooks/calendar-data/event-changes.ts`, `use-event-mutations.ts`, `use-plugin-mutations.ts`. |
| 3.3.2 | **Edit permissions** | Core | Shipped: #340 | `editable`, `eventStartEditable`, `eventDurationEditable`, `eventAllow(info)`; per-event `editable`/`startEditable`/`durationEditable`, per-event over calendar as in FullCalendar. Evaluated on every snap through the existing `isCellDisabled` path in `drag-and-drop/dnd-utils.ts`. `disableDragAndDrop` becomes an alias of `editable={false}`. |
| 3.3.3 | **Event resize** | Core (shares the drag engine) | Shipped: #345 | End-edge handle on the segment with `isEnd`; start edge only with `eventResizableFromStart`. Snaps to the slot (time grid) or day (day grid); minimum one slot or one day; end stays exclusive (#248). Recurring occurrences go through the scope dialog. No separate `onEventResize`: a resize is one `onEventsChange` action, with `endDelta` beside `delta` (the `startDelta` of FullCalendar's `eventResize`). e2e: real pointer and touch resize in week, month, horizontal resource day, vertical resource week; refusal by `eventAllow`. |
| 3.3.4 | **Visible hours** | Core | Shipped: #346 | `slotMinTime`, `slotMaxTime` (`'HH:mm'`), independent of `hideNonBusinessHours`. Touch: `utils/view-hours.ts`. |
| 3.3.5 | **Slot and snap sizes** | Core | Shipped: #349, trimmed in #356; drag-preview fix #352 | `SlotDuration` stays `15 \| 30 \| 60`; `snapDuration: 15 \| 30` (core of #101, #138): finer than the cell and dividing it, for drag, resize and drag-to-create in the vertical grid and the horizontal resource timeline; otherwise the cell's own size is used. **Cut:** slots longer than an hour (ilamy draws hour rows), slot sizes of 1 to 12 minutes (the stack briefly widened `slotDuration` to any divisor of 60; narrowed back before release since no user needs that granularity and it multiplies cells, droppables and layout work), snap sizes other than 15 and 30, and `slotLabelInterval`/`slotHeaderInterval` (every hour row is labelled). |
| 3.3.6 | **Formats** | Core | Shipped: #343 | `slotLabelFormat`, `eventTimeFormat`, `displayEventTime`, `displayEventEnd`, `dayHeaderFormat`, `titleFormat`, all `Intl.DateTimeFormatOptions`; `timeFormat` stays as shorthand. |
| 3.3.7 | **Display toggles** | Core | Shipped: #344 (part a), #347 (part b) | `allDaySlot`; `nowIndicator` (default true, see D3); `weekNumbers` incl. month rows, `weekNumberCalculation: 'local' \| 'ISO'` (a custom function form was cut before release to keep the API simple); `weekends`; `hiddenDays` in every view; `scrollTime` and `scrollToNow` scroll to the exact minute (shipped). `hiddenDays` and `weekends` apply to the month, week and day views and to every resource arrangement (part b, shipped): bars clamp to the nearest drawn day, the day view skips hidden days, and the year view and the agenda plugin keep every day. |
| 3.3.8 | **Async events** | Core (one prop) | Shipped: #348 | Shipped. `events` also accepts `(info, { signal }) => Promise<Event[]>` (`EventsFetcher`); `loading(isLoading)`; `lazyFetching`; superseded fetches are aborted; `onEventsError`; `refetchEvents()` on the context API (the `ref` API, 3.3.9, surfaces it too). Touch: `hooks/calendar-data/use-events-fetcher.ts`. Cuts: multiple `eventSources` and JSON-feed URLs (a feed plugin is 4.0.32). |
| 3.3.9 | **Ref API** | Core | Shipped: #351 | `ref` prop on `IlamyCalendar` and the deprecated alias (a regular prop in React 19, `useImperativeHandle`: https://react.dev/reference/react/useImperativeHandle). `ref.current` is the `useIlamyCalendarContext()` object (D6 keeps ilamy's names: `selectDate` is FullCalendar's `gotoDate` and fires `onDateChange`, `setCurrentDate` is the silent raw setter, `nextPeriod`, `setView`, `refetchEvents`, ...), plus `scrollToTime(time)`. Touch: `components/ilamy-calendar.tsx`, `hooks/use-scroll-to-time.ts`. Cuts: `select`/`unselect` (4.0.14); a separate controller hook (the ref plus `headerComponent` cover custom toolbars). |
| 3.3.10 | **Async resources** | Core | Shipped: #353 | Shipped. `resources` also accepts `(info, { signal }) => Promise<Resource[]>` (`ResourcesFetcher`), called once on mount and on `refetchResources()` (context API; the `ref` from 3.3.9 publishes the whole context API, so it is there too), or on navigation with `refetchResourcesOnNavigate`; `resourcesSet(resources)` after the list is set and after every change; `onResourcesError`; `loading` is one signal for both fetchers. Touch: `hooks/calendar-data/use-range-fetcher.ts` (the abort/latest/loading rules for events and resources, once). |

Performance work in the stack: #354 derives a day's hour rows once and builds them once per
render (a 500-resource week went from seconds to about 4 to 7 ms; `scripts/bench-day-hours.tsx`
exits 1 over budget, `bun run bench:day-hours`). #357 processes a range's events once and buckets
them by resource and column; #358 places events by binary search over column start times; #359
makes each bar one drag source for move and resize. Measured against 3.2.1 on a 2,000-event month
(Chromium, 90th percentile): next/previous 310 to 43 ms, open form 328 to 52 ms, drop 670 to
127 ms. A 500-event week stays close to 3.2.1 (next/previous 46 to 53 ms), the cost of drawing
resize handles, and was accepted.

**Release tasks of 3.3** (they ship in 3.3, not as separate features):

| # | Task | Notes |
|---|---|---|
| 3.3.11 | **Deprecation set** | Every name 4.0 removes whose replacement already works in 3.x has a `@deprecated` TSDoc tag; `docs/migration-v4.md` lists them all (this PR). Tagged: `disableDragAndDrop`, `IlamyResourceCalendar` and its props type. Not tagged: `dayjs`, `Dayjs`, `ManipulateType`, because their replacement (ISO strings or `Date`) only exists in 4.0 and a tag would strike through every consumer's date types. |
| 3.3.12 | **Migration guides** | For users coming from other calendar libraries: option mapping, deliberate deviations, a ported example. Grows with each 4.x release. |

**Acceptance:** a consumer can resize, reject any move or resize before or after it lands, undo
it with one call, and configure the time axis.

## Release 4.0 — Complete v4 platform (Temporal, Layered CSS, Multi-Framework, Scheduler & Reach)

All v4 work ships under **4.0** (no separate 4.1/4.2/4.3 roadmap). Detailed architecture plans:
- CSS token contract, core view-models, and symmetric wrappers: `docs/superpowers/plans/2026-11-22-v4-css-tokens-and-symmetric-core-plan.md`
- Single `lib/dom` renderer, token-only styling mappers & collapsed 2-package monorepo: `docs/superpowers/plans/2026-11-22-v4-zero-ui-deps-and-collapsed-monorepo-plan.md`

### 4.0A — Temporal core, standard defaults & architecture foundation

| # | Change | Placement | Notes |
|---|---|---|---|
| 4.0.1 | **Date core on `temporal-polyfill`** | Core | `fns` API inside shared utils (`src/utils/temporal/`); formatting through `Intl`. Acceptance check as written in `docs/timezones.md` (awkward zones × every clock change × several machine zones vs an `Intl`-only reference). |
| 4.0.2 | **Public dates as ISO strings or `Date`** | Core | Events, cell info, render props, callbacks, the plugin contract. Remove `dayjs`, `Dayjs`, `ManipulateType` exports. Add `timezone` to the context API. |
| 4.0.3 | **Several zones per page** | Core | Falls out of 4.0.1 (zero module-global zone state). e2e spec. |
| 4.0.4 | **Optional built-ins become plugins** | Plugins | iCal export becomes `plugins/ical` (header button via toolbar-items hook); year view becomes `plugins/year` (D7). |
| 4.0.5 | **Standard defaults** | Core | `BusinessHours.daysOfWeek` defaults to Monday–Friday; `nowIndicator` defaults `false` (D3); `editable` defaults `false` (D8); `displayEventTime` defaults `true` and `displayEventEnd` defaults `false` in month / `true` in time-grid views (D9); `onDateChange`/`currentRange` trim to drawn days when `hiddenDays`/`weekends` hide days (D10); month cell clicks and drag-to-create selections report `allDay: true` (D11). Business hours (and month padding days) only shade by default; restricting is opt-in via `eventConstraint` and `selectConstraint`. |
| 4.0.6 | **Remove deprecated names** | Core | Everything in `docs/migration-v4.md`, including `IlamyResourceCalendar` and `disableDragAndDrop`. Keep `onEventAdd`/`onEventUpdate`/`onEventDelete` alongside `onEventsChange` (D2). |
| 4.0.7 | **Plugins on new date types** | Plugins | Recurrence keeps RFC 5545 floating-time correctness. |
| 4.0.8 | **kcsujeet/ilamy-calendar#314** | Core | Verify whether the Temporal core fixes it; do not assume. |
| 4.0.9 | **Visible resize handles** | Core | Discoverable event resize handles: invisible at rest, subtle 3-dot grip on event hover, full opacity on handle hover (`currentColor`, adapts to light/dark). |
| 4.0.10 | **Layered CSS contract & pure token mappers (`styles.css`, `./styles/stylex`, `./styles/mui`)** | Styles | `@layer ilamy.base` (structural layout/grid/sticky/scroll, plus dialogs, popovers, inputs, selects, and checkboxes; zero Tailwind dependency) + `@layer ilamy.theme` (`--ilamy-*` CSS tokens with automatic shadcn/Tailwind bridges for Base UI #401, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS). Delete hardcoded colors/pixels in theme JS and boolean styling heuristics. Every design-system integration is a framework-agnostic `--ilamy-*` token mapper (`./styles/stylex`, `./styles/mui` with `createMuiCalendarTheme`) with zero UI-component wrappers. |
| 4.0.11 | **Option A single `lib/dom` renderer & symmetric framework wrappers (`motion` pattern)** | Core + DOM + Adapters | Lift view-model generation (month, week/day, `weekViewGranularity`, resource timelines, constraints, translations) into `src/lib/` and `src/utils/`. Make `src/lib/dom/` (`./dom`) the single calendar UI renderer and zero-dependency pointer drag/resize engine wrapped by ALL 5 frameworks (`./react` via `ReactDOM.createPortal` + `useSyncExternalStore` + Context, `./vue`, `./svelte`, `./solid`, `./angular`) plus Vanilla DOM. Symmetric entry points: `.` (headless core, zero framework), `./react`, `./vue`, `./svelte`, `./solid`, `./angular`, `./dom`, `./styles.css`, `./styles/base.css`, `./styles/theme.css`, `./styles/stylex`, `./styles/mui`, `./plugins/*`. |
| 4.0.11b | **Framework-agnostic plugins, zero UI/`@dnd-kit` deps & collapsed 2-package monorepo** | Core + Plugins + Monorepo | Collapse 18 redundant micro-packages into `packages/calendar/src/` (`config/`, `types/`, `utils/`, `lib/{controller,layout,view-models,dom}/`, `features/{styling,adapters,plugins}/`) and move demo-only shadcn chrome to `packages/playground/src/components/ui/` with strict Biome `noRestrictedImports` boundaries (zero cross-feature imports in `features/**`). Rewrite all 5 plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`) on ONE framework-agnostic DOM `IlamyPlugin` contract (removing boolean `enable*` flags and hard-wired `rrule` from `lib/dom`). Remove `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material` runtime components, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `CalendarComponents`; custom UI forms/headers/events use `renderEventForm` / `renderHeader` / `renderEvent` / `renderResource` portals/slots. Only `temporal-polyfill` stays in `dependencies`; `rrule` is optional only for `./plugins/recurrence`. Playground switches Frameworks × Token Styles (`Default CSS \| MUI Tokens \| StyleX \| Unstyled`). |

### 4.0B — Scheduling rules & drag ecosystem

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.0.12 | **Background events** | Plugin `background-events` (grid-layer hook) | `display: 'background' \| 'inverse-background'` on events; per-resource inverse rule as FullCalendar (verify). Core gains only `display: 'none'` and `className`. |
| 4.0.13 | **Constraints and overlap** | Plugin `constraints` (`allowPlacement` hook) | `eventOverlap`, `selectOverlap`, remaining `eventConstraint`/`selectConstraint` values (`groupId`, event object/array alongside `'businessHours'`), per-event `overlap`/`constraint`/`groupId`, `validRange`. One answer for drag, resize, select and form. |
| 4.0.14 | **Selection** | Core state; drag-to-create stays the UI plugin (D4) | `selectable`, `selectMirror`, `unselectAuto`, `onSelect`, `onUnselect`, `selectAllow`, `ref.select/unselect`. |
| 4.0.15 | **External drag-in, between calendars** | Plugin `external-drag` | `<CalendarDraggable eventData>`, consumer `DndContext`, `drop`, `onEventReceive`, `onEventLeave`. Study https://fullcalendar.io/docs/external-dragging. |
| 4.0.16 | **Group moves** | Plugin `constraints` (via `applyEdit`) | Moving or resizing one event of a `groupId` moves all of them in one `onEventsChange`. |

### 4.0C — Scheduler & resources

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.0.17 | **Resource hierarchy and grouping** | Plugin `scheduler` (`transformResources` + slots) | `parentId` or `children` (FullCalendar resource parsing), expand/collapse, `resourcesInitiallyExpanded`, `resourceGroupField`. |
| 4.0.18 | **Resource columns** | Plugin `scheduler` | `resourceColumns: [{ field \| render, header, width }]`, resizable. |
| 4.0.19 | **Resource ordering** | Plugin `scheduler` | `resourceOrder`, FullCalendar syntax. |
| 4.0.20 | **Timeline without resources** | Plugin `timeline` (`PluginView`) | Day/week/month timeline over the horizontal grid. |
| 4.0.21 | **Agenda in resource mode** | Plugin `agenda` | Resource-aware agenda list. |
| 4.0.22 | **Virtualisation** | Core (grid rendering), opt-in prop | Measure first (#300 and a 500-resource timeline, recorded in `docs/performance.md`). Must keep sticky labels (#290) and drag auto-scroll. |
| 4.0.23 | **Resource ref API** | Core | `getResources`, `getResourceById`, `refetchResources`. |

### 4.0D — Views, customisation, accessibility, RTL, print & interop

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.0.24 | **Multi-month view** | Plugin `multi-month` | `multiMonthYear` equivalent. |
| 4.0.25 | **Event order and layout** | Core | `eventOrder`, `slotEventOverlap: false` side-by-side mode, `eventMinHeight`, `eventMaxStack`. |
| 4.0.26 | **Toolbar config** | Core | `headerToolbar: { start, center, end }`, `buttons` (FullCalendar v7 naming), plugin items via toolbar hook. |
| 4.0.27 | **Render hooks and callback context** | Core | Public `render*`/`get*ClassName` for day cell, day header, slot label, "more" link, resource label; `navLinks` with callbacks; `jsEvent`/`el` on callbacks; `onEventMouseEnter`/`Leave`. |
| 4.0.28 | **Sizing and month options** | Core | `height`, `contentHeight`, `aspectRatio`, `expandRows`, `fixedWeekCount`, `showNonCurrentDates`. |
| 4.0.29 | **Accessibility** | Core | ARIA grid roles, roving tabindex, keyboard move/resize/select, translated live-region announcements, Axe in the e2e gate with zero violations. |
| 4.0.30 | **RTL** | Core | `direction` (default: document `dir`); CSS logical properties; mirrored layout and drag math; `&direction=rtl` axis in the e2e matrix. |
| 4.0.31 | **Print** | Core | `@media print` rules; e2e via `page.emulateMedia({ media: 'print' })`. |
| 4.0.32 | **Interop** | Plugins `ical` (import + TZID/VTIMEZONE export per RFC 5545 §3.6.5), `ics-feed`, `google-calendar` | Feeds use the event-sources hook. Emit `DTSTART;TZID=` and `VTIMEZONE` so recurring series preserve wall-clock time across DST changes. |
| 4.0.33 | **Move a whole series to another weekday** | Plugin `recurrence` | Dragging an occurrence with scope "all events" to another weekday shifts `BYDAY` / `BYMONTHDAY` together with `DTSTART`, matching Google Calendar. |

**Acceptance (4.0):** `bun run ci` and `bun run e2e` green with machine zones UTC, Vancouver, London, and Havana; zero-Tailwind standalone fixtures + cross-framework parity green across React, Vue, Svelte, Solid, and Angular; every app in `examples/` upgraded by following `docs/migration-v4.md` alone; a 500-resource, 3-level scheduler scrolls smoothly within RAIL/INP budgets.

---

## Open decisions (escalate when the release that needs one starts)

Each decision below is listed in `docs/migration-v4.md` as "under consideration" until it is
settled.

- **D1 — Resolved:** 4.0 comes after 3.3 and consolidates all v4 capabilities into one major release on Temporal.
- **D2 — Resolved (4.0):** Keep `onEventAdd`, `onEventUpdate` and `onEventDelete` alongside
  `onEventsChange`, matching FullCalendar (`eventAdd`, `eventChange`, `eventRemove` alongside
  `eventsSet`).
- **D3 — Resolved (4.0):** Flip `nowIndicator` default to `false`, matching FullCalendar
  (`https://fullcalendar.io/docs/nowIndicator`).
- **D4 — Selection in core vs plugin.** Recommended: core state, plugin UI.
- **D5 — Resolved (4.0):** Option A single-renderer architecture inside a collapsed 2-package monorepo (`packages/calendar` for the published `@ilamy/calendar` library under `src/{config,types,utils,lib,features}/`; `packages/playground` for the private demo app and demo-only shadcn chrome under `src/components/ui/`). Headless, framework-agnostic core on `@ilamy/calendar` root `.` (`motion` pattern: zero DOM, zero React, zero CSS — Temporal date engine, controller, layout math, view-models, types, `defaultTranslations`), ONE single zero-framework DOM renderer & pointer dnd/resize engine (`src/lib/dom/`, `./dom`), 5 symmetric thin framework wrappers (`@ilamy/calendar/{react,vue,svelte,solid,angular}`, where `./react` uses `ReactDOM.createPortal` + `useSyncExternalStore` + Context), ONE framework-agnostic DOM plugin contract (`IlamyPlugin`) shared across all 5 frameworks + DOM, ONE shared layered CSS contract (`@ilamy/calendar/styles.css`, `./styles/base.css`, `./styles/theme.css` with automatic shadcn/Tailwind bridges), and pure token-only styling/theme mappers (`./styles/stylex`, `./styles/mui`) with zero UI-component wrappers.
- **D6 — Clashing names** (`firstDayOfWeek`/`firstDay`, `timezone`/`timeZone`,
  `onCellClick`/`dateClick`). Recommended: keep ilamy's, document the mapping. Needed by the
  migration guides (3.3.12).
- **D7 — Resolved (4.0):** Move year view (`plugins/year`) and iCal export (`plugins/ical`)
  out of core into plugins, matching FullCalendar (`multimonth`, `icalendar`); evaluate the
  resource axis and move it only if the plugin contract carries it cleanly.
- **D8 — Resolved (4.0):** Flip `editable` default to `false` (read-only unless enabled),
  matching FullCalendar (`https://fullcalendar.io/docs/editable`).
- **D9 — Resolved (4.0):** Default `displayEventTime` to `true`, and `displayEventEnd` to
  `false` in month view and `true` in time-grid (week/day) views, matching FullCalendar
  (`https://fullcalendar.io/docs/displayEventTime`, `displayEventEnd`).
- **D10 — Resolved (4.0):** Trim `onDateChange` and `currentRange` to the drawn (visible)
  days when `hiddenDays` or `weekends` hide days, matching FullCalendar's `activeStart` /
  exclusive `activeEnd` on `datesSet` (`https://fullcalendar.io/docs/datesSet`, `view-object`).
- **D11 — Resolved (4.0):** Month cell clicks and drag-to-create selections report
  `allDay: true`, matching FullCalendar's day grid (`https://fullcalendar.io/docs/dateClick`,
  `DayGridRows.tsx:256`, v7.1.1).
- **D12 — Resolved (4.0):** Option A single DOM renderer + zero UI-library/`@dnd-kit` dependencies in `@ilamy/calendar`: remove `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material` runtime components, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, `CalendarComponents`, `useCalendarComponents`, `muiCalendarComponents`, `useMuiCalendarTheme`, and `./react/mui`. `lib/dom` renders the calendar UI and runs the single zero-dependency pointer drag/resize engine across all 5 frameworks + Vanilla DOM; custom UI forms/headers/events (Base UI #401, Radix, MUI, Vuetify, etc.) use `renderEventForm` / `renderHeader` (`headerComponent`) / `renderEvent` / `renderResource` portals/slots; and all design-system integrations (`./styles.css`, `./styles/stylex`, `./styles/mui` with `createMuiCalendarTheme`) are pure framework-agnostic `--ilamy-*` token mappers. Keep `temporal-polyfill` as the sole direct runtime dependency; make `rrule` an optional peer only for `./plugins/recurrence` (removing hard-wired `rrule` and boolean `enable*` flags from `src/lib/dom/`), and keep framework runtimes, `@stylexjs/stylex` (types), and `tailwindcss` as optional `peerDependencies`.

## Checklist mapping

| `docs/feature-checklist.md` item | Feature |
|---|---|
| `revert()` on drop | 3.3.1 |
| `oldEvent` in callbacks | 3.3.1 |
| Range selection `onSelect` | 4.0.14 |
| Events as a function | 3.3.8 |
| `loading` callback | 3.3.8 |
| Event resize (`onEventResize`) | 3.3.3, reported through `onEventsChange` + `endDelta` |
| External dragging | 4.0.15 |
| `eventAllow` / `selectAllow` | 3.3.2 / 4.0.14 |
| `delta` | 3.3.1 |
| `slotMinTime` / `slotMaxTime` | 3.3.4 |
| `jsEvent`, `el` | 4.0.27 |
| Nav link callbacks | 4.0.27 |
| `allDaySlot` | 3.3.7 |
| `slotLabelFormat` / `eventTimeFormat` | 3.3.6 |
| `resourcesSet`, resources as function | 3.3.10 |
