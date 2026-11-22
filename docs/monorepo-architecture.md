# Monorepo Architecture

**Status:** Target Architecture (v4.0 — migration in progress)
**Toolchain:** Bun workspaces only (no Turborepo, no Changesets). Builds with `bunup`; scripts orchestrated with `bun run --filter`.
**Plan:** `docs/superpowers/plans/2026-11-22-v4-zero-ui-deps-and-collapsed-monorepo-plan.md`

---

## Layout (2-Package Monorepo)

The repository collapses the former 18 internal micro-packages and thin facade shell into **two workspace packages**: `@ilamy/calendar` (published, holding all library source under `packages/calendar/src/` in a textbook fractal Bulletproof React structure) and `@ilamy/playground` (private, holding the shared interactive demo UI and demo-only shadcn chrome under `packages/playground/src/components/ui/`).

```text
ilamy-calendar/                root (private, not published)
  package.json                 workspaces: ["packages/*", "apps/*"]
  tsconfig.base.json           shared compiler options
  biome.json                   shared lint/format + strict noRestrictedImports boundaries
  bun.lock
  packages/
    calendar/                  @ilamy/calendar (PUBLISHED)
      styles/
        base.css               @layer ilamy.base — grid, layout, dialogs, popovers, inputs, selects, checkboxes (zero Tailwind)
        theme.css              @layer ilamy.theme — --ilamy-* tokens + automatic shadcn bridges
      src/                     Textbook Bulletproof React: shared -> features -> entry (ZERO relative cross-feature imports)
        config/                shared package constants (zero framework)
        types/                 shared canonical types: CalendarEvent, Resource, SlotProps, plugin contracts
        utils/                 shared pure utils: temporal, helpers, ical-format, i18n, business-hours, date-grid, editability, normalize, resource-filter, view-hours
        lib/                   shared reusable engines (reused across multiple features):
          controller/          createCalendarController (reused by core, dom, vue, svelte, solid, angular)
          layout/              horizontal/vertical geometry & column layout
          view-models/         month, time-grid, resource-timeline, agenda, year builders
          dom/                 "./dom" — zero-framework DOM renderer (reused by vue, svelte, solid, angular; lazy-loads rrule on demand; internal Bulletproof):
            components/        shared DOM UI (date-picker, time-picker, color-picker, event-bar, dialog-shell)
            types/             DomCalendarOptions, DomRuntime, render contexts
            utils/             icons, constraints, popover, styles, ical, events
            features/          header/, dialogs/, interactions/, views/ (zero cross-feature imports)
            app/               dom-mount.ts
            index.ts
        features/              isolated vertical features (ZERO relative cross-feature imports):
          styling/
            stylex/            "./styles/stylex" — framework-agnostic StyleX CSS-var bridge (zero React)
          adapters/
            react/             "./react" — textbook Bulletproof React (zero Radix/CVA/lucide-react/tailwind-merge):
              components/      shared React components + components/ui/ (native HTML defaults + inline SVG icons)
              config/          React constants
              hooks/           shared React hooks
              lib/             plugin runtime (PluginRuntime)
              stores/          shared React contexts
              types/           React prop & CalendarComponents types
              utils/           shared React utils
              features/        header/, event-form/, drag-and-drop/, views/, mui/ ("./react/mui") — zero cross-feature imports
              app/             CalendarProvider, IlamyCalendar
              testing/         "./testing" — CalendarTestProvider & fixtures
              index.ts
            vue/               "./vue" — Vue 3.5+ wrapper
            svelte/            "./svelte" — Svelte 5 wrapper
            solid/             "./solid" — Solid 2.0 wrapper
            angular/           "./angular" — Angular 22 wrapper
          plugins/
            recurrence/        "./plugins/recurrence" (components/, stores/, types/, utils/)
            agenda/            "./plugins/agenda"
            year/              "./plugins/year"
            ical/              "./plugins/ical"
            drag-to-create/    "./plugins/drag-to-create"
        index.ts               "." headless entry (exports types/, utils/, lib/{controller,layout,view-models} only; zero DOM/framework)
    playground/                @ilamy/playground (private) — shared demo UI for apps/demo & apps/website
      src/                     Textbook Bulletproof React:
        components/
          form/
          ui/                  demo-only shadcn chrome (moved out of deleted packages/ui)
        features/              calendar-preview (Styling vs UI Components split), settings, code-and-log
        hooks/  lib/  types/  utils/
        app/
  apps/
    demo/                      private Vite playground
    website/                   docs site & interactive demo (ilamy.dev)
  docs/                        shared docs + plans + dev logs
```

---

## Published Entry Points (`@ilamy/calendar`)

`packages/calendar/package.json` exposes symmetric, `motion`-style entry points and keeps **Styling Systems** (framework-agnostic CSS libraries) separate from **Component UI Libraries** (framework-specific):

