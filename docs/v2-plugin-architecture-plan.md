# @ilamy/calendar v2.0.0 — Plugin Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@ilamy/calendar` fully pluggable. Core becomes plugin-agnostic; recurrence is migrated to a true plugin built only from the public API; the plugin contract supports data transforms, event management, UI slots, data contributions, views, and plugin-owned state.

**Architecture:** See `docs/v2-plugin-architecture.md` (the locked spec). This plan executes that spec.

**Tech Stack:** React 19, TypeScript, Tailwind v4, @dnd-kit, rrule.js, dayjs, bun, biome, bunup.

**Baseline:** commit `61a5cff` — generic plugin runtime + `src/features/plugins/` relocation already landed. Current contract uses `claimsEvent`/`getOwner` and recurrence is still coupled to core (default registration, `CalendarEvent.rrule`, recurrence-named context methods, internal UI). This plan removes that coupling.

**Conventions (per repo rules):** TDD (write/extend the co-located `*.test.*` first), `.at()` over indexing, no `!`, `Boolean()` over `!!`, no `any`, named exports only, no internal barrels, update `docs/logs/` after each task, conventional commit prefixes, never push without approval.

**Test invariant:** the full suite stays green (currently 897) at every task boundary. Recurrence tests move with the plugin; new contract features get new tests in existing `*.test.ts` files.

---

## Phase A — Complete the generic contract

### Task A1: Rename `claimsEvent` → `managesEvent`, `getOwner` → `getEventManager`

**Files:**
- Modify: `src/features/plugins/lib/types.ts`, `src/features/plugins/lib/create-plugin-runtime.ts`, `src/features/plugins/lib/create-plugin-runtime.test.ts`
- Modify: `src/features/plugins/recurrence/recurrence-plugin.tsx`, `src/features/plugins/recurrence/recurrence-plugin.test.ts`
- Modify: `src/hooks/use-calendar-engine.ts`, `src/features/calendar/contexts/calendar-context/context.ts`
- Modify: `src/components/drag-and-drop/calendar-dnd-context.tsx`, `src/components/event-form/event-form.tsx`

- [ ] **Step 1:** In `types.ts`, rename `IlamyPlugin.claimsEvent` → `managesEvent`; in `PluginRuntime`, rename `getOwner` → `getEventManager`.
- [ ] **Step 2:** In `create-plugin-runtime.ts`, rename the runtime method and its body (`plugins.find(p => p.managesEvent?.(event))`). Update `create-plugin-runtime.test.ts` (`getOwner` → `getEventManager`).
- [ ] **Step 3:** Update recurrence adapter (`managesEvent: (event) => isRecurringEvent(event)`) and its test (`claimsEvent` → `managesEvent`).
- [ ] **Step 4:** Update engine return + `CalendarContextType` (`getOwner` → `getEventManager`), and the two consumers (dnd, event-form) that read `getOwner` from context.
- [ ] **Step 5:** Run `bun run type-check && bun test`. Expected: clean, 897 pass.
- [ ] **Step 6:** Update `docs/logs/<today>.md`; commit `refactor(plugins): rename to managesEvent / getEventManager`.

### Task A2: Add `contribute` / `collect`

**Files:** `src/features/plugins/lib/types.ts`, `create-plugin-runtime.ts`, `create-plugin-runtime.test.ts`; `src/hooks/use-calendar-engine.ts`; `src/features/calendar/contexts/calendar-context/context.ts`.

- [ ] **Step 1 (test first):** In `create-plugin-runtime.test.ts`, add tests:
  ```ts
  test('collect flattens contributions from all plugins for a point', () => {
    const a: IlamyPlugin = { name: 'a', contribute: (p) => (p === 'x' ? ['a1'] : []) }
    const b: IlamyPlugin = { name: 'b', contribute: (p) => (p === 'x' ? ['b1', 'b2'] : []) }
    expect(createPluginRuntime([a, b]).collect('x', null)).toEqual(['a1', 'b1', 'b2'])
  })
  test('collect ignores plugins without contribute or with other points', () => {
    const a: IlamyPlugin = { name: 'a', contribute: (p) => (p === 'x' ? ['a1'] : []) }
    expect(createPluginRuntime([a, { name: 'b' }]).collect('y', null)).toEqual([])
  })
  ```
