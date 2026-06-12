# v2 Overhaul — Phase 3: Generalize the Plugin View Contract + Port Views — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** One view-resolution path for built-in and plugin views alike (master plan
`docs/v2-overhaul-plan.md`, Phase 3). Extend the published `PluginView` contract with
optional, backward-compatible fields (`navigationStep`, `range`, `columns`, `layout`,
`renderHeader`, `supportsResources`), port the four built-in views onto it, and delete the
three hardcoded special-cases (`VIEW_UNITS`, the `builtInViews` record, the `BUILT_IN_VIEWS`
switcher list). Adding a hypothetical agenda view afterwards = one `PluginView` entry.
Custom-duration views (e.g. a 40-day grid) become possible: `range` + `columns` +
`navigationStep` is the whole job. Ships with the mandatory view-author guide
`docs/custom-views.md`.

**Architecture:** The contract is the LOCKED one from the master plan ("View contract:
generalize `PluginView` (no new registry)"). The renderer is a three-way dispatcher
(`layout: 'vertical'` → VerticalGrid, `layout: 'horizontal'` → HorizontalGrid, else
`component`), NOT a prop unification — the two grids' inputs genuinely differ. The engine
rule is mechanical: `engine = resources && view.supportsResources ? config.orientation :
view.layout`. Vocabulary discipline throughout: the two values are **'vertical'** and
**'horizontal'**; the resource dimension is the **resource axis**, declared via
**`supportsResources`** — no other words for these concepts appear in code, tests, or docs.

**Resource scope guard (read before writing any code):** `supportsResources` views must
compose BOTH arrangements when resources exist — but that composition arrives in **Phase 4**.
In Phase 3 the built-ins keep their current behavior without the resource axis, so **all four
built-in specs ship `supportsResources: false` in Phase 3 and flip in Phase 4**. Do not wire
any resource logic into the built-in `columns()` functions in this phase. The
`features/resource-calendar/` fork keeps serving resource day/week/month until Phase 4
deletes it (a transitional allowlist in the switcher encodes this, see Task 7).

**Baseline & sequencing caveat:** authored against `main@abe1c73`. This phase executes
AFTER Phases 1–2, which change the geometry layer (Phase 1: `lib/layout`) and the
provider/engine (Phase 2: engine slices in `features/calendar/hooks/use-calendar-*.ts`).
Code quoted below is **today's real code**; any file or line it names may have moved.
**Task 1 is therefore a re-validation gate** — confirm every quoted anchor still exists,
adjust paths, and only then proceed. Steps that touch the engine are explicitly marked
**(re-validate after Phase 2)**: the logic they quote may live in
`use-calendar-navigation.ts` / `use-calendar-data.ts` instead of `use-calendar-engine.ts`
by the time this phase runs. Adapt the *location*, never the *semantics*, without reporting.

**Tech Stack:** TypeScript, React 19, bun, bunup. No new dependencies. `@ilamy/types` is a
bundled private package — **every task that touches it must `bun run build` before
type-check/test** (recurrence + demo resolve `@ilamy/calendar` through built `dist/*.d.ts`).

**Verification commands used throughout** (expected outputs given per step):

```bash
bun run type-check     # expect: exits 0, no errors
bun run test           # expect: "0 fail" in every package section
bun run build          # expect: exits 0 (REQUIRED before checks whenever @ilamy/types changes)
bun run check:fix      # biome lint+format; expect: no errors (warnings pre-exist)
```

---

### Task 1: Branch setup + re-validation gate

**Files:** none modified

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/v2-phase3-view-contract
```

- [ ] **Step 2: Confirm a green baseline**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` for both `@ilamy/calendar-recurrence` and `@ilamy/calendar`. If red, STOP
and report — do not start on a broken main.

- [ ] **Step 3: Re-validate every anchor this plan quotes (MANDATORY — Phases 1–2 landed since authoring)**

Run each grep; record the current path/line for each anchor. If a hit is missing entirely
(not just moved), STOP and report before continuing.

```bash
# The PluginView contract (Task 3 extends it):
grep -n "export interface PluginView" packages/types/src/index.ts
# The hardcoded builtInViews record (Task 4 starts dissolving, Task 7 deletes):
grep -rn "const builtInViews" packages/calendar/src
# VIEW_UNITS + calculateViewRange + navigatePeriod (Task 7) — Phase 2 may have
# sliced these into features/calendar/hooks/use-calendar-navigation.ts:
grep -rn "VIEW_UNITS\|calculateViewRange\|navigatePeriod" packages/calendar/src --include='*.ts*' | grep -v '\.test\.'
# The BUILT_IN_VIEWS switcher special-case (Task 7 deletes):
grep -rn "BUILT_IN_VIEWS" packages/calendar/src --include='*.ts*'
# The 5 gutter-column copies (Task 2 dedups) — all share this exact class string:
grep -rln "sticky left-0 bg-background z-20 border-r-0" packages/calendar/src --include='*.tsx'
# The animation-delay constant sites (Task 2 dedups):
grep -rn "0\.05" packages/calendar/src --include='*.ts*' | grep -v '\.test\.'
# The resource body's view map (Task 8 adds the missing plugin fallback):
grep -n "viewMap" packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/resource-calendar-body.tsx
# Existing ColumnSpec shapes (Task 3 formalizes them in @ilamy/types):
grep -n "VerticalGridColProps\|HorizontalGridRowProps" packages/calendar/src/components/vertical-grid/vertical-grid-col.tsx packages/calendar/src/components/horizontal-grid/horizontal-grid-row.tsx
```

Expected anchors as of `main@abe1c73` (adjust to what the greps actually report):
`packages/types/src/index.ts:115-124` (PluginView); `ilamy-calendar.tsx:34-44`
(builtInViews); `use-calendar-engine.ts:82-87` (VIEW_UNITS), `:89-108`
(calculateViewRange), `:212-225` (navigatePeriod); `view-controls.tsx:67-95`
(BUILT_IN_VIEWS loop); gutter copies in `day-view.tsx:23-36`, `week-view.tsx:54-66`,
`resource-day-vertical.tsx:~30-43`, `resource-week-vertical.tsx:~21-44`,
`resource-month-vertical.tsx:~16-30`; delay sites in `month-header.tsx`, `week-view.tsx`,
`year-view.tsx`, `resource-month-horizontal.tsx`, `resource-day-horizontal.tsx`
(`delayStep={0.05}`), `resource-week-horizontal-day-header.tsx`,
`resource-week-vertical-day-header.tsx`.

- [ ] **Step 4: Check the dev logs for Phase 1–2 decisions that affect this plan**

Read the most recent `docs/logs/*.md` entries for the Phase 1/2 PRs. Specifically note:
where the engine navigation logic now lives, whether `useSmartCalendarContext` is now the
selector-only unified hook (Phase 2 exit criterion), and whether `resources`/`orientation`
are now honestly-optional fields on the one context (this plan's `ViewRenderer` reads both).

---

### Task 2: Gutter-column factory + header stagger constant (pure dedup, lands first)

The sticky time/date gutter column literal is pasted into 5 files; the `0.05` animation
stagger into 7. Both extractions need no contract change, so they land before anything else
(master plan: "the two highest-value extractions need no registry at all and land first").
No behavior change anywhere — the full suite is the regression gate.

**Files:**
- Create: `packages/calendar/src/components/vertical-grid/gutter.tsx`
  *(master plan names `gutter.ts`; the factory renders JSX so the extension is `.tsx` — same module path)*
- Modify: `packages/calendar/src/lib/constants.ts`
- Modify: `packages/calendar/src/features/calendar/components/day-view/day-view.tsx`
- Modify: `packages/calendar/src/features/calendar/components/week-view/week-view.tsx`
- Modify: `packages/calendar/src/features/calendar/components/month-view/month-header.tsx`
- Modify: `packages/calendar/src/features/calendar/components/year-view/year-view.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/day-view/resource-day-vertical.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/day-view/resource-day-horizontal.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/week-view/vertical/resource-week-vertical.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/week-view/vertical/resource-week-vertical-day-header.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/week-view/horizontal/resource-week-horizontal-day-header.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/month-view/resource-month-vertical.tsx`
- Modify: `packages/calendar/src/features/resource-calendar/components/month-view/resource-month-horizontal.tsx`

- [ ] **Step 1: Create the factory**

`packages/calendar/src/components/vertical-grid/gutter.tsx`:

```tsx
import type React from 'react'
import { HourLabel } from '@/components/hour-label/hour-label'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { cn } from '@/lib/utils'
import { keys } from '@/lib/utils/keys'
import type { VerticalGridColProps } from './vertical-grid-col'

/** Fixed gutter width (day view, the resource vertical views). */
export const GUTTER_WIDTH = 'w-16 min-w-16 max-w-16'
/** Responsive gutter width (week view + its all-day spacer). */
export const RESPONSIVE_GUTTER_WIDTH =
	'w-10 sm:w-16 min-w-10 sm:min-w-16 max-w-10 sm:max-w-16'

interface GutterColumnOptions {
	/** Cells of the gutter: hour slots for time gutters, dates for date gutters. */
	days: Dayjs[]
	gridType: 'day' | 'hour'
	/** Per-cell label. Defaults to `<HourLabel />` for 'hour' gutters. */
	renderLabel?: (date: Dayjs) => React.ReactNode
	/** Width utilities; defaults to the fixed `GUTTER_WIDTH`. */
	widthClassName?: string
}

/**
 * The sticky left gutter column (time or date labels), defined once.
 * Replaces the column literal previously pasted into every vertical view.
 */
export const gutterColumn = ({
	days,
	gridType,
	renderLabel,
	widthClassName = GUTTER_WIDTH,
}: GutterColumnOptions): VerticalGridColProps => ({
	id: gridType === 'hour' ? keys.col.time : keys.col.date,
	day: undefined,
	days,
	className: cn(
		'shrink-0',
		widthClassName,
		'sticky left-0 bg-background z-20 border-r-0'
	),
	gridType,
	noEvents: true,
	renderCell: (date: Dayjs) => (
		<div className="text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center">
			{renderLabel ? renderLabel(date) : <HourLabel date={date} />}
		</div>
	),
})
```

- [ ] **Step 2: Add the stagger constant to `lib/constants.ts`**

```ts
// Per-item stagger (seconds) for AnimatedSection sequences in view headers and
// the year grid. Previously the literal 0.05 pasted into 7 files.
export const HEADER_STAGGER_DELAY = 0.05
```

- [ ] **Step 3: Swap the five gutter copies for the factory**

`day-view.tsx` — replace the whole `firstCol` literal (lines 23–36) with:

```ts
const firstCol = gutterColumn({ days: hours, gridType: 'hour' })
```

`week-view.tsx` — delete the `LEFT_COL_WIDTH` constant (line 15) and replace the `firstCol`
literal (lines 54–66) with:

```ts
const firstCol = gutterColumn({
	days: hours,
	gridType: 'hour',
	widthClassName: RESPONSIVE_GUTTER_WIDTH,
})
```

and update the `AllDayRow` spacer class that used `LEFT_COL_WIDTH`:

```tsx
<AllDayRow
	classes={{ cell: CELL_CLASS, spacer: RESPONSIVE_GUTTER_WIDTH }}
	days={visibleDays}
/>
```

`resource-day-vertical.tsx` — replace its `firstCol` literal with:

```ts
const firstCol = gutterColumn({ days: hours, gridType: 'hour' })
```

`resource-month-vertical.tsx` — replace its `firstCol` literal with:

```tsx
const firstCol = gutterColumn({
	days: daysInMonth,
	gridType: 'day',
	renderLabel: (date: Dayjs) => (
		<>
			<span>{date.format('D')}</span>
			<span>{date.format('ddd')}</span>
		</>
	),
})
```

`resource-week-vertical.tsx` — replace the `firstCol` `useMemo` body with:

```tsx
const firstCol = useMemo(
	() =>
		gutterColumn({
			days: isHourly ? hours : weekDays,
			gridType: isHourly ? 'hour' : 'day',
			renderLabel: isHourly
				? undefined
				: (date: Dayjs) => (
						<>
							<span>{date.format('ddd')}</span>
							<span>{date.format('D')}</span>
						</>
					),
		}),
	[hours, isHourly, weekDays]
)
```

Note the factory reproduces today's id rule exactly (`keys.col.time` for 'hour',
`keys.col.date` for 'day') — `resource-week-vertical`'s `isHourly ? keys.col.time :
keys.col.date` ternary falls out for free. Imports of `HourLabel`/`keys` that become unused
in the view files get removed (biome will flag them).

- [ ] **Step 4: Swap the seven `0.05` sites for the constant**

In each file, import `HEADER_STAGGER_DELAY` from `@/lib/constants` and replace:

- `month-header.tsx:33` → `delay={index * HEADER_STAGGER_DELAY}`
- `week-view.tsx:134` → `delay={index * HEADER_STAGGER_DELAY}`
- `year-view.tsx:148` → `const animationDelay = monthIndex * HEADER_STAGGER_DELAY`
- `resource-month-horizontal.tsx:30` → `delay={index * HEADER_STAGGER_DELAY}`
- `resource-day-horizontal.tsx:36` → `<TimeHeaderRow delayStep={HEADER_STAGGER_DELAY} hours={dayHours} view="day" />`
- `resource-week-horizontal-day-header.tsx:32` → `delay={index * HEADER_STAGGER_DELAY}`
- `resource-week-vertical-day-header.tsx:41` → `delay={index * HEADER_STAGGER_DELAY}`

- [ ] **Step 5: Verify zero drift and commit**

Run: `grep -rn "0\.05" packages/calendar/src --include='*.ts*' | grep -v '\.test\.'`
Expected: only the `HEADER_STAGGER_DELAY` definition (plus the prose comment in
`time-header-row.tsx:12`, which references the value in a doc sentence — leave it).

Run: `grep -rln "sticky left-0 bg-background z-20 border-r-0" packages/calendar/src --include='*.tsx'`
Expected: only `components/vertical-grid/gutter.tsx`.

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` — the factory is byte-identical markup, so every existing
view/grid test passes unmodified.

```bash
git add -A packages/calendar/src
git commit -m "refactor(grid): extract shared gutter-column factory and header stagger constant"
```

---

### Task 3: Extend `PluginView` in `@ilamy/types` (additive, backward compatible)

The LOCKED contract from the master plan, with full TSDoc. `ColumnSpec` is not invented —
it formalizes the existing `VerticalGridColProps` / `HorizontalGridRowProps` shapes, which
then `extends` the published specs so nothing drifts. `Resource` moves to `@ilamy/types`
(its only dependency, `BusinessHours`, already lives there) so `ViewConfig.resources` is
typed without inventing a new word for the resource axis; the calendar re-exports it from
its current path, so the public surface is unchanged.

**Files:**
- Modify: `packages/types/src/index.ts`
- Modify: `packages/calendar/src/features/resource-calendar/types/index.ts` (Resource → re-export)
- Modify: `packages/calendar/src/components/vertical-grid/vertical-grid-col.tsx` (extends spec)
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid-row.tsx` (extends spec)
- Modify: `packages/calendar/src/index.ts` (re-export the new contract types)
- Append: `docs/migration-v2.md`

- [ ] **Step 1: Move `Resource` into `@ilamy/types`**

Cut the `Resource` interface from
`packages/calendar/src/features/resource-calendar/types/index.ts` (post-Phase-0 shape: `id`,
`title`, `color?`, `backgroundColor?`, `businessHours?`, `data?: Record<string, unknown>`)
and paste it into `packages/types/src/index.ts` below `BusinessHours`, unchanged. In the
resource types file, replace it with:

```ts
export type { Resource } from '@ilamy/types'
```

(`packages/calendar/src/index.ts:28` already re-exports `Resource` from that path, so the
public API is byte-identical. Check `packages/calendar/package.json` declares
`@ilamy/types` — it does, all internal packages are `noExternal` bundled.)

- [ ] **Step 2: Add the view-spec types to `packages/types/src/index.ts`**

Insert above `PluginView`:

```ts
/**
 * Calendar configuration handed to a view's `range()`/`columns()`/`renderHeader()`.
 * Carries the resource axis (`resources`, `orientation`) so a resource-capable
 * view can compose both arrangements.
 */
export interface ViewConfig {
	firstDayOfWeek: number
	hiddenDays?: Set<number>
	businessHours?: BusinessHours | BusinessHours[]
	hideNonBusinessHours?: boolean
	/** The resource axis. Set only when the calendar renders resources. */
	resources?: Resource[]
	/**
	 * The calendar-level resource arrangement (the user's choice): where the
	 * resource axis goes. Only meaningful when `resources` is set.
	 */
	orientation?: 'vertical' | 'horizontal'
}

/**
 * One column of a 'vertical' view (time flows down the column).
 * Formalizes the calendar's existing VerticalGrid column input.
 */
export interface VerticalColumnSpec {
	/** Stable column id; drives testids and React keys. */
	id: string
	/** The date this column represents; gutter/label columns leave it unset. */
	day?: Dayjs
	/** The cells of the column: hour slots (gridType 'hour') or dates ('day'). */
	days: Dayjs[]
	gridType?: 'day' | 'hour'
	className?: string
	/** Label-only column (e.g. the time gutter): renders no events. */
	noEvents?: boolean
	renderCell?: (date: Dayjs) => ReactNode
	/** Resource-axis identity when the column belongs to one resource. */
	resourceId?: string | number
	resource?: Resource
}

/** One cell of a 'horizontal' row. */
export interface HorizontalCellSpec {
	id: string
	day?: Dayjs
	/** A grouped cell spanning several dates (nested-axis arrangements). */
	days?: Dayjs[]
	gridType: 'day' | 'hour'
	className?: string
}

/**
 * One row of a 'horizontal' view (date cells flow across the row).
 * Formalizes the calendar's existing HorizontalGrid row input.
 */
export interface HorizontalRowSpec {
	id: string | number
	columns?: HorizontalCellSpec[]
	className?: string
	showDayNumber?: boolean
	/** Resource-axis identity when the row belongs to one resource. */
	resource?: Resource
}

/** What a view's `columns()` returns; `layout` picks which engine consumes it. */
export type ColumnSpec = VerticalColumnSpec | HorizontalRowSpec

/** Context passed to a view's `renderHeader`. */
export interface ViewHeaderContext {
	date: Dayjs
	config: ViewConfig
}
```

- [ ] **Step 3: Extend `PluginView` (replace the existing interface body — every addition optional)**

```ts
/**
 * Describes a view type — contributed by a plugin or built into the calendar
 * core (the four built-ins are themselves `PluginView` entries). A view either
 * declares `columns` + `layout` and renders through the shared grid engines,
 * or renders entirely through `component` (the escape hatch).
 */
export interface PluginView {
	/** Unique view id, e.g. 'resource-week'. */
	name: string
	/** View-switcher label (or a translation key; unknown keys render as-is). */
	label?: string
	/** Renders the view when `columns`/`layout` are absent (the escape hatch). */
	component: ComponentType
	/** How far prev/next steps when `navigationStep` is absent ('week', 'month', …). */
	navigationUnit?: ManipulateType
	/**
	 * How far prev/next jumps; defaults to one `navigationUnit`. Custom-duration
	 * views (a 40-day grid, a 4-day vertical view) set `{ amount: 40, unit: 'day' }`
	 * so navigation moves a full window.
	 */
	navigationStep?: { amount: number; unit: ManipulateType }
	/**
	 * Visible range for navigation callbacks and the event pipeline. Views
	 * without `range` fall back to the month 6x7 grid range.
	 */
	range?: (date: Dayjs, config: ViewConfig) => { start: Dayjs; end: Dayjs }
	/**
	 * Column/row specs for the shared renderer. Return `VerticalColumnSpec[]`
	 * when `layout` is 'vertical', `HorizontalRowSpec[]` when 'horizontal'.
	 * Omit (together with `layout`) to render `component` instead.
	 */
	columns?: (
		date: Dayjs,
		config: ViewConfig
	) => VerticalColumnSpec[] | HorizontalRowSpec[]
	/**
	 * The view's intrinsic shape (the author's choice): which engine renders it
	 * when the calendar has NO resources. 'vertical' = time flows down;
	 * 'horizontal' = date cells flow across in stacked rows. With resources on
	 * a resource-capable view, the calendar-level `orientation` wins instead:
	 * `engine = resources && supportsResources ? orientation : layout`.
	 */
	layout?: 'vertical' | 'horizontal'
	/** Header row content rendered above the grid by the shared renderer. */
	renderHeader?: (ctx: ViewHeaderContext) => ReactNode
	/**
	 * Whether `columns()` composes the resource axis when `config.resources`
	 * is set. Defaults to false; the view switcher hides resource-incapable
	 * views on a resource calendar.
	 */
	supportsResources?: boolean
}
```

(`name`/`label`/`component`/`navigationUnit` keep their exact published shapes; existing
plugins — including the recurrence plugin, which declares no views — compile unchanged.)

- [ ] **Step 4: Re-base the grid prop types on the specs (proves "ColumnSpec already exists")**

`vertical-grid-col.tsx` — replace the `VerticalGridColProps` interface (lines 10–29) with:

```ts
import type { Resource, VerticalColumnSpec } from '@ilamy/types'

export interface VerticalGridColProps extends VerticalColumnSpec {
	'data-testid'?: string
	/**
	 * Granularity of each hour row in minutes. `60` renders one cell per hour with
	 * no sub-hour lines. `30` renders two. `15` renders four with dashed separators.
	 */
	slotDurationMinutes?: number
	/** Whether this is the last column in the grid */
	isLastColumn?: boolean
}
```

(`resourceId`/`resource`/`day`/`days`/`className`/`gridType`/`renderCell`/`noEvents` now
come from the spec. Drop the local `renderHeader?: () => React.ReactNode` field only if
`grep -rn "renderHeader" packages/calendar/src/components/vertical-grid` shows no consumer —
re-validate; if consumed, keep it on the extended interface.)

`horizontal-grid-row.tsx` — replace the two local interfaces (lines 14–34) with:

```ts
import type {
	HorizontalCellSpec,
	HorizontalRowSpec,
	Resource,
} from '@ilamy/types'

interface HorizontalGridColumn extends HorizontalCellSpec {
	renderCell?: (row: HorizontalGridRowProps) => React.ReactNode
}

export interface HorizontalGridRowProps extends HorizontalRowSpec {
	gridType?: 'day' | 'hour'
	variant?: 'regular' | 'resource'
	dayNumberHeight?: number
	columns?: HorizontalGridColumn[]
	allDay?: boolean
	isLastRow?: boolean
}
```

- [ ] **Step 5: Re-export the contract types from the calendar's public index**

In `packages/calendar/src/index.ts`, extend the existing `@ilamy/types`-sourced type export
(next to `PluginView`) with: `ViewConfig`, `ColumnSpec`, `VerticalColumnSpec`,
`HorizontalCellSpec`, `HorizontalRowSpec`, `ViewHeaderContext`. View authors import these
from `@ilamy/calendar` (the dogfooding rule: plugins use only public exports).

- [ ] **Step 6: Build, then verify (types package is bundled — rebuild is NOT optional)**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail`. Every addition is optional, so `ilamy-calendar.test.tsx`'s
existing plugin-view test (`views: [{ name: 'fake-view', label: 'Fake', component:
FakeView, navigationUnit: 'day' }]`) compiles and passes untouched — that test IS the
backward-compatibility proof.

- [ ] **Step 7: Append the migration note (verified non-breaking, stated explicitly)**

Add to `docs/migration-v2.md` before `## Summary checklist`:

```markdown
### `PluginView` gains optional view-spec fields (non-breaking)

`PluginView` adds `navigationStep`, `range`, `columns`, `layout`, `renderHeader`, and
`supportsResources` — all optional. Existing view objects (`{ name, label, component,
navigationUnit }`) keep working unchanged; verified against the v1 plugin-view shape in the
test suite. New capability, not a break: a view that declares `columns` + `layout` renders
through the calendar's shared engines, `range` drives the event pipeline, and
`navigationStep` makes prev/next jump custom windows. See `docs/custom-views.md`.

One behavior change ships alongside (see "View switcher" below): on a **resource** calendar
the switcher now hides plugin views that don't declare `supportsResources: true`. They
previously showed a button that rendered a blank body.
```

- [ ] **Step 8: Commit**

```bash
git add packages/types packages/calendar/src docs/migration-v2.md
git commit -m "feat(types): extend PluginView with range/columns/layout/renderHeader/navigationStep"
```

---

### Task 4: The three-way `ViewRenderer` dispatcher + port `day` (proves the shape)

`day` is the simplest view; porting it first proves the dispatcher end-to-end while the
other three built-ins still render through the legacy record. Behavior-preserving: the
existing `day-view.test.tsx` suite is the spec and must pass **unmodified** (a test change
in a port is a review flag, per the master plan).

**Files:**
- Create: `packages/calendar/src/features/calendar/components/views/view-renderer.tsx`
- Create: `packages/calendar/src/features/calendar/components/views/day.tsx`
- Create: `packages/calendar/src/features/calendar/components/views/index.ts`
- Move: `.../day-view/day-view.test.tsx` → `.../views/day.test.tsx` (git mv; import-path-only edit)
- Delete: `packages/calendar/src/features/calendar/components/day-view/` (after the move)
- Modify: `packages/calendar/src/features/calendar/components/ilamy-calendar.tsx`
- Modify: `packages/calendar/src/components/vertical-grid/vertical-grid-header-container.tsx` (one class)

- [ ] **Step 1: Let header nodes own their height (`h-12` → `min-h-12`)**

The dispatcher passes uniform `classes` to the grids, so per-view header heights must live
in the header node itself. In `vertical-grid-header-container.tsx`, change:

```ts
className={cn('h-12 border-b', TotalWidthClass, classes?.header)}
```

to:

```ts
className={cn('min-h-12 border-b', TotalWidthClass, classes?.header)}
```

Views that passed an explicit height through `classes.header` (week's `h-18`, the resource
views' `h-24`/`h-12`) still override via `cn`/tailwind-merge exactly as before; views that
didn't get a minimum instead of a fixed height. Run the vertical-grid + view suites; if any
test pins the literal `h-12` class on `vertical-grid-header`, update that single assertion
and flag it in the PR description (deliberate, behavior-equivalent).

- [ ] **Step 2: Create the dispatcher**

`views/view-renderer.tsx`:

```tsx
import type React from 'react'
import { useMemo } from 'react'
import type {
	HorizontalRowSpec,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { AllDayRow } from '@/components/all-day-row/all-day-row'
import { HorizontalGrid } from '@/components/horizontal-grid/horizontal-grid'
import { RESPONSIVE_GUTTER_WIDTH } from '@/components/vertical-grid/gutter'
import { VerticalGrid } from '@/components/vertical-grid/vertical-grid'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'

// Contract rule, not a runtime check: a view declaring `layout: 'vertical'`
// returns VerticalColumnSpec[] from columns() (see PluginView.columns TSDoc).
const isVerticalSpecs = (
	_specs: VerticalColumnSpec[] | HorizontalRowSpec[],
	engine: 'vertical' | 'horizontal'
): _specs is VerticalColumnSpec[] => engine === 'vertical'

/**
 * The three-way view dispatcher: 'vertical' → VerticalGrid, 'horizontal' →
 * HorizontalGrid, no columns/layout → the view's `component` (escape hatch).
 * Engine rule: resources + a resource-capable view → the calendar-level
 * `orientation`; otherwise the view's own `layout`.
 */
export const ViewRenderer: React.FC<{ view: PluginView }> = ({ view }) => {
	const {
		currentDate,
		firstDayOfWeek,
		hiddenDays,
		businessHours,
		hideNonBusinessHours,
		slotDuration,
		resources,
		orientation,
	} = useSmartCalendarContext((c) => ({
		currentDate: c.currentDate,
		firstDayOfWeek: c.firstDayOfWeek,
		hiddenDays: c.hiddenDays,
		businessHours: c.businessHours,
		hideNonBusinessHours: c.hideNonBusinessHours,
		slotDuration: c.slotDuration,
		resources: c.resources,
		orientation: c.orientation,
	}))

	const config = useMemo<ViewConfig>(
		() => ({
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
		}),
		[
			firstDayOfWeek,
			hiddenDays,
			businessHours,
			hideNonBusinessHours,
			resources,
			orientation,
		]
	)

	// Memoized so the grids' memo()d columns/rows see stable references
	// (the PR #190 stale-useMemo lesson: deps are exhaustive).
	const specs = useMemo(
		() => view.columns?.(currentDate, config),
		[view, currentDate, config]
	)

	if (!specs || !view.layout) {
		const EscapeHatch = view.component
		return <EscapeHatch />
	}

	const hasResources = Boolean(resources?.length)
	const composesResourceAxis = hasResources && Boolean(view.supportsResources)
	// The locked engine rule.
	const engine = composesResourceAxis
		? (orientation ?? 'horizontal')
		: view.layout
	const variant = composesResourceAxis ? 'resource' : 'regular'
	const header = view.renderHeader?.({ date: currentDate, config })

	if (isVerticalSpecs(specs, engine)) {
		const gridType = specs.some((col) => col.gridType === 'hour')
			? 'hour'
			: 'day'
		const eventDays = specs
			.filter((col) => !col.noEvents)
			.map((col) => col.day)
			.filter((day): day is Dayjs => Boolean(day))
		const allDayClasses =
			eventDays.length > 1
				? { cell: 'flex-1 min-w-0', spacer: RESPONSIVE_GUTTER_WIDTH }
				: undefined

		return (
			<VerticalGrid
				allDayRow={
					gridType === 'hour' ? (
						<AllDayRow classes={allDayClasses} days={eventDays} />
					) : undefined
				}
				classes={{ header: 'w-full', body: 'w-full', allDay: 'w-full' }}
				columns={specs}
				gridType={gridType}
				slotDurationMinutes={slotDuration}
				variant={variant}
			>
				{header}
			</VerticalGrid>
		)
	}

	return (
		<HorizontalGrid
			classes={{ body: 'w-full', header: 'w-full' }}
			rows={specs}
			variant={variant}
		>
			{header}
		</HorizontalGrid>
	)
}
```

**(re-validate after Phase 2):** `resources` and `orientation` must be honestly-optional
fields on the unified smart context (a Phase 2 exit criterion). If Phase 2 named them
differently, follow the Phase 2 naming — the engine rule itself is non-negotiable.

- [ ] **Step 3: Port the day view**

`views/day.tsx` (replaces `day-view/day-view.tsx`; header markup is byte-identical):

```tsx
import type React from 'react'
import type {
	Dayjs,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { AnimatedSection } from '@/components/animations/animated-section'
import { gutterColumn } from '@/components/vertical-grid/gutter'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { cn } from '@/lib/utils'
import { getDayKey, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { ViewRenderer } from './view-renderer'

const DayViewHeader: React.FC<{ date: Dayjs }> = ({ date }) => {
	const { t } = useSmartCalendarContext((c) => ({ t: c.t }))
	const today = isToday(date)

	return (
		<div
			className={'flex flex-1 justify-center items-center min-h-12'}
			data-testid="day-view-header"
		>
			<AnimatedSection
				className={cn(
					'flex justify-center items-center text-center text-sm font-semibold sm:text-xl',
					today && 'text-primary'
				)}
				transitionKey={getDayKey(date)}
			>
				{date.format('dddd, LL')}
				{today && (
					<span className="bg-primary text-primary-foreground ml-2 rounded-full px-1 py-0.5 text-xs sm:px-2 sm:text-sm">
						{t('today')}
					</span>
				)}
			</AnimatedSection>
		</div>
	)
}

const dayColumns = (date: Dayjs, config: ViewConfig): VerticalColumnSpec[] => {
	const hours = getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: [date],
	})

	return [
		gutterColumn({ days: hours, gridType: 'hour' }),
		{
			id: keys.col.day(date),
			day: date,
			days: hours,
			className: 'w-[calc(100%-4rem)] flex-1',
			gridType: 'hour',
		},
	]
}

export const DayView: React.FC = () => <ViewRenderer view={dayView} />

export const dayView: PluginView = {
	name: 'day',
	label: 'day',
	navigationUnit: 'day',
	layout: 'vertical',
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date) => ({ start: date.startOf('day'), end: date.endOf('day') }),
	columns: dayColumns,
	renderHeader: ({ date }) => <DayViewHeader date={date} />,
	component: DayView,
}
```

(`DayView` is declared before `dayView` deliberately: `component: DayView` is evaluated at
module init, while `DayView`'s body reads `dayView` only at render time — no TDZ.
`component` is never rendered for this view — `columns`+`layout` take the shared path — but
the contract requires it and tests render `<DayView />` directly.)

`views/index.ts`:

```ts
import type { PluginView } from '@ilamy/types'
import { dayView } from './day'

export { DayView, dayView } from './day'
export { ViewRenderer } from './view-renderer'

/** The core's own views, resolved exactly like plugin views (prepended first). */
export const builtInViews: PluginView[] = [dayView]
```

- [ ] **Step 4: Move the test, delete the old module**

```bash
git mv packages/calendar/src/features/calendar/components/day-view/day-view.test.tsx \
	packages/calendar/src/features/calendar/components/views/day.test.tsx
git rm packages/calendar/src/features/calendar/components/day-view/day-view.tsx
```

In `views/day.test.tsx` change ONLY the component import: `import { DayView } from './day'`.
Every assertion stays byte-identical (the port must pass the existing suite unmodified).

- [ ] **Step 5: Start dissolving the record in `ilamy-calendar.tsx`**

Replace the `CalendarContent` resolution (today's lines 27–44; `dayMaxEvents` thread already
gone after Phase 0):

```tsx
import {
	builtInViews,
	ViewRenderer,
} from '@/features/calendar/components/views'

const CalendarContent: React.FC = () => {
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))

	// Transitional until Task 7: week/month/year still render via the legacy
	// record; day resolves through the spec path like a plugin view.
	const legacyBuiltIns: Record<string, React.ReactNode> = {
		month: <MonthView key="month" />,
		week: <WeekView key="week" />,
		year: <YearView key="year" />,
	}
	const spec =
		builtInViews.find((v) => v.name === view) ??
		getViews().find((v) => v.name === view)
	const activeView =
		legacyBuiltIns[view] ?? (spec ? <ViewRenderer key={view} view={spec} /> : null)
	// ... rest of the component unchanged
```

Remove the now-unused `DayView` old-path import; import nothing from `day-view/`.

- [ ] **Step 6: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`. The day suite (moved, assertions untouched), the
`ilamy-calendar.test.tsx` plugin-view test, and the all-day-row/vertical-grid suites all
green — they pin the dispatcher's output as identical to the old inline assembly.

```bash
git add -A packages/calendar/src
git commit -m "feat(views): three-way ViewRenderer dispatcher; port day view to the PluginView contract"
```

---

### Task 5: Port `week` (proves `renderHeader`: corner cell + clickable day headers)

The week header (week-number corner cell + clickable, staggered day headers) is exactly the
irreducible per-view code `renderHeader` exists for. Behavior-preserving; the existing
`week-view.test.tsx` (including the PR #190 hiddenDays-rerender regression test) is the spec.

**Files:**
- Create: `packages/calendar/src/features/calendar/components/views/week.tsx`
- Move: `.../week-view/week-view.test.tsx` → `.../views/week.test.tsx` (git mv; import-path-only edit)
- Delete: `packages/calendar/src/features/calendar/components/week-view/`
- Modify: `views/index.ts`, `ilamy-calendar.tsx`

- [ ] **Step 1: Pre-verify the two cleanups the port performs**

Run: `grep -rn -- "--visible-days" packages apps --include='*.ts*' --include='*.css' | grep -v node_modules | grep -v dist`
Expected: only `week-view.tsx:86` (the var is *set* but never *consumed*) — the port drops
it. If a consumer appears, keep the var by setting it via the header node's `style` and
report. Likewise the old column fields `label`/`value`: `VerticalGridColProps` (now
`extends VerticalColumnSpec`, Task 3) never declared them — dead weight the port drops.

- [ ] **Step 2: Create `views/week.tsx`**

```tsx
import type React from 'react'
import type {
	Dayjs,
	PluginView,
	VerticalColumnSpec,
	ViewConfig,
} from '@ilamy/types'
import { AnimatedSection } from '@/components/animations/animated-section'
import {
	gutterColumn,
	RESPONSIVE_GUTTER_WIDTH,
} from '@/components/vertical-grid/gutter'
import { getViewHours } from '@/features/calendar/utils/view-hours'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { HEADER_STAGGER_DELAY } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { getWeekDays, isToday } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { ViewRenderer } from './view-renderer'

const getVisibleDays = (date: Dayjs, config: ViewConfig): Dayjs[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const { hiddenDays } = config
	if (!hiddenDays) return weekDays
	return weekDays.filter((day) => !hiddenDays.has(day.day()))
}

const WeekViewHeader: React.FC<{ date: Dayjs; config: ViewConfig }> = ({
	date,
	config,
}) => {
	const { t, selectDate, openEventForm } = useSmartCalendarContext((c) => ({
		t: c.t,
		selectDate: c.selectDate,
		openEventForm: c.openEventForm,
	}))
	const visibleDays = getVisibleDays(date, config)

	return (
		<div className={'flex h-18 flex-1'} data-testid="week-view-header">
			{/* Corner cell with week number */}
			<div className="w-10 sm:w-16 min-w-10 sm:min-w-16 h-full shrink-0 items-center justify-center border-r p-2 flex">
				<div className="flex flex-col items-center justify-center min-w-0 w-full">
					<span className="text-muted-foreground text-xs truncate w-full text-center">
						{t('week')}
					</span>
					<span className="font-medium truncate w-full text-center">
						{date.week()}
					</span>
				</div>
			</div>

			{/* Day header cells */}
			{visibleDays.map((day, index) => {
				const today = isToday(day)
				const key = keys.header.week.day(day)

				return (
					<AnimatedSection
						className={cn(
							'hover:bg-accent flex-1 min-w-0 flex flex-col justify-center cursor-pointer p-1 text-center sm:p-2 border-r last:border-r-0 w-20 h-full',
							today && 'bg-primary/10 font-bold'
						)}
						data-testid={keys.header.weekday('week', day.format('dddd'))}
						delay={index * HEADER_STAGGER_DELAY}
						key={key}
						onClick={() => {
							selectDate(day)
							openEventForm({ start: day })
						}}
						transitionKey={key}
					>
						<div className="text-xs sm:text-sm truncate w-full">
							{day.format('ddd')}
						</div>
						<div
							className={cn(
								'mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs',
								today && 'bg-primary text-primary-foreground'
							)}
						>
							{day.format('D')}
						</div>
					</AnimatedSection>
				)
			})}
		</div>
	)
}

const weekColumns = (date: Dayjs, config: ViewConfig): VerticalColumnSpec[] => {
	const weekDays = getWeekDays(date, config.firstDayOfWeek)
	const visibleDays = getVisibleDays(date, config)
	const gutterHours = getViewHours({
		referenceDate: date,
		businessHours: config.businessHours,
		hideNonBusinessHours: config.hideNonBusinessHours,
		allDates: weekDays,
	})

	return [
		gutterColumn({
			days: gutterHours,
			gridType: 'hour',
			widthClassName: RESPONSIVE_GUTTER_WIDTH,
		}),
		// Each day column gets its own hours on the correct date.
		...visibleDays.map((day) => ({
			id: keys.col.day(day),
			day,
			days: getViewHours({
				referenceDate: day,
				businessHours: config.businessHours,
				hideNonBusinessHours: config.hideNonBusinessHours,
				allDates: weekDays,
			}),
			className: 'flex-1 min-w-0',
			gridType: 'hour' as const,
		})),
	]
}

export const WeekView: React.FC = () => <ViewRenderer view={weekView} />

export const weekView: PluginView = {
	name: 'week',
	label: 'week',
	navigationUnit: 'week',
	layout: 'vertical',
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date, config) => {
		const days = getWeekDays(date, config.firstDayOfWeek)
		const weekStart = days.at(0) ?? date
		const weekEnd = days.at(-1) ?? date
		return { start: weekStart.startOf('day'), end: weekEnd.endOf('day') }
	},
	columns: weekColumns,
	renderHeader: ({ date, config }) => (
		<WeekViewHeader config={config} date={date} />
	),
	component: WeekView,
}
```

Two deliberate diffs from the old file, both inert: the dead `--visible-days` CSS var is
gone (Step 1 proved zero consumers), and the header's old `h-full` root becomes `h-18`
(the height previously injected via `classes.header`; Task 4 Step 1's `min-h-12` container
makes the node's own height authoritative). The all-day row (`cell: 'flex-1 min-w-0'`,
`spacer: RESPONSIVE_GUTTER_WIDTH`) now comes from the dispatcher's multi-day branch —
byte-identical classes to what the old view passed.

- [ ] **Step 3: Register, move the test, delete the old module**

In `views/index.ts`: `export { WeekView, weekView } from './week'` and
`builtInViews: PluginView[] = [dayView, weekView]`.
In `ilamy-calendar.tsx`: remove `week` from `legacyBuiltIns` and its old import.

```bash
git mv packages/calendar/src/features/calendar/components/week-view/week-view.test.tsx \
	packages/calendar/src/features/calendar/components/views/week.test.tsx
git rm -r packages/calendar/src/features/calendar/components/week-view
```

In `views/week.test.tsx` change only the import to `import { WeekView } from './week'`.

- [ ] **Step 4: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` — including the week suite's header-click, hiddenDays, and
business-hours tests, unmodified.

```bash
git add -A packages/calendar/src
git commit -m "feat(views): port week view; renderHeader carries the corner cell + day headers"
```

---

### Task 6: Port `month` (horizontal) + `year` (escape hatch, pipeline-driven badges)

`month` proves the 'horizontal' arm of the dispatcher. `year` stays a `component` escape
hatch — its 12-mini-calendar layout fits neither engine — but its month badges stop
filtering raw `events` and join the range-driven pipeline, killing the badge-vs-dots
divergence (master plan "Why" item 4). That is a **behavior change** for events spanning
month boundaries (and for any plugin-transformed events): failing-first test required.

**Files:**
- Create: `packages/calendar/src/features/calendar/components/views/month.tsx`
- Create: `packages/calendar/src/features/calendar/components/views/year.tsx` (spec only)
- Move: `.../month-view/month-header.tsx` → `.../views/month-header.tsx` (git mv)
- Move: `.../month-view/month-view.test.tsx` → `.../views/month.test.tsx` (git mv; import edit)
- Delete: `packages/calendar/src/features/calendar/components/month-view/`
- Modify: `packages/calendar/src/features/calendar/components/year-view/year-view.tsx`
- Modify: `packages/calendar/src/features/calendar/components/year-view/year-view.test.tsx` (append failing-first test)
- Modify: `packages/calendar/src/lib/utils/date-utils.ts` (add `getMonthGridRange`)
- Modify: `views/index.ts`, `ilamy-calendar.tsx`

- [ ] **Step 1 (RED): failing-first test for the year badge pipeline**

Append inside the existing `describe('Event Count Badge', ...)` block of
`year-view.test.tsx`, using the file's `renderYearView` helper and current-year convention:

```tsx
test('counts a multi-day event spanning a month boundary in both month badges', () => {
	const year = dayjs().year()
	const spanningEvent: CalendarEvent = {
		id: 'span-1',
		title: 'Spans Jan/Feb',
		start: dayjs(`${year}-01-30T18:00:00.000Z`),
		end: dayjs(`${year}-02-02T10:00:00.000Z`),
	}

	renderYearView({ events: [spanningEvent] })

	const januaryBadge = screen.getByTestId(keys.header.year.month('01', 'count'))
	const februaryBadge = screen.getByTestId(keys.header.year.month('02', 'count'))
	expect(januaryBadge.textContent).toBe('1 event')
	expect(februaryBadge.textContent).toBe('1 event')
})
```

Run: `bun test packages/calendar/src/features/calendar/components/year-view`
Expected: **the new test FAILS** (February has no badge today — the old code counts by
`event.start.month()` only, while the day dots already mark Feb 1–2). All other tests pass.

- [ ] **Step 2 (GREEN): badges read the same range-driven path as the dots**

In `year-view.tsx`, replace `generateMonthsData` (lines 45–64):

```ts
const generateMonthsData = (): MonthData[] => {
	return Array.from({ length: 12 }, (_, monthIndex) => {
		const monthDate = dayjs()
			.year(currentYear)
			.month(monthIndex)
			.startOf('month')
		const eventsInMonth = getEventsForDateRange(
			monthDate,
			monthDate.endOf('month')
		)

		return {
			date: monthDate,
			name: monthDate.format('MMMM'),
			eventCount: eventsInMonth.length,
			monthKey: monthDate.format('MM'),
		}
	})
}
```

Remove `events` from the `useSmartCalendarContext()` destructuring (it is now unused — the
view no longer filters `events` directly, per the master plan's event-pipeline rule).

Run the year suite again. Expected: ALL tests pass, including the existing exact-count badge
tests (single-month events overlap exactly one month, so their counts are unchanged) and
the new spanning test.

- [ ] **Step 3: Extract the month grid range helper (shared by the month spec now and the engine fallback in Task 7)**

Append to `lib/utils/date-utils.ts`, next to `getMonthWeeks`:

```ts
/** The 6x7 month grid range: first cell of week 1 → last cell of week 6. */
export const getMonthGridRange = (
	date: Dayjs,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } => {
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	const gridStart = weeks.at(0)?.at(0) ?? date
	const gridEnd = weeks.at(-1)?.at(-1) ?? date
	return { start: gridStart.startOf('day'), end: gridEnd.endOf('day') }
}
```

- [ ] **Step 4: Create `views/month.tsx`**

```tsx
import type React from 'react'
import type {
	Dayjs,
	HorizontalRowSpec,
	PluginView,
	ViewConfig,
} from '@ilamy/types'
import { getMonthGridRange, getMonthWeeks } from '@/lib/utils/date-utils'
import { keys } from '@/lib/utils/keys'
import { MonthHeader } from './month-header'
import { ViewRenderer } from './view-renderer'

const monthRows = (date: Dayjs, config: ViewConfig): HorizontalRowSpec[] =>
	getMonthWeeks(date, config.firstDayOfWeek).map((days, weekIndex) => ({
		id: keys.listKey('week', weekIndex),
		columns: days.map((day) => ({
			id: keys.col.day(day),
			day,
			className: 'w-auto',
			gridType: 'day' as const,
		})),
		className: 'flex-1',
		showDayNumber: true,
	}))

export const MonthView: React.FC = () => <ViewRenderer view={monthView} />

export const monthView: PluginView = {
	name: 'month',
	label: 'month',
	navigationUnit: 'month',
	layout: 'horizontal',
	// Phase 4 flips this when the built-ins compose the resource axis.
	supportsResources: false,
	range: (date, config) => getMonthGridRange(date, config.firstDayOfWeek),
	columns: monthRows,
	renderHeader: () => <MonthHeader className="h-12" />,
	component: MonthView,
}
```

- [ ] **Step 5: Create `views/year.tsx` (the escape hatch made explicit)**

```tsx
import type { PluginView } from '@ilamy/types'
import { YearView } from '../year-view/year-view'

// The 12-mini-calendar layout fits neither shared engine, so the year view is
// the canonical `component` escape hatch: no `columns`/`layout`, full custom
// rendering — but range/navigation/label resolve through the one contract.
export const yearView: PluginView = {
	name: 'year',
	label: 'year',
	navigationUnit: 'year',
	// Stays false in Phase 4 too: the switcher keeps hiding year on resource
	// calendars (generalizes today's hardcoded year-view suppression).
	supportsResources: false,
	range: (date) => ({ start: date.startOf('year'), end: date.endOf('year') }),
	component: YearView,
}
```

(`year-view/year-view.tsx` and its 600-line test suite stay where they are — only the spec
is new. Phase 4's placement sweep moves files; this phase doesn't have to.)

- [ ] **Step 6: Register, move month files, finish dissolving the record**

```bash
git mv packages/calendar/src/features/calendar/components/month-view/month-header.tsx \
	packages/calendar/src/features/calendar/components/views/month-header.tsx
git mv packages/calendar/src/features/calendar/components/month-view/month-view.test.tsx \
	packages/calendar/src/features/calendar/components/views/month.test.tsx
git rm packages/calendar/src/features/calendar/components/month-view/month-view.tsx
```

`views/index.ts` final form:

```ts
import type { PluginView } from '@ilamy/types'
import { dayView } from './day'
import { monthView } from './month'
import { weekView } from './week'
import { yearView } from './year'

export { DayView, dayView } from './day'
export { MonthView, monthView } from './month'
export { ViewRenderer } from './view-renderer'
export { WeekView, weekView } from './week'
export { yearView } from './year'

/** The core's own views, resolved exactly like plugin views (prepended first). */
export const builtInViews: PluginView[] = [dayView, weekView, monthView, yearView]
```

In `ilamy-calendar.tsx`: `legacyBuiltIns` now holds only `year` — leave it; Task 7 deletes
the record entirely once the engine resolves year through `builtInViews` too. Update the
`MonthView` import to `@/features/calendar/components/views`; fix `month.test.tsx`'s import
to `./month`.

- [ ] **Step 7: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`. Month suite unmodified (the 'horizontal' dispatcher arm emits
the identical `HorizontalGrid` invocation); year suite green including the new spanning test.

```bash
git add -A packages/calendar/src
git commit -m "feat(views): port month to horizontal layout; year badges read the range pipeline"
```

---

### Task 7: One resolution path — delete `VIEW_UNITS`, `builtInViews` record, `BUILT_IN_VIEWS` **(re-validate after Phase 2)**

Everything in this task touches the engine/navigation code that Phase 2 sliced — re-resolve
each quoted block to its current home (likely `features/calendar/hooks/use-calendar-navigation.ts`)
before editing. New behavior (`navigationStep`, `range` for plugin views) gets failing-first
tests; the deletions are pinned by the existing 30+ navigation/range tests.

**Files:**
- Modify: `packages/calendar/src/hooks/use-calendar-engine.ts` *(or the Phase 2 navigation slice)*
- Modify: `packages/calendar/src/hooks/use-calendar-engine.test.ts` (append failing-first tests)
- Modify: `packages/calendar/src/features/calendar/components/ilamy-calendar.tsx` (delete the record)
- Modify: `packages/calendar/src/components/header/view-controls.tsx` (delete the special-case)
- Modify: `packages/calendar/src/types/index.ts` (delete `BUILT_IN_VIEWS`/`BuiltInView`)
- Modify: `packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx` (append failing-first switcher tests)
- Append: `docs/migration-v2.md`

- [ ] **Step 1 (RED): failing-first tests in `use-calendar-engine.test.ts`**

Append inside the existing navigation `describe`, reusing the file's `defaultConfig`,
`initialDate` (2025-01-15) and `onDateChange` fixtures:

```ts
it('navigates by navigationStep and reports the custom range for views that declare them', () => {
	const fortyDayPlugin: IlamyPlugin = {
		name: 'forty',
		views: [
			{
				name: 'forty-day',
				component: () => null,
				navigationStep: { amount: 40, unit: 'day' },
				range: (date) => ({
					start: date.startOf('day'),
					end: date.add(39, 'day').endOf('day'),
				}),
			},
		],
	}
	const { result } = renderHook(() =>
		useCalendarEngine({
			...defaultConfig,
			initialDate,
			initialView: 'forty-day',
			plugins: [fortyDayPlugin],
			onDateChange,
		})
	)

	act(() => result.current.nextPeriod()) // Jan 15 + 40 days

	expect(result.current.currentDate.format('YYYY-MM-DD')).toBe('2025-02-24')
	const [, range] = onDateChange.mock.calls[0]
	expect(range.start.format('YYYY-MM-DD')).toBe('2025-02-24')
	expect(range.end.format('YYYY-MM-DD')).toBe('2025-04-04')
})

it('prepends the four built-in view specs in getViews()', () => {
	const { result } = renderHook(() => useCalendarEngine(defaultConfig))

	const names = result.current.getViews().map((v) => v.name)

	expect(names).toEqual(['day', 'week', 'month', 'year'])
})
```

Run: `bun test packages/calendar/src/hooks/use-calendar-engine.test.ts`
Expected: **both new tests FAIL** (`navigatePeriod` hardcodes a single-unit step and falls
back to month range; `getViews()` returns only plugin views). Everything else passes.

- [ ] **Step 2 (GREEN): the engine consumes the contract**

In `use-calendar-engine.ts` *(re-validate after Phase 2 — apply in the navigation slice if
split)*:

Delete the `VIEW_UNITS` record (lines 82–87). Replace `calculateViewRange` (lines 89–108)
with a spec-driven version, importing `builtInViews` from the views barrel and
`getMonthGridRange` from date-utils:

```ts
import { builtInViews } from '@/features/calendar/components/views'
import { getMonthGridRange, getMonthWeeks, getWeekDays } from '@/lib/utils/date-utils'
import type { PluginView } from '@/features/plugins/lib/types'

const calculateViewRange = (
	date: Dayjs,
	viewSpec: PluginView | undefined,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } =>
	// Views without `range` keep today's fallback: the month 6x7 grid range.
	viewSpec?.range?.(date, { firstDayOfWeek }) ??
	getMonthGridRange(date, firstDayOfWeek)
```

Inside the hook, add the single resolution path and rewire every `calculateViewRange`
call site (`getCurrentViewRange`, `updateDateAndNotify`, `handleViewChange`) plus
`navigatePeriod`:

```ts
const getAllViews = useCallback(
	() => [...builtInViews, ...pluginRuntime.getViews()],
	[pluginRuntime]
)
const resolveViewSpec = useCallback(
	(name: CalendarView) => getAllViews().find((v) => v.name === name),
	[getAllViews]
)

const getCurrentViewRange = useCallback(() => {
	return calculateViewRange(currentDate, resolveViewSpec(view), firstDayOfWeek)
}, [currentDate, view, firstDayOfWeek, resolveViewSpec])

const updateDateAndNotify = useCallback(
	(newDate: Dayjs) => {
		setCurrentDate(newDate)
		const range = calculateViewRange(newDate, resolveViewSpec(view), firstDayOfWeek)
		onDateChange?.(newDate, range)
	},
	[onDateChange, view, firstDayOfWeek, resolveViewSpec]
)

const navigatePeriod = useCallback(
	(direction: 1 | -1) => {
		const spec = resolveViewSpec(view)
		// navigationStep wins; else one navigationUnit; else one day (today's default).
		const step = spec?.navigationStep ?? {
			amount: 1,
			unit: spec?.navigationUnit ?? 'day',
		}
		updateDateAndNotify(currentDate.add(direction * step.amount, step.unit))
	},
	[currentDate, view, updateDateAndNotify, resolveViewSpec]
)
```

In `handleViewChange`, swap its `calculateViewRange(currentDate, newView, firstDayOfWeek)`
for `calculateViewRange(currentDate, resolveViewSpec(newView), firstDayOfWeek)`. In the
return object, change `getViews: pluginRuntime.getViews` to `getViews: getAllViews`. Remove
the imports that died with the old code (`ManipulateType` if now unused, `getWeekDays` /
`getMonthWeeks` if the spec ranges were their last engine call sites).

Run the engine suite. Expected: ALL pass — the 30+ existing navigation/range tests pin that
day/week/month/year ranges and steps are bit-identical through the spec path (the specs
reproduce `calculateViewRange`'s old branches exactly: Tasks 4–6 ranges, this fallback).

- [ ] **Step 3: Delete the `legacyBuiltIns` record — `CalendarContent` resolves only specs**

`ilamy-calendar.tsx` final resolution (the engine's `getViews()` now includes built-ins):

```tsx
const CalendarContent: React.FC = () => {
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))

	const spec = getViews().find((v) => v.name === view)
	const activeView = spec ? <ViewRenderer key={view} view={spec} /> : null
	// ... rest unchanged
```

Delete the `MonthView`/`WeekView`/`YearView`/`DayView` component imports — `ViewRenderer`
reaches them through the specs.

- [ ] **Step 4 (RED): failing-first switcher tests**

Append to `ilamy-resource-calendar.test.tsx` (inside the main describe, after the
view-changes test, reusing `mockResources`):

```tsx
it('hides plugin views without supportsResources from the resource switcher, shows capable ones', () => {
	const plugins: IlamyPlugin[] = [
		{
			name: 'incapable',
			views: [{ name: 'agenda', label: 'Agenda', component: () => null }],
		},
		{
			name: 'capable',
			views: [
				{
					name: 'timeline',
					label: 'Timeline',
					component: () => null,
					supportsResources: true,
				},
			],
		},
	]

	render(<IlamyResourceCalendar plugins={plugins} resources={mockResources} />)

	expect(screen.queryByText('Agenda')).toBeNull()
	expect(screen.getByText('Timeline')).toBeDefined()
})
```

Run: expected **FAIL** — today the switcher renders every plugin view on resource calendars
(while the body renders them blank; Task 8 fixes the body half).

- [ ] **Step 5 (GREEN): unify the switcher; delete `BUILT_IN_VIEWS`**

Rewrite the view-buttons section of `view-controls.tsx` (delete `AVAILABLE_VIEWS`, the
`BUILT_IN_VIEWS` import, and both `.map` blocks at lines 67–95):

```tsx
// Phase 4 deletes this allowlist: the resource-calendar feature still forks
// day/week/month, so those built-ins stay visible on resource calendars even
// though their core specs ship supportsResources: false until Phase 4 flips
// them. Year stays hidden — the general rule already encodes the old
// hardcoded year suppression.
const RESOURCE_FORK_VIEWS = new Set(['day', 'week', 'month'])
```

```tsx
{getViews().map((v) => {
	const resourceCapable =
		Boolean(v.supportsResources) || RESOURCE_FORK_VIEWS.has(v.name)
	if (isResourceCalendar && !resourceCapable) {
		return null
	}

	return (
		<Button
			className={getButtonClassName(v.name)}
			key={v.name}
			onClick={() => onChange(v.name)}
			size={size}
			variant={getBtnVariant(v.name)}
		>
			{t(v.label ?? v.name)}
		</Button>
	)
})}
```

Button order is preserved (built-ins prepended, then plugin views, then Today). Labels:
built-ins keep their translated labels (`t('day')` …); plugin labels now also pass through
`t()`, which returns unknown keys verbatim — so existing plugin labels render unchanged,
and plugins may now opt into translation keys for free.

Then delete `BUILT_IN_VIEWS` and `BuiltInView` from `packages/calendar/src/types/index.ts`
(keep `CalendarView`, `TimeFormat`).

Run: `grep -rn "BUILT_IN_VIEWS\|BuiltInView\|VIEW_UNITS" packages apps --include='*.ts*' | grep -v node_modules | grep -v dist`
Expected: no output — and neither name was ever exported from `src/index.ts` (verified:
internal-only, sole consumer was `view-controls.tsx`), so no migration entry for the
deletion itself.

- [ ] **Step 6: Migration entry for the switcher behavior change**

Append to `docs/migration-v2.md` (before `## Summary checklist`):

```markdown
### View switcher: resource calendars hide resource-incapable plugin views

On `IlamyResourceCalendar`, plugin views now appear in the view switcher only if they
declare `supportsResources: true`. Previously every plugin view got a button that rendered
a blank body. Regular calendars list plugin views exactly as before. Plugin view `label`s
are now passed through the translator; unknown keys render verbatim, so plain-text labels
are unaffected.
```

- [ ] **Step 7: Verify everything and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` — including the full `ilamy-calendar.test.tsx` suite (the
fake-view plugin test now resolves through the one path) and the resource header tests.

```bash
git add -A packages/calendar/src docs/migration-v2.md
git commit -m "feat(engine): one view-resolution path; navigationStep; drop VIEW_UNITS/BUILT_IN_VIEWS"
```

---

### Task 8: `ResourceCalendarBody` gains the plugin-view fallback it lacks **(re-validate after Phase 2)**

Pre-existing inconsistency (master plan): the resource switcher could select plugin views,
but `ResourceCalendarBody`'s `viewMap` had no fallback — the body rendered blank. With
Task 7's switcher rule, only `supportsResources` views are reachable from the UI, and they
now actually render.

**Files:**
- Modify: `packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/resource-calendar-body.tsx`
- Modify: `.../ilamy-resource-calendar.test.tsx` (append failing-first test)

- [ ] **Step 1 (RED): failing-first test**

Append to `ilamy-resource-calendar.test.tsx`:

```tsx
it('renders a resource-capable plugin view through the shared resolution path', () => {
	const plugin: IlamyPlugin = {
		name: 'custom',
		views: [
			{
				name: 'custom-view',
				label: 'Custom',
				component: () => <div data-testid="custom-view">custom</div>,
				supportsResources: true,
			},
		],
	}

	render(
		<IlamyResourceCalendar
			initialView="custom-view"
			plugins={[plugin]}
			resources={mockResources}
		/>
	)

	expect(screen.getByTestId('custom-view')).toBeDefined()
})
```

Run: expected **FAIL** — `viewMap['custom-view']` is `undefined`, the body renders nothing.

- [ ] **Step 2 (GREEN): add the fallback**

In `resource-calendar-body.tsx`, mirror `CalendarContent`'s resolution:

```tsx
import { ViewRenderer } from '@/features/calendar/components/views'

export const ResourceCalendarBody: React.FC = () => {
	const { view, getViews } = useSmartCalendarContext((c) => ({
		view: c.view,
		getViews: c.getViews,
	}))

	// Phase 4 deletes this fork map: until the resource axis is composed by the
	// core specs, the resource-calendar feature's own day/week/month win here.
	const resourceForkViews: Record<string, React.ReactNode> = {
		month: <ResourceMonthView key="month" />,
		week: <ResourceWeekView key="week" />,
		day: <ResourceDayView key="day" />,
	}
	const spec = getViews().find((v) => v.name === view)
	const activeView =
		resourceForkViews[view] ??
		(spec ? <ViewRenderer key={view} view={spec} /> : null)
```

…and render `{activeView}` where `{viewMap[view]}` was. **(re-validate after Phase 2:**
the resource provider must expose `getViews` through the unified context — it does once the
providers share slices; if the field is missing, the Phase 2 slice wiring is incomplete and
this is a STOP-and-report.) Note `year` on a resource calendar now resolves to the year
spec's escape hatch instead of a blank body if forced via `initialView="year"` — the
switcher still hides it; graceful render beats a blank screen. State this in the PR.

- [ ] **Step 3: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`; the new test green.

```bash
git add -A packages/calendar/src
git commit -m "fix(resource-calendar): resolve plugin views in ResourceCalendarBody via shared path"
```

---

### Task 9: `docs/custom-views.md` (MANDATORY before merge) + TSDoc + docs sweep

The owner found the `layout` / `orientation` / `supportsResources` triad confusing, so
users will too. **Audience separation is the core principle: calendar users only ever read
about `orientation`; `layout` and `supportsResources` appear only in this author guide.**

**Files:**
- Create: `docs/custom-views.md`
- Modify: `packages/calendar/src/features/resource-calendar/types/index.ts` (orientation TSDoc)
- Modify: `AGENTS.md` (Key Paths), `docs/hooks-and-context.md`, `docs/types-and-interfaces.md` (path refs)

- [ ] **Step 1: Write `docs/custom-views.md`**

Required content, in this order (the contract TSDoc from Task 3 is the API reference; this
doc is the narrative):

````markdown
# Custom Views — Author Guide

A view is one `PluginView` entry. The four built-ins (day, week, month, year) are
themselves `PluginView` entries resolved exactly like yours — there is no second registry.

## The three knobs, and who owns them

| Field | Audience | One-line meaning |
|---|---|---|
| `layout` | view **author** | The view's shape: which engine renders it when the calendar has **no** resources. |
| `orientation` | calendar **user** | Where the resources go on a resource calendar. Ignored without `resources`. |
| `supportsResources` | view **author** | Whether your `columns()` composes the resource axis when `config.resources` is set. |

> layout = the view's shape, author's choice; orientation = where your resources go,
> user's choice; supportsResources = whether the author built the resource arrangements.

## The two engines

```
layout: 'vertical'                      layout: 'horizontal'
(time flows down; columns across)       (date cells flow across; rows stack)

        Mon    Tue    Wed                       S  M  T  W  T  F  S
  9:00 |      |      |      |           week 1 [ ][ ][ ][ ][ ][ ][ ]
 10:00 |      |      |      |           week 2 [ ][ ][ ][ ][ ][ ][ ]
 11:00 |      |      |      |           week 3 [ ][ ][ ][ ][ ][ ][ ]
```

Day and week are 'vertical'; month is 'horizontal'; year declares neither and renders its
own `component` (the escape hatch).

## The engine rule (what the renderer actually does)

```
engine = resources && view.supportsResources ? calendar.orientation : view.layout
```

With resources present and a resource-capable view, the **user's** `orientation` decides
the arrangement; otherwise your `layout` does:

```
orientation: 'vertical'                 orientation: 'horizontal'
(resources as columns)                  (resources as rows)

        Room A   Room B                          Mon   Tue   Wed
  9:00 |        |        |              Room A  [    ][    ][    ]
 10:00 |        |        |              Room B  [    ][    ][    ]
```

## What breaks without each field

| You omit… | What happens |
|---|---|
| `range` | The event pipeline and `onDateChange` fall back to the month 6x7 grid range — wrong events fetched for your window. |
| `navigationStep` / `navigationUnit` | Prev/next steps a single day. |
| `columns` + `layout` | Your `component` renders everything itself (escape hatch — fine, that's the year view). |
| `renderHeader` | No header row above the grid. |
| `supportsResources` | Your view is hidden from the switcher on resource calendars. |

## Worked example: a 40-day grid

One entry. `range` defines the window, `columns` its rows, `navigationStep` makes
prev/next jump a full window (the event pipeline is range-driven, so events follow free):

```tsx
import type {
	Dayjs,
	HorizontalRowSpec,
	IlamyPlugin,
	PluginView,
	ViewConfig,
} from '@ilamy/calendar'

const WINDOW = 40
const DAYS_PER_ROW = 10

const fortyDayRows = (date: Dayjs, _config: ViewConfig): HorizontalRowSpec[] => {
	const start = date.startOf('day')
	const days = Array.from({ length: WINDOW }, (_, i) => start.add(i, 'day'))
	const rows: HorizontalRowSpec[] = []
	for (let row = 0; row * DAYS_PER_ROW < days.length; row += 1) {
		const rowDays = days.slice(row * DAYS_PER_ROW, (row + 1) * DAYS_PER_ROW)
		rows.push({
			id: `forty-row-${row}`,
			className: 'flex-1',
			showDayNumber: true,
			columns: rowDays.map((day) => ({
				id: `forty-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			})),
		})
	}
	return rows
}

