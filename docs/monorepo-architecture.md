# Monorepo Architecture

**Status:** Implemented (v4.0)
**Toolchain:** Bun workspaces only (no Turborepo, no Changesets). Builds with `bunup` per package; scripts orchestrated with `bun run --filter`.

---

## Layout

Only `@ilamy/calendar` is published to npm; every other workspace package is `private: true` and bundled into `@ilamy/calendar` at build time.

```
ilamy-calendar/                root (private, not published)
  package.json                 workspaces: ["packages/*", "packages/adapters/*", "packages/plugins/*", "packages/themes/*", "apps/*"]
  tsconfig.base.json           shared compiler options
  biome.json                   shared lint/format + Bulletproof React boundaries
  bun.lock
  packages/
    types/                     @ilamy/types                    (private)  shared React plugin-contract & re-exported domain types
    utils/                     @ilamy/utils                    (private)  TC39 Temporal core (./temporal) + helpers (./helpers)
    core/                      @ilamy/core                     (private)  framework-agnostic headless engine + shared view-models
    dom/                       @ilamy/dom                      (private)  zero-React full-parity DOM calendar renderer
    ui/                        @ilamy/ui                       (private)  shadcn primitives
    playground/                @ilamy/playground               (private)  shared interactive demo UI
    adapters/
      react/                   @ilamy/adapter-react            (private)  React 19 UI adapter & test harness
      vue/                     @ilamy/adapter-vue              (private)  Vue 3.5+ wrapper
      svelte/                  @ilamy/adapter-svelte           (private)  Svelte 5 wrapper
      solid/                   @ilamy/adapter-solid            (private)  Solid 2.0 wrapper
      angular/                 @ilamy/adapter-angular          (private)  Angular 22 wrapper
    plugins/
      recurrence/              @ilamy/calendar-recurrence      (private)  RFC 5545 recurrence plugin
      agenda/                  @ilamy/calendar-agenda          (private)  agenda view plugin
      drag-to-create/          @ilamy/calendar-drag-to-create  (private)  drag-to-create plugin
      year/                    @ilamy/calendar-year            (private)  12-month year overview plugin
      ical/                    @ilamy/calendar-ical            (private)  RFC 5545 iCalendar (.ics) export plugin
    themes/
      mui/                     @ilamy/theme-mui                (private)  Material UI theme bridge
      stylex/                  @ilamy/theme-stylex             (private)  StyleX token contract
    calendar/                  @ilamy/calendar                 (PUBLISHED) pure thin publishing facade + shared layered CSS (`styles/`)
  apps/
    demo/                      private Vite playground
    website/                   docs site & interactive demo (ilamy.dev)
  docs/                        shared docs + dev logs
```

---

## Published Entry Points (`@ilamy/calendar`)

`packages/calendar/package.json` exposes symmetric, `motion`-style entry points:

| Subpath | Contents |
|---|---|
| `.` (`@ilamy/calendar`) | Pure headless core (`@ilamy/core`: `createCalendarController`, Temporal helpers, layout engines, view-model builders, `defaultTranslations`, `createTranslator`, shared domain types) |
| `./react` | React 19 UI wrapper (`IlamyCalendar`, `useIlamyCalendarContext`, `CalendarThemeProvider`, `useSlotProps`, `useCalendarComponents`, `SLOT_*`, `IlamyPlugin`, React prop/component types) |
| `./vue` | Vue 3.5+ wrapper (`IlamyCalendar`, `useIlamyCalendar`) |
| `./svelte` | Svelte 5 wrapper (`ilamyCalendar`, `ilamyCalendarAction`, `createIlamyCalendar`) |
| `./solid` | Solid 2.0 wrapper (`IlamyCalendar`, `createIlamyCalendar`) |
| `./angular` | Angular 22 wrapper (`registerIlamyCalendarElement`, `IlamyCalendarElement`, `createAngularCalendar`) |
| `./dom` | Vanilla DOM renderer (`mountCalendar`, `generateDomIcal`, `DomCalendarOptions`, `MountedCalendar`, render-context types) |
| `./styles.css` | Combined layered CSS (`@layer ilamy.base, ilamy.theme`) — works standalone with zero Tailwind and auto-bridges shadcn CSS variables |
| `./styles/base.css` | Structural layout only (`@layer ilamy.base`, zero visual chrome) |
| `./styles/theme.css` | Theme layer only (`@layer ilamy.theme`) |
| `./themes/mui` | Material UI theme bridge (`createMuiCalendarTheme`, `useMuiCalendarTheme`, `muiCalendarComponents`) |
| `./themes/stylex` | StyleX token contract (`createStylexCalendarTheme`, `stylexCalendarTheme`, `stylexCalendarDarkTheme`, `stylexSlot`, `createStylexSlotProps`) |
| `./plugins/{recurrence,agenda,drag-to-create,year,ical}` | Opt-in plugins |
| `./testing` | `CalendarTestProvider` + test fixtures |

---

## Cross-Cutting Mechanics

- **Root scripts:** `bun run build` builds the package and its CSS layers (`bunup && bun scripts/build-styles.ts`); `bun run test` fans out via `--filter`; `bun run ci` runs check, build, `check:dist-types`, type-check, and tests.
- **TypeScript:** `tsconfig.base.json` holds shared compiler options; each package's `tsconfig.json` maps the internal `@ilamy/*` packages it imports to their `src/` via `paths` so editor type-checking and `bunup` resolve to source. Published `exports`/`types` point to `dist/`.
- **Published declarations:** `bun run check:dist-types` type-checks the built `dist/*.d.ts` with `skipLibCheck: false` (`packages/calendar/tsconfig.dist.json`).
- **Styling:** `packages/calendar/styles/{base,theme}.css` compiles to `dist/styles.css`, `dist/styles/base.css`, and `dist/styles/theme.css`. Both React (`packages/calendar/src/`) and `@ilamy/dom` emit matching `data-ilamy-slot` and state attributes, so one stylesheet drives every framework with zero Tailwind required.
