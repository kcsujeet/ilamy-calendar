# @ilamy/calendar v2.0.0 — Plugin Architecture Spec

**Status:** Design locked, pending implementation plan.
**Goal:** Turn `@ilamy/calendar` into a fully pluggable calendar. The core is plugin-agnostic; recurrence (and later iCal export) are plugins built against a public API. Resources ship in core; a resource plugin is a possible future extraction once the v2 plugin contracts have proven themselves. Internal and external developers create plugins the same way.

---

## 1. Guiding principles

1. **Plugin-agnostic core.** The core knows about the *plugin system*, never about any specific plugin (no `recurrence` import, type, or concept in core).
2. **Dogfooding rule (hard constraint).** The recurrence plugin is built using **only** `@ilamy/calendar`'s public exports — zero `@/hooks`, `@/components`, `@/lib`, `@/features` deep imports. If recurrence needs something internal, that is a public-API gap to close, not to reach around. Enforced two ways: the package `exports` map (external) and an ESLint `no-restricted-imports` rule on `src/features/plugins/**` (internal).
3. **Third-party-first.** Every design choice is judged from the viewpoint of an external developer who only has `@ilamy/calendar` installed. If they can't do it, neither can we.
4. **Bring your own UI.** Plugins render their own React in slots/views. The core does not export its design system. The recurrence plugin ships its own editor/dialog UI.
5. **Ease over blast radius.** Authoring a plugin must be simple and idiomatic React. Internal refactor cost is not a constraint.

---

## 2. Locked decisions (summary)

| # | Decision |
|---|---|
| 1 | **Event-type extension** via TypeScript **declaration merging**. Core ships a lean `CalendarEvent` *interface*; each plugin augments it. |
| 2 | **Views** (`views: PluginView[]`) + **plugin-owned state** via `provider` (each plugin brings its own React context — "B1"). |
| 3 | **Generic context API**: `applyScopedEdit` / `applyScopedDelete` (opaque `scope`); `findParentRecurringEvent` removed from core (moves into recurrence). |
| 4 | **`contribute` / `collect`** generic data-contribution bus (the data twin of `renderSlot`), so plugins extend the host *and each other*. iCal serialization is its first user. |
| 5 | **Packaging**: `exports` subpaths (`@ilamy/calendar` + `@ilamy/calendar/plugins/recurrence`), `sideEffects: false`, **no default plugin registration** (core ships zero plugins), third-party plugins as separate packages with `@ilamy/calendar` as a peer dependency. |
| — | **Dogfooding rule** + **bring-your-own-UI**, as above. |

---

## 3. The plugin contract

`src/features/plugins/lib/types.ts` (exported publicly from `@ilamy/calendar`):

```ts
import type { ReactNode, ComponentType } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { Dayjs, ManipulateType } from '@/lib/configs/dayjs-config'

export interface PluginDateRange {
  start: Dayjs
  end: Dayjs
}

export interface PluginMutationArgs {
  event: CalendarEvent
  updates?: Partial<CalendarEvent>   // present for edit, absent for delete
  currentEvents: CalendarEvent[]
  scope: unknown                     // opaque; produced + consumed by the managing plugin
}

export interface PluginView {
  name: string                       // unique view id, e.g. 'resource-week'
  label?: string                     // view-switcher label (or a translation key)
  component: ComponentType           // renders the view; reads state via useIlamyCalendarContext()
  navigationUnit?: ManipulateType    // how next/prev steps for this view ('week', 'month', ...)
}

export interface IlamyPlugin {
  name: string

  // DATA pipeline — sequential. Each plugin receives the previous plugin's
  // output. Expand (recurrence), filter, decorate. Omit for no transform.
  transformEvents?: (events: CalendarEvent[], range: PluginDateRange) => CalendarEvent[]

  // INTERACTION — first-match. The first plugin whose managesEvent returns
  // true manages the event's scoped mutations.
  managesEvent?: (event: CalendarEvent) => boolean
  applyEdit?: (args: PluginMutationArgs) => CalendarEvent[]
  applyDelete?: (args: PluginMutationArgs) => CalendarEvent[]

  // UI contributions — additive. Render into a named slot (host- or plugin-defined).
  renderSlot?: (slotName: string, context: unknown) => ReactNode

  // DATA contributions — additive. Contribute data to a named extension point
  // (host- or plugin-defined). e.g. iCal property lines.
  contribute?: (point: string, context: unknown) => unknown[]

  // VIEWS — register new view types into the calendar's view switcher.
  views?: PluginView[]

  // STATE — wrap the calendar subtree so the plugin's own React context/state
  // is available to its views, slots, and components.
  provider?: ComponentType<{ children: ReactNode }>
}
```

