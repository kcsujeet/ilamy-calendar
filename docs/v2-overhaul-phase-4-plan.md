# v2 Overhaul — Phase 4: Resources in the Core Calendar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the resource calendar a configuration of the one calendar (master plan
`docs/v2-overhaul-plan.md`, Phase 4): the config slice gains `resources` /
`renderResource` / `orientation` / `weekViewGranularity`, the view dispatcher gains the
resource axis behind the existing resource test suites, per-resource business hours flow
through the config slice, and the entire `features/resource-calendar/` fork (~1,320
non-test lines + 8 test files at baseline) is absorbed or deleted piecemeal. Ends with the
Bulletproof placement sweep and the v2 public-surface decision (`IlamyCalendar` absorbs the
four resource props; `IlamyResourceCalendar` becomes a deprecated alias **or** is removed —
both variants planned below, owner picks at execution).

## Baseline & re-validation (READ BEFORE EXECUTING ANYTHING)

- **Baseline: `main@abe1c73` (merge of PR #190).** Every file quote and `path:line`
  citation in this plan is **as-of-baseline**. Treat all line numbers as approximate
  pointers, never as edit targets.
- **This phase executes LAST**, after Phase 1 (unified geometry: composed
  `PositionedEvent { event, ...placement }` in `lib/layout/`), Phase 2 (one provider built
  from engine slices `use-calendar-{config,data,navigation,interaction}`;
  `use-smart-calendar-context` moved to `features/calendar/hooks/` and de-cast), and
  Phase 3 (built-in views as `PluginView` entries + a three-way dispatcher; `VIEW_UNITS`,
  `builtInViews`, and the `BUILT_IN_VIEWS` switcher special-case deleted). **Task 1 is
  therefore a substantial RE-VALIDATION pass, not a formality**: re-read every file this
  plan quotes, update every path (Phase 2 moved hooks; Phase 3 moved views; this phase's
  own Task 7 moves more), and re-verify every quoted snippet still exists in the shape
  shown. Steps marked **(re-validate)** act on post-Phase-3 state and quote *today's*
  (baseline) code as the semantic reference only.
- **Phase 3 dependency rule:** any step that touches the view dispatcher must reference
  the published `PluginView` **contract** — `{ name, label?, navigationUnit?,
  navigationStep?, range?, columns?, layout?, renderHeader?, supportsResources?,
  component }` — never assumed file contents. If Phase 3 shipped a different file layout
  for the dispatcher, adapt mechanically; the contract fields are the stable interface.
- **Vocabulary is binding** (master plan, resource-axis section): "resource axis",
  `supportsResources`, `'vertical'` / `'horizontal'`. The word "lane" must not appear in
  any code, type, test, or doc this phase writes.

**Repo rules binding every task:** bun only (never npm/pnpm/node); TDD failing-first for
every behavior change; **never create a new test file** — the resource suites already
exist and extending `ilamy-resource-calendar.test.tsx` /
`ilamy-calendar.test.tsx` is the pattern; conventional commits ≤ 100 chars; type-check +
test after every task; `bun run build` before any cross-package check (recurrence/demo
resolve `@ilamy/calendar` through built `dist/*.d.ts`); `bun run ci` + dev log at the end.

**Architecture:** Strangler in four moves. (1) The unified provider/slices gain the
resource axis and the dispatcher learns the engine rule, *initially re-using the existing
resource arrangement components* (cross-feature import, tolerated only inside this phase);
the eight resource suites are re-pointed one at a time with assertions byte-identical.
(2) Business-hour union + shading verified on the unified path. (3) The fork is deleted
piecemeal — day → week → month → context — each deletion gated on its suite passing
against the unified path. (4) Placement sweep (`git mv`), docs sweep, v2 surface.

**Verification commands used throughout** (expected outputs given per step):

```bash
bun run type-check     # expect: exits 0, no errors
bun run test           # expect: "0 fail" in every package section
bun run build          # expect: exits 0 (required before recurrence/demo type-checks)
bun run check:fix      # biome lint+format; expect: no errors (warnings pre-exist)
bun run ci             # full gate: check → build → type-check → test
```

---

## The semantics contract (all verified at baseline; every task must keep these true)

These are the master plan's BINDING verified semantics, with baseline evidence. The
unified path must encode each one explicitly; the suites pin most of them, and Task 3
adds pins for the two that are only smoke-tested today.

1. **Membership filtering = `resourceIds` with `resourceId` fallback.** The canonical
   function, `resource-calendar-context/provider.tsx:18-26`:

   ```ts
   const getEventResourceIds = (event: CalendarEvent): (string | number)[] => {
   	if (event.resourceIds) {
   		return event.resourceIds
   	}
   	if (event.resourceId !== undefined) {
   		return [event.resourceId]
   	}
   	return []
   }
   ```

   Note the precedence: when `resourceIds` is present, `resourceId` is **ignored** unless
   listed. This is the exact "membership over `resourceIds ∪ {resourceId}`" rule — a
   cross-resource event renders **once per matching resource** (no spanning rendering
   exists). Preserve byte-for-byte; do not "improve" it into a true union.
2. **Unassigned events hide only when resources exist.** Resources absent → no filter
   (`useProcessedDayEvents.ts:32-36` only filters when `resourceId` is set; the regular
   calendar passes none). Resources present → every cell/column filters per-resource, so
   an event with no resource fields matches nothing and renders nowhere. Only
   smoke-tested today (`ilamy-resource-calendar.test.tsx:376-394` asserts "renders
   without errors") — Task 3 Step 1 adds the explicit pin.
3. **Visible hours = global ∪ all resources' `businessHours`.** Every resource view
   passes `resourceBusinessHours: resources.map(r => r.businessHours).filter(Boolean)`
   into `getViewHours` (`resource-day-vertical.tsx:25-27`,
   `use-resource-week-view-data.ts:31-34`); `getViewHours` merges via
   `calculateBusinessHoursRange` (`features/calendar/utils/view-hours.ts:43-48`). Pinned
   by `business-hours.test.tsx:133-178` (union shows 9–18 when A=9–17 and B=9–18, AND
   per-cell precedence: row A's 17:00 cell `data-disabled="true"`, row B's `"false"`).
4. **Per-cell shading stays `useEffectiveBusinessHours`**
   (`hooks/use-effective-business-hours.ts:18-26`): resource-specific hours when the
   resource has them, else the global hours. It resolves through `getResourceById` from
   context — the unified provider must always supply that function.
5. **Orientation is a dispatch between the two existing grid engines — no transpose.**
   Horizontal = resources as **rows** on `HorizontalGrid` (pixel row stacking;
   `resource-event-grid.tsx:44-49` builds `rows = resources.map(...)`). Vertical =
   resources as **columns** on `VerticalGrid` (percent time geometry;
   `resource-day-vertical.tsx:45-52` builds per-resource columns). Both engines stay.
6. **Hourly week = nested axes with two-level headers.** Vertical: resource header row +
   per-day header row, columns = resource × day cartesian
   (`use-resource-week-vertical-data.ts:33-47`, `resource-week-vertical.tsx:73-79`).
   Horizontal: day header row + time header row (`resource-week-horizontal.tsx:29-38`).
7. **`weekViewGranularity: 'hourly' | 'daily'` with the hiddenDays caveat.** Daily mode
   intentionally uses all 7 `weekDays`, not `visibleDays`
   (`use-resource-week-vertical-data.ts:49-51`): *"Non-contiguous visible days would
   break multi-day event positioning, so `hiddenDays` is not supported in daily
   granularity."* This comment must survive the move. The public TSDoc on `hiddenDays`
   (`features/calendar/types/index.ts:320-338`) documents the same caveat — keep it.
8. **Year is suppressed when resources are present.** Today: the `resources.length`
   sniff in `view-controls.tsx:37` + the hardcoded skip at `:67-70`. This phase replaces
   both with the general `supportsResources` check (Task 3 Step 4).
9. **`getEventsForResource` stays public API** through `useIlamyCalendarContext()`
   (`use-smart-calendar-context.ts:46-48,122`) and moves into the unified provider
   verbatim.
10. **Click-to-create keeps injecting the cell's resource.** Baseline:
    `resource-calendar-context/provider.tsx:184-186` sets
    `newEvent.resourceId = info.resource.id`; the public suite pins
    `callArgs.resource?.id` and `callArgs.allDay === false` for `onCellClick`
    (`ilamy-resource-calendar.test.tsx:462-475,491-504`). **Phase 2 already owns the
    `handleDateClick` unification and the `allDay` decision** (master plan Phase 2,
    bullets 1 & 3) — this phase only re-validates the outcome (Task 1 Step 4); do NOT
    re-plan that fix here.
11. **DnD drops set `resourceId` and never rewrite `resourceIds`.**
    `drag-and-drop/dnd-utils.ts:51-56`:

    ```ts
    const updates = {
    	start: newStart,
    	end: newEnd,
    	resourceId,
    	allDay: isTimeCell ? false : (allDay ?? activeEvent.allDay),
    }
    ```

    Preserve exactly — changing this to touch `resourceIds` would be a conscious
    behavior change outside this phase's scope.
12. **Testids are spec.** They come from the shared `lib/utils/keys.ts` factory (already
    fully resource-aware: `col.day(day, resourceId)` `:25-28`, `col.resource` `:29-30`,
    `cell.vertical(..., resourceId)` `:44-52`, `container.horizontal.row` `:61`,
    `allDayRow(resourceId)` `:93`, `droppable.dayCell({resourceId})` `:110-116`,
    `header.resource.*` `:71-74`) plus a handful of literals in the resource views
    (`data-testid="resource-day"`, `"resource-week"`, `"resource-month-vertical-grid"`,
    `"resource-month-header"`). **Zero edits to `keys.ts` are allowed in this phase**,
    and the unified path must reproduce every id exactly — *including resource rows as
    DOM ancestors of their cells* (the suites assert with
    `within(screen.getByTestId('horizontal-row-A')).getByTestId('day-cell-…')`,
    e.g. `business-hours.test.tsx:170-177`,
    `ilamy-resource-calendar.test.tsx:465-466,493-494`).
13. **Engine rule** (master plan, view contract):
    `engine = resources && view.supportsResources ? config.orientation : view.layout`.
    `layout` is the view author's intrinsic declaration; `orientation` is the user's
    resource-arrangement preference. Dev-mode `console.warn` when `orientation` is passed
    without `resources` (Task 6 Step 1).

---

### Task 1: Branch setup + re-validation pass

**Files:** none modified (read-only pass)

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/v2-phase4-resource-axis
```

- [ ] **Step 2: Confirm a green baseline**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` for both packages. If red, STOP and report.

- [ ] **Step 3: Re-locate every module this plan touches (Phases 1–3 moved things)**

Build a path map (old baseline path → current path) for at least:

| Baseline path (quoted in this plan) | Expected post-Phase-1–3 home (verify!) |
|---|---|
| `hooks/use-calendar-engine.ts` | split into `features/calendar/hooks/use-calendar-{config,data,navigation,interaction}.ts` (Phase 2) |
| `hooks/use-smart-calendar-context.ts` | `features/calendar/hooks/use-smart-calendar-context.ts`, selector-only, no cast (Phase 2) |
| `features/calendar/contexts/calendar-context/provider.tsx` | same path, slimmed to slice composition (Phase 2; path pinned by `src/testing/index.tsx` until Task 7) |
| `features/calendar/components/{day,week,month,year}-view/` | `features/calendar/components/views/{day,week,month,year}.tsx` as `PluginView` entries + dispatcher (Phase 3) |
| `lib/utils/position-{day,week}-events.ts` | `lib/layout/{vertical,horizontal}.ts`, composed `PositionedEvent` (Phase 1) |
| `lib/utils/event-utils.ts` (`filterEventsByResource`) | possibly already `lib/events/pipeline.ts` (master plan target) — if not, Task 2 Step 3 moves it |
| `features/calendar/hooks/useProcessed{Day,Week}Events.ts` | re-validate name/home after Phases 1–2 |

Run a sweep to confirm:

```bash
grep -rn "supportsResources" packages/calendar/src packages/types/src --include='*.ts*' | grep -v test
grep -rn "filterEventsByResource\|getEventResourceIds" packages/calendar/src --include='*.ts*' | grep -v test
```

Expected: `supportsResources` exists on the `PluginView` type (Phase 3 shipped it). If it
does NOT exist, Phase 3 deferred it — add the optional field to the `PluginView`
interface (in `@ilamy/types`, backward compatible) as the first step of Task 3 instead.

- [ ] **Step 4: Re-validate what Phase 2 already fixed (avoid double-planning)**

Master plan Phase 2 owns: (a) the `handleDateClick` unification including the cell's
`resource` reaching `openEventForm` (baseline gap: `use-calendar-engine.ts:301-312`
carries only `eventData?.resourceId` and drops `CellInfo.resource`); (b) the deliberate
`allDay` decision (resource copy hardcodes `allDay: false`,
`resource-calendar-context/provider.tsx:181`, while the engine respects the cell's flag);
(c) `IlamyCalendarApi.getEventsForResource` required-but-runtime-undefined on regular
calendars (stub or optional + `?.` at `grid-cell.tsx:84`). Verify each shipped; record
the chosen `allDay` semantics — the public suite pins `callArgs.allDay === false` for
hour cells (`ilamy-resource-calendar.test.tsx:474,503`), so whatever Phase 2 decided must
already be reconciled with those assertions. If any of (a)–(c) did NOT ship, escalate to
the owner before proceeding — they are prerequisites, not Phase 4 work.

- [ ] **Step 5: Re-validate the test-suite inventory**

The master plan says "six of the seven suites import internals". Baseline verification
**corrects the count: there are EIGHT resource test files; SEVEN import internals**, one
(`ilamy-resource-calendar.test.tsx`) renders the public component. Confirm the eight
files and their import lines still match the table in Task 3 Step 2; note any drift
(Phase 2 may have already re-pointed provider imports).

- [ ] **Step 6: Record findings**

Append a short "Phase 4 re-validation" note to today's dev log: the path map, the
Phase 2 outcomes from Step 4, and any contract drift. No code changes in this task; no
commit needed (or commit the dev log alone:
`docs(logs): phase 4 re-validation findings`).

---

### Task 2: The resource axis enters the engine slices

The config slice gains the four resource props; the data slice gains the resource
utilities verbatim; the unified context type makes resource fields honestly present
(functions always defined; `resources` optional). After this task the ONE provider can
serve every resource suite — Task 3 does the re-pointing.

**Files (re-validate exact paths via Task 1 Step 3):**
- Modify: `features/calendar/hooks/use-calendar-config.ts` (config slice)
- Modify: `features/calendar/hooks/use-calendar-data.ts` (data slice)
- Modify: `features/calendar/contexts/calendar-context/provider.tsx` (accept + thread the four props)
- Modify: the unified context type (Phase 2's merged `CalendarContextType`)
- Create/modify: `lib/events/pipeline.ts` (absorbs `filterEventsByResource` + `getEventResourceIds`)
- Modify: `features/calendar/contexts/calendar-context/provider.test.tsx` (failing-first pin)

- [ ] **Step 1 (TDD, failing first): pin the unified provider's resource axis**

Extend the EXISTING `provider.test.tsx` (never a new file) with a test that the unified
provider exposes the axis. Adapt the file's existing render/consumer helpers; the spirit:

```tsx
test('provider exposes the resource axis when resources are passed', () => {
	const resources: Resource[] = [{ id: 'r1', title: 'Room 1' }]
	const events: CalendarEvent[] = [
		mkEvent('e1', { resourceId: 'r1' }),
		mkEvent('e2', { resourceIds: ['r1', 'r2'] }),
		mkEvent('e3', {}), // unassigned
	]
	const ctx = renderProviderHook({ resources, events, orientation: 'vertical' })
	expect(ctx.resources).toEqual(resources)
	expect(ctx.orientation).toBe('vertical')
	expect(ctx.weekViewGranularity).toBe('hourly') // default
	expect(ctx.getEventsForResource('r1').map((e) => e.id)).toEqual(['e1', 'e2'])
	expect(ctx.getResourceById('r1')?.title).toBe('Room 1')
	expect(ctx.isEventCrossResource(ctx.getEventsForResource('r1')[1])).toBe(true)
})
```

Run: `bun test packages/calendar/src/features/calendar/contexts` — expected: the new test
FAILS (fields undefined on the unified provider). Commit nothing yet.

- [ ] **Step 2: Config slice gains the four props (defaults preserved)**

Add to the config slice's props/value (defaults from
`resource-calendar-context/provider.tsx:81,87` and the wrapper):

```ts
/** The resource axis. Absent/empty → a regular calendar (no filtering, no resource columns). */
resources?: Resource[]
/** Custom render for resource header cells. */
renderResource?: (resource: Resource) => React.ReactNode
/** Resource arrangement preference. Only applies when `resources` is set. @default 'horizontal' */
orientation?: 'horizontal' | 'vertical'
/** Week-view granularity for resource weeks. @default 'hourly' */
weekViewGranularity?: 'hourly' | 'daily'
```

Defaults: `orientation = 'horizontal'`, `weekViewGranularity = 'hourly'`. Do NOT default
`resources` to `[]` blindly — `view-controls.tsx:37` treats "resource calendar" as
`resources && resources.length > 0` and `useIlamyCalendarContext` already does
`context.resources || []` (`use-smart-calendar-context.ts:110`); keep "present" =
non-empty so an empty array keeps behaving like today
(`ilamy-resource-calendar.test.tsx:369-374` pins `resources={[]}` renders fine).

- [ ] **Step 3: Membership filtering moves into `lib/events/pipeline.ts`**

**(re-validate)** If Phases 1–3 already created `lib/events/pipeline.ts`, add to it;
otherwise create it now per the master plan's pipeline contract. Move — verbatim — the
module-level `getEventResourceIds` from `resource-calendar-context/provider.tsx:18-26`
(quoted in the semantics contract above) and `git mv` the existing
`filterEventsByResource` + `eventOverlapsRange` consumers' source
(`lib/utils/event-utils.ts:9-15`) into the pipeline module, leaving a re-export shim at
the old path until Task 7 deletes it. Export both; the pipeline's resource stage is:

```ts
/** Resource-axis filter stage: keep events whose membership set contains resourceId. */
export function filterEventsForResource(
	events: CalendarEvent[],
	resourceId: string | number
): CalendarEvent[] {
	return events.filter((event) => getEventResourceIds(event).includes(resourceId))
}
```

(This is the provider's `getEventsForResource` body, `provider.tsx:113-119`, lifted to a
pure function so both the context method and any view-level filtering share one
implementation. The existing two-step dance — `filterEventsByResource(dayEvents,
getEventsForResource(resourceId))` in `useProcessedDayEvents.ts:33-36`,
`useProcessedWeekEvents.ts:53-56`, and `grid-cell.tsx:82-84` — intersects by event id;
calling `filterEventsForResource(rangeEvents, resourceId)` on the range-filtered list is
equivalent and one pass. Keep the old helpers exported until those three consumers are
swapped, then delete in Task 7.)

- [ ] **Step 4: Data slice gains the context methods verbatim**

Move from `resource-calendar-context/provider.tsx:113-142` into the data slice, bodies
unchanged except delegating membership to the pipeline:

```ts
const getEventsForResource = useCallback(
	(resourceId: string | number): CalendarEvent[] =>
		filterEventsForResource(events, resourceId),
	[events]
)

const getEventsForResources = useCallback(
	(resourceIds: (string | number)[]): CalendarEvent[] =>
		events.filter((e) =>
			getEventResourceIds(e).some((id) => resourceIds.includes(id))
		),
	[events]
)

const getResourceById = useCallback(
	(resourceId: string | number | undefined): Resource | undefined => {
		if (resourceId === undefined) {
			return undefined
		}
		return resources.find((resource) => resource.id === resourceId)
	},
	[resources]
)

const isEventCrossResource = useCallback((event: CalendarEvent): boolean => {
	return Boolean(event.resourceIds && event.resourceIds.length > 1)
}, [])
```

Thread all of them (plus `getEventResourceIds` itself, which
`ResourceCalendarContextType` exposes — `context.ts:20`) through the unified context
value. These functions are now ALWAYS defined (no more `getEventsForResource(resourceId)
?? []` guards needed; on a resource-less calendar they operate on an empty `resources`
array / unfiltered events, which is exactly the regular-calendar semantics).

- [ ] **Step 5: Shim the old provider**

`ResourceCalendarProvider` (`resource-calendar-context/provider.tsx`) becomes a thin
delegation to the unified provider — its 291 lines reduce to prop pass-through (it
already accepts `CalendarProviderProps` + the four resource props, `provider.tsx:28-42`).
`ResourceCalendarContext`/`context.ts` stays mounted only if `useSmartCalendarContext`
still reads it **(re-validate — Phase 2 may have already collapsed the dual-context read
at `use-smart-calendar-context.ts:78-83`)**; otherwise the shim is just
`export const ResourceCalendarProvider = CalendarProvider` semantics with the narrower
prop type. The shim dies in Task 5 Step 4.

- [ ] **Step 6: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: Step 1's test now passes; `0 fail` everywhere (the resource suites still run
against the old fork, which now delegates).

```bash
git add -A packages/calendar/src
git commit -m "feat(calendar): resource axis enters the engine slices and event pipeline"
```

---

### Task 3: Resource-aware view dispatch behind the existing suites

The dispatcher learns the engine rule; the built-in `day`/`week`/`month` views declare
`supportsResources: true` and compose the resource arrangements; each of the eight suites
is re-pointed to the unified path with **assertions byte-identical**. Only import lines
and the JSX inside the suites' render helpers may change — every `expect(...)` line and
every testid string literal stays exactly as it is.

**Files (re-validate against Phase 3's shipped layout):**
- Modify: `features/calendar/components/views/{day,week,month}.tsx` (built-in `PluginView` entries)
- Modify: the Phase 3 view dispatcher (baseline ancestor: `ilamy-calendar.tsx:34-44`)
- Modify: `components/header/view-controls.tsx`
- Modify: `features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx` (new pins, Step 1)
- Modify: all eight suite files' imports (Step 6)

- [ ] **Step 1 (TDD): add the two missing behavior pins to the PUBLIC suite first**

Extend `ilamy-resource-calendar.test.tsx` (existing file). These pass against the
baseline fork too — they are regression pins, written before any dispatch change so a
unified-path regression cannot slip through:

(a) **Unassigned-event hiding** — upgrade the smoke test at `:376-394` ("should handle
events without resource assignments") from "renders without errors" to an explicit pin.
Keep the existing event setup, add:

```tsx
// Resources are present, the event has no resource fields → it renders nowhere.
expect(screen.queryByText('Floating Event')).not.toBeInTheDocument()
```

(b) **Resource + `initialView="year"`** — there is no pin today. Baseline behavior:
`ResourceCalendarBody`'s `viewMap` (`resource-calendar-body.tsx:14-18`) has no `year`
entry, so the body renders an **empty** `calendar-body`. The unified dispatcher will have
a year view registered. **Behavior decision (flag to owner in the PR):** the planned
semantics are *"a resource-incapable view renders as a regular (resource-less) view when
forced"* — i.e. year renders its normal grid, resource axis simply doesn't apply (the
switcher already hides the button; only programmatic `initialView`/`setView` reaches
this). Pin the CHOSEN semantics:

```tsx
it('renders the regular year grid when initialView="year" is forced with resources', () => {
	render(
		<IlamyResourceCalendar
			events={[]}
			initialDate={dayjs('2025-08-04T00:00:00.000Z')}
			initialView="year"
			resources={mockResources}
		/>
	)
	// year-month-* testids come from keys.header.year (keys.ts:84-89)
	expect(screen.getByTestId('year-month-2025-08')).toBeInTheDocument()
})
```

**(re-validate the exact `year-month-*` key format against `keys.ts` and the Phase 3 year
view before writing.)** This test FAILS on baseline (empty body) — it lands in the same
commit as Step 3's dispatcher change, red-then-green. If the owner prefers preserving the
empty-body behavior, pin that instead (`expect(screen.getByTestId('calendar-body')).toBeEmptyDOMElement()`).

- [ ] **Step 2: Built-in `day`/`week`/`month` entries gain `supportsResources` + the resource arrangements**

**(re-validate — acts on Phase 3's view entries.)** Each entry declares
`supportsResources: true` (year omits it → default false). The entry's `component` (or
`columns()` if Phase 3 shipped column-spec composition) branches on the engine rule and —
*in this task* — renders the existing resource arrangement components by direct import
(cross-feature import from `features/resource-calendar/`, tolerated only until Task 5
moves them in). Sketch for the day entry, against the contract:

```tsx
// features/calendar/components/views/day.tsx  (re-validate Phase 3 shape)
export const dayView: PluginView = {
	name: 'day',
	navigationUnit: 'day',
	layout: 'vertical',
	supportsResources: true,
	component: DayViewComponent,
}

const DayViewComponent: React.FC = () => {
	const { resources, orientation } = useSmartCalendarContext((c) => ({
		resources: c.resources,
		orientation: c.orientation,
	}))
	const hasResources = Boolean(resources?.length)
	if (!hasResources) {
		return <DayGrid /> // Phase 3's regular day body
	}
	// Engine rule: resources present + supportsResources → orientation picks the engine.
	if (orientation === 'vertical') {
		return <ResourceDayVertical />
	}
	return <ResourceDayHorizontal />
}
```

This is exactly what `ResourceDayView`/`ResourceWeekView`/`ResourceMonthView` do today
(`day-view/index.tsx:6-14`, `week-view/index.tsx:6-14`, `month-view/index.tsx:6-14`) —
the dispatch moves up into the unified view entry and those three index files become
dead (deleted in Task 5). Repeat for `week` (vertical → `ResourceWeekVertical`,
horizontal → `ResourceWeekHorizontal`) and `month` (vertical → `ResourceMonthVertical`,
horizontal → `ResourceMonthHorizontal`).

- [ ] **Step 3: The dispatcher serves resource calendars (kill `ResourceCalendarBody`'s reason to exist)**

**(re-validate)** With Step 2, the unified body (Phase 3's descendant of
`CalendarContent`, baseline `ilamy-calendar.tsx:27-64`) already renders the right thing
for `month`/`week`/`day` with resources, and `year` per Step 1(b)'s decision.
`ResourceCalendarBody` (`resource-calendar-body.tsx`) differs from the unified body only
in: the `viewMap` without `year` and plugin fallback (a pre-existing inconsistency
Phase 3 fixed), the root `data-testid="ilamy-resource-calendar"` (`:23`), and
`h-[calc(100%-3.5rem)]` vs `min-h-0 flex-1` on the animated section. Verified at
baseline: **no test asserts the `ilamy-resource-calendar` root testid** (only the
component's own file contains the string), so the unified body's
`data-testid="ilamy-calendar"` is acceptable — note it in the migration entry (Task 6
Step 5) since testids are public-ish harness surface. Point the (still-existing) wrapper
at the unified body, leaving `ResourceCalendarBody` dead for Task 5.

- [ ] **Step 4: `view-controls.tsx` — the `resources.length` sniff becomes the `supportsResources` filter**

Baseline `view-controls.tsx:36-37,67-70`:

```tsx
const isResourceCalendar = resources && resources.length > 0
...
{AVAILABLE_VIEWS.map((type: BuiltInView) => {
	if (isResourceCalendar && type === 'year') {
		return null
	}
```

**(re-validate — Phase 3 already deleted the `BUILT_IN_VIEWS` special-case and renders one
merged `getViews()` list.)** Replace the hardcoded year skip with the general rule over
the merged list:

```tsx
const hasResources = Boolean(resources?.length)
const visibleViews = getViews().filter(
	(v) => !hasResources || v.supportsResources
)
```

This generalizes pin #8 of the semantics contract: year (no `supportsResources`) stays
hidden on resource calendars; any future resource-incapable plugin view hides the same
way. Existing tests asserting the year button's absence on resource calendars (search
the public suite) must pass unchanged.

- [ ] **Step 5: Run the FULL suite before any import rewrite**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail`. The fork suites still exercise the old components directly AND the
public suite now exercises the unified dispatch. Commit checkpoint:

```bash
git add -A packages/calendar/src
git commit -m "feat(views): built-in day/week/month compose the resource axis via supportsResources"
```

- [ ] **Step 6: Per-suite import rewrite (one commit per suite, assertions byte-identical)**

The corrected inventory (baseline; **eight** files, **seven** import internals — the
master plan's "six of seven" undercounts by one). Paths relative to
`packages/calendar/src/features/resource-calendar/components/`. "Unified provider" =
Phase 2's `CalendarProvider` (re-validate import path); "unified view" = Phase 3's
built-in view component for that name (re-validate export names/paths).

| # | Suite (lines) | Imports today (internal) | Imports after the rewrite |
|---|---|---|---|
| 1 | `business-hours.test.tsx` (180) | `ResourceCalendarProvider` (ctx index), `ResourceDayHorizontal`, `ResourceDayVertical`, `ResourceWeekHorizontal` | unified provider; unified day view (provider gets `orientation="horizontal"` / `"vertical"` per test) and unified week view (`orientation="horizontal"`) |
| 2 | `day-view/resource-day-horizontal.test.tsx` (383) | `ResourceCalendarProvider`, `ResourceDayHorizontal` | unified provider (helper already passes `orientation="horizontal"`), unified day view |
| 3 | `day-view/resource-day-vertical.test.tsx` (358) | `ResourceCalendarProvider`, `ResourceDayVertical` | unified provider (helper already passes `orientation="vertical"`), unified day view |
| 4 | `month-view/resource-month-vertical.test.tsx` (94) | `ResourceCalendarProvider`, `ResourceMonthVertical` | unified provider (`orientation="vertical"` already passed), unified month view |
| 5 | `resource-event-grid.test.tsx` (233) | `ResourceCalendarProvider` (NOTE: deep `…/resource-calendar-context/provider` path), `ResourceEventGrid` | unified provider; `ResourceEventGrid` survives as an internal composition component — import re-points to its post-move home (Task 5 moves it with this suite via `git mv`) |
| 6 | `week-view/horizontal/resource-week-horizontal.test.tsx` (683) | `ResourceCalendarProvider`, `ResourceWeekHorizontal` | unified provider (`orientation="horizontal"` already passed), unified week view |
| 7 | `week-view/vertical/resource-week-vertical.test.tsx` (466) | `ResourceCalendarProvider`, `ResourceWeekVertical` | unified provider (`orientation="vertical"` already passed), unified week view |
| 8 | `ilamy-resource-calendar/ilamy-resource-calendar.test.tsx` (1104) | **public component** `IlamyResourceCalendar` (relative `./ilamy-resource-calendar`) | unchanged in this task; Task 6 re-points it per the alias-vs-removal variant |

Mechanics per suite (example: suite #3, today's code):

```tsx
// BEFORE (resource-day-vertical.test.tsx:5-8, 18-33)
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
…
import { ResourceDayVertical } from './resource-day-vertical'

const renderResourceDayVertical = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			orientation="vertical"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<ResourceDayVertical />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}
```

```tsx
// AFTER — provider + view component swapped; every prop, helper name, and assertion identical
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider' // (re-validate)
…
import { DayView } from '@/features/calendar/components/views/day' // (re-validate export)

const renderResourceDayVertical = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			orientation="vertical"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<DayView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}
```

Hard rule for review: the diff for each suite touches ONLY import lines and the JSX
inside render helpers. If any `expect(...)` needs to change to go green, that is a
unified-path bug — fix the implementation, never the assertion. Suite #1 additionally
needs its inline `<ResourceDayVertical />` / `<ResourceDayHorizontal />` renders mapped
to the unified day view with the matching `orientation` prop on the provider (the
baseline tests rely on component choice instead of the prop; the provider prop is the
unified equivalent).

Per suite: rewrite → `bun test <suite path>` green → commit:

```bash
git commit -m "test(resources): point resource-day-vertical suite at the unified path"
```

(and analogous messages for the others).

**Expected friction to budget for:** suites #2/#5/#6 assert `horizontal-row-{id}` rows as
DOM **ancestors** of `day-cell-*` cells — the unified horizontal arrangement must keep
`ResourceEventGrid`'s exact structure (`rows = resources.map(…)` over `HorizontalGrid`,
`resource-event-grid.tsx:44-57`). Suites #3/#4/#7 assert `vertical-col-*` /
`vertical-cell-*-resource-{id}` ids — preserved as long as the column builders keep
producing `keys.col.day(day, resource.id)` / `keys.col.resource(scope, id)` /
`keys.col.time` / `keys.col.date` exactly as quoted in the semantics contract.

---

### Task 4: Per-resource business hours through the config slice

The union rule (visible hours = global ∪ resources') and per-cell shading
(`useEffectiveBusinessHours`) must flow from the unified config slice, pinned by
`business-hours.test.tsx` (re-pointed in Task 3 Step 6 #1).

**Files (re-validate):**
- Modify: wherever the unified views compute hours (Phase 3 view entries / their data hooks)
- Verify-only: `hooks/use-effective-business-hours.ts`, `features/calendar/utils/view-hours.ts`

- [ ] **Step 1: Centralize the `resourceBusinessHours` derivation**

Today every resource view re-derives it (`resource-day-vertical.tsx:25-27` with a
`filter(Boolean) as` cast; `use-resource-week-view-data.ts:31-34` with the cleaner
`flatMap`). Lift ONE memoized derivation into the config slice (or a tiny shared hook in
`features/calendar/hooks/` — re-validate the by-type home), using the cast-free form:

```ts
const resourceBusinessHours = useMemo(
	() => resources.flatMap((r) => (r.businessHours ? [r.businessHours] : [])),
	[resources]
)
```

All hour computations on the unified path pass it to `getViewHours` (whose
`resourceBusinessHours` parameter already exists and already unions —
`view-hours.ts:19,32,43-48`; **no change to `getViewHours` itself**). The regular
day/week bodies, now also serving resource calendars, must include it whenever
`resources` is non-empty — for a resource-less calendar `resources.flatMap(...)` is `[]`
and `getViewHours` behaves exactly as today (`view-hours.ts:36-37` treats empty as "no
resource config"), so regular-calendar suites stay green by construction.

- [ ] **Step 2: Verify per-cell shading resolves through the unified provider**

`useEffectiveBusinessHours` (`use-effective-business-hours.ts:18-26`) reads
`getResourceById` from context; Task 2 Step 4 made it always defined. Confirm the `if
(resourceId != null && getResourceById)` guard now never short-circuits on a resource
calendar, and that `grid-cell.tsx:60` + `event-form.tsx:116` (its two consumers) need no
change. The pin: `business-hours.test.tsx:168-177` — resource A (9–17) has its 17:00 cell
`data-disabled="true"` while resource B (9–18) has `"false"`, inside the SAME rendered
union grid.

- [ ] **Step 3: Run the pinning suite + full gate, commit**

Run: `bun test packages/calendar/src/**/business-hours.test.tsx` (both business-hours
suites — the regular one under `features/calendar/components/` and the resource one)
then the full `bun run test`.
Expected: `0 fail`.

```bash
git add -A packages/calendar/src
git commit -m "feat(business-hours): resource union + per-cell shading flow through the config slice"
```

---

### Task 5: Piecemeal deletion of `features/resource-calendar` (day → week → month → context)

Each sub-step: `git mv` what survives into `features/calendar/` by-type folders (suites
move WITH their modules — never new test files), re-point the unified views' imports from
the cross-feature paths to the new homes, delete what is dead, and gate on the moved
suite passing. After this task `features/resource-calendar/` contains only the public
wrapper + types (handled in Task 6) — or nothing, if the owner picks removal.

**Move map (survivors → by-type homes inside `features/calendar/`; re-validate against
Phase 3's actual `views/` layout):**

| Baseline file | Disposition |
|---|---|
| `components/day-view/resource-day-{horizontal,vertical}.tsx` + tests | `git mv` → `features/calendar/components/views/day/` (resource arrangements of the day view) |
| `components/day-view/index.tsx` (`ResourceDayView` orientation switch) | DELETE (dispatch absorbed in Task 3 Step 2) |
| `components/week-view/{vertical,horizontal}/*.tsx` + tests, `use-resource-week-view-data.ts` | `git mv` → `features/calendar/components/views/week/` (headers + arrangements); the `use-*` data hooks → `features/calendar/hooks/` (by-type rule: hooks don't live under `components/`) |
| `components/week-view/index.tsx` | DELETE |
| `components/month-view/resource-month-{horizontal,vertical}.tsx` + test | `git mv` → `features/calendar/components/views/month/` |
| `components/month-view/index.tsx` | DELETE |
| `components/resource-event-grid.tsx` + test | `git mv` → `features/calendar/components/views/` (shared by day/week/month horizontal arrangements) |
| `components/time-header-row.tsx` | `git mv` → `features/calendar/components/views/` (used by day+week horizontal) |
| `contexts/resource-calendar-context/{provider,context,index}.ts*` | DELETE (the 291-line provider is fully absorbed; nothing imports the shim after the suites moved) |
| `components/ilamy-resource-calendar/resource-calendar-body.tsx` | DELETE (Task 3 Step 3 made it dead) |
| `components/ilamy-resource-calendar/{ilamy-resource-calendar.tsx,index.ts}` + test | Task 6 decides (alias variant: `git mv` to the app layer; removal variant: DELETE) |
| `types/index.ts` (`Resource`, `IlamyResourceCalendarProps`, `IlamyResourceCalendarPropEvent`) | `git mv` content → `features/calendar/types/` (Task 6 Step 4 handles the prop types; `Resource` import sites update mechanically) |

- [ ] **Step 1: Day views.** `git mv` the two day arrangements + their two suites; update
  the unified day view's imports from `@/features/resource-calendar/...` to the new
  relative/`@/features/calendar/...` paths; `git rm` `day-view/index.tsx`.
  Gate: `bun test <moved day suites> && bun run type-check` → `0 fail`. Commit:
  `refactor(views): absorb resource day arrangements into features/calendar`
- [ ] **Step 2: Week views.** Same procedure for `week-view/**` (arrangements, the two
  headers per orientation, `time-header-row.tsx`, the three data hooks — hooks land in
  `features/calendar/hooks/`, preserving the hiddenDays-in-daily comment from
  `use-resource-week-vertical-data.ts:49-51` verbatim) + the two week suites; `git rm`
  `week-view/index.tsx`. Gate + commit:
  `refactor(views): absorb resource week arrangements into features/calendar`
- [ ] **Step 3: Month views + the shared grid.** Move both month arrangements,
  `resource-event-grid.tsx` (+ its suite, + `business-hours.test.tsx` which lives at the
  `components/` root and pins day+week — move it next to the views it exercises), and the
  month suite. `git rm` `month-view/index.tsx`. Gate + commit:
  `refactor(views): absorb resource month arrangements and event grid into features/calendar`
- [ ] **Step 4: Context.** Verify nothing imports the shim:

```bash
grep -rn "resource-calendar-context\|ResourceCalendarProvider\|ResourceCalendarContext" \
  packages/calendar/src apps/demo/src --include='*.ts*' | grep -v dist
```

Expected: zero hits outside the files being deleted (the suites were re-pointed in
Task 3; `use-smart-calendar-context` was collapsed in Phase 2/Task 2 — re-validate, and
remove any residual `ResourceCalendarContext` read so the unified context is the only
one). Then `git rm -r contexts/resource-calendar-context` and `git rm`
`resource-calendar-body.tsx`. Also delete `docs/testing-guide.md`'s
`ResourceCalendarProvider` example import (`testing-guide.md:89`) — replaced by the
unified provider example (full docs sweep is Task 7).
Gate: full `bun run test` + `bun run type-check` → `0 fail`. Commit:
`refactor(calendar)!: delete the resource-calendar provider fork`

---

### Task 6: v2 surface — `IlamyCalendar` absorbs the resource props; `IlamyResourceCalendar` either/or

**Files:**
- Modify: `features/calendar/types/index.ts` (props), `features/calendar/components/ilamy-calendar.tsx`
- Modify: `features/calendar/components/ilamy-calendar.test.tsx` (dev-warn pin, failing first)
- Modify: `src/index.ts` (public exports)
- Either/or: the wrapper + its suite (see Step 3)
- Append: `docs/migration-v2.md`; modify `docs/resource-calendar.md`

- [ ] **Step 1 (TDD, failing first): the dev-mode warn for orientation-without-resources**

Extend the EXISTING `ilamy-calendar.test.tsx`:

```tsx
import { spyOn } from 'bun:test'

describe('orientation without resources', () => {
	it('warns in dev when orientation is passed without resources', () => {
		const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
		render(<IlamyCalendar orientation="vertical" />)
		const allWarnArgs = warnSpy.mock.calls.flat().join(' ')
		expect(allWarnArgs).toContain(
			'`orientation` was provided without `resources`'
		)
		warnSpy.mockRestore()
	})

	it('does not warn when resources are present', () => {
		const warnSpy = spyOn(console, 'warn').mockImplementation(() => {})
		render(
			<IlamyCalendar
				orientation="vertical"
				resources={[{ id: 'r1', title: 'Room 1' }]}
			/>
		)
		const allWarnArgs = warnSpy.mock.calls.flat().join(' ')
		expect(allWarnArgs).not.toContain('`orientation`')
		warnSpy.mockRestore()
	})
})
```

Run — expected: first test FAILS (`orientation` not yet a prop / no warn). Then implement
in `IlamyCalendar` (the app-layer component, not the provider — it is the documented v2
surface; the test harness `CalendarTestProvider` must not warn):

```ts
const hasResources = Boolean(resources?.length)
if (process.env.NODE_ENV !== 'production' && orientation && !hasResources) {
	// eslint-disable-next-line no-console -- deliberate DX guard (master plan, view contract)
	console.warn(
		'[@ilamy/calendar] `orientation` was provided without `resources` — it only applies when the calendar has resources, so it is ignored.'
	)
}
```

(Wrap in a `useEffect`/once-per-mount guard matching the codebase's existing warn
patterns if one exists — re-validate; a render-time warn fires twice under StrictMode.)

- [ ] **Step 2: `IlamyCalendarProps` gains the four props (audience-separated TSDoc)**

Append to `IlamyCalendarProps` (`features/calendar/types/index.ts:100-385`), TSDoc per
the master plan's audience rule (users read about `orientation`; `layout` /
`supportsResources` live only in `docs/custom-views.md` from Phase 3):

```ts
/**
 * Resources (people, rooms, equipment) to display as a resource axis.
 * When set: events are shown per matching resource (`resourceIds`, falling
 * back to `resourceId`); events with no resource assignment are hidden; the
 * year view is hidden from the view switcher.
 */
resources?: Resource[]
/** Custom render function for resource header cells. */
renderResource?: (resource: Resource) => React.ReactNode
/**
 * How resources are arranged. Only applies when `resources` is set.
 * - "horizontal": resources are rows, time is columns (default)
 * - "vertical": resources are columns, time is rows
 */
orientation?: 'horizontal' | 'vertical'
/**
 * Granularity of week-view time slots when `resources` is set.
 * - "hourly": one column per hour (default)
 * - "daily": one column per day. Note: `hiddenDays` is ignored in daily
 *   mode (non-contiguous days would break multi-day event positioning).
 */
weekViewGranularity?: 'hourly' | 'daily'
```

Thread them through `IlamyCalendar` → unified provider (they already exist on the
provider from Task 2). `Resource` now lives in `features/calendar/types/` (Task 5 move
map); update the public re-export in `src/index.ts:28`. The separate
`IlamyResourceCalendarPropEvent` (`resource-calendar/types/index.ts:15-20`) is redundant
in v2 — `CalendarEvent` already carries `resourceId`/`resourceIds`
(`packages/types/src/index.ts:49,51`), so `IlamyCalendarPropEvent` already accepts them;
keep it only as a deprecated alias in the alias variant.

- [ ] **Step 3: EITHER/OR — owner picks ONE at execution (both fully planned; flag in the PR description which was taken)**

**Variant A — deprecated one-line alias for the beta cycle:**

```tsx
// features/calendar/components/ilamy-resource-calendar.tsx (moved via git mv from the fork)
import type React from 'react'
import { IlamyCalendar } from './ilamy-calendar'
import type { IlamyCalendarProps } from '../types'

/** @deprecated Since v2.0 `IlamyCalendar` accepts `resources`, `renderResource`,
 * `orientation`, and `weekViewGranularity` directly — use it instead. This alias
 * will be removed in the next major. */
export type IlamyResourceCalendarProps = IlamyCalendarProps

/** @deprecated Since v2.0 — use `IlamyCalendar` with the `resources` prop. */
export const IlamyResourceCalendar: React.FC<IlamyResourceCalendarProps> = (
	props
) => <IlamyCalendar {...props} />
```

`src/index.ts:25-26` re-points to the new home. Suite #8
(`ilamy-resource-calendar.test.tsx`) `git mv`s next to the alias and keeps importing
`IlamyResourceCalendar` — 1,104 lines of assertions stay byte-identical and prove the
alias is faithful.

**Variant B — removed at 2.0:** `git rm` the wrapper + `index.ts`; delete the
`IlamyResourceCalendar` / `IlamyResourceCalendarProps` exports from `src/index.ts:25-26`;
suite #8's imports rewrite to `IlamyCalendar` (`import { IlamyCalendar } from
'@/features/calendar/components/ilamy-calendar'`, every
`<IlamyResourceCalendar` → `<IlamyCalendar` in render helpers — assertions byte-identical),
and the suite `git mv`s to `features/calendar/components/`. Demo fallout: re-point the
three demo files (`apps/demo/src/components/demo/demo-calendar-display.tsx`,
`demo-page.tsx`, `demo-resource-picker.tsx`) from `IlamyResourceCalendar` to
`IlamyCalendar`. (Variant A defers the demo change but doing it anyway dogfoods the v2
surface — recommended either way.)

- [ ] **Step 4: Verify (build first — cross-package), commit**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail` (recurrence + demo resolve the rebuilt dist).

```bash
git add -A packages/calendar/src packages/calendar/dist apps/demo/src 2>/dev/null || git add -A
git commit -m "feat(calendar)!: IlamyCalendar absorbs the resource axis props; resource wrapper decided"
```

(Adjust the message to `…wrapper deprecated` / `…wrapper removed` per the variant; keep
≤ 100 chars.)

- [ ] **Step 5: Migration + docs entries**

Append to `docs/migration-v2.md` BEFORE `## Summary checklist`:

````markdown
## One calendar: resources are props on `IlamyCalendar` (v2 structure overhaul, Phase 4)

`IlamyCalendar` now accepts `resources`, `renderResource`, `orientation`, and
`weekViewGranularity` directly. Behavior with resources set is unchanged: events render
per matching resource (`resourceIds`, falling back to `resourceId`), unassigned events
are hidden, visible hours are the union of global and per-resource business hours, and
the year view is hidden from the switcher.

**Before (v1)**

```tsx
<IlamyResourceCalendar resources={rooms} orientation="vertical" events={events} />
```

**After (v2)**

```tsx
<IlamyCalendar resources={rooms} orientation="vertical" events={events} />
```

<!-- Variant A --> `IlamyResourceCalendar` still works as a deprecated alias and will be
removed in the next major.
<!-- Variant B --> `IlamyResourceCalendar` has been removed.

Other notes:
- `orientation` without `resources` is inert; dev builds now log a console warning.
- `IlamyResourceCalendarPropEvent` is gone — `CalendarEvent` (and therefore the `events`
  prop) already carries `resourceId` / `resourceIds`.
- The root testid of a resource calendar is now `ilamy-calendar`
  (was `ilamy-resource-calendar`).
````

Add the matching `## Summary checklist` items. Update `docs/resource-calendar.md` to the
unified surface (its examples import `IlamyResourceCalendar` at `:26,57` and document
`IlamyResourceCalendarProps` at `:182-217` — rewrite onto `IlamyCalendar` + the four
props; keep the orientation/granularity prose, which stays accurate). Commit:
`docs(migration): resource calendar unified into IlamyCalendar`

---

### Task 7: Bulletproof placement sweep (`git mv`) + docs/agent-instruction sweep

The final move from the master plan: feature-specific code into `features/calendar/`
by-type folders; only calendar-agnostic primitives stay shared. History preserved with
`git mv`; imports updated mechanically.

- [ ] **Step 1: Placement inventory and moves**

**(re-validate everything — Phases 2/3 already moved provider internals and views.)**
Apply the placement rule file-by-file over `packages/calendar/src/components/` and
`src/hooks/`. Expected moves at baseline (adjust to current reality):

| From (shared) | To (feature, by type) | Why |
|---|---|---|
| `components/header/**` | `features/calendar/components/header/` | calendar-specific UI (master plan target structure) |
| `components/event-form/**` | `features/calendar/components/event-form/` | calendar-specific UI |
| `components/resource-cell.tsx` | `features/calendar/components/views/` | resource-axis header cell, used only by the arrangements |
| `hooks/use-effective-business-hours.ts` | `features/calendar/hooks/` | reads the calendar context; feature-specific |
| `hooks/use-calendar-engine.ts` (if any residue) | `features/calendar/hooks/` | Phase 2 leftover |
| `lib/utils/event-utils.ts` shim | DELETE (pipeline absorbed it in Task 2 Step 3; swap the last `filterEventsByResource` consumers — `useProcessedDayEvents.ts:33-36`, `useProcessedWeekEvents.ts:53-56`, `grid-cell.tsx:82-84` — to `filterEventsForResource`) |
| `features/resource-calendar/` (whatever remains) | empty → `git rm -r` the directory |

Stays shared (calendar-agnostic primitives per the master plan):
`components/{vertical-grid,horizontal-grid,all-day-row,drag-and-drop,animations,hour-label}`,
`grid-cell.tsx` (consumed by both shared grids), `day-number.tsx`, `calendar-slots.tsx`
(public slot catalog), `lib/**`, `types/**`. **Never move:** `src/index.ts`,
`src/testing/index.tsx`, `src/plugins/recurrence.ts` (bunup entries +
package.json exports encode these exact paths), and `lib/configs/dayjs-config.ts`
(biome rule message/exemption glob + the test preload
`packages/calendar/testing-library.ts:6` key off it).

Mechanics per move: `git mv` (file + co-located `.test.tsx` together), then a mechanical
import sweep:

```bash
grep -rln "@/components/header" packages/calendar/src | xargs sed -i '' \
  's|@/components/header|@/features/calendar/components/header|g'
```

(one such sweep per moved path; verify each with `bun run type-check` before the next).

- [ ] **Step 2: `src/testing/index.tsx` — the public entry's provider import**

This file is one of the three that never move, but its IMPORT must track the provider.
Baseline (`src/testing/index.tsx:2-5`):

```tsx
import {
	CalendarProvider,
	type CalendarProviderProps,
} from '@/features/calendar/contexts/calendar-context/provider'
```

If Step 1 (or Phase 2 before it) relocated the provider, update this import — and only
this import — in the same commit as the move. Then **rebuild before any cross-package
check**: `bun run build` (the recurrence package's 3 test files import
`@ilamy/calendar/testing` through dist).

- [ ] **Step 3: Docs + agent-instruction path sweep (master plan "Mechanical landmines" list)**

Every doc with path references gets the moved paths updated:

- `docs/time-grid.md` (10 path refs), `docs/hooks-and-context.md` (17 — incl. the
  `ResourceCalendarContextType`/`ResourceCalendarProvider` rows at `:219-220`, now
  deleted types), `docs/types-and-interfaces.md` (17 — incl.
  `features/resource-calendar/types/index.ts` rows at `:71,126,215,219`),
  `docs/testing-guide.md` (9, incl. the `:89` provider example), `docs/export-ical.md`
  (4), `docs/monorepo-architecture.md:49` (the "Keeps:" list mentions
  `features/resource-calendar`).
- **`docs/v2-plugin-architecture.md` preamble amendment (BINDING, master plan resource
  decision):** line 4 reads
  `recurrence (and later resource, iCal export) are plugins built against a public API`
  → change `(and later resource, iCal export)` to
  `(and later iCal export)` and append after that sentence:
  `Resources ship in core; a resource plugin is a possible future extraction once the v2 plugin contracts have proven themselves.`
  Also reconcile the `:88` example ("a whole-feature plugin (resource) implements
  `views` + `provider`") to a hypothetical, non-resource example.
- `AGENTS.md` Key Paths section: delete the `resource-calendar/` block
  (`ilamy-resource-calendar/`, `contexts/resource-calendar-context/`,
  `day-view/ week-view/ month-view/` resource variants), fold the resource axis into the
  `features/calendar/` lines, update `components/` lines for header/event-form moves.
  (`CLAUDE.md`/`GEMINI.md` are symlinks — edit `AGENTS.md` only.)
- `.agents/commands/load-context.md` (`:28,55,131-137` reference `resource-calendar.md`,
  `resource-cell.tsx`, and the resource feature section) and
  `.agents/skills/code-review/SKILL.md:180` (cites
  `packages/calendar/src/features/calendar/` as the by-type reference — likely fine,
  verify).

- [ ] **Step 4: Cross-feature import gate + verify + commit**

```bash
grep -rn "features/resource-calendar" packages/calendar/src apps/demo/src --include='*.ts*'
```

Expected: zero hits (the feature no longer exists). Run
`bun run build && bun run type-check && bun run test` → all green.

```bash
git add -A
git commit -m "refactor(structure): bulletproof placement sweep; docs and agent paths updated"
```

---

### Task 8: Final gate, dev log, PR

**Files:**
- Create/append: `docs/logs/<today YYYY-MM-DD>.md`

- [ ] **Step 1: Full CI gate**

Run: `bun run ci`
Expected: exits 0 (biome check → build → type-check → tests). Note the master plan's
canary: the demo consuming the rebuilt dist is part of this gate.

- [ ] **Step 2: Dev log (mandatory per CLAUDE.md)**

Append to today's `docs/logs/YYYY-MM-DD.md` (create if absent; delete the oldest if the
directory exceeds 10): under `## Changes`,
`**[v2 phase 4]**: resource axis absorbed into the core calendar — config/data slices
gained resources/orientation/weekViewGranularity + resource utilities; built-in views
compose the resource arrangements via supportsResources; per-resource business-hour
union + shading on the unified path; features/resource-calendar deleted (provider fork,
body, per-view dispatch); IlamyCalendar absorbed the four resource props (+ dev warn for
orientation w/o resources); IlamyResourceCalendar <aliased|removed>; placement sweep +
docs/AGENTS path sweep; migration entries added.` List moved/deleted files under
`## Files Modified`; record the alias-vs-removal decision and the resource+year
semantics decision under `## Notes`.

- [ ] **Step 3: Ask the user to review; on explicit approval, push and open the PR**

Suggested title: `feat(v2)!: phase 4 — resources in the core calendar`
PR body links `docs/v2-overhaul-plan.md` (Phase 4), the migration entries, and flags the
two owner decisions (wrapper variant taken; forced-year-with-resources semantics). NEVER
push or post without explicit approval in the user's latest message; chain the ritual:
`touch .claude/state/pr-post-approved.flag && gh pr create …`.

---

## Self-review notes

- **Spec coverage against the master plan's six Phase 4 bullets:** resource-aware
  dispatch behind the suites with the explicit per-suite import-rewrite table → Task 3
  (incl. the suite-count correction: eight files at baseline, seven importing internals,
  not the master plan's "six of seven"); per-resource business hours through the config
  slice (union + shading, pinned by `business-hours.test.tsx`) → Task 4; piecemeal
  deletion day → week → month → context, each gated on its suite → Task 5; Bulletproof
  placement sweep with `git mv` + docs/AGENTS/load-context sweeps + the
  `src/testing/index.tsx` provider-import update → Task 7; `IlamyCalendar` absorbs the
  four props + dev-warn, alias-or-removal planned as a marked either/or → Task 6;
  `bun run ci` + dev log → Task 8. The binding `v2-plugin-architecture.md` preamble
  amendment is Task 7 Step 3.
- **Deliberately NOT planned here:** the `handleDateClick`/`allDay`/resource-injection
  unification and the `getEventsForResource` optionality fix — Phase 2 owns those
  (verified against the master plan's Phase 2 bullets); Task 1 Step 4 only re-validates
  the outcome and escalates if missing. Likewise `keys.ts` is frozen (testids are spec).
- **Two new-behavior decisions are surfaced, not buried:** forced `initialView="year"`
  with resources (Task 3 Step 1b — baseline renders an empty body; planned semantics:
  regular year grid) and the wrapper variant (Task 6 Step 3). Both get pins and PR flags.
- **TDD accounting:** failing-first tests exist for the dev-warn (Task 6 Step 1), the
  unified provider's resource axis (Task 2 Step 1), and the year decision (Task 3
  Step 1b); the unassigned-hiding pin (Task 3 Step 1a) passes on baseline by design — it
  is a regression pin upgrading a smoke test, written before the dispatch change.
  Everything else is behavior-preserving and pinned by the eight existing suites with
  byte-identical assertions. No new test files anywhere; suites move via `git mv`.
- **Order constraints:** Task 2 before 3 (the provider must carry the axis before suites
  re-point); Task 3 Step 5's full-suite checkpoint before any import rewrite; Task 5's
  context deletion (Step 4) requires Task 3's re-pointing AND the wrapper's provider swap
  (Task 3 Step 3); Task 6 Step 4 and Task 7 Step 2 both build before cross-package
  checks. Tasks 4 and the early steps of 6 could interleave with 5, but the listed order
  keeps every commit green.
- **Known risks:** (1) Phase 3's actual view-entry shape may differ from the
  `component`-dispatch sketch in Task 3 Step 2 — the contract-not-contents rule covers
  this; if Phase 3 shipped `columns()`-driven composition, the resource arrangements
  become column-spec producers instead of wrapped components, and the testid/ancestry
  pins in the suites are the acceptance bar either way. (2) The root-testid change
  (`ilamy-resource-calendar` → `ilamy-calendar`) is unpinned by tests but is harness
  surface — it gets a migration entry. (3) Suite #1 (`business-hours.test.tsx`) renders
  two orientations in one file, so its rewrite maps component choice → provider
  `orientation` prop; flagged in Task 3 Step 6 as the one rewrite that is more than an
  import swap (still assertion-identical).
