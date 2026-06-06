# Monorepo Migration Plan

Executes `docs/monorepo-architecture.md`. Each phase ends at a **green checkpoint** (`bun run type-check` + `bun test` + build pass). Moves use `git mv` to preserve history. Commit per phase; push only on the user's say-so.

Dependency order for everything: `@ilamy/ui` → `@ilamy/calendar` → `@ilamy/calendar-recurrence` → `apps/demo`.

---

## Phase 1 — Workspace scaffold + relocate core (pure lift-and-shift)

Goal: repo becomes a Bun workspace; **all** current `src/` becomes `@ilamy/calendar` under `packages/calendar/`, still containing recurrence + ui internally. No import rewrites yet (the package keeps its `@/` → `./src/*` alias). Lowest-risk move first.

1. Root `package.json` → private workspace root: `{ "private": true, "workspaces": ["packages/*", "apps/*"] }`, keep shared devDeps (bun, biome, typescript, bunup). Remove the library fields (`main`/`module`/`exports`/`version`/`publishConfig`) — those move to the calendar package.
2. `git mv src packages/calendar/src`. Move `bunup.config.ts` → `packages/calendar/bunup.config.ts`. Create `packages/calendar/package.json` = the old library manifest (`name: @ilamy/calendar`, version, exports `.` only — drop the recurrence subpath later in Phase 3, keep for now to stay green), `publishConfig.access public`.
3. `tsconfig`: add root `tsconfig.base.json` (shared compiler options); `packages/calendar/tsconfig.json` extends it, keeps `paths: { "@/*": ["./src/*"] }`. Drop the `@ilamy/calendar` self-reference paths.
4. `git mv` the demo out of the package: `packages/calendar/src/components/demo` → `apps/demo/src`, plus the Vite entry/index.html. Create `apps/demo/package.json` (`private: true`, dep `@ilamy/calendar: workspace:*`), `apps/demo/vite.config`, `apps/demo/tsconfig.json`. (If the demo is currently wired through the package's own entry, stub a minimal app entry that imports `@ilamy/calendar`.)
5. `bun install` (links workspaces). Root scripts call into packages via `--filter`.
6. **Checkpoint:** `cd packages/calendar && bun test && bun run type-check && bun run build` green; `apps/demo` type-checks. Commit.

## Phase 2 — Extract `@ilamy/ui`

1. `mkdir packages/ui`; `cd packages/ui && bunx shadcn@latest init` with a `components.json` using `@ilamy/ui/*` aliases (verify the exact init flags against shadcn docs first).
2. `git mv` the generic primitives from `packages/calendar/src/components/ui/*` → `packages/ui/src/components/*` (button, card, checkbox, input, label, select, dialog, popover, badge, scroll-area, textarea, calendar, input-group). Move `lib/utils.ts` (`cn`) → `packages/ui/src/lib/utils.ts`. **Leave** `date-picker`/`time-picker` in calendar (context-coupled).
3. `packages/ui/package.json` = `@ilamy/ui` (published), peer/deps: react, radix packages, lucide-react, clsx, tailwind-merge. `bunup` build + `exports` map (`.`, `./components/*`, `./lib/utils`). tsconfig extends base.
4. Add `@ilamy/ui: workspace:*` to `@ilamy/calendar` deps. Rewrite calendar's imports: `@/components/ui/<x>` → `@ilamy/ui/components/<x>` (or a barrel), `@/lib/utils` (cn) → `@ilamy/ui`. The context-coupled `date-picker`/`time-picker` now import primitives from `@ilamy/ui`.
5. `bun install`. **Checkpoint:** ui builds; calendar + demo green. Commit.

## Phase 3 — Extract `@ilamy/calendar-recurrence`

1. `git mv packages/calendar/src/features/plugins/recurrence` → `packages/recurrence/src`. Entry `recurrence.ts` → `src/index.ts`.
2. Delete `packages/recurrence/src/ui/` (9 files); repoint its imports to `@ilamy/ui`. (`select`/`dialog`/`date-picker` now the shared shadcn ones — accept Radix.)
3. `packages/recurrence/package.json` = `@ilamy/calendar-recurrence` (published); deps: `@ilamy/calendar`, `@ilamy/ui` (`workspace:*`), `rrule`. `bunup` single entry, `exports` `.`. tsconfig extends base.
4. Remove from `@ilamy/calendar`: the `./plugins/recurrence` subpath in `package.json` exports + `bunup.config.ts` multi-entry; the `@ilamy/calendar/plugins/recurrence` tsconfig path. **Delete** `plugins-import-boundary.test.ts` and the biome `noRestrictedImports` plugin override.
5. Update `apps/demo` to import the plugin from `@ilamy/calendar-recurrence`; add it as a workspace dep.
6. `bun install`. **Checkpoint:** all three packages build; all tests green across the workspace; demo type-checks. Commit.

## Phase 4 — Root orchestration, CI, docs, cleanup

1. Root scripts: `build`/`test`/`type-check`/`lint`/`ci` via `bun run --filter '*' …` (and `--if-present`); `dev` → demo. Keep the `CI=true` build strictness (per the earlier parity fix) in each package's build script.
2. Move `fallow.toml` to root, rescope globs to `packages/*`; update `.github/workflows/ci.yml` if needed (still `bun run ci`).
3. Per-package `README.md`; Tailwind `content`-glob note for `@ilamy/ui` consumers. Migration notes: `@ilamy/calendar/plugins/recurrence` → `@ilamy/calendar-recurrence` (new breaking change after 2.0.0).
4. Move/990 the dev-log + CLAUDE.md path references that assume single-package `src/`.
5. Full `bun run ci` at root green; `bun publish --dry-run` per package in dependency order. Commit.

## Per-step discipline

- After every file move/edit: `bun run type-check`, `bunx biome check --write`, `bun test` for the affected package.
- Update `docs/logs/<today>.md` per phase.
- Never push without explicit approval.