export const fortyDayView: PluginView = {
	name: 'forty-day',
	label: '40 days',
	layout: 'horizontal',
	navigationStep: { amount: WINDOW, unit: 'day' },
	range: (date) => ({
		start: date.startOf('day'),
		end: date.add(WINDOW - 1, 'day').endOf('day'),
	}),
	columns: fortyDayRows,
	renderHeader: ({ date }) => (
		<div className="flex h-12 items-center justify-center font-semibold">
			{date.format('LL')} — {date.add(WINDOW - 1, 'day').format('LL')}
		</div>
	),
	// Never rendered while columns+layout are present; required by the contract.
	component: () => null,
}

export const fortyDayPlugin: IlamyPlugin = {
	name: 'forty-day',
	views: [fortyDayView],
}
```

### …and with resources

Declare `supportsResources: true` and compose the resource axis in `columns()` from
`config.resources`. Honor the engine rule: when `config.orientation` is 'horizontal',
return one `HorizontalRowSpec` per resource (set `resource` on the row); when 'vertical',
return one `VerticalColumnSpec` per resource (set `resourceId`/`resource` on the column).
The resource axis multiplies whatever day cells your window declares — the event pipeline
already filters per resource.

```tsx
const fortyDayResourceRows = (
	date: Dayjs,
	config: ViewConfig
): HorizontalRowSpec[] => {
	const start = date.startOf('day')
	const days = Array.from({ length: WINDOW }, (_, i) => start.add(i, 'day'))
	return (config.resources ?? []).map((resource) => ({
		id: `forty-${resource.id}`,
		className: 'flex-1',
		resource,
		columns: days.map((day) => ({
			id: `forty-${resource.id}-${day.toISOString()}`,
			day,
			gridType: 'day' as const,
		})),
	}))
}
```

A view that declares `supportsResources: true` must handle BOTH orientations — that is the
promise the flag makes to the switcher.
````

(The built-ins demonstrate every non-resource field in
`packages/calendar/src/features/calendar/components/views/` — point readers there.)

- [ ] **Step 2: TSDoc the user-facing `orientation` prop**

In `packages/calendar/src/features/resource-calendar/types/index.ts`, the
`IlamyResourceCalendarProps.orientation` doc becomes:

```ts
	/**
	 * Where the resource axis goes (only applies when `resources` is set):
	 * - "horizontal": resources are rows, dates flow across (default)
	 * - "vertical": resources are columns, time flows down
	 * Distinct from a view's `layout`, which is the engine used when the
	 * calendar has no resources. See docs/custom-views.md.
	 */
	orientation?: 'horizontal' | 'vertical'
