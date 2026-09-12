# E2E testing for @ilamy/calendar

Status: proposed
Date: 2026-09-12

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
published package surface. Two shallow smoke tests against the demo close that
later. They are not the foundation.

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
  "today" drifts and every baseline rots.
- **The zone.** `timezoneId` in the Playwright `use` block, and the `timezone`
  prop on the calendar. Both, because they answer different questions: the first
  is what the browser believes, the second is what the calendar renders against.
- **`locale`, `viewport` and `colorScheme`** in `use`, so font metrics and
  layout do not depend on the machine.

## Structure

```
apps/e2e/                  the harness app (Vite, private)
  src/scenarios.ts         the typed scenario record
  src/main.tsx             reads the URL, mounts IlamyCalendar
e2e/                       the tests
  playwright.config.ts
  pages/                   page objects: MonthGrid, WeekGrid, EventBar
  specs/
```

Page objects wrap the `keys.*` testids the components already emit, so
selectors have one home. A markup change breaks one page object rather than
twenty specs.

`webServer` in the config boots the harness (`command`, `url`,
`reuseExistingServer: !process.env.CI`).

## Visual layer

One baseline per *rendering surface* on the `basic` fixture — eleven screens if
agenda has no resource form, thirteen if it does. That is a principled number
rather than a chosen one: each surface is a distinct layout engine, and a
screenshot is the only thing that sees a layout break. Fixtures beyond `basic`
are covered by behaviour assertions, not more baselines.

Baselines are generated inside `mcr.microsoft.com/playwright:v1.63.0-noble`
(pinned, per https://playwright.dev/docs/docker) so they match CI byte for byte
rather than macOS font rendering. `bun run e2e:update` refreshes them through
the same container.

Every screenshot is a file a human reviews when it changes. Keeping them to one
per surface is what stops the diffs becoming a rubber stamp.

## CI

A fourth job in `ci.yml`, after `build-test`, running in the pinned Playwright
container. Uploads the HTML report and diff images as artifacts on failure,
because a red visual check is unreadable without them.

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
4. Visual baselines in the container, and the CI job.
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
