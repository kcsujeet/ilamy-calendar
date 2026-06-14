# Agenda View Plugin — Implementation Plan

> Addresses issue #139 (Agenda / upcoming-events list view).

**Goal:** Add an opt-in **Agenda view** that renders a compact, chronological, day-grouped list of events for a date window, skipping empty days. Shipped as an optional plugin (`@ilamy/calendar/plugins/agenda`) so it only appears in the header when a consumer registers it.

**Architecture:** A `PluginView` using the `component` escape hatch (same shape as `yearView`: `range` + `navigationStep` + `component`, no `columns`/`layout`). The view component reads context through the **public** `useIlamyCalendarContext()` (windowed `events`, `t`, `timeFormat`, `openEventForm`), groups events by day, drops empty days, and renders compact rows. Contributed via an `agendaPlugin()` factory's `views: [...]`, so it enters `getViews()` (and the header switcher) only when registered.

**Tech stack:** React + the configured dayjs instance (`@ilamy/utils/dayjs`). **No new runtime dependency.** No `CalendarEvent` type augmentation.

---

## Decisions settled (and why)

1. **Opt-in plugin, not a built-in view.** The header switcher (`view-controls.tsx`) renders **every** `getViews()` entry, and there is no `views`/`hiddenViews` prop in `IlamyCalendarProps`. A built-in agenda would be forced into every consumer's header with no way to hide it. Plugin-contributed views enter `getViews()` only when registered → opt-in header presence with **zero new core API**.

2. **Windowed and dependency-free, not infinite-scroll.** The engine is range-based: a view declares `range(date)`, the pipeline filters events to that window, and `onDateChange(date, range)` fires off it. The agenda declares a window and steps it with `navigationStep`, like every other view. No virtualization, no new dependency, matches the navigation model. (Nothing in the codebase virtualizes; month view bounds cost with `dayMaxEvents` + "+N more".)

3. **Plugins grouped under `packages/plugins/`, one separate package each.** New `packages/plugins/agenda/` (`@ilamy/calendar-agenda`), and the existing recurrence package relocates to `packages/plugins/recurrence/` (name unchanged: `@ilamy/calendar-recurrence`). Each stays a private workspace package bundled into `@ilamy/calendar` and exposed at its `./plugins/<name>` subpath. Verified viable: the public `IlamyCalendarApi` (from `useIlamyCalendarContext()`) already exposes everything the agenda view needs — `events` (windowed), `currentDate`, `firstDayOfWeek`, `t`, `timeFormat`, `timezone`, `openEventForm`, `selectDate`, `getEventsForDateRange` — so the package consumes only the public API, exactly as recurrence does.

   - **Separate packages, not one combined `@ilamy/calendar-plugins`:** keeps recurrence's `rrule` + global `declare module` augmentation isolated from the dep-free agenda; consumers gain nothing from combining since the `./plugins/*` subpaths are independent bunup entries either way.
   - **Relocation cost (low, names unchanged):** root `workspaces` adds `"packages/plugins/*"`; `packages/calendar/tsconfig.json` path `../recurrence/src/index.ts` → `../plugins/recurrence/src/index.ts`; recurrence's own `tsconfig.json` relative `extends`/paths shift one level deeper; `git mv packages/recurrence packages/plugins/recurrence`. bunup `noExternal`, calendar's dependency entry, and `src/plugins/recurrence.ts` are name-based and untouched.

4. **Window default `'month'`, configurable.** `window: 'month' | number` (number = N days from the current date). Default `'month'`.

5. **Multi-day events repeat under each overlapped day, with a "Day N of M" indicator.** Confirmed against Google Calendar's Schedule view (screenshot): a 15-day event appears under each spanned day labelled "Day 8/15", "Day 9/15", … "Day 15/15", then stops. We replicate both: repeat the occurrence under every overlapped day (reusing the range-overlap predicate in `lib/events/pipeline.ts`), and render a **display-only** "Day N of M" indicator next to the title for multi-day events — `N = occurrenceDay.diff(event.start, 'day') + 1`, `M = event.end.diff(event.start, 'day') + 1`. The indicator is rendered, never written back to `event.title`.

6. **i18n always.** Add an `agenda` key to the default translations and the `Translations` type; the spec sets `label: 'agenda'` so it localizes like `day`/`week`/`month`/`year`.

   **Constraint:** `TranslatorFunction = (key: TranslationKey | string) => string` takes no params, so a fully-localized, word-order-correct "Day N of M" is not expressible without extending the translator contract (which would ripple across all keys — out of scope). Pragmatic choice for the indicator: render `` `${t('day')} ${n}/${m}` `` (reuses the existing `day` key → "Day 8/15"), accepting that the compact `n/m` is language-neutral. If you'd rather have a properly interpolated localized string, that's a separate core change to `TranslatorFunction`. Flagged for your call; default is the compact reuse-`day` form.

## Explicitly out of scope (deferred)