```

(The dev-mode "orientation without resources" `console.warn` ships in Phase 4 with the
unified `IlamyCalendar` props — today the prop only exists on the resource calendar, where
resources are always present.)

- [ ] **Step 3: Docs/agent-instruction sweep**

- `AGENTS.md` Key Paths: replace the `day-view/ week-view/ month-view/ year-view/` line
  with `views/  # built-in PluginView specs + ViewRenderer dispatcher (year component in year-view/)`.
- `grep -rn "VIEW_UNITS\|builtInViews\|BUILT_IN_VIEWS\|day-view\|week-view\|month-view" docs/*.md` —
  update stale references in `docs/hooks-and-context.md` and `docs/types-and-interfaces.md`
  (describe the extended `PluginView` contract and the one resolution path); link
  `docs/custom-views.md` from both.

- [ ] **Step 4: Verify and commit**

Run: `bun run check:fix && bun run type-check`
Expected: exits 0.

```bash
git add docs AGENTS.md packages/calendar/src
git commit -m "docs: custom-views author guide; orientation/layout TSDoc; path sweep"
```

---

### Task 10: Final gate, dev log, PR

**Files:**
- Create/append: `docs/logs/<today YYYY-MM-DD>.md`

- [ ] **Step 1: Full CI gate**

Run: `bun run ci`
Expected: exits 0 (biome check → build → type-check → tests). The build-before-type-check
ordering matters: this phase changed `@ilamy/types`, and recurrence/demo resolve
`@ilamy/calendar` through built `dist/*.d.ts`.

