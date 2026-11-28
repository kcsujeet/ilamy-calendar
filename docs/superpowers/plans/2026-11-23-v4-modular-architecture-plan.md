# v4.0 Plan: Modular Architecture (Framework x Component Library x CSS Library)

**Status:** Proposed, for hand-off. Supersedes `2026-11-22-v4-zero-ui-deps-and-collapsed-monorepo-plan.md`.
**Branch:** `roadmap/4.0` (PR #400). Base commit: `de6873db`.

## Principle: follow established conventions

Name and shape public APIs the way major libraries already do, and cite the source per decision (doc URL, version read). Do not invent our own semantics. Calendar behaviour follows RFC 5545 first (AGENTS.md).

## 0. Goal

Any combination of these three axes must work, each chosen independently:

| Axis | Examples | How it plugs in |
|---|---|---|
| Framework | React, Vue, Svelte, Solid, Angular | Thin wrapper over one internal Preact renderer (`lib/renderer`, internal; no public plain-JS entry, see section 6) |
| Component library | shadcn (Base UI / Radix / React Aria), MUI, bits-ui, reka-ui, shadcn-svelte, shadcn-vue | Region-level `slots` prop (`header`, `event`, `resource`, `eventForm`, `moreEventsDialog`, `recurrenceScopeDialog`) on every wrapper; native accessible HTML defaults ship inside `lib/renderer` (zero Radix/UI-lib deps), and when a region slot is provided the wrapper mounts the user's component into that slot host |
| CSS library | plain CSS, Tailwind, StyleX, MUI theme | `--ilamy-*` tokens, `unstyled`, and `slotProps` (`className`/`style`) per semantic part. No library-specific styling code ships; docs recipes show the mapping. |

Acceptance example: a shadcn-on-Base-UI user gets native defaults inheriting shadcn CSS variables or swaps `slots.eventForm` / `slots.header` with Base UI components and ships zero Radix; Svelte + Tailwind + shadcn-svelte works with zero Radix, React, or `@dnd-kit`.

## 1. Verified state of the branch (at `de6873db`)

Checked against the tree, not the docs:

- Commits `1ccd0c4c`, `76278d99`, `a8e6ecb7`, and `de6873db` are docs-only. `git diff --stat 7fcaba73 de6873db -- packages apps/demo biome.json` is empty.
- `packages/` still holds `adapters core dom playground plugins themes types ui utils`. `packages/calendar/src` has no `config/ types/ utils/ lib/ features/`.
- `packages/calendar/package.json` dependencies still include 10 `@radix-ui/*`, `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `rrule`. Exports still list `./themes/mui`, `./themes/stylex`; there is no `./styles/mui` or `./styles/stylex`.
- Two UIs: React adapter ~14,964 LOC (own state engine; never calls `createCalendarController`), `packages/dom` ~6,722 LOC (uses the controller).
- Three drag engines: `@dnd-kit` in React (`use-calendar-drag.ts` 566 + helpers), `packages/dom/src/interactions/dom-interactions.ts` (465), `packages/plugins/drag-to-create/src/hooks/use-drag-gesture.ts` (320).
- `packages/dom` has no plugin API: agenda, year, recurrence UI and ical are hard-coded (`dom-agenda-view.ts`, `dom-year-view.ts`, `dom-repeat-section.ts`, `dom-ical.utils.ts`).
- `rrule` is imported statically in `packages/dom` (`dom-repeat-section.ts`, `dom-events.utils.ts`, `dom-ical.utils.ts`, `dom-calendar.types.ts`), so it is not optional for DOM users today.
- Plugins import `react`, `@ilamy/calendar/react`, `@ilamy/ui/*` and `lucide-react`.
- `packages/types/src/index.ts` imports `react`.

## 2. Problems in the current docs (fix as part of this plan)

1. **Docs describe unbuilt code as shipped.** README, website (`apps/website/src/content/docs/**`), `docs/migration-v4.md` and `AGENTS.md` name paths, exports and peer deps that do not exist. A website deploy would publish install steps that fail. Rule: docs land in the same commit as the code they describe (Phase 7 final truth pass). Until then, label target-state text "Planned (v4)".
2. **The `components` prop (`CalendarComponents`) was removed from the docs**, and #401 is claimed solved by shadcn CSS-variable bridging alone. That is incomplete: #401 is solved by removing all `@radix-ui/*` from `@ilamy/calendar` (shipping accessible native HTML defaults that inherit shadcn CSS variables) AND adding region-level `slots` across every wrapper (Phase 3 & Phase 5) rather than primitive-level `CalendarComponents`.
3. **`rrule` is documented as "only for plugins/recurrence"** while the DOM core imports it statically (Phase 4 moves plugins out and keeps `rrule` strictly inside `features/plugins/recurrence`).
4. **Plugins are documented as framework-agnostic** while today's DOM renderer has no plugin contract (Phase 4).

## 3. Target layout

Keep the 2-package collapse from the 11-22 plan (`packages/calendar`, `packages/playground`) and its Biome `noRestrictedImports` boundaries. Changes to it:

```text
packages/calendar/src/
  index.ts              "."  headless: types/, utils/ (temporal, helpers, i18n), lib/{controller,layout,view-models,interactions} — zero preact, zero framework
  types/                CalendarEvent, Resource, plugin contract, region slot contract — zero framework/preact imports
  utils/
  lib/
    controller/         the only state engine (all wrappers use it)
    layout/  view-models/
    interactions/       headless pointer engine: drag, resize, drag-to-create (geometry + snapping, no DOM rendering)
    renderer/           internal Preact 11.2.0 renderer, not exported; native HTML defaults + stable region slot hosts;
                        internal Bulletproof layout: components/, features/{header,event-form,views}/, app/
  features/
    adapters/{react,vue,svelte,solid,angular}/   thin wrappers: props -> renderer mount, controller -> framework store, region slots -> framework components
    plugins/{recurrence,agenda,year,ical,drag-to-create}/   core data hooks + internal Preact UI slots; zero React/Vue/Svelte/Solid/Angular imports
styles/                 base.css (structure), theme.css (tokens)
```

**JSX isolation:** `packages/calendar/tsconfig.json` uses `"jsxImportSource": "preact"` (for `lib/renderer/` and `features/plugins/*`), while `features/adapters/react/**` uses `/** @jsxImportSource react */` (verified in Phase 0 across `bunup`, `bun check`, `check:dist-types`, and `bun test`). Biome `noRestrictedImports` forbids `react`/`react-dom` outside `features/adapters/react/**` and forbids `preact` inside `src/types/`, `src/utils/`, `src/lib/{controller,layout,view-models,interactions}/`, `src/index.ts`, and `src/features/adapters/**` (guaranteeing `preact` never leaks into `.` headless core or public `.d.ts`).

**Dependencies:** `dependencies` = `temporal-polyfill` + `preact` (`11.2.0`, verified via `npm view preact version` on 2026-11-23; zero runtime sub-dependencies, `preact-render-to-string` is an optional peer). Optional peers: framework runtimes (`react`, `react-dom`, `vue`, `svelte`, `solid-js`, `@angular/core`), `rrule` (imported only by `features/plugins/recurrence`; `lib/renderer` never imports it). Removed completely from published package: `@radix-ui/*`, `@dnd-kit/*`, `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, `@mui/material`, `@stylexjs/stylex`. Before adding or bumping anything, run `npm view <pkg> version` and use the latest (AGENTS.md hard rule).

## 4. Component slot contract (`slots` + `slotProps`)

One framework-free, **region-level** contract in `types/`, rendered by `lib/renderer`:

```ts
// Sketch. Final shape verified in Phase 0 and approved by owner (public API).
type SlotName =
  | 'header'
  | 'event'
  | 'resource'
  | 'eventForm'
  | 'moreEventsDialog'
  | 'recurrenceScopeDialog'

interface SlotMount<P> {
  mount(host: HTMLElement, props: P): { update(props: P): void; destroy(): void }
}
type CalendarSlots = Partial<{ [K in SlotName]: SlotMount<SlotContextMap[K]> }>
```

**Naming (decided 2026-11-23): `slots` + `slotProps`, the MUI convention.** Source: https://mui.com/material-ui/customization/overriding-component-structure/ (read at v9.6.0): "`slots`—to replace any interior slots (when present) as well as the root"; "you can pass custom props to interior slots using `slotProps`"; a `slotProps` entry "can also be a callback that receives the component's `ownerState`". MUI v6 deprecated its older per-part `*Props` props in favour of these.
- `slots` replaces the unreleased `components` / `CalendarComponents` on this branch. Verified 2026-11-23: the published 3.3.1 `IlamyCalendarProps` (`dist/index.d.ts:863`, from `npm pack @ilamy/calendar@3.3.1`) has no `components`, `CalendarComponents`, `slotProps` or `unstyled`, so `slots` and `slotProps` are new in v4 and need no rename entry in `docs/migration-v4.md` (list them as new).
- The branch's unreleased `slotProps` (`{ className, style }` per semantic part such as `header`) is kept and widened as a map keyed by semantic part, with entries able to take calendar state as a callback (as in MUI).

Why region-level slots replace primitive-level slots:
- No `lib/renderer` DOM nodes sit inside a foreign framework `Dialog`, eliminating nested-portal focus-trap conflicts, outside-click dismissal bugs, and controlled-input caret jumps across 5 frameworks.
- Apps style the built-in grid and header via `--ilamy-*` tokens + `slotProps` and swap whole regions (`eventForm`, `header`, `moreEventsDialog`, etc.) with their own domain UI.
- Accessible native HTML defaults handle out-of-the-box rendering inside `lib/renderer` with zero Radix.
- Preact's keyed reconciliation keeps each slot's host `HTMLElement` stable across calendar state updates so mounted React/Vue/Svelte/Solid/Angular trees update in place via `SlotMount.update(props)` without unmounting or losing focus.
- Each wrapper converts its framework's components into `SlotMount`s using each framework's documented imperative mount API (React `createPortal`, Vue `render`/Teleport, Svelte `mount`, Solid `render`, Angular `createComponent`; cite docs URL in the PR).
- `slots` unifies `renderEvent`, `renderHeader`/`headerComponent`, `renderResource`, `renderEventForm`, and `onMoreEventsClick` into one mechanism (with any thin React v3 convenience prop mapping decided in Phase 0/5).

## 5. Phases

Each phase ends with a full run of `2026-11-23-v4-qa-protocol.md` and its report. Each phase is one coherent change with unit and e2e tests written first (AGENTS.md: TDD, both layers), exercised in `apps/demo` with default settings, and a dev log entry. Docs for a phase land in that phase.

**Phase 0 — Spike (gate for everything else).** Prove two pillars before refactoring:
1. **Dual-JSX hygiene (`preact` `11.2.0` in `lib/renderer`, `/** @jsxImportSource react */` in `features/adapters/react`):** `bunup`, `bun check`, `check:dist-types`, and `bun test` all pass with zero `preact` types leaking into public `dist/*.d.ts`.
2. **Region slot lifecycle in React (shadcn on Base UI) and Svelte (bits-ui / shadcn-svelte):** mount a Base UI `<Dialog>` in `slots.eventForm` (containing a nested Base UI `<Select>` and `<Popover>`) plus `slots.header` / `slots.event` inside a Preact-rendered calendar; Playwright E2E verifies Preact state updates call `SlotMount.update(props)` without unmounting portals or losing focus, React Context (`useIlamyCalendarContext()`, theme providers) flows into portals, focus trap / Escape / outside-click / keyboard nav work, and SSR imports do not crash.

Deliver: findings, go/no-go, final `SlotName`/`SlotContextMap` shape. Stop and report to owner before Phase 1.

**Phase 1 — Collapse packages & drop unreleased theme packages (no behaviour change to shipped APIs).** Move sources into `packages/calendar/src/` per section 3; move demo-only shadcn chrome from `packages/ui` to `packages/playground/src/components/ui/`; delete unreleased `packages/themes/*` and `./themes/mui` + `./themes/stylex` exports now (updating `packages/playground` to pure `--ilamy-*` token presets so dead theme packages are not moved only to be deleted in Phase 6); delete the 18 obsolete private packages; Biome boundaries on. Framework-free domain types go to `src/types/` (zero React); legacy React plugin/component types stay in `features/adapters/react/types/` until Phases 4 & 5 delete them. Existing unit + E2E specs pass.

**Phase 2 — One drag engine (`lib/interactions/`).** Build headless pointer engine (move, resize, sub-cell `snapDuration` 15/30, `eventResizableFromStart`, touch drag + auto-scroll, drag-to-create selection) in `src/lib/interactions/` (zero framework); delete duplicate drag logic (`use-drag-gesture.ts`). Every drag/resize/select spec drives a real pointer (`page.mouse`, small steps, `document.elementFromPoint`), including `apps/demo` defaults (600px scroll, business hours, timezone, all plugins).

**Phase 3 — Port battle-tested React views into internal Preact `lib/renderer/` (zero Radix, zero Tailwind, 100% parity).** Port the battle-tested React UI (`views/`, `header/`, `event-form/`, async `events`/`resources` fetchers, `Intl` format props, `allDaySlot`, `scrollTime`/`scrollToNow`, `eventResizableFromStart`, `onMoreEventsClick`, `scrollToTime`, ARIA grid roles, 500-resource perf) into `src/lib/renderer/` on Preact `11.2.0` + `lib/controller/` + `lib/interactions/`. Replace all `@radix-ui/*`, `lucide-react`, `cva`, `clsx`, `tailwind-merge`, and Tailwind utility classes with semantic native HTML (`<dialog>`, `<button>`, `<input>`, `<textarea>`, `<select>`, `<input type="checkbox">`, inline SVGs) styled by `styles/base.css` and `styles/theme.css` via `data-ilamy-slot` attributes (zero Tailwind required for grid, header, dialogs, popovers, or forms). Wire region-level `slots` + `slotProps`. Delete old imperative `packages/dom` (6.7k LOC) once parity + zero-Tailwind E2E specs pass.

**Phase 4 — Framework-agnostic plugins (`features/plugins/*`) & zero `rrule` in core.** Define the plugin contract in `src/types/`; port `recurrence`, `agenda`, `year`, `ical`, and `drag-to-create` into `src/features/plugins/*` using core data hooks + internal Preact UI slots (zero React/Vue/Svelte/Solid/Angular imports). `rrule` is imported only by `features/plugins/recurrence`; Biome boundary + bundle check confirm a calendar without `recurrencePlugin()` does not include `rrule`.

**Phase 5 — Thin symmetric wrappers for all 5 frameworks & delete old React/`@dnd-kit`/Radix.** Point `vue`, `svelte`, `solid`, and `angular` adapters at `lib/renderer` + `lib/controller` + region `slots`. Rewrite `features/adapters/react` as a thin React 19 wrapper (`useSyncExternalStore` + Context for `useIlamyCalendarContext()` / `ref`, `ReactDOM.createPortal` for region `slots`). Delete old React UI, `@dnd-kit/*`, `@radix-ui/*`, `lucide-react`, `cva`, `clsx`, and `tailwind-merge` only after the full unit + E2E suite passes against the new React wrapper in `apps/demo`. Verify `packages/calendar/package.json` `dependencies` = `temporal-polyfill` + `preact` only.

**Phase 6 — Runnable styling & component recipes (zero library-specific styling code), and the playground split into three axes.** The playground offers Framework, CSS (Unstyled, Plain CSS, Tailwind, StyleX) and Components (Native, plus the libraries available for that framework) as three independent controls; see the Playground section of the QA protocol. Confirm `@mui/material` and `@stylexjs/stylex` are absent from `packages/calendar` peers and exports (`./themes/*`, `./styles/mui`, `./styles/stylex`, `./react/mui`). Add website recipes: MUI theme -> `--ilamy-*` variables, StyleX -> variables + `slotProps`, Tailwind -> `unstyled` + `slotProps.className`, and shadcn (Base UI, Radix) / MUI / bits-ui regions via `slots`. Each recipe is a runnable example covered by an E2E spec in at least two frameworks so it cannot rot.

**Phase 7 — Docs truth pass.** README, `packages/calendar/README.md`, website (`apps/website/src/content/docs/**`), `docs/migration-v4.md`, `docs/monorepo-architecture.md`, `docs/roadmap.md`, and `AGENTS.md` match the shipped tree. Every documented export resolves (`bun run build && bun run check:dist-types`, plus an import smoke test per subpath).

## 6. Owner decisions (all decided 2026-11-23; any new public API question goes back to the owner)

1. ~~Prop name~~ **Decided:** `slots` + `slotProps` (MUI v9.6.0 convention), **region-level only** (`header`, `event`, `resource`, `eventForm`, `moreEventsDialog`, `recurrenceScopeDialog`), replacing unreleased `components` / `CalendarComponents`.
2. **Decided (2026-11-23): no public plain-JS entry.** `lib/renderer` stays internal; remove `./dom` from `exports`, README and website. Users reach the calendar only through a framework wrapper (`./react`, `./vue`, `./svelte`, `./solid`, `./angular`). `.` stays the headless core (types, Temporal helpers, controller).
2b. **Decided (2026-11-23): drop all library-specific styling code.** Removed in Phase 1; runnable recipes in Phase 6 (`./themes/*`, `./styles/mui`, `./styles/stylex` or `./react/mui` do not ship). None of these shipped: the latest published version, 3.3.1, exports only `.`, `./plugins/agenda`, `./plugins/drag-to-create`, `./plugins/recurrence`, `./testing` (`npm view @ilamy/calendar exports`, 2026-11-23), so no migration entry is needed.
3. **Decided (2026-11-23): single internal Preact renderer (`preact` `11.2.0`), wrapped by all 5 frameworks including React** via `createPortal` (https://react.dev/reference/react-dom/createPortal). Owner approved Preact as a runtime dependency on 2026-11-23. Precedent (checked with `npm view`, 2026-11-23): `@schedule-x/calendar` depends on `preact ^10.19.2`; `@fullcalendar/core@6` depended on `preact ~10.12.1` and its React wrapper portals custom content (`createPortal(vnode, customRendering.containerEl)`, https://raw.githubusercontent.com/fullcalendar/fullcalendar-react/main/src/index.tsx). The latest `@fullcalendar/core` (7.1.5) no longer lists `preact` (peers: `temporal-polyfill`, `@full-ui/headless-calendar`); whether v7 bundles it internally is unverified. Measure Preact's real gzipped cost in Phase 0 (`bun run build` before/after) rather than relying on the ~4 KB estimate; chosen over raw `document.createElement` to port battle-tested React views 1:1 and get keyed reconciliation for virtualisation, keyboard focus, and stable portal hosts. `preact` stays internal and never appears in public `.d.ts`. Rejected: a native UI per framework over shared logic (AG Grid's model, `ag-grid-react/src/reactUi/gridComp.tsx`), because it multiplies UI code by six; fully headless (TanStack Table), because users would build the calendar themselves.

## 7. Rules that apply to every phase (from AGENTS.md)

- `bun` only; never bare `bun test` at the root (`bun run test`).
- Temporal via `utils/temporal.ts`; no dayjs; ISO 8601 with offset.
- RFC 5545 semantics; where silent, match established calendar behaviour and cite it.
- Never commit to `main`; no AI co-author; no GitHub posting without a fresh "post it".
- A feature is done only after it is driven in `apps/demo` with defaults and recorded as a spec.
- Verify every claim twice; label unverified things "unverified".
