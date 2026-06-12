# Monorepo Architecture (design spec)

**Goal:** Convert the single-package repo into a Bun-workspaces monorepo where the core calendar, the shared UI primitives, and each plugin are separate packages. This makes the plugin dogfooding boundary *structural* (package boundaries, not a custom lint test) and removes per-plugin UI duplication (one shared, shadcn-managed `@ilamy/ui`).

**Status:** design, pending approval. No files move until this is approved and an implementation plan is written.

**Toolchain (decided):** Bun workspaces only. No Turborepo, no Changesets. Builds with `bunup` per package; scripts orchestrated with `bun run --filter`.

---

## Final layout

```
ilamy/                         root (private, not published)
  package.json                 workspaces: ["packages/*", "apps/*"]
  tsconfig.base.json           shared compiler options
  biome.json                   shared lint/format
  bun.lock
  packages/
    ui/                        @ilamy/ui                  (published)
    calendar/                  @ilamy/calendar            (published)
    recurrence/                @ilamy/calendar-recurrence (published)
  apps/
    demo/                      private Vite playground (never published)
  docs/                        shared docs + dev logs
```

Internal dependencies use the `workspace:*` protocol; Bun rewrites them to the real version on publish (`workspace:*` → `1.x.y`). `bun install` symlinks local packages into `node_modules`, so `import … from '@ilamy/calendar'` resolves to `packages/calendar` during development.

## Packages

### `@ilamy/ui` (packages/ui) — published