- **Virtualization / true infinite scroll.** Not built now. Revisit only if a consumer demonstrates a measured scroll-perf problem with thousands of rows in one window. The `PluginView` shape is identical, so virtualization can be added inside the same component later; if it pulls a dependency it lives naturally in this already-separate package.
- **"Spots remaining" / booking chips** (issue comment): consumers render that via their own event content.

---

## Package layout (mirrors the relocated `packages/plugins/recurrence/`)

```
packages/plugins/recurrence/             # @ilamy/calendar-recurrence (relocated from packages/recurrence/)
packages/plugins/agenda/                 # @ilamy/calendar-agenda (private)
  package.json                           # name, deps (@ilamy/* workspace + peer react), @ilamy/calendar external
  tsconfig.json
  src/
    index.ts                             # export { agendaPlugin }, { createAgendaView, type AgendaViewOptions }
    agenda-plugin.ts                     # agendaPlugin() -> IlamyPlugin { name, views }
    agenda-plugin.test.ts
    components/
      agenda-view.tsx                    # AgendaView component (escape-hatch render)
      agenda-view.test.tsx
      agenda-day-group.tsx               # one day's header + its rows
      agenda-event-row.tsx               # time/all-day + color dot + title; click -> openEventForm
    utils/
      create-agenda-view.ts             # createAgendaView({ window }) -> PluginView (range + navigationStep)
      group-events-by-day.ts            # pure: events -> ordered non-empty day groups (overlap rule)
      group-events-by-day.test.ts
```

Edits to existing files (mirroring how recurrence is integrated):
- Root `package.json` `workspaces` — add `"packages/plugins/*"`.
- Relocate recurrence: `git mv packages/recurrence packages/plugins/recurrence`; fix its own `tsconfig.json` relative paths; update `packages/calendar/tsconfig.json` recurrence path to `../plugins/recurrence/src/index.ts`.
- `packages/calendar/src/plugins/agenda.ts` — subpath entry: `export * from '@ilamy/calendar-agenda'` (or named re-exports).
- `packages/calendar/bunup.config.ts` — add `'src/plugins/agenda.ts'` to `entry`; add `calendar-agenda` to the `noExternal` regex.
- `packages/calendar/package.json` — add `"./plugins/agenda"` export + `"@ilamy/calendar-agenda": "workspace:*"` dependency.
- `packages/calendar/tsconfig.json` (+ root) — add `@ilamy/calendar-agenda` path mapping to source.
- `packages/calendar/src/lib/translations/default.ts` + `Translations` type — add `agenda: 'Agenda'`.
- `apps/demo/src/components/demo/demo-data.ts` — add `agendaPlugin()` to `demoPlugins`.

No changes to the core engine, switcher, navigation, or any public core type. Verified merge path: navigation builds `[...builtInViews, ...pluginRuntime.getViews()]` and `getViews()` is `plugins.flatMap(p => p.views ?? [])`.

---

## The spec + factory (`utils/create-agenda-view.ts`)

```ts
import type { Dayjs, PluginView } from '@ilamy/calendar'
import { AgendaView } from '../components/agenda-view'

/** 'month' = the calendar month containing the date; a number = that many days from the date. */
export type AgendaWindow = 'month' | number

export interface AgendaViewOptions {
  window?: AgendaWindow   // default 'month'
}

const windowRange = (date: Dayjs, window: AgendaWindow) => {
  if (window === 'month') {
    return { start: date.startOf('month'), end: date.endOf('month') }
  }
  return { start: date.startOf('day'), end: date.add(window - 1, 'day').endOf('day') }
}

const windowStep = (window: AgendaWindow) =>
  window === 'month'
    ? { amount: 1, unit: 'month' as const }
    : { amount: window, unit: 'day' as const }

export const createAgendaView = ({ window = 'month' }: AgendaViewOptions = {}): PluginView => ({
  name: 'agenda',
  label: 'agenda',                       // translation key (see i18n)
  navigationStep: windowStep(window),
  range: (date) => windowRange(date, window),
  supportsResources: false,              // list view does not compose the resource axis
  component: AgendaView,
})
```

## The component (`components/agenda-view.tsx`)

```tsx
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { groupEventsByDay } from '../utils/group-events-by-day'
import { AgendaDayGroup } from './agenda-day-group'

export const AgendaView = () => {
  const { events, t, openEventForm } = useIlamyCalendarContext()
  const dayGroups = groupEventsByDay(events)   // ordered; empty days dropped; multi-day repeated per overlapped day

  if (dayGroups.length === 0) {
    return <p data-testid="agenda-empty">{t('noEventsToDisplay')}</p>  // reuse/extend an existing empty key
  }

  return (
    <div className="flex flex-col" data-testid="agenda-view">
      {dayGroups.map((group) => (
        <AgendaDayGroup key={group.key} group={group} onEventClick={openEventForm} />
      ))}
    </div>
  )
}
```