Every member except `name` is optional; a plugin implements only what it needs. A data-only plugin implements `transformEvents`; a hypothetical whole-feature plugin (say, an agenda timeline) implements `views` + `provider`; recurrence implements most.

### Execution semantics (Rollup/Vite model)

- `transformEvents` — **sequential** chain (each sees the prior output), then the runtime applies the range-overlap filter.
- `managesEvent` — **first-match** (the first plugin that returns true manages the event).
- `renderSlot` / `contribute` — **additive** (all plugins may contribute; results aggregated).

---

## 4. The runtime

`src/features/plugins/lib/create-plugin-runtime.ts`:

```ts
export interface PluginRuntime {
  transformEvents: (events: CalendarEvent[], range: PluginDateRange) => CalendarEvent[]
  getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
  renderSlot: (slotName: string, context: unknown) => ReactNode[]   // keyed nodes
  collect: (point: string, context: unknown) => unknown[]           // flattened data
  getViews: () => PluginView[]
  getProviders: () => Array<ComponentType<{ children: ReactNode }>>
}
```

- `transformEvents`: `plugins.reduce(...)` then `eventOverlapsRange` filter.
- `getEventManager`: `plugins.find(p => p.managesEvent?.(event))`.
- `renderSlot`: collects non-null nodes, each keyed by plugin name.
- `collect`: `plugins.flatMap(p => p.contribute?.(point, ctx) ?? [])`.
- `getViews`: `plugins.flatMap(p => p.views ?? [])`.
- `getProviders`: `plugins.map(p => p.provider).filter(Boolean)`.

The engine builds the runtime once (`useMemo`) from `config.plugins` (default `[]`).

---

## 5. Public API surface (the "plugin SDK")

Exported from `@ilamy/calendar` (main entry, `src/index.ts`):

- **Components:** `IlamyCalendar`.
- **Contract types:** `IlamyPlugin`, `PluginDateRange`, `PluginMutationArgs`, `PluginView`.
- **Slot catalog:** `SLOT_EVENT_FORM`, `SLOT_EVENT_MUTATION_SCOPE`, `EventFormSlotContext`, `EventMutationScopeSlotContext` (from `src/components/calendar-slots.ts`).
- **Context access:** `useIlamyCalendarContext()` returning the **curated** `IlamyCalendarApi` (see below) — never the full internal context.
- **Core types:** `CalendarEvent`, `CalendarView`, `Resource`, `Translations`, `IlamyCalendarProps`, etc.

**Not exported from main:** recurrence anything (moves to its subpath), internal UI (`@/components/ui`), internal hooks/utils.

The main entry **must not import any plugin**, or tree-shaking and the opt-in model break.

### 5.1 Curated public context surface (`IlamyCalendarApi`)

The split already exists in `src/features/calendar/hooks/use-smart-calendar-context.ts` and v2 preserves it:

