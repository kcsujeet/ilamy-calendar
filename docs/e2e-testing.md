# Browser (E2E) testing

How `apps/e2e` works, why it is built this way, and what it deliberately does
not cover. For the unit suite see `testing-guide.md`.

## Why

Nothing in this repo drives a real browser. The 929 unit tests render into
happy-dom, which has no layout: an element can be asserted present, correct and
invisible at the same time. Every visual regression so far has been found by a
person looking at the screen, and the fix for the header animations landed only
because the maintainer noticed a blink and said so.

Two jobs follow from that, and they are not the same job:

1. **A gate.** Catch regressions automatically, on every PR, without anyone
   looking. Must be deterministic or it is worse than nothing.
2. **Hands for an agent.** Let an AI navigate the calendar and answer "does this
   look right", without a human clicking through setup first.

The gate is the foundation. Agent exploration that finds something real gets
recorded back into the gate, so a bug found once is not found twice.

## What it drives

A new `apps/e2e`: a Vite app that mounts `IlamyCalendar` with its entire state
taken from the URL.

```
/?scenario=cross-month-week&view=week&tz=UTC&date=2025-03-31T00:00:00.000Z
```

Not `apps/demo`. The demo runs on the real current date, and a calendar renders
almost everything from "today": a test asserting today's highlight sits in
column 3 passes on Monday and fails on Tuesday, and a screenshot baseline rots
within 24 hours because the today-circle moves daily. That alone rules out
visual regression against the demo.

This repo has been bitten three times by the same shape of bug — tests whose
outcome was decided by the environment rather than the code (#268's
zone-dependent week tests, an SSR fixture that fell into the previous week west
of UTC, and view harnesses that disagreed with the provider). Pointing E2E at a
live-clock app rebuilds that trap with slower feedback.

Known gap: `apps/e2e` can be green while `apps/demo` is visibly broken, since
the harness does not exercise the demo's own wiring, Tailwind build or the
published package surface. That gap shipped once: the demo defaulted
`enableBusinessHours` to true, so on a weekend every seed event a visitor
grabbed refused to move or resize, and it was reported as "resize is broken"
while every harness spec passed. The `demo` Playwright project
(`demo-tests/`) now drives the real demo with its default settings and seed
events, the clock pinned to a Sunday: a resize in week and month view and a
move, each by a real pointer. It is a small smoke layer, not the foundation:
anything that needs a fixture or a setting belongs in the harness.

### Two axes, not one

Scenarios and views are orthogonal, and conflating them is what made the first
draft of this table skew to month view. A fixture describes *what events exist*;
a view describes *how they are drawn*. The URL takes both, so the coverage
matrix is generated rather than hand-written:

```
/?scenario=spanning-event&view=week&orientation=vertical&tz=UTC
```

**Axis 1 — every rendering surface.** These are distinct layout engines, not
variations, and each can break alone:

| View | Regular | Resource vertical | Resource horizontal |
|---|---|---|---|
| `day` | yes | yes | yes |
| `week` | yes | yes | yes |
| `month` | yes | yes | yes |
| `year` | yes | n/a | n/a |
| `agenda` (plugin) | yes | to confirm | to confirm |

`year` has no `orientation` branch in `year.tsx`, so it has no resource form.
Whether the agenda plugin does is confirmed when its specs are written, not
assumed here.

**Axis 2 — the fixtures.** Each is a pinned instant and a fixed event set,
chosen because it has broken before or spans a boundary:

