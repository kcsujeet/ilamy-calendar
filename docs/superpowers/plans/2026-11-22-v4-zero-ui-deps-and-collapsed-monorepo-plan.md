# v4.0 Architecture Plan — Zero UI Dependencies, Styling vs Component UI Split & Collapsed 2-Package Monorepo

**Status:** Planned (next)
**Supersedes / extends:** `docs/superpowers/plans/2026-11-22-v4-css-tokens-and-symmetric-core-plan.md`

---

## 1. Goals & Architectural Principles

1. **Zero UI-library dependencies in `@ilamy/calendar`** — remove `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`. Ship accessible native HTML defaults + minimal inline SVG icons styled directly by `@ilamy/calendar/styles.css`.
2. **Full `CalendarComponents` routing across React core and all React plugins** — every button, input, textarea, label, checkbox, dialog, select, and popover renders through `CalendarComponents` so consumers can drop in shadcn with Base UI (resolving #401), shadcn with Radix, React Aria, Chakra, or MUI without shipping or colliding with Radix.
3. **Clear architectural distinction: Styling Systems vs Component UI Libraries**
   - **Styling Systems (CSS libraries — framework-agnostic):** `./styles.css`, `./styles/base.css`, `./styles/theme.css`, and `./styles/stylex`. Alternative to Tailwind or plain CSS; works identically with React, Vue, Svelte, Solid, Angular, and Vanilla DOM; zero React types or React peer dependencies.
   - **Component UI Libraries (framework-specific):** Native HTML defaults (zero dependencies), `./react/mui` (React MUI token mapper + MUI primitives), and user-supplied `components` prop overrides.
4. **Collapsed 2-package monorepo** — eliminate 18 redundant private micro-packages (`packages/{types,utils,core,dom,ui}`, `packages/adapters/*`, `packages/plugins/*`, `packages/themes/*`) and the hollow `packages/calendar` shim shell. Real source lives inside `packages/calendar/src/` in a textbook fractal Bulletproof React structure; demo-only shadcn chrome moves from deleted `packages/ui` to `packages/playground/src/components/ui/`.
5. **Single runtime dependency + optional peer dependencies** — `@ilamy/calendar` declares ONLY `temporal-polyfill` in `dependencies`. Framework runtimes, `@dnd-kit/core` + `@dnd-kit/modifiers`, `rrule`, `@mui/material`, and `@stylexjs/stylex` are optional `peerDependencies`. `src/lib/dom/` lazy-loads `rrule` only when an event carries `rrule`.

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
      src/                        Textbook Bulletproof React: shared -> features -> entry (ZERO relative cross-feature imports)
        config/                   shared package constants (zero framework)
        types/                    shared canonical types: CalendarEvent, Resource, SlotProps, plugin contracts
        utils/                    shared pure utils: temporal, helpers, ical-format, i18n, business-hours, date-grid, editability, normalize, resource-filter, view-hours
        lib/                      shared reusable engines (reused across multiple features):
          controller/             createCalendarController (reused by core, dom, vue, svelte, solid, angular)
          layout/                 horizontal/vertical geometry & column layout
          view-models/            month, time-grid, resource-timeline, agenda, year builders
          dom/                    "./dom" — zero-framework DOM renderer (reused by vue, svelte, solid, angular; lazy-loads rrule on demand; internal Bulletproof):
            components/           shared DOM UI (date-picker, time-picker, color-picker, event-bar, dialog-shell)
            types/                DomCalendarOptions, DomRuntime, render contexts
            utils/                icons, constraints, popover, styles, ical, events
            features/             header/, dialogs/, interactions/, views/ (zero cross-feature imports)
            app/                  dom-mount.ts
            index.ts
        features/                 isolated vertical features (ZERO relative cross-feature imports):
          styling/
            stylex/               "./styles/stylex" — framework-agnostic StyleX CSS-var bridge (zero React)
          adapters/
            react/                "./react" — textbook Bulletproof React (zero Radix/CVA/lucide-react/tailwind-merge):
              components/         shared React components + components/ui/ (native HTML defaults + inline SVG icons)
              config/             React constants
              hooks/              shared React hooks
              lib/                plugin runtime (PluginRuntime)
              stores/             shared React contexts
              types/              React prop & CalendarComponents types
              utils/              shared React utils
              features/           header/, event-form/, drag-and-drop/, views/, mui/ ("./react/mui") — zero cross-feature imports
              app/                CalendarProvider, IlamyCalendar
              testing/            "./testing" — CalendarTestProvider & fixtures
              index.ts
            vue/                  "./vue" — Vue 3.5+ wrapper
            svelte/               "./svelte" — Svelte 5 wrapper
            solid/                "./solid" — Solid 2.0 wrapper
            angular/              "./angular" — Angular 22 wrapper
          plugins/
            recurrence/           "./plugins/recurrence" (components/, stores/, types/, utils/)
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
        features/                 calendar-preview (Styling vs UI Components split), settings, code-and-log
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
| `./styles.css` | Styling (CSS) | `styles/{base,theme}.css` | Pure CSS |
| `./styles/base.css` | Styling (CSS) | `styles/base.css` | Pure CSS |
| `./styles/theme.css` | Styling (CSS) | `styles/theme.css` | Pure CSS |
| `./styles/stylex` | Styling (CSS-in-JS) | `src/features/styling/stylex/index.ts` | Optional peer: `@stylexjs/stylex` (zero React) |
| `./react` | Framework Adapter | `src/features/adapters/react/index.ts` | Optional peers: `react`, `react-dom`, `@dnd-kit/core`, `@dnd-kit/modifiers` |
| `./react/mui` | Component UI (React) | `src/features/adapters/react/features/mui/index.ts` | Optional peers: `react`, `@mui/material` |
| `./vue` | Framework Adapter | `src/features/adapters/vue/index.ts` | Optional peer: `vue` |
| `./svelte` | Framework Adapter | `src/features/adapters/svelte/index.ts` | Optional peer: `svelte` |
| `./solid` | Framework Adapter | `src/features/adapters/solid/index.ts` | Optional peer: `solid-js` |
| `./angular` | Framework Adapter | `src/features/adapters/angular/index.ts` | Optional peer: `@angular/core` |
| `./dom` | Vanilla DOM Adapter | `src/lib/dom/index.ts` | Pure DOM (lazy-loads optional peer `rrule` only when an event carries `rrule`) |
| `./plugins/*` | Plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`) | `src/features/plugins/*/index.ts` | Optional peers: `rrule` (`recurrence`), `react` (for React UI) |
| `./testing` | Testing Harness | `src/features/adapters/react/testing/index.tsx` | Optional peer: `react` |

### 2.3 Biome `noRestrictedImports` Boundaries (`packages/calendar/src/` & `packages/playground/src/`)

- **Top-level shared (`src/{config,types,utils,lib}/**`):** cannot import `src/features/**` or any framework runtime (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`, `@dnd-kit/*`).
- **Headless shared (`src/{config,types,utils}/**`, `src/lib/{controller,layout,view-models}/**`, `src/index.ts`):** cannot import `src/lib/dom/**` or `rrule`.
- **Inside `src/lib/dom/**`:** Bulletproof direction (`components/`, `types/`, `utils/` -> `features/{header,dialogs,interactions,views}` -> `app/`) with zero cross-feature imports (lifting shared `date-picker`, `event-bar`, `dialog-shell` out of `dialogs/` and `views/` into `lib/dom/components/` eliminates today's 2 cross-feature leaks).
- **Top-level `src/features/**`:** ZERO relative cross-feature imports across `styling/*`, `adapters/*`, and `plugins/*` (plugins only reference the external public `'@ilamy/calendar/react'` contract so they share runtime context, never relative paths into `features/adapters/react/**`).
- **Inside `src/features/adapters/react/**`:** textbook Bulletproof React (`components/`, `config/`, `hooks/`, `lib/`, `stores/`, `types/`, `utils/` -> `features/{header,event-form,drag-and-drop,views,mui}` -> `app/`) with zero cross-feature imports (which also guarantees `@mui/material` inside `features/mui/` can never leak into `app/`, shared folders, or other features) and forbidding `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`.
- **Inside `packages/playground/src/**`:** textbook Bulletproof React (`components/{form,ui}`, `hooks/`, `lib/`, `types/`, `utils/` -> `features/` -> `app/`).

---

## 3. Implementation Milestones

### Milestone 1 — Expand Zero-Tailwind CSS for Dialogs, Popovers & Form Controls
- Expand `packages/calendar/styles/base.css` (`@layer ilamy.base`) and `packages/calendar/styles/theme.css` (`@layer ilamy.theme`) to style `dialog`, `popover`, `input`, `textarea`, `select`, `checkbox`, `label`, `button`, focus rings, and modal backdrops using `--ilamy-*` tokens with automatic shadcn variable bridges and light/dark fallbacks.
- Ensure identical `[data-ilamy-slot]` and state attributes cover dialogs, popovers, and form fields in both React and DOM.
- **TDD gate:** Zero-Tailwind Playwright specs in `apps/e2e` verify opening, interacting with, and closing the event form dialog, date/popover pickers, selects, and checkboxes with zero Tailwind loaded for both React and DOM.

### Milestone 2 — Native HTML React Primitives & Full `CalendarComponents` Routing
- Replace `@ilamy/ui`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` in the React adapter (`src/features/adapters/react/`) and all React plugins (`recurrence`, `agenda`, `year`, `ical`, `drag-to-create`).
- Author zero-dependency accessible native HTML primitives (native `<dialog>` / focus-managed modal, popover positioning, `<button>`, `<input>`, `<textarea>`, `<select>`, `<input type="checkbox">`, `<label>`) and inline SVG icons in `src/features/adapters/react/components/ui/`.
- Route every UI control in React core (`header`, `event-form`, `date-picker`, `views`) and every React plugin (`RecurrenceEditor`, `EventMutationScopeDialog`, `IcalExportButton`, `YearView`, `AgendaView`) through `useCalendarComponents()` / `CalendarComponents`.
- Move shared DOM primitives (`dom-date-picker`, `dom-time-picker`, `dom-color-picker`, `dom-event-bar`, `dom-dialog-shell`) into `src/lib/dom/components/` so `src/lib/dom/features/*` has zero cross-feature imports.
- **TDD gate:** Unit tests verify native defaults work without Radix/Tailwind; integration & E2E tests verify passing custom `components` (including a shadcn/Base UI-style override without Radix, addressing #401) renders every form, scope dialog, and plugin control through the consumer's primitives.

### Milestone 3 — Collapse 18 Private Packages into `packages/calendar` & Optional Peers
- Move source from the 18 private packages (`packages/{types,utils,core,dom}`, `packages/adapters/*`, `packages/plugins/*`, `packages/themes/*`) into `packages/calendar/src/` following the fractal Bulletproof React tree in Section 2.1, leaving one canonical `CalendarEvent` and plugin contract in `src/types/`.
- Move shared DOM primitives (`dom-date-picker`, `dom-time-picker`, `dom-color-picker`, `dom-event-bar`, `dom-dialog-shell`) into `src/lib/dom/components/` so `src/lib/dom/features/*` has zero cross-feature imports (eliminating cross-feature leaks between `dialogs/` and `views/`).
- Move demo-only shadcn UI from `packages/ui` into `packages/playground/src/components/ui/` (aligned with `packages/playground/src/` Bulletproof React layout) and delete the 18 obsolete workspace packages and hollow shim files.
- Update root `package.json` workspaces, `packages/calendar/bunup.config.ts`, `tsconfig*.json`, `fallow.toml`, and `biome.json` (`noRestrictedImports` layer boundaries).
- Update `packages/calendar/package.json`:
  - `dependencies`: ONLY `temporal-polyfill`.
  - Optional `peerDependencies`: `react`, `react-dom`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `rrule`, `vue`, `svelte`, `solid-js`, `@angular/core`, `@mui/material`, `@stylexjs/stylex`.
  - Graceful runtime handling when optional `@dnd-kit/*` or `rrule` peers are not installed (e.g., read-only React calendar works without `@dnd-kit/*`; `src/lib/dom/` dynamically `import('rrule')` only when an event carries `rrule`).
- **TDD gate:** Dependency/bundle audit confirms `dependencies` is strictly `["temporal-polyfill"]`; `src/lib/dom/` tests confirm non-recurring calendars never load `rrule`; `bun run check`, `bun run type-check`, `bun run build`, `bun run check:dist-types`, and `bun run test` pass across the collapsed monorepo.

### Milestone 4 — Styling vs Component UI Split, Playground Update & Full Verification
- Relocate StyleX bridge to `./styles/stylex` (`src/features/styling/stylex/index.ts`) with zero React types or React peer dependencies so it works across React, Vue, Svelte, Solid, Angular, and DOM.
- Relocate MUI bridge + primitives to `./react/mui` (`src/features/adapters/react/features/mui/index.ts`), updating `apps/*` and `packages/playground` imports (removing `./themes/stylex` and `./themes/mui`).
- Split `packages/playground` preview controls into two independent axes:
  - **Styling:** `Default CSS` / `StyleX` / `Unstyled`
  - **UI Components:** `Native HTML` / `MUI`
- **Final gate:**
  - `bun run ci` (`biome check`, `type-check`, `test`, `build`, `check:dist-types`)
  - `bunx fallow@3.20.0 audit --changed-since main --gate new-only --no-cache` (`0 / 0 / 0`)
  - Full Playwright E2E suite (including zero-Tailwind dialog/popover specs for React & DOM, Base UI / custom `components` #401 spec, cross-framework parity, Axe accessibility, and multi-timezone runs)
  - Manual pointer/UI verification in `apps/demo` across Styling × UI Components combinations and light/dark mode.

---

## 4. Acceptance Criteria

1. `packages/calendar/package.json` `dependencies` contains ONLY `temporal-polyfill`; zero `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, or `lucide-react` exist in `@ilamy/calendar` dependencies or source.
2. `@dnd-kit/core`, `@dnd-kit/modifiers`, and `rrule` are optional `peerDependencies`; `src/lib/dom/` lazy-loads `rrule` only when an event carries `rrule`.
3. `packages/` contains only `packages/calendar` (`@ilamy/calendar`) and `packages/playground` (`@ilamy/playground`).
4. Biome `noRestrictedImports` passes and enforces Bulletproof React layer and cross-feature boundaries across `packages/calendar/src/` and `packages/playground/src/`.
5. Zero-Tailwind Playwright E2E specs verify full dialog, popover, select, input, and checkbox interactions for both React (`@ilamy/calendar/react`) and Vanilla DOM (`@ilamy/calendar/dom`).
6. Custom `components` E2E/unit specs verify Base UI / custom primitives (#401) replace all React core and plugin primitives with zero Radix present.
7. `./styles/stylex` compiles and runs with zero React types across frameworks; `./react/mui` works with MUI + native MUI primitives; playground splits Styling vs UI Components cleanly.