| Subpath | Category | Contents |
|---|---|---|
| `.` (`@ilamy/calendar`) | Core (headless) | Pure headless core (`src/index.ts` exporting `types/`, `utils/`, and `lib/{controller,layout,view-models}/`: `createCalendarController`, Temporal helpers, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, canonical `CalendarEvent` & plugin types) |
| `./styles.css` | Styling (CSS) | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) — styles grid, layout, dialogs, popovers, inputs, selects, and checkboxes with zero Tailwind and auto-bridges shadcn CSS variables |
| `./styles/base.css` | Styling (CSS) | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `./styles/theme.css` | Styling (CSS) | Theme layer only (`@layer ilamy.theme`) |
| `./styles/stylex` | Styling (StyleX) | Framework-agnostic StyleX CSS-var bridge (`src/features/styling/stylex/index.ts`: `createStylexCalendarTheme`, `stylexCalendarTheme`, `stylexCalendarDarkTheme`, `stylexSlot`, `createStylexSlotProps`) — zero React types or peerDeps |
| `./react` | Framework Adapter | React 19 UI adapter (`src/features/adapters/react/index.ts`: `IlamyCalendar`, `useIlamyCalendarContext`, `CalendarThemeProvider`, `useSlotProps`, `useCalendarComponents`, `SLOT_*`, `IlamyPlugin`) with accessible native HTML defaults |
| `./react/mui` | Component UI (React) | React Material UI theme bridge & primitives (`src/features/adapters/react/features/mui/index.ts`: `createMuiCalendarTheme`, `useMuiCalendarTheme`, `muiCalendarComponents`) |
| `./vue` | Framework Adapter | Vue 3.5+ wrapper (`src/features/adapters/vue/index.ts`: `IlamyCalendar`, `useIlamyCalendar`) |
| `./svelte` | Framework Adapter | Svelte 5 wrapper (`src/features/adapters/svelte/index.ts`: `ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`) |
| `./solid` | Framework Adapter | Solid 2.0 wrapper (`src/features/adapters/solid/index.ts`: `IlamyCalendar`, `createIlamyCalendar`) |
| `./angular` | Framework Adapter | Angular 22 wrapper (`src/features/adapters/angular/index.ts`: `registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`) |
| `./dom` | Vanilla DOM Adapter | Zero-framework DOM renderer (`src/lib/dom/index.ts`: `mountCalendar`, `generateDomIcal`, `DomCalendarOptions`, `MountedCalendar`) |
| `./plugins/{recurrence,agenda,drag-to-create,year,ical}` | Plugins | Opt-in plugins (`src/features/plugins/*/index.ts`); React plugin UI routes through `CalendarComponents` with zero Radix |
| `./testing` | Testing Harness | `CalendarTestProvider` + test fixtures (`src/features/adapters/react/testing/index.tsx`) |

---

## Dependencies & Optional Peers

`@ilamy/calendar` ships with a minimal dependency footprint and zero UI-library runtime dependencies:

- **`dependencies` (only 1):** `temporal-polyfill`
- **Optional `peerDependencies`:**
  - `react`, `react-dom` — required only for `./react`, `./react/mui`, `./testing`, and React plugin UIs
  - `@dnd-kit/core`, `@dnd-kit/modifiers` — optional peers for React drag-and-drop and event resize
  - `rrule` — optional peer for `./plugins/recurrence` and recurring events in `./dom` (which lazy-loads `rrule` in `src/lib/dom/` only when an event carries `rrule`)
  - `vue`, `svelte`, `solid-js`, `@angular/core` — required only for the corresponding framework adapter
  - `@mui/material` — required only for `./react/mui`
  - `@stylexjs/stylex` — optional peer for `./styles/stylex`
- **Removed from `@ilamy/calendar`:** `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`.

---

## Layer Boundaries (`biome.json`) & Cross-Cutting Mechanics

- **Strict layer isolation (`noRestrictedImports`):**
  - Top-level shared (`src/{config,types,utils,lib}/**`) cannot import `src/features/**` or any framework runtime (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`, `@dnd-kit/*`).
  - Headless shared (`src/{config,types,utils}/**`, `src/lib/{controller,layout,view-models}/**`, `src/index.ts`) cannot import `src/lib/dom/**` or `rrule`.
  - Inside `src/lib/dom/**`: Bulletproof direction (`components/`, `types/`, `utils/` -> `features/{header,dialogs,interactions,views}` -> `app/`) with zero cross-feature imports (lifting shared `date-picker`, `event-bar`, `dialog-shell` out of `dialogs/` and `views/` into `lib/dom/components/` eliminates today's 2 cross-feature leaks).
  - Top-level `src/features/**`: ZERO relative cross-feature imports across `styling/*`, `adapters/*`, and `plugins/*` (plugins only reference the external public `'@ilamy/calendar/react'` contract so they share runtime context, never relative paths into `features/adapters/react/**`).
  - Inside `src/features/adapters/react/**`: textbook Bulletproof React (`components/`, `config/`, `hooks/`, `lib/`, `stores/`, `types/`, `utils/` -> `features/{header,event-form,drag-and-drop,views,mui}` -> `app/`) with zero cross-feature imports (which also guarantees `@mui/material` inside `features/mui/` can never leak into `app/`, shared folders, or other features) and forbidding `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react`.
  - Inside `packages/playground/src/**`: textbook Bulletproof React (`components/{form,ui}`, `hooks/`, `lib/`, `types/`, `utils/` -> `features/` -> `app/`).
- **Root scripts:** `bun run build` builds `@ilamy/calendar` entry points (`bunup`) and layered CSS (`bun scripts/build-styles.ts`); `bun run test` fans out via `--filter`; `bun run ci` runs check, build, `check:dist-types`, type-check, and tests.
- **Published declarations:** `bun run check:dist-types` type-checks the built `dist/*.d.ts` with `skipLibCheck: false` (`packages/calendar/tsconfig.dist.json`).
- **Styling:** `packages/calendar/styles/{base,theme}.css` compiles to `dist/styles.css`, `dist/styles/base.css`, and `dist/styles/theme.css`. Both React (`src/features/adapters/react/`) and DOM (`src/lib/dom/`) emit matching `data-ilamy-slot` and state attributes, so one stylesheet drives every framework, dialog, popover, and form control with zero Tailwind required.
