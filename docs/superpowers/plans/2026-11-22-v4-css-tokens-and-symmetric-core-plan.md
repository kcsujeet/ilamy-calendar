# v4.0 Architecture Plan — Layered CSS Tokens, Shared Core View-Models & Symmetric Framework Wrappers

**Status:** Implemented (v4.0)
**Branch:** `roadmap/4.0`
**Goals:**
1. **Zero hardcoded colors, hexes, or layout pixels in TypeScript** (`themes/mui`, `themes/stylex`, `@ilamy/dom`, `@ilamy/calendar`).
2. **Genuinely optional Tailwind** — React + MUI, React + StyleX, Vue, Svelte, Solid, Angular, and Vanilla DOM work standalone with zero Tailwind installed.
3. **One brain (`@ilamy/calendar`) + one CSS contract (`@ilamy/calendar/styles.css`)** — eliminate drift between React and Vue/Svelte/Solid/Angular/DOM.
4. **True entry-point symmetry** — `@ilamy/calendar` (root `"."`) is the pure headless core; React, Vue, Svelte, Solid, Angular, and DOM are equal sibling wrappers (`@ilamy/calendar/{react,vue,svelte,solid,angular,dom}`).
5. **Minimal v3 → v4 migration friction** — preserve React's customization DX (`useIlamyCalendarContext()`, `render*` props, `components` primitive swap, `slotProps`, plugins) and auto-inherit shadcn CSS tokens.

---

## 1. Package Entry-Point Architecture (`motion` Pattern)

| Subpath | Contents | Runtime deps |
|---|---|---|
| `@ilamy/calendar` (root `"."`) | **Pure headless framework-agnostic core**: Temporal date primitives, `createCalendarController`, RFC 5545 recurrence engine, business-hours/constraints validation, i18n (`defaultTranslations` + `createTranslator`), drag/resize math, shared types, and **pure view-model builders** for Month, Week, Day, Agenda, Year, and Resource grids. *(Zero UI, zero framework code.)* | `temporal-polyfill`, `rrule` |
| `@ilamy/calendar/styles.css` | Combined `base.css` + `theme.css` (`@layer ilamy.base, ilamy.theme`). Single import for zero-config styled UI across all frameworks. | Pure CSS |
| `@ilamy/calendar/styles/base.css` | Structural layout only (`@layer ilamy.base`): flex, grid, sticky headers/gutters, overflow/scrollbars, container queries, button/header alignment. Zero colors or visual chrome — for fully custom or unstyled builds. | Pure CSS |
| `@ilamy/calendar/react` | React 19 wrapper: `<IlamyCalendar />`, `useIlamyCalendarContext()`, `CalendarThemeProvider`, `useSlotProps()`, `useCalendarComponents()`, `components` override contract (`Button`, `Dialog`, `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Popover`), `SLOT_*`, `IlamyPlugin`. | `react`, `react-dom`, `@dnd-kit/core`, `@radix-ui/*`, `lucide-react` |
| `@ilamy/calendar/vue` | Vue 3.5+ wrapper: `<IlamyCalendar />` component + `useIlamyCalendar()` composable (zero React). | `vue` |
| `@ilamy/calendar/svelte` | Svelte 5+ wrapper: `ilamyCalendar` attachment / `ilamyCalendarAction` + `createIlamyCalendar()` rune store (zero React). | `svelte` |
| `@ilamy/calendar/solid` | Solid 2.0+ wrapper: `<IlamyCalendar />` + `mountSolidCalendar` + `createIlamyCalendar()` signals (zero React). | `solid-js` |
| `@ilamy/calendar/angular` | Angular 22+ wrapper: `<ilamy-calendar>` custom element (`registerIlamyCalendarElement`, `IlamyCalendarElement`) + `createAngularCalendar` signal adapter (zero React). | `@angular/core` |
| `@ilamy/calendar/dom` | Vanilla DOM renderer (`mountCalendar`, `generateDomIcal`, `DomCalendarOptions`, `MountedCalendar`, render-context types). | Pure DOM |
| `@ilamy/calendar/plugins/{recurrence,agenda,drag-to-create,year,ical}` | Modular feature plugins built on core contracts. | Varies per plugin |
| `@ilamy/calendar/themes/mui` | Thin Material UI bridge (~30 lines of CSS-var mapping from `useTheme()` → `--ilamy-*`) + optional native MUI primitives (`Button`, `Dialog`, `Input`, `Textarea`, `Select`, `Checkbox`, `Label`, `Popover`). Zero inline padding/border/height overrides. | `@mui/material`, `react` |
| `@ilamy/calendar/themes/stylex` | StyleX token contract (`--ilamy-*` CSS custom properties) + `stylexSlot` / `createStylexSlotProps` helpers for compiled `stylex.props(...)`. Zero hardcoded hex palettes or pixel dimensions in JS. | Optional `@stylexjs/stylex` |
| `@ilamy/calendar/testing` | React test harness (`CalendarTestProvider` + fixtures). | `react` |

