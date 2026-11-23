# v4.0 Architecture Plan — Single `lib/dom` Renderer, Token-Only Styling Mappers & Collapsed 2-Package Monorepo

**Status:** Planned (next)
**Supersedes / extends:** `docs/superpowers/plans/2026-11-22-v4-css-tokens-and-symmetric-core-plan.md`

---

## 1. Goals & Architectural Principles

1. **Option A — Single `lib/dom` Renderer + Framework-Agnostic Plugins:**
   - `packages/calendar/src/lib/dom/` (`./dom`) is the single calendar UI renderer wrapped by ALL 5 frameworks (`react`, `vue`, `svelte`, `solid`, `angular`) plus Vanilla DOM.
   - `features/adapters/react/` (`./react`) is a thin React 19 wrapper over `lib/controller` + `lib/dom`, using `ReactDOM.createPortal` for custom rendering (`renderEvent`, `renderHeader` / `headerComponent`, `renderResource`, `renderEventForm`, `onMoreEventsClick`) and `useSyncExternalStore` + React Context for `useIlamyCalendarContext()` and `ref`.
   - Drag-and-drop and resize use `lib/dom`'s single zero-dependency pointer engine across ALL frameworks (removing `@dnd-kit/core` and `@dnd-kit/modifiers`).
   - Plugins (`features/plugins/{recurrence,agenda,year,ical,drag-to-create}`) implement ONE framework-agnostic DOM plugin contract (`IlamyPlugin` in `src/types/` / `src/lib/dom/`), working identically across all 5 frameworks + Vanilla DOM (removing boolean `enableYearView`, `enableAgendaView`, `enableDragToCreate`, `enableIcalExport` flags and hard-wired `rrule` from `lib/dom`).