- `events` from the public context is the engine's windowed set for the active view's range, which is the agenda spec's `range` → the component already receives exactly the windowed events.
- Recurring instances are pre-expanded by the recurrence plugin's `transformEvents` before they reach `events`, so occurrences list for free when recurrence is also registered.
- Rows: time range (or an "all day" label via `t`, honoring `timeFormat`), a color dot from `event.color`, the title, and — for multi-day events — a display-only "Day N of M" indicator (localized via `t`). shadcn tokens + `cn(...)`, no pixel overrides. Click routes through `openEventForm`, so edit + recurrence-scope dialogs work unchanged.
- The day-index for the indicator is computed from the group's `date` against the event's span (`N`/`M` above); single-day events render no indicator.

## Grouping helper (`utils/group-events-by-day.ts`)

Pure, no React:

```ts
import type { CalendarEvent, Dayjs } from '@ilamy/calendar'

export interface AgendaDayGroupData {
  key: string                 // 'YYYY-MM-DD'
  date: Dayjs                 // start-of-day
  events: CalendarEvent[]     // sorted: all-day first, then by start
}

export const groupEventsByDay = (events: CalendarEvent[]): AgendaDayGroupData[] => { /* ... */ }
```

Pinned with tests:
- Empty days absent (issue's "skip empty days").
- Groups chronological.
- Within a day: all-day first, then `start` ascending.
- A multi-day event appears under **each** day it overlaps within the set (overlap predicate, same semantics as `lib/events/pipeline.ts`).
- Empty input → `[]`.

## The plugin factory (`agenda-plugin.ts`)

```ts
import type { IlamyPlugin } from '@ilamy/calendar'
import { type AgendaViewOptions, createAgendaView } from './utils/create-agenda-view'

export const agendaPlugin = (options: AgendaViewOptions = {}): IlamyPlugin => ({
  name: 'agenda',
  views: [createAgendaView(options)],
})
```

Consumer:
```tsx
import { agendaPlugin } from '@ilamy/calendar/plugins/agenda'
<IlamyCalendar plugins={[agendaPlugin({ window: 14 })]} initialView="agenda" />
```

---

## Test plan

New feature → co-located test files are created (same as the recurrence package; the "no new test files" rule governs not fragmenting tests for existing code).

- `group-events-by-day.test.ts` — empty-day skipping, chronological order, within-day sort, multi-day per-day repetition, empty input. Exact assertions.
- `agenda-view.test.tsx` — via `CalendarTestProvider` with seeded events: renders only non-empty groups in order; empty state at zero events; row click invokes `openEventForm`; a multi-day event renders under each spanned day with the correct "Day N of M" text and single-day events render none. No CSS-class assertions.
- `agenda-plugin.test.ts` — `agendaPlugin()` → `{ name: 'agenda', views: [view named 'agenda'] }`; `createAgendaView({ window })` sets the right `navigationStep` and `range` width for `'month'` and a number.
- Engine integration (existing engine test): registering `agendaPlugin()` makes `getViews()` include `agenda` and stepping fires `onDateChange` with the windowed range; absent without the plugin. (Mirrors the `fortyDayPlugin` registration test.)

## Docs

- `docs/logs/<today>.md` dev-log entry.
- New `docs/agenda-view.md`: register the plugin, `window` option, `initialView`.
- README/feature list: agenda is an opt-in plugin like recurrence.

---

## Task breakdown (bite-sized, TDD, one commit each)

0. **Relocate recurrence under `packages/plugins/`** — add `"packages/plugins/*"` to root `workspaces`, `git mv packages/recurrence packages/plugins/recurrence`, fix recurrence's own tsconfig relative paths + calendar's recurrence tsconfig path. Package name unchanged. `bun run ci` green (proves the relocation is transparent). Commit.
1. **Scaffold `@ilamy/calendar-agenda` package** at `packages/plugins/agenda/` — package.json/tsconfig mirroring recurrence; wire into calendar (bunup entry + `noExternal`, package.json export + dep, tsconfig path, subpath entry `src/plugins/agenda.ts`). Empty plugin that registers an `agenda` view stub. `bun run ci` green (proves the packaging path end to end). Commit.
2. **Grouping helper** (red→green): `group-events-by-day.test.ts` → `group-events-by-day.ts`. Commit.
3. **View spec + factory** (red→green): `createAgendaView` window/range/step + its test. Commit.
4. **Component** (red→green): `agenda-view.test.tsx` → `AgendaView` + day-group + row + empty state. Commit.
5. **Plugin factory + i18n** : `agenda-plugin.test.ts` → `agendaPlugin()`; add `agenda` translation key + type; engine-level registration integration test. `bun run ci` green. Commit.
6. **Demo + docs** : `agendaPlugin()` into the demo, `docs/agenda-view.md`, dev log. Commit.
7. **Branch + PR** off `main` after `bun run ci` + `bunx fallow@2.90.0 audit --changed-since main` green.

## Status

All decisions resolved. Layout: `packages/plugins/{recurrence,agenda}`, separate packages. Ready to execute task-by-task.