---

## 2. CSS Contract (`@layer ilamy.base, ilamy.theme`)

### 2.1 Token Surface (Minimal — Only Real Design-System Tokens)

No layout-spacing variables (`--ilamy-header-gap`, etc.); layout lives directly in `@layer ilamy.base` rules and is overridden on `[data-ilamy-slot="..."]`.

```css
@layer ilamy.base {
  [data-ilamy-root] {
    /* Automatically bridges shadcn/Tailwind CSS variables when present,
       with clean light/dark fallbacks when Tailwind is NOT installed. */
    --ilamy-bg: var(--background, #ffffff);
    --ilamy-fg: var(--foreground, #09090b);
    --ilamy-surface: var(--card, #ffffff);
    --ilamy-muted: var(--muted, #f4f4f5);
    --ilamy-muted-fg: var(--muted-foreground, #71717a);
    --ilamy-border: var(--border, #e4e4e7);
    --ilamy-primary: var(--primary, #18181b);
    --ilamy-primary-fg: var(--primary-foreground, #fafafa);
    --ilamy-danger: var(--destructive, #ef4444);
    --ilamy-radius: var(--radius, 0.5rem);
    --ilamy-font: var(--font-sans, inherit);
  }
}
```

### 2.2 Stable DOM Slot & State Attributes (Identical in React AND `@ilamy/dom`)

Both React (`packages/calendar`) and `@ilamy/dom` emit the exact same `data-ilamy-*` attributes:

- **Slots (`data-ilamy-slot`):**
  `root`, `header`, `toolbar`, `nav-group`, `arrow-group`, `nav-button`, `view-switcher`, `view-button`, `grid`, `grid-scroll`, `month-header`, `day-header`, `resource-header`, `all-day-row`, `cell`, `event-bar`, `now-indicator`, `more-link`, `dialog`, `popover`
- **States (`data-*`):**
  `data-state="active" | "inactive"`, `data-today="true"`, `data-outside-month="true"`, `data-non-business="true"`, `data-disabled="true"`, `data-truncated-start="true"`, `data-truncated-end="true"`, `data-unstyled="true"`

### 2.3 Why Every Bug From Today Becomes Impossible