- [ ] **Step 2:** Run the new tests; expect FAIL (no `contribute`/`collect`).
- [ ] **Step 3:** Add `contribute?: (point: string, context: unknown) => unknown[]` to `IlamyPlugin`; add `collect: (point: string, context: unknown) => unknown[]` to `PluginRuntime`; implement `collect: (point, ctx) => plugins.flatMap(p => p.contribute?.(point, ctx) ?? [])`.
- [ ] **Step 4:** Expose `collect` on the engine return and `CalendarContextType`.
- [ ] **Step 5:** `bun run type-check && bun test`; expect green.
- [ ] **Step 6:** Dev log; commit `feat(plugins): add contribute/collect data-contribution bus`.

### Task A3: Add `views` + `provider`; make `CalendarView` a string; wire the view system

**Files:**
- `src/features/plugins/lib/types.ts` (`PluginView`, `views`, `provider`), `create-plugin-runtime.ts` (+ `getViews`, `getProviders`), tests.
- `src/types/index.ts` (or wherever `CalendarView` lives): widen `CalendarView` from the closed union to `string` (keep `'day'|'week'|'month'|'year'` as known built-ins via a `BUILT_IN_VIEWS` const).
- `src/hooks/use-calendar-engine.ts`: `VIEW_UNITS` lookup must fall back to a plugin view's `navigationUnit`; expose `getViews`.
- Header/view-switcher component: include `getViews()` entries alongside built-ins.
- The provider composition point (where `CalendarProvider`/`ResourceCalendarProvider` render children): wrap the subtree in `getProviders()`.

- [ ] **Step 1 (test first):** In `create-plugin-runtime.test.ts`, add:
  ```ts
  test('getViews aggregates plugin views', () => {
    const p: IlamyPlugin = { name: 'p', views: [{ name: 'v', component: () => null }] }
    expect(createPluginRuntime([p]).getViews().map(v => v.name)).toEqual(['v'])
  })
  test('getProviders returns plugin providers in order', () => {
    const P = ({ children }: { children: ReactNode }) => children
    const p: IlamyPlugin = { name: 'p', provider: P }
    expect(createPluginRuntime([p]).getProviders()).toEqual([P])
  })
  ```
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Add `PluginView` (`name`, `label?`, `component`, `navigationUnit?`), `views?`, `provider?` to the contract; add `getViews`/`getProviders` to runtime.
- [ ] **Step 4:** Widen `CalendarView` to `string`; define `const BUILT_IN_VIEWS = ['day','week','month','year'] as const`. Fix the `VIEW_UNITS` record access so navigation uses the active view's unit (built-in map, else the plugin view's `navigationUnit`, else default to `'day'`).
- [ ] **Step 5:** In the engine, expose `getViews`. In the header view-switcher, render built-in views + `getViews()` (label from `view.label` or translation). When a plugin view is active, the view-rendering switch renders `view.component`.
- [ ] **Step 6:** Compose providers: where the provider renders `children`, wrap with `getProviders().reduceRight((tree, P) => <P>{tree}</P>, children)`.
- [ ] **Step 7:** Add an integration test (in the calendar component test) that mounts `IlamyCalendar` with a fake plugin contributing a view + provider, switches to it, and asserts the view renders and the provider's context value is readable.
- [ ] **Step 8:** `bun run type-check && bun test`; green.
- [ ] **Step 9:** Dev log; commit `feat(plugins): plugin views + provider, CalendarView as string`.

---

## Phase B — Generic scoped-mutation API

### Task B1: Add `applyScopedEdit` / `applyScopedDelete` (parallel to the old methods)

**Files:** `src/hooks/use-calendar-engine.ts`, `src/features/calendar/contexts/calendar-context/context.ts`, engine test.

- [ ] **Step 1 (test first):** In the engine test, add a case: with a fake managing plugin (`managesEvent` true, `applyEdit` returns a marker), `applyScopedEdit(event, updates, scope)` calls the manager's `applyEdit` with `{ event, updates, currentEvents, scope }` and sets state from the result; same for `applyScopedDelete`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement `applyScopedEdit(event, updates, scope)` and `applyScopedDelete(event, scope)` in the engine, routing through `pluginRuntime.getEventManager(event)?.applyEdit/applyDelete` (guarded). Expose on the engine return + `CalendarContextType`. Keep `updateRecurringEvent`/`deleteRecurringEvent` for now (removed in B3).
- [ ] **Step 4:** `type-check && test`; green.
- [ ] **Step 5:** Dev log; commit `feat(context): add generic applyScopedEdit/applyScopedDelete`.

### Task B2: Create `useScopedEventMutation`; migrate event-form and dnd onto it