- `useSmartCalendarContext` (internal, **not exported**) returns the full `SmartCalendarContextType` (all engine state + raw React setters). Library components use this.
- `useIlamyCalendarContext` (public) returns the hand-picked `IlamyCalendarApi` (renamed from today's `UseIlamyCalendarContextReturn`). Plugins and consumers use this.

Exposing the entire context would make every internal field a public contract; the curated surface keeps the public API small and lets internals change freely.

```ts
export interface IlamyCalendarApi {
  // read state
  readonly currentDate: Dayjs
  readonly view: string                          // CalendarView is now a string (plugins add views)
  readonly events: CalendarEvent[]               // plugin-transformed events for the current range
  readonly rawEvents: CalendarEvent[]            // stored events
  readonly selectedEvent: CalendarEvent | null
  readonly selectedDate: Dayjs | null
  readonly isEventFormOpen: boolean
  readonly firstDayOfWeek: number
  readonly currentLocale: string
  readonly timezone?: string
  readonly timeFormat: TimeFormat
  readonly businessHours?: BusinessHours | BusinessHours[]
  readonly t: TranslatorFunction
  // navigation
  readonly setCurrentDate: (date: Dayjs) => void
  readonly selectDate: (date: Dayjs) => void
  readonly setView: (view: string, date?: Dayjs) => void
  readonly nextPeriod: () => void
  readonly prevPeriod: () => void
  readonly today: () => void
  // CRUD
  readonly addEvent: (event: CalendarEvent) => void
  readonly updateEvent: (id: string | number, updates: Partial<CalendarEvent>) => void
  readonly deleteEvent: (id: string | number) => void
  readonly applyScopedEdit: (event: CalendarEvent, updates: Partial<CalendarEvent>, scope: unknown) => void
  readonly applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
  // form control
  readonly openEventForm: (eventData?: Partial<CalendarEvent>) => void
  readonly closeEventForm: () => void
  // querying
  readonly getEventsForDateRange: (start: Dayjs, end: Dayjs) => CalendarEvent[]
  // plugin system
  readonly getEventManager: (event: CalendarEvent) => IlamyPlugin | undefined
  readonly renderSlot: (slotName: string, context: unknown) => ReactNode[]
  readonly collect: (point: string, context: unknown) => unknown[]
  readonly getViews: () => PluginView[]
}
```

- **Added vs today** (for plugins): `rawEvents`, `t`, `timeFormat`, `timezone`, `currentLocale`, `getEventsForDateRange`, `applyScopedEdit`, `applyScopedDelete`, `getEventManager`, `renderSlot`, `collect`, `getViews`.
- **Retained for now**: `resources` and `getEventsForResource` stay on the public surface in v2.0.0 because `IlamyResourceCalendar` still ships the old way. They are **not** in the `IlamyCalendarApi` shown above; they live on the resource context. When the resource calendar is migrated to a plugin (future), they move to the resource plugin's own hook and leave the core surface entirely. Flagged as a deferred removal, not done in this release.
- **Never exposed**: raw React setters (`setSelectedEvent`, `setIsEventFormOpen`, `setSelectedDate`) stay internal-only behind `useSmartCalendarContext`.

---

## 6. Event-type extension (declaration merging)

Verified against the TypeScript handbook ([declaration-merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html)): interface declaration merging + module augmentation.

- Core `CalendarEvent` becomes a lean **`interface`** (merging does not work on `type` aliases) with no recurrence fields.
- The recurrence plugin augments it:

```ts
// @ilamy/calendar/plugins/recurrence
import '@ilamy/calendar'
import type { RRuleOptions } from './types'

declare module '@ilamy/calendar' {
  interface CalendarEvent {
    rrule?: RRuleOptions
    recurrenceId?: string
    exdates?: string[]
  }
}
```

- Consumers keep flat ergonomics: `{ title, start, end, rrule }`. Plugin code reads `event.rrule` directly, typed.
- Collisions surface as compile errors (non-function members must be unique or identically typed), which is the safe failure mode.
- Augmentation targets a **named export** (`CalendarEvent`) — compatible with the repo's "no default exports" rule.

---

## 7. Generic context API

`CalendarContextType` changes (public, via `useIlamyCalendarContext`):

| Removed / renamed | Added (generic) |
|---|---|
| `updateRecurringEvent(event, updates, RecurrenceEditOptions)` | `applyScopedEdit(event, updates, scope: unknown)` |
| `deleteRecurringEvent(event, RecurrenceEditOptions)` | `applyScopedDelete(event, scope: unknown)` |
| `findParentRecurringEvent(event)` | **removed** (moves into the recurrence plugin) |
| `RecurrenceEditOptions` type | dropped; `scope` is opaque `unknown` |
| — | `collect(point, context)`, `renderSlot(slotName, context)`, `getViews()` exposed |

- `applyScopedEdit` / `applyScopedDelete` route to `getEventManager(event)?.applyEdit/applyDelete` with the opaque `scope`.
- Plain `addEvent` / `updateEvent` / `deleteEvent` are unchanged (already generic).
- The engine's `findParentRecurringEvent` (which reads `e.rrule`) is deleted from core; the recurrence form-section component does its own parent lookup using `events` from context.

---

## 8. Host scoped-mutation flow

`src/hooks/use-scoped-event-mutation.ts` — generic host hook (the renamed, relocated, plugin-agnostic successor to today's `useRecurringEventActions`):

- Holds dialog state (`isOpen`, `operation: 'edit' | 'delete'`, `event`, `updates`).
- `openEditDialog(event, updates)` / `openDeleteDialog(event)` open the flow.
- Renders the manager's scope UI via `manager.renderSlot(SLOT_EVENT_MUTATION_SCOPE, { event, operation, resolve, cancel })`.
- On `resolve(scope)`, calls `applyScopedEdit` / `applyScopedDelete` then closes.
- Depends only on the generic context + the mutation-scope slot. **Zero recurrence imports.**
- Shared by **both** `event-form.tsx` and `calendar-dnd-context.tsx` (DRYs the dnd duplicate today).

The flow: host detects a managed event → `useScopedEventMutation` → the manager's `renderSlot` shows the scope dialog → dialog calls `resolve(scope)` → `applyScoped*` → the manager's `applyEdit`/`applyDelete`. The plugin only implements `renderSlot` + `applyEdit`/`applyDelete`; it never imports the hook.

---

## 9. Module structure

```
src/
  index.ts                                  # PUBLIC main entry: core + plugin SDK (NO plugin imports)
  components/
    calendar-slots.ts                       # host slot catalog (SLOT_EVENT_FORM, SLOT_EVENT_MUTATION_SCOPE + contexts)
    event-form/event-form.tsx               # uses useScopedEventMutation + renderSlot; no recurrence
    drag-and-drop/calendar-dnd-context.tsx  # uses useScopedEventMutation + renderSlot; no recurrence
    types.ts                                # lean CalendarEvent interface (no recurrence fields)
  features/calendar/hooks/
    use-calendar-engine.ts                  # plugins default = []; exposes collect/getViews/renderSlot/applyScoped*
    use-scoped-event-mutation.ts            # host scoped-mutation flow (shared)
  lib/
    utils/export-ical.ts                    # core; uses collect('ical:vevent-properties', event); recurrence-unaware
  features/plugins/
    lib/                                    # the kernel (generic, no slot/feature knowledge)
      types.ts                              #   IlamyPlugin, PluginRuntime, PluginMutationArgs, PluginDateRange, PluginView
      create-plugin-runtime.ts
    recurrence/                             # the recurrence plugin (dogfood; public-API-only imports)
      recurrence.ts                         #   PUBLIC ENTRY for the subpath (re-exports plugin + utils + augment)
      recurrence-plugin.tsx                 #   recurrencePlugin()
      augment.ts                            #   declare module '@ilamy/calendar' { interface CalendarEvent ... }
      ui/                                   #   OWN UI (BYO): editor + scope dialog, no @/components/ui
      utils/recurrence-handler.ts           #   generateRecurringEvents, etc.
      ical.ts                               #   contribute('ical:vevent-properties', ...)
```

**Barrel policy:** no internal convenience `index.ts` re-export files inside feature folders. The two **package entry points** — `src/index.ts` (main) and `src/features/plugins/recurrence/recurrence.ts` (recurrence subpath) — are public API surfaces required by the `exports` map, not internal barrels, and are allowed.

---

## 10. Packaging & distribution

Verified against the Node.js docs ([packages.html](https://nodejs.org/api/packages.html)).

`package.json`:

```json
{
  "exports": {
    ".":                    { "types": "./dist/index.d.ts",              "import": "./dist/index.js" },
    "./plugins/recurrence": { "types": "./dist/plugins/recurrence.d.ts", "import": "./dist/plugins/recurrence.js" }
  },
  "sideEffects": false
}
```

- The `exports` map **encapsulates** the package: any path not listed throws `ERR_PACKAGE_PATH_NOT_EXPORTED`, so external consumers cannot deep-import internals. This enforces the dogfooding rule at the package boundary.
- `types` condition first, `import` next (per the docs' most-specific-first ordering).
- `sideEffects: false` is a bundler field (webpack/Rollup), enabling dead-export elimination.
- **No default registration:** `useCalendarEngine` default `plugins = []`. Recurrence is opt-in: `plugins={[recurrencePlugin()]}`.
- bunup builds one entry per public path (`src/index.ts`, `src/features/plugins/recurrence/recurrence.ts`). Exact multi-entry config to be confirmed against the installed bunup version during implementation.

**First-party plugins** (recurrence; later resource, export) ship as subpaths of `@ilamy/calendar` (dayjs `dayjs/plugin/*` model).

**Third-party plugins** ship as their own npm package with `@ilamy/calendar` as a **`peerDependency`** (no duplicate copy). They import the SDK from `@ilamy/calendar`, implement `IlamyPlugin`, publish. Consumer: `npm i @ilamy/calendar cool-ilamy-plugin` then `plugins={[coolPlugin()]}`.

---

## 11. Recurrence as the dogfood

The recurrence plugin proves the public API. After migration it:

- Lives at `src/features/plugins/recurrence/`, ships from `@ilamy/calendar/plugins/recurrence`.
- Imports **only** from `@ilamy/calendar` (SDK) — verified by lint + `exports`.
- Augments `CalendarEvent` with `rrule` / `recurrenceId` / `exdates` (section 6).
- `transformEvents`: expands base rrule events into in-range instances (merging detached overrides from the full list).
- `managesEvent`: `Boolean(event.rrule || event.recurrenceId || event.uid)`.
- `applyEdit` / `applyDelete`: scoped this/following/all logic (casts opaque `scope` to its own `RecurrenceEditScope`).
- `renderSlot`: renders its **own** editor UI into `SLOT_EVENT_FORM` and its **own** scope dialog into `SLOT_EVENT_MUTATION_SCOPE` (BYO UI — no `@/components/ui`).
- `contribute('ical:vevent-properties', event)`: emits `RRULE` / `EXDATE` / `RECURRENCE-ID` lines.
- Does the parent-series lookup (formerly `findParentRecurringEvent`) internally.

`@ilamy/calendar/plugins/recurrence` public exports: `recurrencePlugin`, `generateRecurringEvents`, `isRecurringEvent`, `RRuleOptions`, `RRule`.

---

## 12. iCal export (core now, plugin-ready)

- The core exporter (`export-ical.ts`) serializes only **core** event fields, then appends `collect('ical:vevent-properties', event)` to each VEVENT.
- It no longer reads `rrule` / `recurrenceId` / `exdates`; the recurrence-aware `filterEvents` is deleted (export runs on raw events, which contain no generated instances).
- The point key `'ical:vevent-properties'` is a documented **string convention**, so a future export *plugin* and the recurrence plugin cooperate without depending on each other's packages. When export becomes a plugin later, it reuses `collect` unchanged and recurrence does not change.

---

## 13. Breaking changes (v2.0.0)

1. **Plugins are opt-in.** Recurrence no longer works out of the box; consumers must pass `plugins={[recurrencePlugin()]}`.
2. **Recurrence helpers move** from `@ilamy/calendar` to `@ilamy/calendar/plugins/recurrence` (`generateRecurringEvents`, `isRecurringEvent`, `RRule`, `RRuleOptions`).
3. **`CalendarEvent`** no longer declares `rrule` / `recurrenceId` / `exdates` unless the recurrence plugin is imported (declaration merging).
4. **Context API**: `updateRecurringEvent` / `deleteRecurringEvent` → `applyScopedEdit` / `applyScopedDelete`; `findParentRecurringEvent` removed.
5. **`CalendarView`** becomes `string` (plugins add views), not a closed union.
6. **Deep imports** into the package now throw (`exports` encapsulation).

A migration guide ships with the release.

---

## 14. Enforcement

- **External:** `exports` map — deep imports throw `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- **Internal:** ESLint `no-restricted-imports` (or `import/no-internal-modules`) forbidding `src/features/plugins/**` from importing `@/hooks`, `@/components`, `@/lib`, `@/features` (anything but the public entry). This keeps first-party plugins honest to the dogfooding rule.
- **Tests:** a "recurrence builds from public API only" assertion + the existing 897-test suite preserved through the migration.

---

## 15. Scope & future work

**In scope for v2.0.0:**
- Generic contract + runtime (`transformEvents`, `managesEvent`, `applyEdit/Delete`, `renderSlot`, `contribute`, `views`, `provider`).
- Declaration-merging event extension; lean core `CalendarEvent`.
- Generic context API + `useScopedEventMutation`.
- Recurrence migrated to a true plugin (dogfood: public-API-only, BYO UI, own subpath).
- iCal export uses `collect`; recurrence-unaware core.
- Packaging (`exports`, subpaths, `sideEffects`, no default registration, peer-dep story).
- Enforcement (lint + exports) + third-party authoring docs.

**Future (enabled by this, not in scope here):**
- Resource calendar migrated to a plugin (validates `views` + `provider`; `IlamyResourceCalendar` becomes a thin preset or is removed).
- iCal export migrated to a plugin (reuses `collect` + a header `renderSlot`).
- Additional host slots / extension points as needs arise.

**Prerequisite / coordination:** close PR #126 (competing recurrence rewrite) before recurrence migration to avoid conflicting work.

---

## 16. Risks & open items for the plan

- `views` + `provider` wiring: the header view-switcher must include `getViews()`; navigation must use a view's `navigationUnit`; the provider tree must compose `getProviders()` around the calendar subtree. Detailed in the implementation plan.
- `CalendarView: string` ripples through the header, engine `VIEW_UNITS`, and view rendering.
- Converting `CalendarEvent` to an interface; confirm no `type`-only constructs depend on it.
- Recurrence BYO UI: rebuilding the editor + scope dialog without `@/components/ui` (own minimal primitives).
- bunup multi-entry build specifics (confirm against installed version).
- Preserving the full test suite across a large, breaking refactor; recurrence tests move with the plugin.
```