2. **Pure Token-Only Theme & Styling Mappers (zero UI-component wrappers shipped):**
   - Every design-system integration is a framework-agnostic `--ilamy-*` CSS token mapper with zero UI-component wrappers (`CalendarComponents`, `useCalendarComponents`, `muiCalendarComponents`, `useMuiCalendarTheme`, and `./react/mui` are ALL removed):
     - `./styles.css`, `./styles/base.css`, `./styles/theme.css` — layered CSS (`@layer ilamy.base, ilamy.theme`) covering grid, layout, dialogs, popovers, and form controls with zero Tailwind, auto-bridging shadcn/Tailwind variables (works with Base UI #401, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS).
     - `./styles/stylex` (`src/features/styling/stylex/index.ts`) — `--ilamy-*` token presets + `stylexSlot` / `createStylexSlotProps` (zero React).
     - `./styles/mui` (`src/features/styling/mui/index.ts`) — pure `createMuiCalendarTheme(theme)` reading a MUI `Theme` palette/typography/shape object into `--ilamy-*` tokens (zero `@mui/material` runtime components, zero React dependency — works across all 5 frameworks).
   - Custom UI forms, headers, events, and resources (Base UI, Radix, MUI, Vuetify, etc.) use `renderEventForm` / `renderHeader` (`headerComponent`) / `renderEvent` / `renderResource` portals/slots instead of primitive-level `CalendarComponents`.
3. **Zero UI-Library & `@dnd-kit` Dependencies:** remove `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material` runtime components, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge`.
4. **Collapsed 2-Package Fractal Bulletproof Monorepo:** eliminate 18 redundant private micro-packages (`packages/{types,utils,core,dom,ui}`, `packages/adapters/*`, `packages/plugins/*`, `packages/themes/*`) and the hollow `packages/calendar` shim shell. Real source lives inside `packages/calendar/src/` in a textbook fractal Bulletproof React structure; demo-only shadcn chrome moves from deleted `packages/ui` to `packages/playground/src/components/ui/`.
5. **Single Runtime Dependency + Optional Peer Dependencies:** `@ilamy/calendar` declares ONLY `temporal-polyfill` in `dependencies`. Framework runtimes (`react`, `react-dom`, `vue`, `svelte`, `solid-js`, `@angular/core`), `rrule` (only for `@ilamy/calendar/plugins/recurrence`), `@stylexjs/stylex` (optional types for `./styles/stylex`), and `tailwindcss` (optional) are optional `peerDependencies`.

---

## 2. Target Repository Layout & Subpath Map

### 2.1 Workspace Layout (2 Packages + Apps)

```text
ilamy-calendar/
  package.json                    workspaces: ["packages/*", "apps/*"]
  biome.json                      lint/format + strict noRestrictedImports layer boundaries
  packages/
    calendar/                     @ilamy/calendar (PUBLISHED)
      styles/
        base.css                  @layer ilamy.base — grid, layout, dialogs, popovers, inputs, selects, checkboxes (zero Tailwind)
        theme.css                 @layer ilamy.theme — --ilamy-* tokens + automatic shadcn bridges
      src/                        Fractal Bulletproof structure: shared -> features -> entry (ZERO relative cross-feature imports)
        config/                   shared package constants (zero framework)
        types/                    shared canonical types: CalendarEvent, Resource, SlotProps, framework-agnostic IlamyPlugin
        utils/                    shared pure utils: temporal, helpers, ical-format, i18n, business-hours, date-grid, editability, normalize, resource-filter, view-hours
        lib/                      shared reusable engines (reused across multiple features):
          controller/             createCalendarController + IlamyPlugin kernel (reused by core, dom, all 5 framework adapters)
          layout/                 horizontal/vertical geometry & column layout
          view-models/            month, time-grid, resource-timeline, agenda, year builders
          dom/                    "./dom" — single zero-framework DOM renderer & pointer dnd/resize engine (reused by all 5 frameworks; internal Bulletproof):
            components/           shared DOM UI (date-picker, time-picker, color-picker, event-bar, dialog-shell)
            types/                DomCalendarOptions, DomRuntime, render & plugin mount contexts
            utils/                icons, constraints, popover, styles, events
            features/             header/, dialogs/, interactions/, views/ (zero cross-feature imports)
            app/                  dom-mount.ts
            index.ts
        features/                 isolated vertical features (ZERO cross-feature imports at all):
          styling/
            stylex/               "./styles/stylex" — framework-agnostic StyleX --ilamy-* token presets + stylexSlot / createStylexSlotProps (zero React)
            mui/                  "./styles/mui" — pure framework-agnostic createMuiCalendarTheme(theme) token mapper (zero @mui/material runtime, zero React)
          adapters/               5 symmetric thin wrappers over lib/controller + lib/dom:
            react/                "./react" — React 19 thin wrapper (ReactDOM.createPortal + useSyncExternalStore + Context/ref)
              testing/            "./testing" — CalendarTestProvider & fixtures
              index.ts
            vue/                  "./vue" — Vue 3.5+ thin wrapper
            svelte/               "./svelte" — Svelte 5 thin wrapper
            solid/                "./solid" — Solid 2.0 thin wrapper
            angular/              "./angular" — Angular 22 thin wrapper
          plugins/                framework-agnostic DOM plugins (IlamyPlugin; zero React/framework imports):
            recurrence/           "./plugins/recurrence" (only consumer of optional peer rrule)
            agenda/               "./plugins/agenda"
            year/                 "./plugins/year"
            ical/                 "./plugins/ical"
            drag-to-create/       "./plugins/drag-to-create"
        index.ts                  "." headless entry (exports types/, utils/, lib/{controller,layout,view-models} only; zero DOM/framework)
    playground/                   @ilamy/playground (private) — shared demo UI for apps/demo & apps/website
      src/                        Textbook Bulletproof React:
        components/
          form/
          ui/                     demo-only shadcn chrome (moved out of deleted packages/ui)
        features/                 calendar-preview (Frameworks × Token Styles switcher), settings, code-and-log
        hooks/  lib/  types/  utils/
        app/
  apps/
    demo/                         private Vite demo app
    website/                      docs site & interactive playground (ilamy.dev)
```

### 2.2 Published Entry Points (`@ilamy/calendar`)

| Subpath | Category | Source Root | Runtime Dependencies / Optional Peers |
|---|---|---|---|
| `.` | Core (headless) | `src/index.ts` | `temporal-polyfill` (sole direct dependency) |
| `./styles.css` | Styling (CSS) | `styles/{base,theme}.css` | Pure CSS (optional `tailwindcss` compatibility bridge) |
| `./styles/base.css` | Styling (CSS) | `styles/base.css` | Pure CSS |
| `./styles/theme.css` | Styling (CSS) | `styles/theme.css` | Pure CSS |
| `./styles/stylex` | Token Mapper (StyleX) | `src/features/styling/stylex/index.ts` | Optional peer: `@stylexjs/stylex` (types only, zero React) |
| `./styles/mui` | Token Mapper (MUI) | `src/features/styling/mui/index.ts` | Zero runtime deps, zero React (pure `createMuiCalendarTheme(theme)`) |
| `./react` | Framework Adapter | `src/features/adapters/react/index.ts` | Optional peers: `react`, `react-dom` (wraps `lib/controller` + `lib/dom` + portals) |
| `./vue` | Framework Adapter | `src/features/adapters/vue/index.ts` | Optional peer: `vue` (wraps `lib/controller` + `lib/dom`) |
| `./svelte` | Framework Adapter | `src/features/adapters/svelte/index.ts` | Optional peer: `svelte` (wraps `lib/controller` + `lib/dom`) |
| `./solid` | Framework Adapter | `src/features/adapters/solid/index.ts` | Optional peer: `solid-js` (wraps `lib/controller` + `lib/dom`) |
| `./angular` | Framework Adapter | `src/features/adapters/angular/index.ts` | Optional peer: `@angular/core` (wraps `lib/controller` + `lib/dom`) |
| `./dom` | Vanilla DOM Renderer | `src/lib/dom/index.ts` | Pure DOM (single renderer + pointer dnd/resize engine shared by all 5 frameworks) |
| `./plugins/*` | Plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`) | `src/features/plugins/*/index.ts` | Framework-agnostic DOM plugins; optional peer `rrule` for `recurrence` only |
| `./testing` | Testing Harness | `src/features/adapters/react/testing/index.tsx` | Optional peers: `react`, `react-dom` |

### 2.3 Biome `noRestrictedImports` Boundaries (`packages/calendar/src/` & `packages/playground/src/`)

- **Top-level shared (`src/{config,types,utils,lib}/**`):** cannot import `src/features/**`, any framework runtime (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`), `@dnd-kit/*`, `@radix-ui/*`, `@mui/material`, `lucide-react`, `class-variance-authority`, `clsx`, or `tailwind-merge`.
- **Headless shared (`src/{config,types,utils}/**`, `src/lib/{controller,layout,view-models}/**`, `src/index.ts`):** cannot import `src/lib/dom/**` or `rrule`.
- **Inside `src/lib/dom/**`:** Bulletproof direction (`components/`, `types/`, `utils/` -> `features/{header,dialogs,interactions,views}` -> `app/`) with zero cross-feature imports (lifting shared `date-picker`, `time-picker`, `color-picker`, `event-bar`, `dialog-shell` out of `dialogs/` and `views/` into `lib/dom/components/` eliminates today's 2 cross-feature leaks) and zero hard-wired `rrule` or plugin booleans.
- **Top-level `src/features/**`:** ZERO cross-feature imports at all across `styling/*`, `adapters/*`, and `plugins/*`. Plugins import ONLY top-level `src/{config,types,utils,lib}/`, NEVER `react`, any framework runtime, or `src/features/adapters/*`.
- **Inside `src/features/adapters/*`:** all 5 framework adapters (`react`, `vue`, `svelte`, `solid`, `angular`) are thin wrappers over `src/lib/{controller,dom}` (`react` additionally uses `ReactDOM.createPortal`, `useSyncExternalStore`, and React Context). Zero `@radix-ui/*`, `@dnd-kit/*`, `@mui/material`, `class-variance-authority`, `clsx`, `tailwind-merge`, or `lucide-react`.
- **Inside `packages/playground/src/**`:** textbook Bulletproof React (`components/{form,ui}`, `hooks/`, `lib/`, `types/`, `utils/` -> `features/` -> `app/`).

---

## 3. Implementation Milestones

### Milestone 1 — Zero-Tailwind CSS & `lib/dom` Shared Components
- Expand `packages/calendar/styles/base.css` (`@layer ilamy.base`) and `packages/calendar/styles/theme.css` (`@layer ilamy.theme`) to style `dialog`, `popover`, `input`, `textarea`, `select`, `checkbox`, `label`, `button`, focus rings, and modal backdrops using `--ilamy-*` tokens with automatic shadcn variable bridges and light/dark fallbacks.
- Lift shared DOM UI (`date-picker`, `time-picker`, `color-picker`, `event-bar`, `dialog-shell`) into `src/lib/dom/components/` to fix the 2 cross-feature leaks in `src/lib/dom/features/*`.
- **TDD gate:** Zero-Tailwind Playwright specs in `apps/e2e` verify opening, interacting with, and closing the event form dialog, date/popover pickers, selects, and checkboxes with zero Tailwind loaded.

### Milestone 2 — `lib/dom` Parity + Framework-Agnostic `IlamyPlugin` Kernel & Plugins
- Bring `src/lib/dom/` to 100% v3.3/v4 feature parity:
  - Async `events` and `resources` fetchers (`loading`, abort/latest handling, error callbacks, `refetchEvents` / `refetchResources`).
  - Imperative `ref` / mounted controller API (`scrollToTime`, `selectDate`, `setCurrentDate`, `nextPeriod`, `setView`, `refetchEvents`, `refetchResources`).
  - `Intl` format props (`slotLabelFormat`, `eventTimeFormat`, `displayEventTime`, `displayEventEnd`, `dayHeaderFormat`, `titleFormat`), `allDaySlot`, `scrollTime` / `scrollToNow`.
  - `eventResizableFromStart`, sub-cell `snapDuration` (`15` / `30` min), touch drag/resize + auto-scroll in `lib/dom`'s single zero-dependency pointer engine, and `revert()` / `delta` / `endDelta` in change callbacks.
  - ARIA grid roles, roving keyboard navigation, live-region announcements, zero Axe violations, and `onMoreEventsClick`.
- Add the framework-agnostic `IlamyPlugin` kernel in `src/lib/controller/` & `src/lib/dom/`.
- Rewrite all 5 plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`) as framework-agnostic DOM plugins under `src/features/plugins/*`, removing boolean `enableYearView`, `enableAgendaView`, `enableDragToCreate`, `enableIcalExport` flags and hard-wired `rrule` from `src/lib/dom/`.
- **TDD gate:** Unit and Playwright E2E specs verify every `lib/dom` parity feature, pointer/touch drag & resize, Axe zero violations, and all 5 framework-agnostic plugins running identically in Vanilla DOM (`@ilamy/calendar/dom`) without `rrule` loaded when `recurrence` is unused.

### Milestone 3 — Thin React 19 Wrapper over `lib/dom` & Pure Token Mappers (`./styles/mui`, `./styles/stylex`)
- Rewrite `@ilamy/calendar/react` (`src/features/adapters/react/`) as a thin React 19 wrapper over `src/lib/controller/` + `src/lib/dom/`:
  - Render custom slots (`renderEvent`, `renderHeader` / `headerComponent`, `renderResource`, `renderEventForm`, `onMoreEventsClick`) via `ReactDOM.createPortal` into `lib/dom` mount containers.
  - Implement `useIlamyCalendarContext()` and `ref` via `useSyncExternalStore` + React Context.
  - Port React unit and Playwright E2E tests to the thin wrapper, dropping `CalendarComponents` / `useCalendarComponents` and removing `@dnd-kit/core`, `@dnd-kit/modifiers`, `@radix-ui/*`, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge`.
- Convert MUI integration into a pure framework-agnostic token mapper `./styles/mui` (`src/features/styling/mui/index.ts` exporting `createMuiCalendarTheme(theme)`), removing `./react/mui`, `muiCalendarComponents`, `useMuiCalendarTheme`, and all `@mui/material` runtime components.
- Ensure `./styles/stylex` (`src/features/styling/stylex/index.ts`) exports `--ilamy-*` token presets + `stylexSlot` / `createStylexSlotProps` with zero React types or dependencies.
- **TDD gate:** React unit/E2E parity suite (including portal custom `renderEventForm` / `renderHeader` / `renderEvent` / `renderResource` with Base UI #401, Radix, and MUI forms) and pure token-mapper tests for `./styles/mui` and `./styles/stylex` pass across frameworks.

### Milestone 4 — Collapse 18 Private Packages, Update Configs & Playground Matrix
- Collapse the 18 obsolete private micro-packages (`packages/{types,utils,core,dom,ui}`, `packages/adapters/*`, `packages/plugins/*`, `packages/themes/*`) into `packages/calendar/src/` following Section 2.1, leaving one canonical `CalendarEvent`, `Resource`, `SlotProps`, and `IlamyPlugin` contract in `src/types/`.
- Move demo-only shadcn chrome from deleted `packages/ui` to `packages/playground/src/components/ui/` and delete the 18 obsolete workspace packages and hollow shim files.
- Update root `package.json` workspaces, `packages/calendar/bunup.config.ts`, `tsconfig*.json`, `fallow.toml`, `biome.json` (`noRestrictedImports` boundaries), and `packages/calendar/package.json` (`dependencies: { "temporal-polyfill" }` only; optional `peerDependencies`: `react`, `react-dom`, `vue`, `svelte`, `solid-js`, `@angular/core`, `rrule`, `@stylexjs/stylex`, `tailwindcss`).
- Update `packages/playground` preview switcher to **Frameworks** (`React | Vue | Svelte | Solid | Angular`) × **Token Styles** (`Default CSS | MUI Tokens | StyleX | Unstyled`), verifying all 4 styles and all plugins work identically across all 5 frameworks.
- **TDD gate:** Dependency/bundle audit confirms `dependencies` is strictly `["temporal-polyfill"]`; `biome check` confirms zero cross-feature imports in `src/features/**`; `bun run type-check`, `bun run build`, `bun run check:dist-types`, and `bun run test` pass across the collapsed monorepo.

### Milestone 5 — Full Verification Gate
- Run `bun run ci` (`biome check`, `build`, `check:dist-types`, `type-check`, `test`).
- Run `bunx fallow@3.20.0 audit --changed-since main --gate new-only --no-cache` (`0 / 0 / 0`).
- Run the full Playwright E2E suite: zero-Tailwind dialog/popover specs, cross-framework plugin parity across React/Vue/Svelte/Solid/Angular/DOM, portal/slot custom UI specs (#401), Axe zero violations, and multi-timezone runs (`UTC`, `America/Vancouver`, `Europe/London`, `America/Havana`).
- Perform manual pointer QA in `apps/demo` across Frameworks × Token Styles combinations and light/dark mode.

---

## 4. Acceptance Criteria

1. **Single renderer (Option A):** `packages/calendar/src/lib/dom/` (`./dom`) is the single calendar UI renderer and zero-dependency pointer drag/resize engine wrapped by all 5 framework adapters (`react`, `vue`, `svelte`, `solid`, `angular`) and Vanilla DOM; `@ilamy/calendar/react` uses `ReactDOM.createPortal` for custom rendering and `useSyncExternalStore` + Context for `useIlamyCalendarContext()` and `ref`.
2. **Framework-agnostic plugins across all 5 frameworks:** all 5 plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`) implement ONE DOM `IlamyPlugin` contract in `src/features/plugins/*`, import zero React or framework runtimes, and work identically across React, Vue, Svelte, Solid, Angular, and Vanilla DOM; boolean `enable*` flags and hard-wired `rrule` are removed from `src/lib/dom/`.
3. **Pure token-only styling/theme mappers:** `./styles.css` (auto-bridging shadcn/Tailwind vars), `./styles/stylex`, and `./styles/mui` (`createMuiCalendarTheme`) only map `--ilamy-*` CSS tokens with zero UI-component wrappers (`CalendarComponents`, `useCalendarComponents`, `muiCalendarComponents`, `useMuiCalendarTheme`, and `./react/mui` are removed).
4. **Minimal dependencies:** `packages/calendar/package.json` `dependencies` contains ONLY `temporal-polyfill`; `rrule` is an optional peer only for `./plugins/recurrence`; `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material` runtime components, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge` are completely removed.
5. **Collapsed 2-package monorepo & strict boundaries:** `packages/` contains only `packages/calendar` (`@ilamy/calendar`) and `packages/playground` (`@ilamy/playground`); Biome `noRestrictedImports` passes with zero cross-feature imports in `src/features/**` and zero leaks in `src/lib/dom/features/*`.
6. **Full verification gates green:** `bun run ci`, `bun run check:dist-types`, `fallow audit` (`0 / 0 / 0`), and Playwright E2E (zero-Tailwind, cross-framework plugin parity, Axe, and `UTC` / `America/Vancouver` / `Europe/London` / `America/Havana` timezones) all pass.