| Bug hit previously | Eliminated by |
|---|---|
| Clipped rounded corners / 2px double borders | Single `gap: 1px; background: var(--ilamy-border)` rule in `@layer ilamy.base` (or clean `border-right` with `:last-child { border-right: 0 }`) + outer `[data-ilamy-slot="grid"]` border — zero per-cell inline borders in theme JS. |
| Mismatched header button heights (29px / 35px / 36.5px / 39px) | One CSS rule on `[data-ilamy-slot="nav-button"], [data-ilamy-slot="arrow-group"], [data-ilamy-slot="view-switcher"] { height: 2.25rem; }` in `@layer ilamy.base`. |
| Double header gap in MUI/StyleX (16px) & 0px gap in Vue StyleX | One CSS rule on `[data-ilamy-slot="header"] { padding: 0.25rem; margin-bottom: 0.25rem; }` in `@layer ilamy.base`. |
| Can't scroll in Vue/Svelte/Solid/Angular + StyleX | Outer `[data-ilamy-slot="grid"]` (`overflow: hidden`) is structurally separated from inner `[data-ilamy-slot="grid-scroll"]` (`overflow: auto; scrollbar-width: thin`) in **both** React and `@ilamy/dom`. |
| Saturday/today shaded disabled gray in MUI | `[data-today="true"]` only styles the date badge (`[data-ilamy-today-badge]`) by default, identically across every theme; cells stay `var(--ilamy-bg)`. |
| MUI / StyleX / Vue broken when consumer lacks Tailwind | Zero Tailwind classes required for layout or visual defaults — `base.css` + `theme.css` are plain standard CSS. |
| 4 theme boolean hacks (`isBareUnstyled`, `usesGridBorder`, `hasThemedViewButtons`, `styledClass`) | **Deleted.** `[data-ilamy-root][data-unstyled="true"]` disables `@layer ilamy.theme` rules via `:not([data-unstyled="true"])`, or consumers omit `theme.css` / `styles.css`. |

---

## 3. Shared Core View-Models (`@ilamy/core`)

Lift duplicated view/domain logic out of `packages/calendar` and `packages/dom` into pure functions in `packages/core/src/views/`:

1. **`buildMonthViewModel(state, options)`** → weeks, days, outside-month/today/disabled/non-business flags, week numbers, horizontal positioned event segments, overflow counts.
2. **`buildTimeGridViewModel(state, options, mode: 'day' | 'week')`** → visible days (with `hiddenDays`/`weekends` applied), visible hours (`getViewHours`), columns (regular or vertical resources), all-day segments, vertical positioned events, `now` indicator offset.
3. **`buildResourceTimelineViewModel(state, options, mode: 'day' | 'week' | 'month')`** → **single source of truth for `weekViewGranularity: 'hourly' | 'daily'`**, sticky day/hour headers, resource rows with `color`/`backgroundColor`, horizontal slot grid, positioned bars, `now` indicator offset.
4. **`buildAgendaViewModel(state, options)`** and **`buildYearViewModel(state, options)`**.
5. **Unified i18n (`translate(key, translations, translator)`) & RFC 5545 recurrence expansion/scoped mutation** in `@ilamy/core` (removing the duplicate recurrence utils in `packages/dom/src/core/dom-events.utils.ts`).

Both React (`packages/calendar`) and `@ilamy/dom` become thin renderers over these exact view-models.

---

## 4. Implementation Milestones (TDD + Verification Gate per Milestone)

### Milestone 1 — CSS Contract & Zero-Tailwind Proof
- Author `packages/styles/` (private workspace bundled into `packages/calendar/dist/styles.css` and `dist/styles/base.css`, exported via `package.json` `exports`).
- Define `@layer ilamy.base` and `@layer ilamy.theme` using only `--ilamy-*` tokens with shadcn fallbacks.
- **TDD gate:** Add a **zero-Tailwind Playwright fixture** in `apps/e2e` (loads ONLY `@ilamy/calendar/styles.css`, no Tailwind CDN or Vite Tailwind plugin) and assert layout geometry (flex header, 36px buttons, 8px header gap, 1px grid borders, scrollability, sticky headers).

### Milestone 2 — Wire `[data-ilamy-slot]` & Delete Hardcoded JS Styles
- Update React components (`packages/calendar/src/`) and DOM renderer (`packages/dom/src/`) to emit the identical `data-ilamy-slot` / `data-*` attributes and separate `[data-ilamy-slot="grid"]` from `[data-ilamy-slot="grid-scroll"]`.
- Remove Tailwind layout classes (`flex`, `grid`, `h-9`, `p-1`, `gap-px`, `bg-border`, `sticky`, `overflow-auto`) from components where `base.css` owns them, and delete `isBareUnstyled`, `usesGridBorder`, `hasThemedViewButtons`, and `styledClass`.
- Rewrite `packages/themes/mui/src/mui-theme.ts` to map MUI `Theme` → `--ilamy-*` CSS vars ONLY (plus native MUI `components`), deleting all per-slot padding/border/font/background overrides.
- Rewrite `packages/themes/stylex/src/stylex-theme.ts` to expose StyleX token vars + `stylexSlot` / `createStylexSlotProps` without hardcoded hex/pixel slot overrides.
- **TDD gate:** All existing unit tests updated & green; Playwright tests pass in **both** Tailwind-enabled `apps/demo` AND the zero-Tailwind MUI/StyleX/Vue fixtures.