- [ ] **Step 2: Exit-criteria self-check (from the master plan)**

```bash
# One resolution path: no view special-cases left anywhere
grep -rn "VIEW_UNITS\|BUILT_IN_VIEWS\|legacyBuiltIns" packages/calendar/src; # expect: nothing
# All gutter and delay-constant copies gone (Task 2 invariants still hold)
grep -rln "sticky left-0 bg-background z-20 border-r-0" packages/calendar/src --include='*.tsx'; # expect: gutter.tsx only
# Vocabulary discipline: the agreed words only
grep -rni "time-grid\|row-packing\|lane" packages/calendar/src packages/types/src docs/custom-views.md; # expect: nothing
```

- [ ] **Step 3: Dev log (mandatory per CLAUDE.md)**

Append to today's `docs/logs/YYYY-MM-DD.md` (create if absent; delete the oldest file if the
directory exceeds 10): under `## Changes` —
`**[v2 phase 3]**: generalized PluginView (navigationStep/range/columns/layout/renderHeader/supportsResources, all optional); built-ins are PluginView specs resolved through one path; ViewRenderer three-way dispatcher; gutter factory + HEADER_STAGGER_DELAY dedup; year badges read the range pipeline; navigatePeriod consumes navigationStep; ResourceCalendarBody plugin fallback; docs/custom-views.md. Built-ins ship supportsResources: false (flip in Phase 4).`
List files under `## Files Modified`; note under `## Notes` the transitional
`RESOURCE_FORK_VIEWS` allowlist and the fork view-map (both deleted in Phase 4).

