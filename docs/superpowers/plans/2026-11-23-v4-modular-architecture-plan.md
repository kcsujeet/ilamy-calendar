# v4.0 Plan: Modular Architecture (Framework x Component Library x CSS Library)

**Status:** Proposed, for hand-off. Supersedes the "target layout" parts of
`2026-11-22-v4-zero-ui-deps-and-collapsed-monorepo-plan.md` where they conflict.
**Branch:** `roadmap/4.0` (PR #400). Base commit at time of writing: `76278d99`.

## Principle: follow established conventions

Name and shape public APIs the way major libraries already do, and cite the source per decision (doc URL, version read). Do not invent our own semantics. Calendar behaviour follows RFC 5545 first (AGENTS.md).

## 0. Goal

Any combination of these three axes must work, each chosen independently:

| Axis | Examples | How it plugs in |
|---|---|---|
| Framework | React, Vue, Svelte, Solid, Angular, Vanilla | Thin wrapper over the one DOM renderer (`lib/dom`) |
| Component library | shadcn (Base UI / Radix / React Aria), MUI, bits-ui, reka-ui, shadcn-svelte, shadcn-vue | `slots` prop on every wrapper; the renderer passes controlled props, the wrapper mounts the user's component |
| CSS library | plain CSS, Tailwind, StyleX, MUI theme | `--ilamy-*` tokens, `unstyled`, and `slotProps` (`className`/`style`) per semantic part. No library-specific code ships; docs recipes show the mapping. |

Acceptance example: Svelte + Tailwind + shadcn-svelte works with no Radix, React or
`@dnd-kit` in the user's bundle. Issue #401: a shadcn-on-Base-UI user passes Base UI
components and ships no Radix.

## 1. Verified state of the branch (at `76278d99`)

Checked against the tree, not the docs:

- Commits `1ccd0c4c` and `76278d99` are docs-only. `git diff --stat 1ccd0c4c 76278d99 -- packages apps/demo biome.json` is empty.
- `packages/` still holds `adapters core dom playground plugins themes types ui utils`. `packages/calendar/src` has no `config/ types/ utils/ lib/ features/`.
- `packages/calendar/package.json` dependencies still include 10 `@radix-ui/*`, `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, `@dnd-kit/core`, `@dnd-kit/modifiers`, `rrule`. Exports still list `./themes/mui`, `./themes/stylex`; there is no `./styles/mui` or `./styles/stylex`.
- Two UIs: React adapter ~14,964 LOC (own state engine; never calls `createCalendarController`), `packages/dom` ~6,722 LOC (uses the controller).
- Three drag engines: `@dnd-kit` in React (`use-calendar-drag.ts` 566 + helpers), `packages/dom/src/interactions/dom-interactions.ts` (465), `packages/plugins/drag-to-create/src/hooks/use-drag-gesture.ts` (320).
- `packages/dom` has no plugin API: agenda, year, recurrence UI and ical are hard-coded (`dom-agenda-view.ts`, `dom-year-view.ts`, `dom-repeat-section.ts`, `dom-ical.utils.ts`).
- `rrule` is imported statically in `packages/dom` (`dom-repeat-section.ts`, `dom-events.utils.ts`, `dom-ical.utils.ts`, `dom-calendar.types.ts`), so it is not optional for DOM users today.
- Plugins import `react`, `@ilamy/calendar/react`, `@ilamy/ui/*` and `lucide-react`.
- `packages/types/src/index.ts` imports `react`.

## 2. Problems in the current docs (fix as part of this plan)

1. **Docs describe unbuilt code as shipped.** README, website (`apps/website/src/content/docs/**`), `docs/migration-v4.md` and `AGENTS.md` name paths, exports and peer deps that do not exist. A website deploy would publish install steps that fail. Rule: docs land in the same commit as the code they describe. Until then, label target-state text "Planned (v4)".
2. **The `components` prop (`CalendarComponents`) was removed from the docs**, and #401 is claimed solved by shadcn CSS-variable bridging. That is not a fix: #401 is about which primitive library ships (bundle weight), and CSS variables cannot swap a Radix dialog for a Base UI one. Bring it back as `slots` and make it work in every wrapper (Phase 3).
3. **`rrule` is documented as "only for plugins/recurrence"** while the DOM core imports it statically (Phase 4).
4. **Plugins are documented as framework-agnostic** while the DOM renderer has no plugin contract (Phase 2).

## 3. Target layout

Keep the 2-package collapse from the 11-22 plan (`packages/calendar`, `packages/playground`) and its Biome `noRestrictedImports` boundaries. Changes to it:

```
packages/calendar/src/
  index.ts              "."  headless: types, utils (temporal, helpers, i18n), lib/{controller,layout,view-models,interactions}
  types/                CalendarEvent, Resource, plugin contract, slot contract (zero framework imports)
  utils/
  lib/
    controller/         the only state engine (all wrappers use it)
    layout/  view-models/
    interactions/       headless pointer engine: drag, resize, drag-to-create (geometry + snapping, no DOM rendering)
    dom/                the only renderer (internal, not exported); every interactive primitive goes through a slot
  features/
    adapters/{react,vue,svelte,solid,angular}/   thin wrappers: props -> mountCalendar, controller -> framework store, slots -> framework components
    plugins/{recurrence,agenda,year,ical,drag-to-create}/   framework-free, written against the DOM plugin contract
styles/                 base.css (structure), theme.css (tokens)
```

Dependencies: `dependencies` = `temporal-polyfill` only. Optional peers: framework runtimes, `rrule` (loaded via dynamic `import()` only when an event has `rrule` or the recurrence plugin is used). Removed: `@radix-ui/*`, `@dnd-kit/*`, `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, `@mui/material` (from the published package; the playground may keep its own). Before adding or bumping anything, run `npm view <pkg> version` and use the latest (AGENTS.md hard rule).

## 4. Component slot contract (the piece #401 needs)

One framework-free contract in `types/`, rendered by `lib/dom`:

```ts
// Sketch. Names are a proposal; final shape needs owner approval (public API).
type SlotName = 'button' | 'input' | 'textarea' | 'label' | 'checkbox' | 'select' | 'dialog' | 'popover'
interface SlotMount<P> {
  mount(host: HTMLElement, props: P): { update(props: P): void; destroy(): void }
}
type CalendarSlots = Partial<{ [K in SlotName]: SlotMount<SlotProps[K]> }>
```

**Naming (decided 2026-11-23): `slots` + `slotProps`, the MUI convention.** Source: https://mui.com/material-ui/customization/overriding-component-structure/ (read at v9.6.0): "`slots`—to replace any interior slots (when present) as well as the root"; "you can pass custom props to interior slots using `slotProps`"; a `slotProps` entry "can also be a callback that receives the component's `ownerState`". MUI v6 deprecated its older per-part `*Props` props in favour of these.
- `slots` replaces the unreleased `components` / `CalendarComponents` on this branch. Verified 2026-11-23: the published 3.3.1 `IlamyCalendarProps` (`dist/index.d.ts:863`, from `npm pack @ilamy/calendar@3.3.1`) has no `components`, `CalendarComponents`, `slotProps` or `unstyled`, so `slots` and `slotProps` are new in v4 and need no rename entry in `docs/migration-v4.md` (list them as new).
- The branch's unreleased `slotProps` (`{ className, style }` per semantic part such as `header`) is kept and widened: one map keyed by slot name, covering both semantic parts and swappable primitives. Entries may be a function of calendar state, as in MUI.

- `lib/dom` renders native HTML defaults; when a slot is provided it calls `mount` instead.
- `SlotProps` are controlled: `open`/`onOpenChange`, `value`/`onValueChange`, `checked`/`onCheckedChange`, `children` as a host element, ARIA ids.
- Each wrapper converts its framework's components into `SlotMount`s, so users write `slots={{ dialog: Dialog, select: Select, ... }}` in their own framework's terms. Use each framework's documented imperative mount API (React portal/root, Vue `render`/Teleport, Svelte `mount`, Solid `render`, Angular `createComponent`); cite the doc URL for each in the PR.
- The same mechanism carries `renderEvent`, `renderHeader`, `renderResource`, `renderEventForm` (they are slots too). One mechanism, not two.

## 5. Phases

Each phase is one coherent change with unit and e2e tests written first (AGENTS.md: TDD, both layers), exercised in `apps/demo` with default settings, and a dev log entry. Docs for a phase land in that phase.

**Phase 0 — Spike (gate for everything else).** Prove the slot contract with a Dialog and a Select from a real component library in React (shadcn on Base UI) and Svelte (bits-ui or shadcn-svelte). Check: focus trap, portal placement, outside-click/Escape, nested popover inside dialog, keyboard nav, SSR does not crash. Deliver: findings + a go/no-go and the final `SlotProps` shape. Stop and report to the owner before Phase 1.

**Phase 1 — Collapse packages, no behaviour change.** Move sources into `packages/calendar/src/` per section 3; delete the private packages; Biome boundaries on. All existing unit + e2e specs pass unchanged. `@ilamy/types` no longer imports `react`.

**Phase 2 — Plugin contract in the DOM renderer.** Define it in `types/`; move agenda, year, recurrence UI and ical out of `lib/dom` into `features/plugins/*` as framework-free plugins. Same e2e specs run against the DOM mount.

**Phase 3 — Component slots.** Implement section 4 in `lib/dom` and every wrapper. Native defaults keep current look. Specs: each slot swapped in React and Svelte at minimum.

**Phase 4 — `rrule` on demand.** Replace static imports in `lib/dom` with dynamic `import()`. Test: a calendar with no recurring events does not load `rrule` (bundle check + unit test).

**Phase 5 — One drag engine.** Build `lib/interactions` from `dom-interactions.ts`; port drag-to-create onto it; delete `use-drag-gesture.ts`. Every drag/resize spec drives a real pointer (`page.mouse`, small steps) with the target checked by `document.elementFromPoint`, including the demo config (600px scroll, business hours, timezone, all plugins).

**Phase 6 — React onto the DOM renderer.** Thin React wrapper (controller via `useSyncExternalStore`, slots via section 4). Delete the old React UI, `@dnd-kit`, Radix and friends only after the full e2e suite passes against the new wrapper in `apps/demo`. Public React API stays the same unless the owner approves a change.

**Phase 7 — Styling, no library-specific code.** Delete `packages/themes/*` and the `./themes/mui`, `./themes/stylex` exports; ship no `./styles/mui`, `./styles/stylex` or `./react/mui`. Remove `@mui/material` and `@stylexjs/stylex` from the package's peers. Add website recipes: MUI theme -> `--ilamy-*` variables, StyleX -> variables + `slotProps`, Tailwind -> `unstyled` + `slotProps.className`, and MUI / shadcn (Base UI, Radix) / bits-ui components via `slots`. Each recipe is a runnable example covered by an e2e spec in at least two frameworks, so it cannot rot.

**Phase 8 — Docs truth pass.** README, website, migration guide, AGENTS.md match the shipped tree. Every documented export resolves (`bun run build && bun run check:dist-types`, plus an import smoke test per subpath).

## 6. Owner decisions (all decided 2026-11-23; any new public API question goes back to the owner)

1. ~~Prop name~~ **Decided:** `slots` + `slotProps` (MUI convention), replacing `components` / `CalendarComponents`.
2. **Decided (2026-11-23): no public plain-JS entry.** `lib/dom` stays internal; remove `./dom` from `exports`, README and website. Users reach the calendar only through a framework wrapper (`./react`, `./vue`, `./svelte`, `./solid`, `./angular`). `.` stays the headless core (types, Temporal helpers, controller).
2b. **Decided (2026-11-23): drop all library-specific styling code.** No `./themes/*`, `./styles/mui`, `./styles/stylex` or `./react/mui`. Users bring their own styles and components; docs recipes show how (Phase 7). None of these shipped: the latest published version, 3.3.1, exports only `.`, `./plugins/agenda`, `./plugins/drag-to-create`, `./plugins/recurrence`, `./testing` (`npm view @ilamy/calendar exports`, 2026-11-23), so no migration entry is needed.
3. **Decided (2026-11-23): React runs on the shared renderer**, with user JSX placed via `createPortal`. Context and event bubbling follow the React tree (https://react.dev/reference/react-dom/createPortal). Precedent: FullCalendar's React component constructs the framework-free `Calendar` and portals custom content (`createPortal(vnode, customRendering.containerEl)`, https://raw.githubusercontent.com/fullcalendar/fullcalendar-react/main/src/index.tsx). Rejected: a native UI per framework over shared logic (AG Grid's model, `ag-grid-react/src/reactUi/gridComp.tsx`), because it multiplies UI code by six; fully headless (TanStack Table), because users would build the calendar themselves.

## 7. Rules that apply to every phase (from AGENTS.md)

- `bun` only; never bare `bun test` at the root (`bun run test`).
- Temporal via `utils/temporal.ts`; no dayjs; ISO 8601 with offset.
- RFC 5545 semantics; where silent, match established calendar behaviour and cite it.
- Never commit to `main`; no AI co-author; no GitHub posting without a fresh "post it".
- A feature is done only after it is driven in `apps/demo` with defaults and recorded as a spec.
- Verify every claim twice; label unverified things "unverified".