### Milestone 3 — Lift View-Models & Domain Logic Into `@ilamy/core`
- Extract `buildMonthViewModel`, `buildTimeGridViewModel`, `buildResourceTimelineViewModel` (including `weekViewGranularity`), `buildAgendaViewModel`, `buildYearViewModel`, translations, and recurrence helpers into `@ilamy/core`.
- Refactor React views and `@ilamy/dom` views to consume `@ilamy/core` view-models directly.
- Delete duplicated logic from `packages/dom/src/core/dom-events.utils.ts` and `packages/dom/src/views/*`.
- **TDD gate:** Pure unit tests in `packages/core` covering every view-model (hourly/daily granularity, hidden days, business hours, multi-zone DST, recurrence overrides); cross-framework Playwright parity suite green across all 5 frameworks × all 5 views × all presets.

### Milestone 4 — Symmetric Workspace Layout, Entry Points, Docs & Migration Polish
- Move the React implementation out of `packages/calendar/src/` into `packages/adapters/react` (`@ilamy/adapter-react`, equal sibling of `packages/adapters/{vue,svelte,solid,angular}`), updating `biome.json` Bulletproof React boundary globs, root `package.json` build script, `apps/demo/vite.config.ts`, and `@source` paths (`packages/adapters/*` is already a workspace glob in `package.json` and an entry glob in `fallow.toml`).
- Turn `packages/calendar` into a thin publish/packaging shell (`styles/`, `bunup.config.ts`, `package.json`, and 1-line entry shims) with `motion`-pattern `exports`:
  - `.` → pure headless core (`@ilamy/core` + shared domain types + `defaultTranslations` + `createTranslator`, zero framework code; remove redundant `./core` subpath)
  - `./react` → `@ilamy/adapter-react` (React 19 UI wrapper only — no duplicate core-type re-export dump)
  - `./vue`, `./svelte`, `./solid`, `./angular` → sibling framework wrappers (remove the 4 duplicated `export type { Dom* } from '@ilamy/dom'` blocks)
  - `./dom` → single canonical home for vanilla DOM `mountCalendar`, `generateDomIcal`, and mount/render-context types
  - `./styles.css`, `./styles/base.css`, `./styles/theme.css` → layered CSS
  - `./plugins/*`, `./themes/*`, `./testing`
- Update `packages/calendar/package.json` description/keywords, `apps/demo`, `apps/website`, `packages/playground`, `examples/{vite,nextjs,astro}`, `docs/migration-v4.md`, and `README.md`.
- **Final gate:** Full `bun run ci`, `bun run check:dist-types`, `fallow audit` (`0 / 0 / 0`), full Playwright E2E + accessibility + zero-Tailwind + cross-framework parity suites green, and visual screenshot QA across all 5 frameworks × all themes × light/dark mode.

---

## 5. v3 → v4 Migration Summary for React Users

```diff
- import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar'
+ import { IlamyCalendar, useIlamyCalendarContext } from '@ilamy/calendar/react'
+ import '@ilamy/calendar/styles.css'
```
```diff
  /* globals.css */
  @import 'tailwindcss';
- @source "../node_modules/@ilamy/calendar/dist";
```

Everything else (`useIlamyCalendarContext`, `renderEvent`, `renderHeader`/`headerComponent`, `renderEventForm`, `renderResource`, `components`, `slotProps`, shadcn `--background`/`--primary`/`--border`/`.dark` tokens, and plugins) works seamlessly.