- [ ] **Step 4: Ask the user to review; on explicit approval, push and open the PR**

Suggested title: `feat(v2): phase 3 — generalized PluginView contract, one view-resolution path`
Body links `docs/v2-overhaul-plan.md` (Phase 3), `docs/custom-views.md`, and the migration
entries; flags the three deliberate behavior changes (year badges count by range overlap;
resource switcher hides resource-incapable plugin views; resource body renders plugin
views). NEVER push or post without explicit approval in the user's latest message; chain
the `touch .claude/state/pr-post-approved.flag` ritual with the `gh pr create` command.

---

## Self-review notes

- **Spec coverage:** all six master-plan Phase 3 bullets map to tasks — gutter/delay
  extraction (Task 2, first, per the binding order), contract + dispatcher + day (Tasks
  3–4), week via `renderHeader` (Task 5), month-horizontal + year pipeline (Task 6),
  deletions + `navigationStep` + resource-body fallback (Tasks 7–8), the mandatory
  documentation deliverable (Task 9). The locked contract is reproduced field-for-field;
  nothing was added to it beyond the spec/context types it references (`ViewConfig`,
  `ColumnSpec` shapes, `ViewHeaderContext`), which the master plan names as inputs.
- **TDD:** failing-first tests exist for every behavior change — year badge pipeline
  (Task 6 Step 1), `navigationStep` + `range` + prepended `getViews()` (Task 7 Step 1),
  switcher hiding (Task 7 Step 4), resource-body fallback (Task 8 Step 1). The four ports
  are behavior-preserving and pinned by their existing suites, moved via `git mv` with
  import-path-only edits — zero new test files, per repo rules.
- **Sequencing risks:** this plan quotes `main@abe1c73` code but runs after Phases 1–2;
  Task 1's re-validation gate and the **(re-validate after Phase 2)** markers on Tasks 4,
  7, 8 are the defense. The known fragile assumptions: engine logic location (Phase 2
  slices), `resources`/`orientation` being honestly-optional on the unified context, and
  the `h-12` → `min-h-12` header-container change (Task 4 Step 1 — the one shared-component
  edit; flagged for per-test review).
- **Two deliberate contract tensions, surfaced rather than hidden:** (1) `component`
  remains required even for views that render via `columns`+`layout` (the locked contract
  keeps it; built-ins point it at their thin wrapper, the 40-day example documents
  `() => null`); (2) the switcher's `RESOURCE_FORK_VIEWS` allowlist is transitional
  scaffolding that exists only because built-ins ship `supportsResources: false` until
  Phase 4 — both carry `Phase 4 deletes` comments at the code site.
- **Build discipline:** Tasks 3 and 10 build before checks (`@ilamy/types` is bundled);
  all other tasks are calendar-internal and gate on type-check + full suite. Commits are
  conventional, ≤100 chars, one per task.