| Fixture | Pins |
|---|---|
| `basic` | A handful of ordinary events, the control case |
| `cross-month-week` | The week of 31 March 2025, spanning two months (#259/#260) |
| `overnight-event` | 22:00 to 02:00, cut across two day columns (#264) |
| `spanning-event` | Longer than one row, drawn as several bars |
| `business-hours` | A restricted `viewHours` range, clipping at both edges |
| `recurring-series` | An rrule series with one modified instance |
| `dst-boundary` | A day that gains or loses an hour |
| `horizontal-packing` | Exact-minute handoffs on one resource, beside an independent resource (#388) |

Not every pairing is meaningful — `business-hours` says nothing in `year` — so
the matrix is declared per fixture as the views it applies to, and the specs are
generated from that. A gap is then visible in the table rather than hidden in
whichever specs somebody remembered to write.

**Plugins** get their own fixtures rather than riding along: `recurrence` is
covered by `recurring-series`, `drag-to-create` belongs with the drag work in
step 5, and `agenda` is a view in axis 1.

## Determinism

Three things are pinned, and all three are load-bearing:

- **The clock.** Every spec calls `page.clock.install()` then
  `page.clock.setFixedTime()` before navigating, so `Date.now()` and
  `new Date()` never move (https://playwright.dev/docs/clock). Without this,
  "today" drifts and every baseline rots. It is `PINNED_NOW` unless a spec
  passes `gotoScenario({ now })`, still fixed, for "now" on a particular day
  (the now-line on a clock-change day, #311).
- **The zone.** `timezoneId` in the Playwright `use` block, and the `timezone`
  prop on the calendar. Both, because they answer different questions: the first
  is what the browser believes, the second is what the calendar renders against.
- **dayjs locales.** A locale is data the app registers (`docs/migration-v2.md`),
  so the harness imports `ar`, `de` and `fr` in `src/app.tsx` for specs that
  pass `locale=`. A new locale in a spec needs its import there too.
- **`locale`, `viewport` and `colorScheme`** in `use`, so font metrics and
  layout do not depend on the machine.

## Structure

```
apps/e2e/                       the harness app (Vite, private) and its tests
  playwright.config.ts
  src/main.tsx                  mounts the app
  src/app.tsx                   reads the URL, mounts IlamyCalendar, publishes its state
  src/harness-config.ts         every calendar setting, parsed from the query string
  src/scenarios.ts              the typed scenario record (the events)
  src/seed.ts                   the `seed` URL parameter: rows as JSON become the scenario's events
  src/published-change.ts       the onEventsChange shape and the stored row shape the harness publishes
  tests/support/harness.ts      gotoScenario: pins the clock, builds the URL
  tests/support/pages.ts        page objects: CalendarPage, MonthGrid, TimeGrid, YearGrid, ResourceAxis
  tests/{accessibility,behaviour,clock,drag,matrix}.spec.ts
  tests/clock-change-instants.spec.ts   instants around a clock change: form, grids, year view, navigation
  tests/resources.spec.ts        resource-axis behavior and horizontal packing regressions
  tests/support/event-form.ts   the event form's pickers as questions (pickDay, pickTime, saveForm)
  demo-tests/demo-defaults.spec.ts   the `demo` project: the real apps/demo at its defaults, pinned to a Sunday
```

`playwright.config.ts` has two projects and two web servers: `chromium` runs
`tests/` against the harness, `demo` runs `demo-tests/` against `apps/demo`
(`bunx vite` in that folder). `bun run e2e` runs both, so CI runs both; pass
`--project=chromium` or `--project=demo` to run one. Playwright starts every
configured web server whichever project runs.
The demo page runs an infinite background animation, so the demo specs wait
out animations inside the calendar only, not the page-wide
`settleAnimations`.

`accessibility.spec.ts` pins keyboard and screen-reader behaviour (Enter and Space
open a focused bar, no bar describes a keyboard drag it cannot do, the event
form's pickers and the Repeat checkbox have accessible names) as roles and
accessible names, not an axe scan: axe is not a dependency of this repo.

Page objects wrap the `keys.*` testids the components already emit, so
selectors have one home. A markup change breaks one page object rather than
twenty specs.

`gotoScenario` takes the scenario, view, orientation, `timezone` (the `tz`
parameter; `'none'` leaves the calendar's `timezone` prop unset, so it falls back to the browser's zone), `date`, `now` (the pinned clock, `PINNED_NOW` by default),
`plugins` and any other setting as a query parameter.

The horizontal packing cases open `scenario=horizontal-packing` with `view=day`
and `orientation=horizontal` to reproduce the 07:00–09:17 / 09:17–11:00 handoff.
URL settings and seeded event lists cover nested chains, minimum-length bar
collisions, spillover row heights, overflow and day-grid behavior. Pointer edits,
moves and resizes read the harness's published
event state and change log; these fixture-driven tests do not inspect React's
internal tree. The demo project keeps its default-settings smoke tests.

The harness behaves like a consumer that controls `events`: it persists every
`onEventAdd`, `onEventUpdate` and `onEventDelete`. The calendar resets to the
`events` prop whenever it changes, so a harness that dropped one of them would
see that row come back on the next update (#315). It publishes what the
calendar reports as JSON in two hidden `<script>` elements, read by
`CalendarPage.eventState()` (`event-state`, the stored rows: id, uid, title, start, end, allDay, resourceId,
recurrenceId, exdates and the rule with ISO strings, so a spec can assert what a scope stored) and
`CalendarPage.eventChanges()` (`event-changes`, every `onEventsChange` call).
With `fetch=delayed` (and `fetchDelay=<ms>`) or `fetch=failing` it passes `events` as a function that plays the consumer's server: it answers from the rows the harness holds after the delay, or fails. The mode is read on every call, so `setSettings` can flip it on a mounted calendar. It publishes each call (range and `pending`/`done`/`failed`/`aborted`) in `fetch-log` and the `loading` / `onEventsError` signals in `fetch-state`, read by `CalendarPage.fetchLog()` and `fetchState()`. The harness runs under StrictMode, so a dev mount may log one aborted call before the live one.
`fetch=held` / `resourcesFetch=held` never answer until `setSettings` changes the mode (a held call re-checks every 25ms), so a spec can assert the pending state without racing `fetchDelay`; a wall-clock delay is only safe when the spec asserts nothing about the pending state. `removeSettings` (next to `setSettings` in `support/harness.ts`) deletes a setting from a mounted calendar's URL: removing `fetch` turns `events` back into an array, and releases any held call.
`agendaWindow=day|week|month` sets the window of the agenda plugin (`plugins=agenda`); it is read when the calendar mounts, and without it the plugin's own default (`month`) applies.
`resourcesFetch=delayed|failing|held` does the same for a `resources` function (answering with the scenario's resources, honouring `resourceCount`, with `fetchDelay`); it publishes `resources-fetch-log`, `resources-set` (the ids of every `resourcesSet` call) and `resources-errors` (the `onResourcesError` count; the shared `loading` signal stays in `fetch-state`), and draws a button (`refetch-resources`) that calls `refetchResources()` through a harness-only plugin provider. `refetchResourcesOnNavigate=true` passes straight through. Read by `resourcesFetchLog()`, `resourcesSetCalls()`, `resourcesErrors()` and `refetchResources()`.
`hideExportButton=true` passes straight through. The `ical-export` scenario (a long-description event and an all-day weekly series with UNTIL, EXDATE and a moved occurrence) backs `tests/ical-export.spec.ts`, which reads the downloaded `.ics` the way an importer would. Its all-day dates are UTC midnights, so the spec runs in the pinned zone; the all-day-in-a-west-of-UTC-machine case is covered by the unit tests under `TZ=America/New_York`.
With `onSelect=log` the drag-to-create plugin gets an `onSelect` that records each selection it commits (`start`, `end`, `allDay`, `resourceId`) in `window.__selectLog` instead of opening the form, so a spec can read the `CellInfo` the plugin reports. The `venue-rooms` scenario (30 rooms, a multi-room booking, two bookings in one room on one day) and `numeric-resources` (ids 1, 0, 2) cover the resource-axis cases; the `event-state` rows carry `resourceIds` next to `resourceId`.
With `scenario=seed` (or `seed-resources`) the events come from the `seed=<json>` parameter: an array of ordinary stored
rows (a series base, its overrides, plain events), with ISO strings where the store holds dates
(`rrule.dtstart` and `rrule.until` included). A spec states the rows a case starts from instead of adding a fixture,
which is how `recurrence-scopes.spec.ts` covers the scopes of a series: seed the rows, drive the form or the drag, assert
the published rows and `onEventsChange` calls.
With `revertChanges=true` it acts as a server that rejects every save: it persists no
row and calls `change.revert()` inside `onEventsChange`, so a spec can check the
calendar puts the event back.

`webServer` in the config boots the harness (`command`, `url`,
`reuseExistingServer: !process.env.CI`).

## Visual layer: deferred, deliberately

The first draft of this design specified one screenshot baseline per rendering
surface. That is not built, and the decision is recorded here rather than left
as a gap.

A pixel baseline cannot tell "you broke the layout" from "you restyled it on
purpose": both are just different pixels, so every intentional change means a
human opening each diff and confirming it. On a repo with one maintainer, a
dozen diffs per restyle gets rubber-stamped, and a check nobody genuinely reads
is worse than no check — it converts a real signal into a ritual.

Two further things weaken the case here specifically:

- `@ilamy/calendar` ships no CSS. A baseline would record the harness's own
  pinned theme, not what any consumer sees, so it validates layout rather than
  appearance.
- Baselines only match the platform that produced them, so they must be
  generated in the CI container. That is one more thing that has to be running
  before anyone can accept an intentional change.

Layout is asserted through behaviour instead: exact counts of bars, columns and
cells, which fail with a readable message rather than an image.

Revisit this if a purely visual regression ever ships unnoticed — a wrong
colour, an invisible element, a collapsed bar. That would be evidence the
behaviour assertions have a blind spot worth the maintenance cost, and the
decision should turn on that evidence rather than on the idea being appealing.

## Writing specs that survive a slow runner

CI runs on a slower machine than yours, and a spec that is only right when the
browser keeps up fails there and nowhere else. To reproduce one locally, throttle
the CPU (CDP `Emulation.setCPUThrottlingRate`, 4 to 6x) and run with 4 workers.
Four patterns have caused every such failure so far; the helpers live in
`tests/support/harness.ts`, so use them instead of writing a local copy.

- **Measure after animations.** Bars slide in over 500ms, so a box read earlier is
  not where the bar settles. Call `settleAnimations(page)` before any
  `boundingBox()` that a press or a drop depends on.
- **Lift the pointer with `releasePointer(page)`, never a bare
  `page.mouse.up()`.** A release in the same frame as the last move can drop on
  the cell the drag showed one move earlier. A touch drag has no `mouse.up()`:
  call `waitForDragRender(page)` before its `touchEnd`. Also keep a drop target out of the
  grid's auto-scroll zone (near the edge of a scrolling grid): the held pointer
  scrolls the grid for as long as the drag lasts, so the drop lands somewhere
  that depends on how slow the runner is.
- **Do not race a timer to assert a pending or abandoned fetch.** A `fetchDelay`
  that is long enough locally is over between two clicks on a slow runner. Use
  `fetch: 'held'` (or `resourcesFetch: 'held'`) while acting, wait for the calls
  to register (poll `fetchLog()`), then `setSettings(page, { fetch: 'delayed' })`
  to release them.
- **Do not loop `gotoScenario` inside one test.** Every pass pays a navigation and
  a settle, and 21 of them outlast the 30s test timeout. Open once and change the
  setting with `setSettings`, polling for the result, or split the loop into one
  test per outer value. Where a test is long by nature, mark it `test.slow()` and
  say why in a comment.

## CI

A fourth job in `ci.yml`, on `ubuntu-latest` like the others, installing the
browser with `playwright install --with-deps` — the setup Playwright documents
(https://playwright.dev/docs/ci-intro). The HTML report is uploaded always and
traces on failure, because a red browser test is unreadable without them.

Not the Playwright container, despite the first draft saying so. Its only real
advantage was identical font rendering for screenshot baselines, which are no
longer taken, and it has no `unzip`, which `setup-bun` needs in order to install
Bun at all.

## Running from several worktrees

The server port comes from `E2E_PORT` (default 4200), and the demo's from
`E2E_DEMO_PORT` (default 4210). Give each worktree its own pair:
`E2E_PORT=4311 E2E_DEMO_PORT=4312 bun run e2e`. Locally `webServer.reuseExistingServer` is
true (https://playwright.dev/docs/test-webserver), so Playwright attaches to
whatever already listens on the port and starts nothing. Two worktrees on the
same port therefore do not collide: the second silently tests the first one's
code. With a distinct port each run starts its own server. CI does not set the
variable and is unchanged.

## Agent access

A committed project-scoped `.mcp.json` adding `@playwright/mcp`
(https://code.claude.com/docs/en/mcp), so teammates get it on pull rather than
configuring it per machine. It snapshots the accessibility tree rather than
pixels, which is deterministic and does not need a vision model, and
`browser_start_recording` turns a session into Playwright code.

That recording is the point. The loop is: explore, find something, record it as
a spec, commit it to the gate. An agent's exploratory pass is not a substitute
for a test and does not gate anything — CI runs specs, never an agent.

A CLAUDE.md section states when to run the gate versus drive the browser, and
the rule that anything exploration finds gets recorded rather than left as a
one-off check.

## Order of work

1. `apps/e2e` with the `basic` fixture, and one spec asserting the month grid
   renders the right days. Proves the harness and the clock pinning.
2. Axis 1 first: every view and arrangement renders, driven off the matrix, so
   the surfaces are all reachable before any of them is tested deeply.
3. Axis 2: page objects and behaviour specs per fixture.
4. The CI job, in the pinned Playwright container.
5. `.mcp.json` and the CLAUDE.md section.
6. Drag and drop, last and deliberately.

Drag is last because `@dnd-kit` responds to real pointer sequences and these
will be the flakiest tests here. Building them first would mean debugging the
harness and the drag semantics at the same time. If they prove unstable they
stay out of the gate and remain an agent-driven check, rather than being
retried until green.

## What this does not do

- It does not test the published package as a consumer installs it. The
  `examples/` apps are the place for that, separately.
- It does not replace the unit suite. Anything assertable in happy-dom stays
  there, where it runs in 9 seconds.
- It does not gate on an agent's judgement. Only specs gate.
