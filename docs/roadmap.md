# Roadmap

> **For agentic workers:** This is the master plan. Each feature below becomes its own detailed
> task plan (per `superpowers:writing-plans`, saved to `docs/superpowers/plans/`) when its
> release starts. Do not build from this document alone: the API sketches are starting points,
> and each one is checked against the standard it cites before its task plan is written.
> Read **Delivery process** before taking any task.

**Goal:** Make `@ilamy/calendar` a complete, open-source (MIT) scheduling calendar for React,
scheduler features included, with the core kept small and everything optional shipped as a
plugin, and without leaving current users stranded at any release.

**Release shape:** two additive minors (3.3, 3.4), one breaking major (4.0), then three
additive 4.x minors. Bug fixes and small requests from current users ship as patches from
`main` at any time and never wait for a planned minor. Security or data-loss fixes are
backported to a 3.x patch for three months after 4.0 (owner may change the window).

**Behaviour references:** as CLAUDE.md requires, RFC 5545 first, then the established calendar
conventions: FullCalendar (read at v7.1.1, https://fullcalendar.io/docs/all and its source) and
Google Calendar. Each feature's task plan cites the exact page or `file:line` it follows.

**Inputs:** a sweep on 2026-10-11 of the v3.2.1 code, established calendar conventions and all
109 issues on kcsujeet/ilamy-calendar. Supersedes `docs/api-parity-checklist.md` as
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

The core stays small. **The rule:** a feature is a plugin when it can be built on the public
plugin contract (`IlamyPlugin`, `packages/types/src/index.ts:366`) plus a small, general hook
that other plugins could also use. It stays in core only when it is woven into the core's
layout or interaction engine, or when it is a baseline every user is owed (accessibility,
RTL, print, correct dates).

**Contract today:** `transformEvents`, `managesEvent`, `applyEdit`, `applyDelete`,
`renderSlot`, `contribute`, `views`, `provider`. **Hooks the plan adds** (3.4, additive):

| Hook | Shape (sketch) | Used by |
|---|---|---|
| `allowPlacement` | `(candidate: PlacementCandidate) => boolean` aggregated with AND across plugins and the `eventAllow` prop | constraints, overlap, selection rules, external drag |
| Grid layers | `renderSlot('grid-layer', { range, resource, axis })` drawn under the events layer of every grid | background events, inverse-background, highlights |
| Event bar decorations | `renderSlot('event-bar', { event, segment })` | badges, custom affordances |
| Toolbar items | `contribute('toolbar-items', ctx)` | export button, plugin buttons |
| Event sources | `contribute('event-sources', range)` returning fetchers | ICS feed, Google Calendar |
| Resource transforms | `transformResources?(resources) => Resource[]` | scheduler hierarchy, ordering |

Each hook lands with an internal test plugin that exercises it, unit tests, and an e2e spec,
before any real plugin depends on it.

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
  default English strings for new UI text, and `docs/api-parity-checklist.md`.
- **Simplicity first.** An option only a power user would miss may be cut; the
  cut is recorded in the feature's task plan.
- **Bundle budget:** report core `dist/index.js` gzipped size before and after each feature.
  Core growth over 2% for one feature needs a stated reason; plugins are measured separately.

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
| Reviewer | the `code-review:review-code` gates (`.claude/review-conventions.md` included) | Grades the diff per rule | Fix code |
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

- An open decision (D1–D8 below) whose release has started.
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

| # | Feature | Placement | Notes |
|---|---|---|---|
| 3.3.0 | **Truthful docs** | — | `README.md:53` and `packages/calendar/README.md:53` claim resize; the README claims overlap prevention; audit "100% test coverage" and "100+ locales". Same audit on `apps/website`. Ships as a 3.2.2 patch immediately. |
| 3.3.1 | **Change info** | Core | Add `delta` (`{ days, milliseconds }`, whole calendar days plus wall-clock time) and `revert()` to `EventsChange` (`packages/types/src/index.ts:170`). `revert` restores every row of the action, recurring scopes included (#309), and fires no callbacks. No `oldEvent` field: `EventsChange.event` is already the pre-change event; the docs state the mapping. Touch: `hooks/calendar-data/event-changes.ts`, `use-event-mutations.ts`, `use-plugin-mutations.ts`. |
| 3.3.2 | **Edit permissions** | Core | `editable`, `eventStartEditable`, `eventDurationEditable`, `eventAllow(info)`; per-event `editable`/`startEditable`/`durationEditable`, per-event over calendar as in FullCalendar. Evaluated on every snap through the existing `isCellDisabled` path in `drag-and-drop/dnd-utils.ts`. `disableDragAndDrop` becomes an alias of `editable={false}`. |
| 3.3.3 | **Event resize** | Core (shares the drag engine) | End-edge handle on the segment with `isEnd`; start edge only with `eventResizableFromStart`. Snaps to the slot (time grid) or day (day grid); minimum one slot or one day; end stays exclusive (#248). Recurring occurrences go through the scope dialog. No separate `onEventResize`: a resize is one `onEventsChange` action, with `endDelta` beside `delta` (the `startDelta` of FullCalendar's `eventResize`). e2e: real pointer and touch resize in week, month, horizontal resource day, vertical resource week; refusal by `eventAllow`. |
| 3.3.4 | **Visible hours** | Core | `slotMinTime`, `slotMaxTime` (`'HH:mm'`), independent of `hideNonBusinessHours`. Touch: `utils/view-hours.ts`. |
| 3.3.5 | **Slot and snap sizes** | Core | `SlotDuration` stays `15 \| 30 \| 60`; `snapDuration: 15 \| 30` (core of #101, #138): finer than the cell and dividing it, for drag, resize and drag-to-create in the vertical grid and the horizontal resource timeline; otherwise the cell's own size is used. **Cut:** slots longer than an hour (ilamy draws hour rows), slot sizes of 1 to 12 minutes (the stack briefly widened `slotDuration` to any divisor of 60; narrowed back before release since no user needs that granularity and it multiplies cells, droppables and layout work), snap sizes other than 15 and 30, and `slotLabelInterval`/`slotHeaderInterval` (every hour row is labelled). |
| 3.3.6 | **Formats** | Core | `slotLabelFormat`, `eventTimeFormat`, `displayEventTime`, `displayEventEnd`, `dayHeaderFormat`, `titleFormat`, all `Intl.DateTimeFormatOptions`; `timeFormat` stays as shorthand. |
| 3.3.7 | **Display toggles** | Core | `allDaySlot`; `nowIndicator` (default true, see D3); `weekNumbers` incl. month rows, `weekNumberCalculation: 'local' \| 'ISO'` (a custom function form was cut before release to keep the API simple); `weekends`; `hiddenDays` in every view; `scrollTime` and `scrollToNow` scroll to the exact minute (shipped). `hiddenDays` and `weekends` apply to the month, week and day views and to every resource arrangement (part b, shipped): bars clamp to the nearest drawn day, the day view skips hidden days, and the year view and the agenda plugin keep every day. |
| 3.3.8 | **Async events** | Core (one prop) | Shipped. `events` also accepts `(info, { signal }) => Promise<Event[]>` (`EventsFetcher`); `loading(isLoading)`; `lazyFetching`; superseded fetches are aborted; `onEventsError`; `refetchEvents()` on the context API (the `ref` API, 3.3.9, surfaces it too). Touch: `hooks/calendar-data/use-events-fetcher.ts`. Cuts: multiple `eventSources` and JSON-feed URLs (a feed plugin is 4.3.9). |
| 3.3.9 | **Ref API** | Core | `ref` prop on `IlamyCalendar` and the deprecated alias (a regular prop in React 19, `useImperativeHandle`: https://react.dev/reference/react/useImperativeHandle). `ref.current` is the `useIlamyCalendarContext()` object (D6 keeps ilamy's names: `setCurrentDate`, `nextPeriod`, `setView`, `refetchEvents`, ...), plus `scrollToTime(time)`. Touch: `components/ilamy-calendar.tsx`, `hooks/use-scroll-to-time.ts`. Cuts: `select`/`unselect` (4.1.3); a separate controller hook (the ref plus `headerComponent` cover custom toolbars). |
| 3.3.10 | **Async resources** | Core | Shipped. `resources` also accepts `(info, { signal }) => Promise<Resource[]>` (`ResourcesFetcher`), called once on mount and on `refetchResources()` (context API; the `ref` from 3.3.9 publishes the whole context API, so it is there too), or on navigation with `refetchResourcesOnNavigate`; `resourcesSet(resources)` after the list is set and after every change; `onResourcesError`; `loading` is one signal for both fetchers. Touch: `hooks/calendar-data/use-range-fetcher.ts` (the abort/latest/loading rules for events and resources, once). |

**Acceptance:** a consumer can resize, reject any move or resize before or after it lands, undo
it with one call, and configure the time axis.

## Release 3.4 — data, control, contract, deprecations

The last additive release before 4.0.

| # | Feature | Placement | Notes |
|---|---|---|---|
| 3.4.1 | *(moved to 3.3.8)* | | |
| 3.4.2 | *(moved to 3.3.10)* | | |
| 3.4.4 | **Plugin contract hooks** | Core | The six hooks in **Core vs plugin**, each with an internal test plugin. |
| 3.4.5 | **Deprecation set** | Core | Every name 4.0 removes has its replacement and a `@deprecated` tag. `docs/migration-v4.md` drafted. |
| 3.4.6 | **Migration guides** | Docs | For users coming from other calendar libraries: option mapping, deliberate deviations, a ported example. Grows with each 4.x release. |

**Acceptance:** a consumer drives the calendar from outside, loads data by visible range, and a
third party can write every 4.x plugin against the public contract alone.

## Release 4.0 — Temporal and a smaller core (breaking)

Executes the plan of record in `docs/timezones.md` ("The machine's zone still leaks through
dayjs"), then moves optional built-ins out of core.

| # | Change | Notes |
|---|---|---|
| 4.0.1 | **Date core on `temporal-polyfill`** | `fns` API inside `@ilamy/utils`; formatting through `Intl`. Measure bundle cost first. Acceptance check as written in `docs/timezones.md` (awkward zones × every clock change × several machine zones vs an `Intl`-only reference). |
| 4.0.2 | **Public dates as ISO strings or `Date`** | Events, cell info, render props, callbacks, the plugin contract. Remove `dayjs`, `Dayjs`, `ManipulateType` exports. Add `timezone` to the context API. |
| 4.0.3 | **Several zones per page** | Falls out of 4.0.1 (today one global zone, `docs/timezones.md:89`). e2e spec. |
| 4.0.4 | **Optional built-ins become plugins** | iCal export becomes `plugins/ical` (its header button through the toolbar-items hook); year view becomes `plugins/year` (D7). Evaluate the resource axis as a plugin (listed as future work in `docs/monorepo-architecture.md:100-103`); move it only if the contract carries it without contortion. |
| 4.0.5 | **Standard defaults** | `BusinessHours.daysOfWeek` defaults to Monday–Friday (TODO in `utils/business-hours.ts:152`); `nowIndicator` per D3. |
| 4.0.6 | **Remove deprecated names** | Everything in `docs/migration-v4.md`, including `IlamyResourceCalendar` and `disableDragAndDrop`. |
| 4.0.7 | **Plugins on new date types** | Recurrence keeps RFC 5545 floating-time correctness. |
| 4.0.8 | **kcsujeet/ilamy-calendar#314** | Verify whether the Temporal core fixes it; do not assume. |

**Acceptance:** `bun run ci` and `bun run e2e` green with the machine zone at UTC, Vancouver,
London and Havana; every app in `examples/` upgraded by following `docs/migration-v4.md` alone;
the Upgrader persona passes on the migrated configuration.

## Release 4.1 — scheduling rules and the drag ecosystem

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.1.1 | **Background events** | Plugin `background-events` (grid-layer hook) | `display: 'background' \| 'inverse-background'` on events; per-resource inverse rule as FullCalendar (verify). Core gains only `display: 'none'` and `className`. |
| 4.1.2 | **Constraints and overlap** | Plugin `constraints` (`allowPlacement` hook) | `eventOverlap`, `selectOverlap`, `eventConstraint`, `selectConstraint`, per-event `overlap`/`constraint`/`groupId`, `validRange` (also limits navigation). One answer for drag, resize, select and form. Makes "no double-booking a room" one option. |
| 4.1.3 | **Selection** | Core state; drag-to-create stays the UI plugin (D4) | `selectable`, `selectMirror`, `unselectAuto`, `onSelect`, `onUnselect`, `selectAllow`, `ref.select/unselect`. Drag-to-create's public options unchanged. |
| 4.1.4 | **External drag-in, between calendars** | Plugin `external-drag` | `<CalendarDraggable eventData>`, consumer `DndContext`, `drop`, `onEventReceive`, `onEventLeave`. Check dnd-kit's support for draggables outside the context subtree first; study https://fullcalendar.io/docs/external-dragging. |
| 4.1.5 | **Group moves** | Plugin `constraints` (via `applyEdit` returning related rows) | Moving or resizing one event of a `groupId` moves all of them, one `onEventsChange`. |

## Release 4.2 — scheduler (headline release)

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.2.1 | **Resource hierarchy and grouping** | Plugin `scheduler` (`transformResources` + slots) | `parentId` or `children` (follow FullCalendar's resource parsing), expand/collapse, `resourcesInitiallyExpanded`, `resourceGroupField`. |
| 4.2.2 | **Resource columns** | Plugin `scheduler` | `resourceColumns: [{ field \| render, header, width }]`, resizable. |
| 4.2.3 | **Resource ordering** | Plugin `scheduler` | `resourceOrder`, FullCalendar syntax. |
| 4.2.4 | **Timeline without resources** | Plugin `timeline` (a `PluginView`) | Day/week/month timeline over the horizontal grid. |
| 4.2.5 | **Agenda in resource mode** | Plugin `agenda` | Marked "to confirm" in `docs/e2e-testing.md`. |
| 4.2.6 | **Virtualisation** | Core (grid rendering), opt-in prop | Measure first: the #300 scenario and a 500-resource timeline, recorded in `docs/performance.md`. Must keep sticky labels (#290) and drag auto-scroll. |
| 4.2.7 | **Resource ref API** | Core | `getResources`, `getResourceById`, `refetchResources`. |

**Acceptance:** a 500-resource, 3-level scheduler scrolls smoothly in the harness and every
3.3/4.1 interaction works across resources.

## Release 4.3 — views, customisation, reach

| # | Feature | Placement | Notes |
|---|---|---|---|
| 4.3.1 | **Multi-month view** | Plugin `multi-month` | `multiMonthYear` equivalent. |
| 4.3.2 | **Event order and layout** | Core | `eventOrder` (default reproduces `utils/layout/horizontal.ts:43-54`), `slotEventOverlap: false` side-by-side mode, `eventMinHeight`, `eventMaxStack`. |
| 4.3.3 | **Toolbar config** | Core | `headerToolbar: { start, center, end }`, `buttons` (FullCalendar v7 naming), plugin items via the toolbar hook. |
| 4.3.4 | **Render hooks and callback context** | Core | Public `render*`/`get*ClassName` for day cell, day header, slot label, "more" link, resource label; `navLinks` with callbacks; `jsEvent`/`el` on callbacks; `onEventMouseEnter`/`Leave`. |
| 4.3.5 | **Sizing and month options** | Core | `height`, `contentHeight`, `aspectRatio`, `expandRows`, `fixedWeekCount`, `showNonCurrentDates`. |
| 4.3.6 | **Accessibility** | Core | ARIA grid roles, roving tabindex, keyboard move/resize/select via dnd-kit `KeyboardSensor`, translated live-region announcements, Axe in the e2e gate with zero violations. |
| 4.3.7 | **RTL** | Core | `direction` (default: the document's `dir`); logical Tailwind utilities; mirrored layout and drag math; `&direction=rtl` axis in the e2e matrix. |
| 4.3.8 | **Print** | Core | `@media print` rules; e2e via `page.emulateMedia({ media: 'print' })`. |
| 4.3.9 | **Interop** | Plugins `ical` (import, TZID+VTIMEZONE export per RFC 5545 §3.6.5), `ics-feed`, `google-calendar` | Feeds use the event-sources hook. Parser chosen per the latest-version rule (check `ical.js`, which FullCalendar uses). |

4.3 may split into 4.3 and 4.4 if it is too large to ship as one.

---

## Open decisions (escalate when the release that needs one starts)

- **D1 — Resolved:** 4.0 comes after 3.4, so 4.1–4.3 are written on Temporal once.
- **D2 — Keep `onEventAdd`/`onEventUpdate`/`onEventDelete` in 4.0?** `onEventsChange` covers
  them. Needed by 3.4.5.
- **D3 — `nowIndicator` default.** FullCalendar defaults false; ilamy always shows it. Flip in
  4.0 or keep and record the deviation. Needed by 3.4.5.
- **D4 — Selection in core vs plugin.** Recommended: core state, plugin UI. Needed by 4.1.
- **D5 — Framework reach.** Recommended: React only through this plan.
- **D6 — Clashing names** (`firstDayOfWeek`/`firstDay`, `timezone`/`timeZone`,
  `onCellClick`/`dateClick`). Recommended: keep ilamy's, document the mapping. Needed by 3.4.5.
- **D8 — `editable` default.** True in 3.x so nothing breaks; the convention (FullCalendar) is
  false. Flip in 4.0 or keep and record the deviation. Needed by 3.4.5.
- **D7 — Year view and iCal export out of core in 4.0.** Recommended yes; resource axis only if
  it fits the contract cleanly. Needed by 3.4.5.

## Checklist mapping

| `docs/api-parity-checklist.md` item | Feature |
|---|---|
| `revert()` on drop | 3.3.1 |
| `oldEvent` in callbacks | 3.3.1 |
| Range selection `onSelect` | 4.1.3 |
| Events as a function | 3.3.8 |
| `loading` callback | 3.3.8 |
| Event resize (`onEventResize`) | 3.3.3, reported through `onEventsChange` + `endDelta` |
| External dragging | 4.1.4 |
| `eventAllow` / `selectAllow` | 3.3.2 / 4.1.3 |
| `delta` | 3.3.1 |
| `slotMinTime` / `slotMaxTime` | 3.3.4 |
| `jsEvent`, `el` | 4.3.4 |
| Nav link callbacks | 4.3.4 |
| `allDaySlot` | 3.3.7 |
| `slotLabelFormat` / `eventTimeFormat` | 3.3.6 |
| `resourcesSet`, resources as function | 3.3.10 |