**Files:**
- Create: `src/hooks/use-scoped-event-mutation.ts` (+ co-located `use-scoped-event-mutation.test.ts`).
- Modify: `src/components/event-form/event-form.tsx`, `src/components/drag-and-drop/calendar-dnd-context.tsx`.

- [ ] **Step 1 (test first):** Write `use-scoped-event-mutation.test.ts` rendering the hook within a minimal provider with a fake managing plugin; assert `openEditDialog`/`openDeleteDialog` set dialog state, the manager's `renderSlot(SLOT_EVENT_MUTATION_SCOPE, ...)` is invoked, and `resolve(scope)` triggers `applyScopedEdit/Delete` then closes + calls `onComplete`.
- [ ] **Step 2:** Run; expect FAIL.
- [ ] **Step 3:** Implement the hook (generalized successor of `useRecurringEventActions`): holds `{ isOpen, operation, event, updates }`, exposes `openEditDialog`, `openDeleteDialog`, `closeDialog`, `handleConfirm(scope)`. Uses only `useIlamyCalendarContext`-level members (`getEventManager`, `applyScopedEdit`, `applyScopedDelete`) and `SLOT_EVENT_MUTATION_SCOPE`. The component renders the manager's scope slot.
- [ ] **Step 4:** Migrate `event-form.tsx` to import `useScopedEventMutation` from `@/hooks/use-scoped-event-mutation` (drop the recurrence-plugin `useRecurringEventActions` import). Migrate `calendar-dnd-context.tsx` to use the same hook (delete its inline `recurringDialog` duplicate).
- [ ] **Step 5:** `type-check && test`; green.
- [ ] **Step 6:** Dev log; commit `refactor: shared useScopedEventMutation for form + dnd`.

### Task B3: Remove recurrence-named context API; move parent lookup into recurrence

**Files:** `src/hooks/use-calendar-engine.ts`, `context.ts`, `src/features/plugins/recurrence/*`, the recurrence form-section component.

- [ ] **Step 1:** Move the parent-series lookup (`findParentRecurringEvent`, reads `e.rrule`) out of the engine into the recurrence plugin's form-section component (it has `events` via `useIlamyCalendarContext`).
- [ ] **Step 2:** Delete `updateRecurringEvent`, `deleteRecurringEvent`, `findParentRecurringEvent` from the engine + `CalendarContextType`; delete `RecurrenceEditOptions` usage from core (recurrence keeps its own internal type).
- [ ] **Step 3:** Update any remaining callers to use `applyScopedEdit`/`applyScopedDelete`.
- [ ] **Step 4:** `type-check && test`; green (recurrence tests adjusted).
- [ ] **Step 5:** Dev log; commit `refactor(context): drop recurrence-named methods; parent lookup into plugin`.

---

## Phase C — Event-type extension via declaration merging

### Task C1: Lean `CalendarEvent` interface + recurrence augmentation

**Files:** `src/components/types.ts`, `src/features/plugins/recurrence/augment.ts` (create), recurrence types.

