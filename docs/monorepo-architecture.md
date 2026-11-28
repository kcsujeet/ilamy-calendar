# Monorepo Architecture

**Status:** Shipped Architecture (v4.0)
**Toolchain:** Bun workspaces only (no Turborepo, no Changesets). Builds with `bunup`; scripts orchestrated with `bun run --filter`.
**Plans:** `docs/superpowers/plans/2026-11-22-v4-zero-ui-deps-and-collapsed-monorepo-plan.md`, `docs/superpowers/plans/2026-11-23-v4-modular-architecture-plan.md`

---

## Layout (2-Package Monorepo)

The repository collapses the former 18 internal micro-packages and thin facade shell into **two workspace packages**: `@ilamy/calendar` (published, holding all library source under `packages/calendar/src/` in a textbook fractal Bulletproof React structure) and `@ilamy/playground` (private, holding the shared 3-axis interactive demo UI and demo-only shadcn chrome under `packages/playground/src/components/ui/`).

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
        types/                 shared canonical types: CalendarEvent, Resource, SlotName, CalendarSlots, CalendarSlotProps, framework-agnostic CalendarPlugin
        utils/                 shared pure utils: temporal, helpers, ical-format, i18n, business-hours, date-grid, editability, normalize, resource-filter, view-hours
        lib/                   shared reusable engines (reused across multiple features):
          controller/          createCalendarController + CalendarPlugin kernel (reused by core & all 5 framework adapters)
          interactions/        zero-dependency pointer DnD/resize engine
          layout/              horizontal/vertical geometry & column layout
          plugins/             createPluginRuntime
          view-models/         month, time-grid, resource-timeline, agenda, year builders
          renderer/            internal Preact 11 renderer wrapped by all 5 framework adapters (never exported publicly):
            components/        shared Preact UI (date-picker, time-picker, color-picker, more-events-button, portal-slot)
            types/             internal renderer runtime context types
            utils/             preact-slot, constraints, format, keys, scroll-to-time, slot-props
            features/          header/, dialogs/, views/ (zero cross-feature imports)
            app/               calendar-app.tsx, mount-calendar.tsx
            index.ts
        features/              isolated vertical features (ZERO cross-feature imports at all):
          adapters/            5 symmetric thin wrappers over lib/controller + lib/renderer:
            react/             "./react" — React 19 thin wrapper (ReactDOM.createPortal + useSyncExternalStore + Context/ref)
              testing/         "./testing" — CalendarTestProvider
              index.ts
            vue/               "./vue" — Vue 3.5+ thin wrapper
            svelte/            "./svelte" — Svelte 5 thin wrapper
            solid/             "./solid" — Solid 2.0 thin wrapper
            angular/           "./angular" — Angular 22 thin wrapper
          plugins/             framework-agnostic plugins (CalendarPlugin; zero React/framework imports):
            recurrence/        "./plugins/recurrence" (only consumer of optional peer rrule)
            agenda/            "./plugins/agenda"
            year/              "./plugins/year"
            ical/              "./plugins/ical"
            drag-to-create/    "./plugins/drag-to-create"
        index.ts               "." headless entry (exports types/, utils/, lib/{controller,interactions,layout,plugins,view-models} only; zero UI/framework/Preact)
    playground/                @ilamy/playground (private) — shared 3-axis demo UI for apps/demo & apps/website
      src/                     Textbook Bulletproof React:
        components/
          form/
          ui/                  demo-only shadcn chrome (moved out of deleted packages/ui)
        features/              calendar-preview (Framework × CSS × Components switcher), settings, code-and-log
        hooks/  lib/  types/  utils/
        app/
  apps/
    demo/                      private Vite playground
    e2e/                       Playwright deterministic harness & QA specs
    website/                   docs site & interactive demo (ilamy.dev)
  docs/                        shared docs + plans + dev logs
