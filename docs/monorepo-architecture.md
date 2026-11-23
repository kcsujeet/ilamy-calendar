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
      src/                     Fractal Bulletproof structure: shared -> features -> entry (ZERO cross-feature imports)
        config/                shared package constants (zero framework)
        types/                 shared canonical types: CalendarEvent, Resource, SlotProps, framework-agnostic IlamyPlugin
        utils/                 shared pure utils: temporal, helpers, ical-format, i18n, business-hours, date-grid, editability, normalize, resource-filter, view-hours
        lib/                   shared reusable engines (reused across multiple features):
          controller/          createCalendarController + IlamyPlugin kernel (reused by core, dom, all 5 framework adapters)
          layout/              horizontal/vertical geometry & column layout
          view-models/         month, time-grid, resource-timeline, agenda, year builders
          dom/                 "./dom" — single zero-framework DOM renderer & pointer dnd/resize engine (reused by all 5 frameworks; internal Bulletproof):
            components/        shared DOM UI (date-picker, time-picker, color-picker, event-bar, dialog-shell)
            types/             DomCalendarOptions, DomRuntime, render & plugin mount contexts
            utils/             icons, constraints, popover, styles, events
            features/          header/, dialogs/, interactions/, views/ (zero cross-feature imports)
            app/               dom-mount.ts
            index.ts
        features/              isolated vertical features (ZERO cross-feature imports at all):
          styling/
            stylex/            "./styles/stylex" — framework-agnostic StyleX --ilamy-* token presets + stylexSlot / createStylexSlotProps (zero React)
            mui/               "./styles/mui" — pure framework-agnostic createMuiCalendarTheme(theme) token mapper (zero @mui/material runtime, zero React)
          adapters/            5 symmetric thin wrappers over lib/controller + lib/dom:
            react/             "./react" — React 19 thin wrapper (ReactDOM.createPortal + useSyncExternalStore + Context/ref)
              testing/         "./testing" — CalendarTestProvider & fixtures
              index.ts
            vue/               "./vue" — Vue 3.5+ thin wrapper
            svelte/            "./svelte" — Svelte 5 thin wrapper
            solid/             "./solid" — Solid 2.0 thin wrapper
            angular/           "./angular" — Angular 22 thin wrapper
          plugins/             framework-agnostic DOM plugins (IlamyPlugin; zero React/framework imports):
            recurrence/        "./plugins/recurrence" (only consumer of optional peer rrule)
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
        features/              calendar-preview (Frameworks × Token Styles switcher), settings, code-and-log
        hooks/  lib/  types/  utils/
        app/
  apps/
    demo/                      private Vite playground
    website/                   docs site & interactive demo (ilamy.dev)
  docs/                        shared docs + plans + dev logs