- [ ] **Step 1:** Ensure `CalendarEvent` is declared as an `interface` (convert from `type` if needed). Remove `rrule`, `recurrenceId`, `exdates` fields and the `RRuleOptions` import from `src/components/types.ts`.
- [ ] **Step 2:** Create `src/features/plugins/recurrence/augment.ts`:
  ```ts
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
  Import this module for side effects from the recurrence public entry so consumers of the plugin get the augmentation.
- [ ] **Step 3:** Fix every remaining **core** read of `rrule`/`recurrenceId`/`exdates` (the engine read is already removed in B3; iCal is handled in Phase D). Confirm with `grep -rn "\.rrule\|\.recurrenceId\|\.exdates" src | grep -v src/features/plugins/`.
- [ ] **Step 4:** `type-check && test`; green. (Tests that build events with `rrule` must `import '@/features/plugins/recurrence/augment'` or import the recurrence plugin.)
- [ ] **Step 5:** Dev log; commit `feat!: lean CalendarEvent; recurrence augments via declaration merging`.

---

## Phase D — iCal export through `collect`

### Task D1: Core exporter uses `collect`; recurrence contributes lines

**Files:** `src/lib/utils/export-ical.ts` (+ test), `src/features/plugins/recurrence/ical.ts` (create) + recurrence plugin wiring + recurrence test.

- [ ] **Step 1 (test first):** In recurrence tests, assert `recurrencePlugin().contribute('ical:vevent-properties', baseEvent)` returns the expected `RRULE`/`EXDATE` lines (and `RECURRENCE-ID` for a modified instance).
- [ ] **Step 2:** Implement `contribute` in the recurrence plugin (delegating to a new `ical.ts` that formats the lines, reusing the existing `formatRRule`/date logic moved from `export-ical.ts`).
- [ ] **Step 3:** In `export-ical.ts`, delete `filterEvents` and all `rrule`/`recurrenceId`/`exdates` reads; the exporter must accept a `collect` function (or be called with pre-collected lines) so it stays plugin-agnostic. Simplest: `exportToICalendar(events, collect, calendarName)` where `collect: (point, event) => unknown[]`; `base-header.tsx` passes `context.collect`.
- [ ] **Step 4:** Update `export-ical.test.ts`: tests that assert `RRULE`/`EXDATE` now pass a `collect` backed by the recurrence plugin (or assert core-only output without recurrence). Keep coverage of core fields intact.
- [ ] **Step 5:** `type-check && test`; green.
- [ ] **Step 6:** Dev log; commit `refactor(ical): export via collect(); recurrence contributes its lines`.

---

## Phase E — Recurrence brings its own UI

### Task E1: Replace internal `@/components/ui` in recurrence

**Files:** `src/features/plugins/recurrence/ui/*` (create), recurrence editor + scope dialog, their tests.

- [ ] **Step 1:** Inventory recurrence's `@/components/ui` usage (`grep -rn "@/components/ui" src/features/plugins/recurrence`).
- [ ] **Step 2:** Add a minimal own-UI set under `src/features/plugins/recurrence/ui/` (button, dialog, select, etc. — only what the editor/dialog need), styled with Tailwind classes directly (no dependency on the host design system).
- [ ] **Step 3:** Rewrite `RecurrenceEditor` and the scope dialog to use the plugin's own UI. Keep behavior identical; update the co-located tests (they assert behavior/interactions, not host component internals).
- [ ] **Step 4:** `grep -rn "@/components\|@/hooks\|@/lib\|@/features" src/features/plugins/recurrence` must show only `@ilamy/calendar` (public) imports after Phase F's path switch — for now, internal `@/components/ui` must be gone.
- [ ] **Step 5:** `type-check && test`; green.
- [ ] **Step 6:** Dev log; commit `refactor(recurrence): bring own UI, drop host design system`.

---

## Phase F — Packaging, opt-in, enforcement

### Task F1: Remove default plugin registration (breaking)

**Files:** `src/hooks/use-calendar-engine.ts`, provider(s), demo + examples.

- [ ] **Step 1:** Change the engine default from `plugins = [recurrencePlugin()]` to `plugins = []`. Remove the `recurrencePlugin` import from the engine.
- [ ] **Step 2:** Update the demo app and `examples/*` to pass `plugins={[recurrencePlugin()]}` so recurrence still works there.
- [ ] **Step 3:** Recurrence integration tests now construct the calendar with `plugins={[recurrencePlugin()]}`.
- [ ] **Step 4:** `type-check && test`; green.
- [ ] **Step 5:** Dev log; commit `feat!: plugins are opt-in; core ships no default plugins`.

### Task F2: Curate `IlamyCalendarApi`; split public vs internal context

**Files:** `src/hooks/use-smart-calendar-context.ts`, `src/index.ts`.

- [ ] **Step 1:** Rename `UseIlamyCalendarContextReturn` → `IlamyCalendarApi`. Add the v2 members (`rawEvents`, `t`, `timeFormat`, `timezone`, `currentLocale`, `getEventsForDateRange`, `applyScopedEdit`, `applyScopedDelete`, `getEventManager`, `renderSlot`, `collect`, `getViews`). Keep `resources`/`getEventsForResource` for now (deferred removal). `useIlamyCalendarContext` assembles exactly these from the full context.
- [ ] **Step 2:** Ensure `useSmartCalendarContext` stays internal (not exported from `src/index.ts`).
- [ ] **Step 3:** `type-check && test`; green.
- [ ] **Step 4:** Dev log; commit `feat(api): curate IlamyCalendarApi public context surface`.

### Task F3: Subpath exports + main entry no longer re-exports recurrence

**Files:** `src/index.ts`, `src/features/plugins/recurrence/recurrence.ts` (create public entry), `package.json`, `bunup.config.ts`.

- [ ] **Step 1:** Create `src/features/plugins/recurrence/recurrence.ts` — the recurrence public entry. It re-exports `recurrencePlugin`, `generateRecurringEvents`, `isRecurringEvent`, `RRule`, `RRuleOptions`, and imports `./augment` for the type augmentation side effect.
- [ ] **Step 2:** Remove `generateRecurringEvents`/`isRecurringEvent`/`RRule`/`RRuleOptions` (and any recurrence re-exports) from `src/index.ts`. `src/index.ts` exports only core + the plugin SDK (contract types, slot catalog, `IlamyCalendarApi`, `useIlamyCalendarContext`, core types). Verify `src/index.ts` imports no plugin.
- [ ] **Step 3:** Add `bunup` entries for `src/index.ts` and `src/features/plugins/recurrence/recurrence.ts` (confirm multi-entry syntax against the installed bunup version: `npm view bunup version` then read its docs/types).
- [ ] **Step 4:** Add to `package.json`:
  ```json
  "exports": {
    ".":                    { "types": "./dist/index.d.ts",              "import": "./dist/index.js" },
    "./plugins/recurrence": { "types": "./dist/plugins/recurrence.d.ts", "import": "./dist/plugins/recurrence.js" }
  },
  "sideEffects": false
  ```
  Match the real built output paths to bunup's emit.
- [ ] **Step 5:** `bun run build`; verify `dist/index.js` and `dist/plugins/recurrence.js` (+ `.d.ts`) emit, and `dist/index.js` does not contain recurrence code (grep the bundle for `RRule`/`generateRecurringEvents`).
- [ ] **Step 6:** `type-check && test && build`; green.
- [ ] **Step 7:** Dev log; commit `feat!: subpath export @ilamy/calendar/plugins/recurrence; sideEffects false`.

### Task F4: Enforce the dogfooding rule (lint)

**Files:** biome/oxlint config (`.agents/...` or root config), CI.

- [ ] **Step 1:** Add a `no-restricted-imports`-style rule: files under `src/features/plugins/**` may not import `@/hooks/*`, `@/components/*`, `@/lib/*`, `@/features/*` (anything but `@ilamy/calendar` / relative within the plugin). Confirm the exact rule syntax for the repo's linter (oxlint/biome) against its docs before writing it.
- [ ] **Step 2:** Run the linter; fix any violations the rule surfaces (there should be none left after Phases C–E).
- [ ] **Step 3:** Add a test asserting recurrence's import graph is public-API-only (e.g. scan recurrence source files for forbidden import prefixes).
- [ ] **Step 4:** `bun run ci`; green.
- [ ] **Step 5:** Dev log; commit `chore(lint): enforce plugins import only the public API`.

---

## Phase G — Docs & migration

### Task G1: Plugin authoring guide + migration guide

**Files:** `docs/writing-plugins.md` (create), `docs/migration-v2.md` (create), `README` pointers.

- [ ] **Step 1:** Write `docs/writing-plugins.md`: the `IlamyPlugin` contract, each capability with a minimal example, declaration merging for custom fields, slots/points, views/provider, packaging a third-party plugin (peer dep), all using only public imports.
- [ ] **Step 2:** Write `docs/migration-v2.md` from the spec's §13 breaking-changes list (opt-in plugins, subpath imports, `CalendarEvent` fields, context method renames, `CalendarView: string`, deep-import encapsulation), each with before/after snippets.
- [ ] **Step 3:** Dev log; commit `docs: plugin authoring + v2 migration guides`.

---

## Out of scope (future, enabled by this)

- Resource calendar migrated to a plugin (`views` + `provider`); `IlamyResourceCalendar` becomes a thin preset or is removed; `resources`/`getEventsForResource` leave the core surface.
- iCal export migrated to a plugin (reuses `collect` + a header `renderSlot`).

## Prerequisite

- Close/settle PR #126 (competing recurrence rewrite) before Phase C–E to avoid conflicting recurrence edits.

## Self-review checklist (before execution)

- Spec coverage: every §15 in-scope item maps to a task (A: contract; B: context; C: event type; D: iCal; E: UI; F: packaging/api/enforcement; G: docs). ✓
- Type consistency: `managesEvent`/`getEventManager`/`applyScopedEdit`/`applyScopedDelete`/`collect`/`getViews`/`getProviders`/`IlamyCalendarApi` used identically across tasks. ✓
- Ordering: renames → contribute/collect → views/provider → scoped API → event-type → iCal → UI → packaging → docs. Each task ends green and committed.