```

---

## Published Entry Points (`@ilamy/calendar`)

`packages/calendar/package.json` exposes symmetric, `motion`-style entry points (one internal Preact 11 renderer + framework-agnostic plugins + layered CSS):

| Subpath | Category | Contents |
|---|---|---|
| `.` (`@ilamy/calendar`) | Core (headless) | Pure headless core (`src/index.ts` exporting `types/`, `utils/`, `config/`, and `lib/{controller,interactions,layout,plugins,view-models}/`: `createCalendarController`, Temporal helpers, pointer math, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, canonical `CalendarEvent`, `CalendarPlugin`, & `SlotName` contracts — zero Preact or DOM renderer) |
| `./styles.css` | Styling (CSS) | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) — styles grid, layout, dialogs, popovers, inputs, selects, and checkboxes with zero Tailwind and auto-bridges shadcn/Tailwind CSS variables (works with Base UI #401, Radix, React Aria, shadcn-vue, shadcn-svelte, and plain CSS) |
| `./styles/base.css` | Styling (CSS) | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `./styles/theme.css` | Styling (CSS) | Theme layer only (`@layer ilamy.theme`) |
| `./react` | Framework Adapter | Thin React 19 wrapper over `lib/controller` + `lib/renderer` (`src/features/adapters/react/index.ts`: `IlamyCalendar`, `useIlamyCalendarContext`, `SLOT_*`) using `ReactDOM.createPortal` for persistent region `slots` (`ReactCalendarSlots`) & React callbacks (`renderEvent`, `headerComponent`, `renderResource`, `renderEventForm`, `renderHour`, `renderCurrentTimeIndicator`, `onMoreEventsClick`) and `useSyncExternalStore` + React Context |
| `./vue` | Framework Adapter | Thin Vue 3.5+ wrapper over `lib/controller` + `lib/renderer` (`src/features/adapters/vue/index.ts`: `IlamyCalendar`, `useIlamyCalendar`, `createVueSlotMount`) |
| `./svelte` | Framework Adapter | Thin Svelte 5 wrapper over `lib/controller` + `lib/renderer` (`src/features/adapters/svelte/index.ts`: `ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`, `createSvelteSlotMount`, `mountIlamyCalendar`) |
| `./solid` | Framework Adapter | Thin Solid 2.0 wrapper over `lib/controller` + `lib/renderer` (`src/features/adapters/solid/index.ts`: `IlamyCalendar`, `createIlamyCalendar`, `createSolidSlotMount`, `mountSolidCalendar`) |
| `./angular` | Framework Adapter | Thin Angular 22 wrapper over `lib/controller` + `lib/renderer` (`src/features/adapters/angular/index.ts`: `registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`, `mountAngularCalendar`) |
| `./plugins/{recurrence,agenda,drag-to-create,year,ical}` | Plugins | Framework-agnostic plugins (`src/features/plugins/*/index.ts`) implementing ONE `CalendarPlugin` contract across all 5 frameworks |
| `./testing` | Testing Harness | `CalendarTestProvider` (`src/features/adapters/react/testing/index.tsx`) |

---

## Dependencies & Optional Peers

`@ilamy/calendar` ships with a minimal dependency footprint, zero third-party UI-library runtime dependencies, and a single built-in pointer engine:

- **`dependencies` (only 2):** `preact` (`11.2.0`, internal renderer only — never leaked into public `.d.ts` or headless core `.`) and `temporal-polyfill`
- **Optional `peerDependencies`:**
  - `react`, `react-dom` — required only for `./react` and `./testing`
  - `vue`, `svelte`, `solid-js`, `@angular/core` — required only for the corresponding framework adapter
  - `rrule` — optional peer used ONLY by `./plugins/recurrence`
  - `tailwindcss` — optional (CSS integration only)
- **Removed completely from `@ilamy/calendar`:** `@radix-ui/*`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `@mui/material`, `@stylexjs/stylex`, `lucide-react`, `class-variance-authority`, `clsx`, and `tailwind-merge`.

---

## Layer Boundaries (`biome.json`) & Cross-Cutting Mechanics

- **Strict layer isolation (`noRestrictedImports`):**
  - Top-level shared (`src/{config,types,utils,lib}/**`) cannot import `src/features/**`, any adapter framework runtime (`react`, `vue`, `svelte`, `solid-js`, `@angular/core`), `@dnd-kit/*`, `@radix-ui/*`, `@mui/material`, `lucide-react`, `class-variance-authority`, `clsx`, or `tailwind-merge`.
  - Headless shared (`src/{config,types,utils}/**`, `src/lib/{controller,interactions,layout,plugins,view-models}/**`, `src/index.ts`) cannot import `src/lib/renderer/**`, `preact`, or `rrule`.
  - Inside `src/lib/renderer/**`: Bulletproof direction (`components/`, `types/`, `utils/` -> `features/{header,dialogs,views}` -> `app/`) with zero cross-feature imports and zero hard-wired `rrule` or boolean plugin flags.
  - Top-level `src/features/**`: ZERO cross-feature imports across `adapters/*` and `plugins/*`. Plugins import ONLY top-level `src/{config,types,utils,lib}/`, NEVER React, any framework runtime, or `src/features/adapters/*`.
  - Inside `src/features/adapters/*`: all 5 framework adapters (`react`, `vue`, `svelte`, `solid`, `angular`) wrap `src/lib/{controller,renderer}` (`react` uses `ReactDOM.createPortal` + `useSyncExternalStore` + React Context).
  - Inside `packages/playground/src/**`: textbook Bulletproof React (`components/{form,ui}`, `hooks/`, `lib/`, `types/`, `utils/` -> `features/` -> `app/`).
- **Root scripts:** `bun run build` builds `@ilamy/calendar` entry points (`bunup`) and layered CSS (`bun scripts/build-styles.ts`); `bun run test` fans out via `--filter`; `bun run ci` runs check, build, `check:dist-types`, type-check, and tests.
- **Published declarations:** `bun run check:dist-types` type-checks the built `dist/*.d.ts` with `skipLibCheck: false` (`packages/calendar/tsconfig.dist.json`).
- **Styling:** `packages/calendar/styles/{base,theme}.css` compiles to `dist/styles.css`, `dist/styles/base.css`, and `dist/styles/theme.css`. Because `src/lib/renderer/` renders the calendar UI for all 5 frameworks, every framework shares identical `data-ilamy-slot` and state attributes, and CSS / `slotProps` / `--ilamy-*` token patterns work identically across all frameworks with zero Tailwind required.