Generic, **self-contained** shadcn primitives, managed by the shadcn CLI. Its own `components.json` using the [shadcn monorepo](https://ui.shadcn.com/docs/monorepo) alias convention:

```json
{ "aliases": { "components": "@ilamy/ui/components", "ui": "@ilamy/ui/components", "utils": "@ilamy/ui/lib/utils", "lib": "@ilamy/ui/lib", "hooks": "@ilamy/ui/hooks" } }
```

- Holds: `button`, `card`, `checkbox`, `input`, `label`, `select`, `dialog`, `popover`, `badge`, `scroll-area`, `textarea`, `calendar`, `input-group`, and `lib/utils.ts` (`cn`). These are pure shadcn, no calendar coupling.
- `cn` lives here; everything else imports it from `@ilamy/ui`.
- `select`/`dialog` are the real Radix shadcn versions (so `@radix-ui/*` lands here as a real dependency, shared, not duplicated). The recurrence plugin's hand-rolled native `select`/`date-picker` are deleted in favor of these.
- Adding/updating a primitive later: `cd packages/ui && bunx shadcn@latest add <name>`.

### `@ilamy/calendar` (packages/calendar) — published, **name unchanged**

The core, plugin-agnostic library. Everything currently in `src/` **except** the recurrence plugin, the demo, and the generic UI primitives.

- Keeps: `features/calendar` (incl. its `components/{event-form,header,views}`), `components/{drag-and-drop,vertical-grid,horizontal-grid,all-day-row,...}`, `hooks`, `lib`, `types`, the plugin **kernel** (`features/plugins/lib`: `createPluginRuntime`, `types`, `compose-plugin-providers`), and `components/calendar-slots.tsx` (host slot catalog + slot components).
- **Context-coupled composites stay here:** `date-picker` and `time-picker` use `useSmartCalendarContext` / `use-autocomplete-timepicker`, so they live in `@ilamy/calendar` and import primitives (`Button`, `Calendar`, `Popover`) from `@ilamy/ui`.
- Depends on `@ilamy/ui` (`workspace:*`), plus `react`, `dayjs`, `@dnd-kit/*`.
- Public API `src/index.ts` is unchanged from post-v2 (recurrence already removed). The `@ilamy/calendar/plugins/recurrence` **subpath is removed** — recurrence is now its own package.
- Build: `bunup`, single entry (no more recurrence multi-entry).

### `@ilamy/calendar-recurrence` (packages/recurrence) — published

The recurrence plugin as a standalone package. Everything in `src/features/plugins/recurrence/` **except its hand-rolled `ui/`** (deleted; uses `@ilamy/ui`).

- Keeps: `recurrence-plugin.tsx`, entry `index.ts` (was `recurrence.ts`), `augment.ts`, `ical.ts`, `utils/recurrence-handler.ts` + helpers, `components/{recurrence-editor,recurrence-edit-dialog,recurrence-form-section}`, `types`.
- Deps: `@ilamy/calendar` (`workspace:*`), `@ilamy/ui` (`workspace:*`), `rrule`. Imports `dayjs`/`CalendarEvent`/`useIlamyCalendarContext` from `@ilamy/calendar`; UI from `@ilamy/ui`.
- `augment.ts`'s `declare module '@ilamy/calendar' { … }` still works — it targets the published package name.
- Build: `bunup`, single entry.

### `apps/demo` — private Vite playground

The current `src/components/demo/*` plus the Vite entry (`index.html`, `main.tsx`). `private: true`, never published. Depends on `@ilamy/calendar` + `@ilamy/calendar-recurrence` (`workspace:*`). This is what `bunx vite` (the already-running dev server) serves.

## What gets deleted (the payoff)

- `src/features/plugins/plugins-import-boundary.test.ts` — package boundaries enforce it now.
- The biome `noRestrictedImports` override for plugins.
- The `@/`-alias self-reference hacks in `tsconfig.json` (`"@ilamy/calendar": ["./src/index.ts"]`, the recurrence subpath path).
- The recurrence subpath from `package.json` `exports` and `bunup.config.ts` multi-entry.
- The recurrence plugin's hand-rolled `ui/` (9 files) — replaced by `@ilamy/ui`.

## Cross-cutting mechanics

- **Root scripts:** `build` → `bun run --filter '*' build` (Bun respects dependency order: ui → calendar → recurrence); `test` → `bun test` per package via `--filter`; `type-check`, `lint`, `ci` likewise. `dev` → the demo app.
- **TypeScript:** a `tsconfig.base.json` with shared options; each package extends it. For editor/type-check to resolve cross-package types to source (not built `dist`), the base maps `@ilamy/*` → `packages/*/src` via `paths`; published `exports`/`types` point to `dist`. (This dual mapping is the standard workspace nuance; the plan will pin exact config.)
- **Tailwind:** `@ilamy/ui` ships components styled with Tailwind classes; consumers must add the package to their Tailwind `content` globs. Documented in each package README + migration notes.
- **Publishing (manual, fixed/lockstep version):** bump all three packages together; publish in order `@ilamy/ui` → `@ilamy/calendar` → `@ilamy/calendar-recurrence`; `workspace:*` is rewritten to the real version on `bun publish`. The existing `release-new-version` skill will need a monorepo rewrite (separate follow-up).
- **History:** use `git mv` for moves so blame/history survive.
- **fallow.toml / CI:** move config to root and rescope globs to `packages/*`; CI still runs `bun run ci`.

## Decisions (recommended defaults, confirm before plan)

1. Plugin naming: **`@ilamy/calendar-recurrence`**. (Confirmed.)
2. Versioning: **fixed/lockstep** across packages (simpler with manual publish).
3. `@ilamy/ui`: **published to npm** (plugins depend on it as a normal dep; avoids re-duplicating it in shipped bundles).

## Risks / call-outs

- **Largest mechanical change in the repo's history.** It touches every file's location. Mitigated by `git mv` + the existing test suite (must stay green at each step).
- **`@ilamy/ui` becomes public API** — its primitives' props are now a versioned contract. Low churn (stock shadcn).
- **Radix returns** to the recurrence UI via `@ilamy/ui`'s real shadcn `select`/`dialog`. Accepted: shared, not duplicated.
- **Consumer-facing churn:** importers of `@ilamy/calendar/plugins/recurrence` must switch to `@ilamy/calendar-recurrence`. This is a new major (the v2 subpath was just shipped), so it must be called out loudly in the changelog/migration notes.
- **Release tooling** (`release-new-version` skill) assumes a single package; needs a monorepo-aware rewrite as a follow-up.

## Out of scope (future)

- Migrating the resource calendar and iCal export into their own plugin packages.
- Turborepo/Changesets adoption if the package count grows.