```

---

## Published Entry Points (`@ilamy/calendar`)

`packages/calendar/package.json` exposes symmetric, `motion`-style entry points under **Option A** (one `lib/dom` renderer + framework-agnostic plugins + pure `--ilamy-*` token mappers):

| Subpath | Category | Contents |
|---|---|---|
| `.` (`@ilamy/calendar`) | Core (headless) | Pure headless core (`src/index.ts` exporting `types/`, `utils/`, and `lib/{controller,layout,view-models}/`: `createCalendarController`, Temporal helpers, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, canonical `CalendarEvent` & `IlamyPlugin` types) |
| `./styles.css` | Styling (CSS) | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) — styles grid, layout, dialogs, popovers, inputs, selects, and checkboxes with zero Tailwind and auto-bridges shadcn/Tailwind CSS variables (works with Base UI #401, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS) |
| `./styles/base.css` | Styling (CSS) | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `./styles/theme.css` | Styling (CSS) | Theme layer only (`@layer ilamy.theme`) |
| `./styles/stylex` | Token Mapper (StyleX) | Framework-agnostic `--ilamy-*` token presets (`src/features/styling/stylex/index.ts`: `createStylexCalendarTheme`, `stylexCalendarTheme`, `stylexCalendarDarkTheme`, `stylexSlot`, `createStylexSlotProps`) — zero React types or runtime deps |
| `./styles/mui` | Token Mapper (MUI) | Pure framework-agnostic MUI token mapper (`src/features/styling/mui/index.ts`: `createMuiCalendarTheme(theme)`) reading a MUI `Theme` palette/typography/shape object into `--ilamy-*` tokens — zero `@mui/material` runtime components, zero React dependency |
| `./react` | Framework Adapter | Thin React 19 wrapper over `lib/controller` + `lib/dom` (`src/features/adapters/react/index.ts`: `IlamyCalendar`, `useIlamyCalendarContext`, `CalendarThemeProvider`, `useSlotProps`, `SLOT_*`) using `ReactDOM.createPortal` for custom rendering (`renderEvent`, `renderHeader` / `headerComponent`, `renderResource`, `renderEventForm`, `onMoreEventsClick`) and `useSyncExternalStore` + React Context |
| `./vue` | Framework Adapter | Thin Vue 3.5+ wrapper over `lib/controller` + `lib/dom` (`src/features/adapters/vue/index.ts`: `IlamyCalendar`, `useIlamyCalendar`) |
| `./svelte` | Framework Adapter | Thin Svelte 5 wrapper over `lib/controller` + `lib/dom` (`src/features/adapters/svelte/index.ts`: `ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`) |
| `./solid` | Framework Adapter | Thin Solid 2.0 wrapper over `lib/controller` + `lib/dom` (`src/features/adapters/solid/index.ts`: `IlamyCalendar`, `createIlamyCalendar`) |
| `./angular` | Framework Adapter | Thin Angular 22 wrapper over `lib/controller` + `lib/dom` (`src/features/adapters/angular/index.ts`: `registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`) |
| `./dom` | Vanilla DOM Renderer | Single zero-framework DOM renderer & pointer dnd/resize engine (`src/lib/dom/index.ts`: `mountCalendar`, `DomCalendarOptions`, `MountedCalendar`) wrapped by all 5 frameworks |
| `./plugins/{recurrence,agenda,drag-to-create,year,ical}` | Plugins | Framework-agnostic DOM plugins (`src/features/plugins/*/index.ts`) implementing ONE `IlamyPlugin` contract across all 5 frameworks + Vanilla DOM |
| `./testing` | Testing Harness | `CalendarTestProvider` + test fixtures (`src/features/adapters/react/testing/index.tsx`) |

---

## Dependencies & Optional Peers

`@ilamy/calendar` ships with a minimal dependency footprint, zero UI-library runtime dependencies, and a single built-in pointer engine:

- **`dependencies` (only 1):** `temporal-polyfill`
- **Optional `peerDependencies`:**
  - `react`, `react-dom` — required only for `./react` and `./testing`
  - `vue`, `svelte`, `solid-js`, `@angular/core` — required only for the corresponding framework adapter
  - `rrule` — optional peer used ONLY by `./plugins/recurrence`
  - `@stylexjs/stylex` — optional types for `./styles/stylex`
  - `tailwindcss` — optional (CSS bridge only)
- **Removed completely from `@ilamy/calendar`:** `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material` runtime components, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge`.

---

## Layer Boundaries (`biome.json`) & Cross-Cutting Mechanics

- **Strict layer isolation (`noRestrictedImports`):**
  - Top-level shared (`src/{config,types,utils,lib}/**`) cannot import `src/features/**`, any framework runtime (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`), `@dnd-kit/*`, `@radix-ui/*`, `@mui/material`, `lucide-react`, `class-variance-authority`, `clsx`, or `tailwind-merge`.
  - Headless shared (`src/{config,types,utils}/**`, `src/lib/{controller,layout,view-models}/**`, `src/index.ts`) cannot import `src/lib/dom/**` or `rrule`.
  - Inside `src/lib/dom/**`: Bulletproof direction (`components/`, `types/`, `utils/` -> `features/{header,dialogs,interactions,views}` -> `app/`) with zero cross-feature imports (lifting shared `date-picker`, `time-picker`, `color-picker`, `event-bar`, `dialog-shell` out of `dialogs/` and `views/` into `lib/dom/components/` eliminates today's 2 cross-feature leaks) and zero hard-wired `rrule` or boolean plugin flags.
  - Top-level `src/features/**`: ZERO cross-feature imports at all across `styling/*`, `adapters/*`, and `plugins/*`. Plugins import ONLY top-level `src/{config,types,utils,lib}/`, NEVER React, any framework runtime, or `src/features/adapters/*`.
  - Inside `src/features/adapters/*`: all 5 framework adapters (`react`, `vue`, `svelte`, `solid`, `angular`) are thin wrappers over `src/lib/{controller,dom}` (`react` uses `ReactDOM.createPortal` + `useSyncExternalStore` + React Context).
  - Inside `packages/playground/src/**`: textbook Bulletproof React (`components/{form,ui}`, `hooks/`, `lib/`, `types/`, `utils/` -> `features/` -> `app/`).
- **Root scripts:** `bun run build` builds `@ilamy/calendar` entry points (`bunup`) and layered CSS (`bun scripts/build-styles.ts`); `bun run test` fans out via `--filter`; `bun run ci` runs check, build, `check:dist-types`, type-check, and tests.
- **Published declarations:** `bun run check:dist-types` type-checks the built `dist/*.d.ts` with `skipLibCheck: false` (`packages/calendar/tsconfig.dist.json`).
- **Styling:** `packages/calendar/styles/{base,theme}.css` compiles to `dist/styles.css`, `dist/styles/base.css`, and `dist/styles/theme.css`. Because `src/lib/dom/` renders the calendar UI for all 5 frameworks + Vanilla DOM, every framework shares identical `data-ilamy-slot` and state attributes, and every token mapper (`./styles.css`, `./styles/stylex`, `./styles/mui`) works identically across all frameworks with zero Tailwind required.
