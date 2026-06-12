# v2 Overhaul — Phase 1: Unified Geometry (`lib/layout`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Baseline:** `main@abe1c73`. If Phase 0 (`docs/v2-overhaul-phase-0-plan.md`) has merged by the
time this runs, branch from the newer main instead — the only overlap is the
`ProcessedCalendarEvent` deletion (Task 7 here, Task 5 there), which is written to be
idempotent.

**Goal:** Replace the two incompatible same-named `PositionedEvent` types
(`lib/utils/position-day-events.ts` percent-based, `lib/utils/position-week-events.ts`
pixel-based-despite-its-comments) with ONE composed contract in `lib/layout/geometry.ts`,
implemented by `layoutVertical` (`lib/layout/vertical.ts`) and `layoutHorizontal`
(`lib/layout/horizontal.ts`). Horizontal layout stops emitting pixels entirely (`position`
becomes `row`; the renderer derives `top`); composition (`{ event, ...placement }`) stops
layout fields leaking into stored events, which kills `DraggableEvent`'s double-cast, the
week function's `as PositionedEvent` cast, and the `omitKeys` + `@ts-expect-error` hack in
`recurrence-handler.ts`.

**Architecture:** Strangler pattern. The new modules land first with the moved test suites
(19 + 27 = 46 exact-assertion tests); the old files become behavior-preserving adapter shims
so the five consumers stay green untouched; consumers swap in one task; shims are deleted
last. The ~100/130-line functions are split into named phases (cluster → geometry → place)
while green. Vocabulary is strictly `vertical`/`horizontal` — never "time-grid"/"row-packing".

**Both modules are fully internal** — neither `PositionedEvent` nor either function is
exported from `packages/calendar/src/index.ts` (verified:
`grep -n "Positioned" packages/calendar/src/index.ts` returns nothing), so **no
`docs/migration-v2.md` entry is needed** for this phase. The testids and `data-*`
attributes the resource suites assert (`data-top` as a pixel value,
`horizontal-event-<id>`) are preserved byte-identically.

**Tech Stack:** TypeScript, bun, bunup, biome. Run everything from the repo root. NEVER
start/stop the dev server; NEVER use npm/pnpm.

**Verification commands used throughout** (expected outputs given per step):

```bash
bun run type-check     # expect: exits 0, no errors
bun run test           # expect: "0 fail" in every package section
bun run build          # expect: exits 0 (needed before recurrence checks — they resolve @ilamy/calendar via dist)
bun run check:fix      # biome lint+format; expect: no errors (warnings pre-exist)
```

---

### Task 1: Branch setup + green baseline

**Files:** none

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/v2-phase1-unified-geometry
```

- [ ] **Step 2: Confirm a green baseline**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` for both `@ilamy/calendar-recurrence` and `@ilamy/calendar`. If the
baseline is red, STOP and report — do not start on a broken main.

Run: `git log --oneline -1`
Expected: `abe1c73` (or a later main that contains it, e.g. with Phase 0 merged).

---

### Task 2: The shared geometry contract — `lib/layout/geometry.ts`

This is the locked design from `docs/v2-overhaul-plan.md` ("Unified geometry"). Composition,
not inheritance: the event is nested, so placement fields can never be spread into event
objects again. Vertical layout fills `top`/`height`/`zIndex` (all percent); horizontal layout
fills `row` + truncation flags and emits NO pixel fields.

**Files:**
- Create: `packages/calendar/src/lib/layout/geometry.ts`

- [ ] **Step 1: Create the file with exactly this content**

```ts
import type { CalendarEvent } from '@/components/types'

/**
 * The single layout contract. The layout strategy determines which placement
 * group is set:
 * - `layoutVertical` (day/week time grid) fills `top`/`height`/`zIndex`.
 * - `layoutHorizontal` (month / all-day row) fills `row` + truncation flags
 *   and emits NO pixel fields — the renderer derives pixels from `row`.
 */
export interface PositionedEvent {
	event: CalendarEvent
	/** Horizontal placement, percent of the grid axis (both strategies). */
	left: number
	width: number
	/** Vertical strategy: vertical placement, percent of the visible range. */
	top?: number
	height?: number
	zIndex?: number
	/** Horizontal strategy: stacking row index; the renderer derives pixels. */
	row?: number
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
}
```

(Type-only file — no tests of its own; the moved suites in Tasks 3–4 exercise it.)

- [ ] **Step 2: Verify and commit**

Run: `bun run type-check`
Expected: exits 0.

```bash
git add packages/calendar/src/lib/layout/geometry.ts
git commit -m "feat(layout): add shared composed PositionedEvent geometry contract"
```

---

### Task 3: `layoutVertical` — move, compose, split into named phases

`git mv` keeps history. The test suite (19 tests) moves with the module and is rewritten for
the composed shape FIRST (red), then the implementation follows (green). The old path becomes
an adapter shim so `useProcessedDayEvents` (the only runtime consumer) stays untouched until
Task 5.

**Files:**
- Move: `packages/calendar/src/lib/utils/position-day-events.ts` → `packages/calendar/src/lib/layout/vertical.ts`
- Move: `packages/calendar/src/lib/utils/position-day-events.test.ts` → `packages/calendar/src/lib/layout/vertical.test.ts`
- Create (shim): `packages/calendar/src/lib/utils/position-day-events.ts`

- [ ] **Step 1: Move both files with history**

```bash
git mv packages/calendar/src/lib/utils/position-day-events.ts packages/calendar/src/lib/layout/vertical.ts
git mv packages/calendar/src/lib/utils/position-day-events.test.ts packages/calendar/src/lib/layout/vertical.test.ts
```

- [ ] **Step 2 (TDD red): Rewrite `vertical.test.ts` for the composed shape**

In `packages/calendar/src/lib/layout/vertical.test.ts`:

Replace the import line:

```ts
import { getPositionedDayEvents } from './position-day-events'
```

with:

```ts
import { layoutVertical } from './vertical'
```

Replace the `position` helper body:

```ts
	getPositionedDayEvents({
		days: opts.days ?? hourDays,
		gridType: opts.gridType,
		events,
	})
```

with:

```ts
	layoutVertical({
		days: opts.days ?? hourDays,
		gridType: opts.gridType,
		events,
	})
```

Update `describe('getPositionedDayEvents', ...)` to `describe('layoutVertical', ...)`.

Event-identity assertions move from the flat object to the nested event. Three exact edits:

1. In `'filters out all-day events'`, replace:

```ts
			expect(result).toHaveLength(1)
			expect(result[0].id).toBe('timed')
```

with:

```ts
			expect(result.map((p) => p.event.id)).toEqual(['timed'])
```

2. In the three id-ordering assertions (`'2 events → 0 / 25 offset...'`,
`'3 events → 0 / 25 / 50 offset'`, `'places longest-duration event first'`,
`'tie-breaks equal durations by earliest start'`), replace every:

```ts
		expect(result.map((e) => e.id)).toEqual([...])
```

with:

```ts
		expect(result.map((p) => p.event.id)).toEqual([...])
```

(the expected arrays stay byte-identical).

3. Replace the entire `Stability` describe block:

```ts
	describe('Stability', () => {
		it('preserves original event fields in positioned output', () => {
			const [p] = position([
				mkEvent('kept', 9, 10, {
					title: 'Kept Title',
					description: 'some description',
					color: 'blue',
				}),
			])
			expect(p).toMatchObject({
				id: 'kept',
				title: 'Kept Title',
				description: 'some description',
				color: 'blue',
			})
		})
	})
```

with:

```ts
	describe('Stability', () => {
		it('nests the original event by reference, un-mutated and un-copied', () => {
			const source = mkEvent('kept', 9, 10, {
				title: 'Kept Title',
				description: 'some description',
				color: 'blue',
			})
			const [p] = position([source])
			expect(p.event).toBe(source)
		})

		it('emits no horizontal-strategy fields', () => {
			const [p] = position([mkEvent('e', 9, 10)])
			expect(p.row).toBeUndefined()
			expect(p.isTruncatedStart).toBeUndefined()
			expect(p.isTruncatedEnd).toBeUndefined()
		})
	})
```

All percent assertions (`p.left`, `p.width`, `p.top`, `p.height`, `p.zIndex`) stay
byte-identical — those fields live at the top level in the composed shape too.

Run: `cd packages/calendar && bun test src/lib/layout/vertical.test.ts`
Expected: FAILS (module `./vertical` still exports the old API) — this is the red step.

- [ ] **Step 3 (TDD green): Rewrite `vertical.ts` — composed output, named phases**

Replace the ENTIRE content of `packages/calendar/src/lib/layout/vertical.ts` with:

```ts
import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { PositionedEvent } from './geometry'

export interface VerticalLayoutInput {
	days: Dayjs[]
	gridType?: 'day' | 'hour' | 'minute'
	events: CalendarEvent[]
}

interface GridMetrics {
	gridStart: Dayjs
	totalUnits: number
	gridType: 'day' | 'hour' | 'minute'
	isDiscrete: boolean
}

// --- Phase 1: cluster -------------------------------------------------------

/** Groups time-sorted events into clusters of transitively overlapping events. */
const clusterOverlappingEvents = (
	sortedEvents: CalendarEvent[]
): CalendarEvent[][] => {
	const clusters: CalendarEvent[][] = []
	let currentCluster: CalendarEvent[] = []
	let lastEventEnd: Dayjs | null = null
	for (const event of sortedEvents) {
		if (lastEventEnd && event.start.isSameOrAfter(lastEventEnd)) {
			if (currentCluster.length > 0) {
				clusters.push(currentCluster)
			}
			currentCluster = []
		}
		currentCluster.push(event)
		lastEventEnd = lastEventEnd ? dayjs.max(lastEventEnd, event.end) : event.end
	}
	if (currentCluster.length > 0) {
		clusters.push(currentCluster)
	}
	return clusters
}

// --- Phase 2: geometry ------------------------------------------------------

/** Top/height percentages for an event, clamped to the grid; null if outside. */
const computeTopHeight = (
	event: CalendarEvent,
	{ gridStart, totalUnits, gridType, isDiscrete }: GridMetrics
): { top: number; height: number } | null => {
	let startTime = event.start.diff(gridStart, gridType, true)
	let endTime = event.end.diff(gridStart, gridType, true)
	if (isDiscrete) {
		startTime = Math.floor(startTime)
		endTime = Math.ceil(endTime)
		if (endTime <= startTime) endTime = startTime + 1
	}
	if (startTime < 0) startTime = 0
	if (endTime > totalUnits) endTime = totalUnits
	const duration = Math.max(0, endTime - startTime)
	if (duration === 0) return null
	return {
		top: (startTime / totalUnits) * 100,
		height: (duration / totalUnits) * 100,
	}
}

// Max cluster offset by event count; clusters of 5 or more cap at 70%.
const maxOffsetPercentByCount: Record<number, number> = {
	2: 25,
	3: 50,
	4: 60,
}
const defaultMaxOffsetPercent = 70
const maxOffsetByCount = (n: number) =>
	maxOffsetPercentByCount[n] ?? defaultMaxOffsetPercent

// --- Phase 3: place ---------------------------------------------------------

/** Positions one cluster: a lone event spans full width; layered otherwise. */
const placeCluster = (
	cluster: CalendarEvent[],
	metrics: GridMetrics
): PositionedEvent[] => {
	const onlyEvent = cluster.length === 1 ? cluster.at(0) : undefined
	if (onlyEvent) {
		const pos = computeTopHeight(onlyEvent, metrics)
		if (!pos) return []
		return [{ event: onlyEvent, left: 0, width: 100, ...pos }]
	}

	// Multiple events — layered positioning. Longest duration first, tie-break
	// by earliest start.
	const sortedCluster = [...cluster].sort((a, b) => {
		const durDiff =
			b.end.diff(b.start, 'minute') - a.end.diff(a.start, 'minute')
		return durDiff !== 0 ? durDiff : a.start.diff(b.start)
	})

	const n = sortedCluster.length
	const offsetPerEvent = n > 1 ? maxOffsetByCount(n) / (n - 1) : 0

	const placed: PositionedEvent[] = []
	for (let i = 0; i < n; i++) {
		const event = sortedCluster.at(i)
		if (!event) continue
		const pos = computeTopHeight(event, metrics)
		if (!pos) continue
		// First event (longest) takes full width; later events are offset.
		const left = i === 0 ? 0 : offsetPerEvent * i
		placed.push({
			event,
			...pos,
			left,
			width: 100 - left,
			zIndex: i + 1,
		})
	}
	return placed
}

// --- Entry point ------------------------------------------------------------

export const layoutVertical = ({
	days,
	gridType = 'hour',
	events,
}: VerticalLayoutInput): PositionedEvent[] => {
	// Filter out all-day events and sort by start time
	const sortedEvents = events
		.filter((e) => !e.allDay)
		.toSorted((a, b) => a.start.diff(b.start))

	if (sortedEvents.length === 0) {
		return []
	}

	// Grid boundaries and metrics, anchored to the grid unit boundaries.
	const metrics: GridMetrics = {
		gridStart: days.at(0) || dayjs(),
		totalUnits: days.length,
		gridType,
		isDiscrete: gridType === 'day',
	}

	return clusterOverlappingEvents(sortedEvents).flatMap((cluster) =>
		placeCluster(cluster, metrics)
	)
}
```

(Every numeric branch is byte-identical to the old implementation — only the output shape
and the function decomposition changed. The old `processedEvents.push({ ...onlyEvent, ... })`
spreads become `{ event: onlyEvent, ... }` nesting.)

Run: `cd packages/calendar && bun test src/lib/layout/vertical.test.ts`
Expected: 20 pass, 0 fail (19 moved + 1 added in the Stability split).

- [ ] **Step 4: Create the strangler shim at the old path**

Create `packages/calendar/src/lib/utils/position-day-events.ts` with exactly:

```ts
// TEMPORARY strangler shim — deleted in the final task of the Phase 1 plan
// (docs/v2-overhaul-phase-1-plan.md) once all consumers import from
// '@/lib/layout'. Adapts the composed PositionedEvent back to the legacy
// spread-into-the-event shape. Do not add new imports of this file.
import type { CalendarEvent } from '@/components/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { layoutVertical } from '@/lib/layout/vertical'

export interface PositionedEvent extends CalendarEvent {
	left: number // Left position in percentage
	width: number // Width in percentage
	top: number // Top position in percentage
	height: number // Height in percentage
	zIndex?: number // Z-index for layering overlapping events
}

interface GetPositionedDayEventsParams {
	days: Dayjs[]
	gridType?: 'day' | 'hour' | 'minute'
	events: CalendarEvent[]
}

export const getPositionedDayEvents = (
	params: GetPositionedDayEventsParams
): PositionedEvent[] =>
	layoutVertical(params).map((positioned) => ({
		...positioned.event,
		left: positioned.left,
		width: positioned.width,
		top: positioned.top ?? 0,
		height: positioned.height ?? 0,
		zIndex: positioned.zIndex,
	}))
```

(`top`/`height` are always set by `layoutVertical`; the `?? 0` only satisfies the optional
type without a non-null assertion, per the repo style rules.)

- [ ] **Step 5: Verify the whole suite and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` everywhere — `useProcessedDayEvents.ts` still imports
`@/lib/utils/position-day-events` and gets identical behavior through the shim.

```bash
git add -A packages/calendar/src/lib
git commit -m "refactor(layout): move day positioning to lib/layout/vertical with composed output"
```

---

### Task 4: `layoutHorizontal` — renderer owns the pixels

The week module's pixel math (`top = dayNumberHeight + eventSpacing + row * (eventBarHeight +
eventSpacing)`, `height = eventBarHeight`) is half-dead today: the renderer already ignores
the function's `height` and uses context `eventHeight`
(`horizontal-grid-events-layer.tsx:68`). The math moves to the renderer; its 10 pixel tests
move (as DOM assertions) to the EXISTING consumer suite
`components/horizontal-grid/horizontal-grid-row.test.tsx` — never a new test file. Order
matters: pin the renderer behavior first (green), then change the layout module under the
shim.

**Files:**
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid-row.test.tsx` (add pixel-placement describe)
- Move: `packages/calendar/src/lib/utils/position-week-events.ts` → `packages/calendar/src/lib/layout/horizontal.ts`
- Move: `packages/calendar/src/lib/utils/position-week-events.test.ts` → `packages/calendar/src/lib/layout/horizontal.test.ts`
- Create (shim): `packages/calendar/src/lib/utils/position-week-events.ts`

- [ ] **Step 1 (pin first, green): Add the pixel-placement suite to `horizontal-grid-row.test.tsx`**

These pin the DOM result (inline `style.top`/`style.height` on the
`horizontal-event-<id>` wrapper), so they are valid before AND after the math moves.
`ResourceCalendarProvider` accepts `eventSpacing`/`eventHeight`
(provider.tsx:68-69 defaults them to `1`/`EVENT_BAR_HEIGHT`); rendering with
`variant="regular"` and no `resource` skips resource filtering so plain events show.
dnd-kit's `useDraggable` works without a `DndContext` ancestor (default context), as the
resource view suites already rely on.

Add to the imports of `horizontal-grid-row.test.tsx`:

```ts
import type { CalendarEvent } from '@/components/types'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/lib/constants'
```

Append this describe block inside the top-level `describe('HorizontalGridRow', ...)`:

```tsx
	describe('event bar pixel placement (math owned by the events layer)', () => {
		// Hour-long event on the grid's day; ids double as titles.
		const mkEvent = (id: string, startHour: number): CalendarEvent => ({
			id,
			title: id,
			start: initialDate.hour(startHour).minute(0),
			end: initialDate.hour(startHour + 1).minute(0),
		})

		const renderRowWithEvents = ({
			events,
			dayNumberHeight,
			eventSpacing,
			eventHeight,
		}: {
			events: CalendarEvent[]
			dayNumberHeight?: number
			eventSpacing?: number
			eventHeight?: number
		}) => {
			const columns = [
				{ id: 'col-1', day: initialDate, gridType: 'day' as const },
			]
			return render(
				<ResourceCalendarProvider
					dayMaxEvents={4}
					eventHeight={eventHeight}
					eventSpacing={eventSpacing}
					events={events}
					initialDate={initialDate}
					resources={[]}
				>
					<HorizontalGridRow
						columns={columns}
						dayNumberHeight={dayNumberHeight}
						id="row-1"
						variant="regular"
					/>
				</ResourceCalendarProvider>
			)
		}

		const eventWrapper = (id: string) =>
			screen.getByTestId(`horizontal-event-${id}`)

		test('places the first row at default dayNumberHeight + spacing with default bar height', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)] })
			const expectedTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS
			expect(eventWrapper('a').style.top).toBe(`${expectedTop}px`)
			expect(eventWrapper('a').style.height).toBe(`${EVENT_BAR_HEIGHT}px`)
		})

		test('uses the dayNumberHeight prop in the top calculation', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)], dayNumberHeight: 50 })
			expect(eventWrapper('a').style.top).toBe(
				`${50 + GAP_BETWEEN_ELEMENTS}px`
			)
		})

		test('sets the bar height from context eventHeight', () => {
			renderRowWithEvents({ events: [mkEvent('a', 10)], eventHeight: 40 })
			expect(eventWrapper('a').style.height).toBe('40px')
		})

		test('derives stacked row tops from eventHeight + eventSpacing', () => {
			renderRowWithEvents({
				events: [mkEvent('a', 10), mkEvent('b', 12)],
				eventHeight: 48,
			})
			const rowZeroTop = DAY_NUMBER_HEIGHT + GAP_BETWEEN_ELEMENTS
			const rowOneTop =
				DAY_NUMBER_HEIGHT +
				GAP_BETWEEN_ELEMENTS +
				1 * (48 + GAP_BETWEEN_ELEMENTS)
			expect(
				[eventWrapper('a'), eventWrapper('b')].map((el) => el.style.top)
			).toEqual([`${rowZeroTop}px`, `${rowOneTop}px`])
		})

		test('uses custom eventSpacing in stacked row tops', () => {
			renderRowWithEvents({
				events: [mkEvent('a', 10), mkEvent('b', 12)],
				eventSpacing: 4,
			})
			const rowZeroTop = DAY_NUMBER_HEIGHT + 4
			const rowOneTop = DAY_NUMBER_HEIGHT + 4 + 1 * (EVENT_BAR_HEIGHT + 4)
			expect(
				[eventWrapper('a'), eventWrapper('b')].map((el) => el.style.top)
			).toEqual([`${rowZeroTop}px`, `${rowOneTop}px`])
		})
	})
```

Coverage map from the 10 retired layout-level pixel tests: "calculates correct top position
for first row" + the two default-fallback tests → test 1; "Custom Day Number Height" →
test 2; the five "Custom Event Bar Height" tests → tests 3–4; the three "Custom Event
Spacing" tests → tests 1 and 5.

Run: `cd packages/calendar && bun test src/components/horizontal-grid/horizontal-grid-row.test.tsx`
Expected: all pass, 0 fail (these pin CURRENT behavior — the math is still inside
`getPositionedEvents` at this point).

- [ ] **Step 2: Move the module and its tests with history**

```bash
git mv packages/calendar/src/lib/utils/position-week-events.ts packages/calendar/src/lib/layout/horizontal.ts
git mv packages/calendar/src/lib/utils/position-week-events.test.ts packages/calendar/src/lib/layout/horizontal.test.ts
```

- [ ] **Step 3 (TDD red): Rewrite `horizontal.test.ts` — composed shape, `row`, no pixels, factory helpers**

Replace the ENTIRE content of `packages/calendar/src/lib/layout/horizontal.test.ts` with
(this is the old 27-test suite minus the 10 pixel tests retired to Step 1, restructured with
the factory helpers the test style guide requires, plus 2 new shape pins; assertions on
`left`/`width`/`row`/truncation are value-identical to the old suite):

```ts
import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
import { layoutHorizontal } from './horizontal'

const days = Array.from({ length: 7 }, (_, i) =>
	dayjs('2025-01-12').add(i, 'day')
)

// Compact event factory: id doubles as title.
const mkEvent = (
	id: string,
	startISO: string,
	endISO: string
): CalendarEvent => ({
	id,
	title: id,
	start: dayjs(startISO),
	end: dayjs(endISO),
})

const singleDayEvent = mkEvent(
	'single-day',
	'2025-01-13T10:00:00.000Z',
	'2025-01-13T11:00:00.000Z'
)
const multiDayEvent = mkEvent(
	'multi-day',
	'2025-01-13T00:00:00.000Z',
	'2025-01-15T23:59:59.000Z'
)
const longMultiDayEvent = mkEvent(
	'long-multi-day',
	'2025-01-10T00:00:00.000Z',
	'2025-01-20T23:59:59.000Z'
)

// Run layout with the default 7-day grid and dayMaxEvents 4.
const run = (
	events: CalendarEvent[],
	opts: { dayMaxEvents?: number; gridType?: 'day' | 'hour' } = {}
) =>
	layoutHorizontal({
		days,
		events,
		dayMaxEvents: opts.dayMaxEvents ?? 4,
		gridType: opts.gridType,
	})

describe('layoutHorizontal', () => {
	describe('Basic Positioning', () => {
		it('positions single-day event correctly', () => {
			const result = run([singleDayEvent])

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(14.285714, 2)
			expect(result[0].width).toBeCloseTo(14.285714, 2)
			expect(result[0].row).toBe(0)
		})

		it('positions multi-day event correctly', () => {
			const result = run([multiDayEvent])

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(14.285714, 2)
			expect(result[0].width).toBeCloseTo(42.857142, 2)
			expect(result[0].row).toBe(0)
		})

		it('emits no pixel fields — the renderer derives them from row', () => {
			const [p] = run([singleDayEvent])
			expect(p.top).toBeUndefined()
			expect(p.height).toBeUndefined()
			expect(p.zIndex).toBeUndefined()
		})

		it('nests the original event by reference, un-mutated and un-copied', () => {
			const [p] = run([singleDayEvent])
			expect(p.event).toBe(singleDayEvent)
		})
	})

	describe('Edge Cases - Truncation', () => {
		it('truncates event starting before week start', () => {
			const result = run([longMultiDayEvent])

			expect(result).toHaveLength(1)
			expect(result[0].left).toBe(0)
			expect(result[0].isTruncatedStart).toBe(true)
		})

		it('truncates event ending after week end', () => {
			const result = run([
				mkEvent('multi-day', '2025-01-16T00:00:00.000Z', '2025-01-20T23:59:59.000Z'),
			])

			expect(result).toHaveLength(1)
			expect(result[0].isTruncatedEnd).toBe(true)
		})

		it('truncates event spanning entire week and beyond', () => {
			const result = run([longMultiDayEvent])

			expect(result).toHaveLength(1)
			expect(result[0].left).toBe(0)
			expect(result[0].width).toBe(100)
			expect(result[0].isTruncatedStart).toBe(true)
			expect(result[0].isTruncatedEnd).toBe(true)
		})
	})

	describe('Edge Cases - Grid Bounds', () => {
		it('clamps single-day event at last day boundary', () => {
			const result = run([
				mkEvent('single-day', '2025-01-18T23:00:00.000Z', '2025-01-18T23:59:59.000Z'),
			])

			expect(result).toHaveLength(1)
			expect(result[0].left).toBeCloseTo(85.714285, 2)
		})

		it('handles events exactly at week boundaries', () => {
			const result = run([
				mkEvent('first', '2025-01-12T00:00:00.000Z', '2025-01-12T23:59:59.000Z'),
				mkEvent('last', '2025-01-18T00:00:00.000Z', '2025-01-18T23:59:59.000Z'),
			])

			expect(result).toHaveLength(2)
			expect(result[0].left).toBe(0)
			expect(result[1].left).toBeCloseTo(85.714285, 2)
		})
	})

	describe('Complex Scenarios - Overlapping Events', () => {
		it('stacks overlapping single-day events vertically', () => {
			const result = run([
				singleDayEvent,
				mkEvent('single-2', '2025-01-13T11:00:00.000Z', '2025-01-13T11:30:00.000Z'),
				mkEvent('single-3', '2025-01-13T14:00:00.000Z', '2025-01-13T14:30:00.000Z'),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1, 2])
		})

		it('stacks overlapping multi-day events correctly', () => {
			const result = run([
				multiDayEvent,
				mkEvent('multi-2', '2025-01-14T00:00:00.000Z', '2025-01-16T23:59:59.000Z'),
			])

			expect(result.map((p) => p.row)).toEqual([0, 1])
		})

		it('sorts multi-day events by duration (longer first)', () => {
			const result = run([
				mkEvent('short', '2025-01-13T00:00:00.000Z', '2025-01-14T23:59:59.000Z'),
				mkEvent('long', '2025-01-13T00:00:00.000Z', '2025-01-16T23:59:59.000Z'),
			])

			expect(result.map((p) => p.event.id)).toEqual(['long', 'short'])
		})
	})

	describe('Complex Scenarios - Gap Filling', () => {
		it('fills gaps with single-day events', () => {
			const result = run([
				multiDayEvent,
				mkEvent('gap-filler', '2025-01-16T10:00:00.000Z', '2025-01-16T11:00:00.000Z'),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})

		it('places non-overlapping events in same row', () => {
			const result = run([
				multiDayEvent,
				mkEvent('multi-2', '2025-01-17T00:00:00.000Z', '2025-01-18T23:59:59.000Z'),
			])

			expect(result.map((p) => p.row)).toEqual([0, 0])
		})
	})

	describe('Grid Overflow Handling', () => {
		it('stops placing events when dayMaxEvents is reached', () => {
			const manyEvents = Array.from({ length: 10 }, (_, i) =>
				mkEvent(
					`event-${i}`,
					dayjs('2025-01-13T10:00:00.000Z').add(i, 'hour').toISOString(),
					dayjs('2025-01-13T11:00:00.000Z').add(i, 'hour').toISOString()
				)
			)

			const result = run(manyEvents, { dayMaxEvents: 3 })

			expect(result.length).toBeLessThanOrEqual(3)
		})

		it('tries to place truncated version if full event does not fit', () => {
			const fillerEvents = [0, 1, 2].map((i) =>
				mkEvent(`filler-${i}`, '2025-01-13T00:00:00.000Z', '2025-01-15T23:59:59.000Z')
			)

			const result = run(fillerEvents, { dayMaxEvents: 2 })

			expect(result).toHaveLength(2)
		})

		it('respects dayMaxEvents limit when placing overlapping events', () => {
			const blockerEvents = [0, 1, 2].map((i) =>
				mkEvent(`blocker-${i}`, '2025-01-13T00:00:00.000Z', '2025-01-15T23:59:59.000Z')
			)

			const result = run(blockerEvents, { dayMaxEvents: 2 })

			expect(result.length).toBeLessThanOrEqual(2)
			expect(result.every((p) => (p.row ?? 0) < 2)).toBe(true)
		})
	})

	describe('Hour Grid Type', () => {
		it('handles hour gridType for single-day events', () => {
			const result = run(
				[mkEvent('single-day', '2025-01-13T10:00:00.000Z', '2025-01-13T10:00:00.000Z')],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result[0].width).toBeCloseTo(14.285714, 2)
		})

		it('handles hour gridType for multi-hour events', () => {
			const result = run(
				[mkEvent('single-day', '2025-01-13T10:00:00.000Z', '2025-01-13T13:01:00.000Z')],
				{ gridType: 'hour' }
			)

			expect(result).toHaveLength(1)
			expect(result[0].row).toBe(0)
		})
	})
})
```

(Note on the overlap-stacking test: the original used three copies of `singleDayEvent` with
shifted starts; expressing them via `mkEvent` keeps each on 2025-01-13 so they share the
day column — the `row` assertions `[0, 1, 2]` are the same pins. The original suite's
`position` assertions all become `row`; the `dayNumberHeight`/`eventBarHeight`/
`eventSpacing` parameters no longer exist on the input.)

Run: `cd packages/calendar && bun test src/lib/layout/horizontal.test.ts`
Expected: FAILS (module `./horizontal` doesn't exist yet) — red step.

- [ ] **Step 4 (TDD green): Write `horizontal.ts` — `row` + truncation only, named phases**

Replace the ENTIRE content of `packages/calendar/src/lib/layout/horizontal.ts` with:

```ts
import type { CalendarEvent } from '@/components/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { PositionedEvent } from './geometry'

export interface HorizontalLayoutInput {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	gridType?: 'day' | 'hour'
}

interface GridBounds {
	firstDay: Dayjs
	lastDay: Dayjs
	dayCount: number
	gridType: 'day' | 'hour'
}

// --- Phase 1: cluster (partition + sort) ------------------------------------

/** Splits events into multi-unit and single-unit groups, each placement-sorted. */
const partitionAndSortEvents = (
	events: CalendarEvent[],
	gridType: 'day' | 'hour'
): { sortedMultiUnit: CalendarEvent[]; sortedSingleUnit: CalendarEvent[] } => {
	const multiUnitEvents = events.filter(
		(e) => e.end.diff(e.start, gridType) > 0
	)
	const singleUnitEvents = events.filter(
		(e) => e.end.diff(e.start, gridType) === 0
	)

	// Multi-unit: by start date, then longer events first.
	const sortedMultiUnit = [...multiUnitEvents].sort((a, b) => {
		const startDiff = a.start.diff(b.start)
		if (startDiff !== 0) {
			return startDiff
		}
		return b.end.diff(b.start) - a.end.diff(a.start)
	})

	// Single-unit: by start time.
	const sortedSingleUnit = [...singleUnitEvents].sort((a, b) =>
		a.start.diff(b.start)
	)

	return { sortedMultiUnit, sortedSingleUnit }
}

// --- Phase 2: geometry ------------------------------------------------------

/** Column span and truncation of an event, clamped to the grid bounds. */
const computeColumnSpan = (
	event: CalendarEvent,
	{ firstDay, lastDay, dayCount, gridType }: GridBounds
): {
	startCol: number
	endCol: number
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
} => {
	const eventStart = dayjs.max(event.start.startOf(gridType), firstDay)
	const adjustedEnd =
		gridType === 'hour' ? event.end.subtract(1, 'minute') : event.end
	const eventEnd = dayjs.min(adjustedEnd.startOf(gridType), lastDay)
	return {
		startCol: Math.max(0, eventStart.diff(firstDay, gridType)),
		endCol: Math.min(dayCount - 1, eventEnd.diff(firstDay, gridType)),
		isTruncatedStart: event.start.startOf(gridType).isBefore(firstDay),
		isTruncatedEnd: event.end.startOf(gridType).isAfter(lastDay),
	}
}

// --- Phase 3: place (occupancy grid) ----------------------------------------

type OccupancyGrid = { taken: boolean }[][]

/** First row where every column from startCol..endCol is free; -1 if none. */
const findAvailableRow = (
	grid: OccupancyGrid,
	startCol: number,
	endCol: number
): number => {
	for (let row = 0; row < grid.length; row++) {
		let canPlace = true
		for (let col = startCol; col <= endCol; col++) {
			if (grid[row][col].taken) {
				canPlace = false
				break
			}
		}
		if (canPlace) return row
	}
	return -1
}

export const layoutHorizontal = ({
	days,
	events,
	dayMaxEvents,
	gridType = 'day',
}: HorizontalLayoutInput): PositionedEvent[] => {
	// For hour-based grids, use actual first/last hours from the days array;
	// for day-based grids, use start/end of day to capture all events.
	const first = days.at(0)
	const last = days.at(-1)
	if (!first || !last) return []

	const bounds: GridBounds = {
		firstDay: gridType === 'hour' ? first.startOf('hour') : first.startOf('day'),
		lastDay: gridType === 'hour' ? last.endOf('hour') : last.endOf('day'),
		dayCount: days.length,
		gridType,
	}

	const { sortedMultiUnit, sortedSingleUnit } = partitionAndSortEvents(
		events,
		gridType
	)

	// dayMaxEvents x dayCount occupancy grid.
	const grid: OccupancyGrid = Array.from({ length: dayMaxEvents }, () =>
		Array.from({ length: bounds.dayCount }, () => ({ taken: false }))
	)

	const placedEvents: PositionedEvent[] = []

	const place = (
		row: number,
		startCol: number,
		endCol: number,
		event: CalendarEvent,
		isTruncatedStart: boolean,
		isTruncatedEnd: boolean
	) => {
		for (let col = startCol; col <= endCol; col++) {
			grid[row][col] = { taken: true }
		}
		const spanDays = endCol - startCol + 1
		placedEvents.push({
			event,
			left: (startCol / bounds.dayCount) * 100,
			width: (spanDays / bounds.dayCount) * 100,
			row,
			isTruncatedStart,
			isTruncatedEnd,
		})
	}

	// Multi-unit events claim rows first.
	for (const event of sortedMultiUnit) {
		const span = computeColumnSpan(event, bounds)

		// First try: place from the original start position.
		const row = findAvailableRow(grid, span.startCol, span.endCol)
		if (row !== -1) {
			place(
				row,
				span.startCol,
				span.endCol,
				event,
				span.isTruncatedStart,
				span.isTruncatedEnd
			)
			continue
		}

		// Fallback: try truncated versions starting from later days.
		for (let tryStart = span.startCol + 1; tryStart <= span.endCol; tryStart++) {
			const truncRow = findAvailableRow(grid, tryStart, span.endCol)
			if (truncRow !== -1) {
				place(truncRow, tryStart, span.endCol, event, true, span.isTruncatedEnd)
				break
			}
		}
	}

	// Single-unit events fill the remaining gaps.
	for (const event of sortedSingleUnit) {
		const span = computeColumnSpan(event, bounds)
		const col = Math.max(0, Math.min(bounds.dayCount - 1, span.startCol))
		const row = findAvailableRow(grid, col, col)
		if (row !== -1) {
			place(row, col, col, event, false, false)
		}
	}

	return placedEvents
}
```

The old `as PositionedEvent` cast (`position-week-events.ts:115`) is gone — the literal now
fits the composed type exactly. Note the old `place()` spread `...event` AFTER the computed
`left`/`width`/`top`/`height` (position-week-events.ts:105-115), meaning a leaked stale
`event.left` would silently OVERRIDE the freshly computed one — a latent bug class that
composition makes unrepresentable. Also note: the occupancy grid no longer stores the event
reference; the old `event: CalendarEvent | null` cell field was write-only.

Run: `cd packages/calendar && bun test src/lib/layout/horizontal.test.ts`
Expected: 19 pass, 0 fail (17 retained + 2 new shape pins).

- [ ] **Step 5: Create the strangler shim at the old path**

Create `packages/calendar/src/lib/utils/position-week-events.ts` with exactly:

```ts
// TEMPORARY strangler shim — deleted in the final task of the Phase 1 plan
// (docs/v2-overhaul-phase-1-plan.md) once all consumers import from
// '@/lib/layout'. Reproduces the legacy spread shape including the pixel
// top/height math that now belongs to the renderer. Do not add new imports
// of this file.
import type { CalendarEvent } from '@/components/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import {
	DAY_NUMBER_HEIGHT,
	EVENT_BAR_HEIGHT,
	GAP_BETWEEN_ELEMENTS,
} from '@/lib/constants'
import { layoutHorizontal } from '@/lib/layout/horizontal'

export interface PositionedEvent extends CalendarEvent {
	left: number // Left position in percentage
	width: number // Width in percentage
	top: number // Top position in pixels
	height: number // Height in pixels
	position: number // Row in the grid (0 for first, 1 for second, etc.)
	isTruncatedStart: boolean // Whether the event is truncated at the start
	isTruncatedEnd: boolean // Whether the event is truncated at the end
}

interface GetPositionedEventsProps {
	days: Dayjs[]
	events: CalendarEvent[]
	dayMaxEvents: number
	dayNumberHeight?: number
	gridType?: 'day' | 'hour'
	eventSpacing?: number
	eventBarHeight?: number
}

export const getPositionedEvents = ({
	days,
	events,
	dayMaxEvents,
	dayNumberHeight = DAY_NUMBER_HEIGHT,
	gridType = 'day',
	eventSpacing = GAP_BETWEEN_ELEMENTS,
	eventBarHeight = EVENT_BAR_HEIGHT,
}: GetPositionedEventsProps): PositionedEvent[] =>
	layoutHorizontal({ days, events, dayMaxEvents, gridType }).map(
		(positioned) => {
			const row = positioned.row ?? 0
			return {
				...positioned.event,
				left: positioned.left,
				width: positioned.width,
				top:
					dayNumberHeight + eventSpacing + row * (eventBarHeight + eventSpacing),
				height: eventBarHeight,
				position: row,
				isTruncatedStart: positioned.isTruncatedStart ?? false,
				isTruncatedEnd: positioned.isTruncatedEnd ?? false,
			}
		}
	)
```

(The pixel formula is copied verbatim from the old `place()` at
position-week-events.ts:108-110, so consumer behavior — including the resource suites'
`data-top` assertions like `expect(top).toBe(1)` in
`resource-week-horizontal.test.tsx:285` — is bit-identical through the shim.)

- [ ] **Step 6: Verify the whole suite and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` everywhere (hook + renderer untouched, shim preserves behavior;
the new renderer pixel suite from Step 1 passes against the unchanged renderer).

```bash
git add -A packages/calendar/src/lib packages/calendar/src/components/horizontal-grid/horizontal-grid-row.test.tsx
git commit -m "refactor(layout): move week positioning to lib/layout/horizontal; rows not pixels"
```

---

### Task 5: Swap the five consumers + give DraggableEvent real truncation props

One task because the composed shape flows through all of them together: the two hooks
produce it, the two events layers consume it, `HorizontalGridRow` re-routes
`dayNumberHeight` from the layout call to the renderer, and `DraggableEvent` stops sniffing
truncation off the event object. Green only at the end of the task.

**Files:**
- Modify: `packages/calendar/src/features/calendar/hooks/useProcessedDayEvents.ts`
- Modify: `packages/calendar/src/features/calendar/hooks/useProcessedWeekEvents.ts`
- Modify: `packages/calendar/src/components/vertical-grid/vertical-grid-events-layer.tsx`
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid-events-layer.tsx`
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid-row.tsx`
- Modify: `packages/calendar/src/components/draggable-event/draggable-event.tsx`

- [ ] **Step 1: `useProcessedDayEvents` imports the new module**

Replace lines 5-8:

```ts
import {
	getPositionedDayEvents,
	type PositionedEvent,
} from '@/lib/utils/position-day-events'
```

with:

```ts
import type { PositionedEvent } from '@/lib/layout/geometry'
import { layoutVertical } from '@/lib/layout/vertical'
```

and the positioning memo:

```ts
	const todayEvents = useMemo<PositionedEvent[]>(() => {
		return getPositionedDayEvents({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])
```

with:

```ts
	const todayEvents = useMemo<PositionedEvent[]>(() => {
		return layoutVertical({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])
```

- [ ] **Step 2: `useProcessedWeekEvents` calls `layoutHorizontal`; pixel knobs leave the hook**

The hook's `dayNumberHeight` prop and the context reads `eventSpacing`/`eventHeight` existed
only to feed the old pixel math (useProcessedWeekEvents.ts:88-96); they move to the renderer.

Replace lines 10-13:

```ts
import {
	getPositionedEvents,
	type PositionedEvent,
} from '@/lib/utils/position-week-events'
```

with:

```ts
import type { PositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'
```

Remove `dayNumberHeight?: number` from `UseProcessedWeekEventsProps` and `dayNumberHeight,`
from the destructured parameters.

Replace the context destructuring:

```ts
	const {
		getEventsForDateRange,
		dayMaxEvents,
		eventSpacing,
		eventHeight,
		getEventsForResource,
	} = useSmartCalendarContext()
```

with:

```ts
	const { getEventsForDateRange, dayMaxEvents, getEventsForResource } =
		useSmartCalendarContext()
```

Replace the positioning memo:

```ts
	const positionedEvents = useMemo(() => {
		return getPositionedEvents({
			days,
			events,
			dayMaxEvents,
			dayNumberHeight,
			eventSpacing,
			eventBarHeight: eventHeight,
			gridType,
		})
	}, [
		days,
		dayMaxEvents,
		dayNumberHeight,
		eventSpacing,
		eventHeight,
		events,
		gridType,
	])
```

with:

```ts
	const positionedEvents = useMemo(() => {
		return layoutHorizontal({
			days,
			events,
			dayMaxEvents,
			gridType,
		})
	}, [days, dayMaxEvents, events, gridType])
```

- [ ] **Step 3: `DraggableEvent` — truncation flags become real props; double-cast dies**

Concrete prop shape (designed after reading the component: truncation is presentation-only,
consumed solely by `DefaultEventContent`, so two flat optional booleans — not a nested
object — keep the memo comparator cheap and the call sites obvious):

Replace the props (draggable-event.tsx:25-37):

```ts
function DraggableEventUnmemoized({
	elementId,
	event,
	className,
	style,
	disableDrag = false,
}: {
	elementId: string
	className?: string
	style?: CSSProperties
	event: CalendarEvent
	disableDrag?: boolean
}) {
```

with:

```ts
function DraggableEventUnmemoized({
	elementId,
	event,
	className,
	style,
	disableDrag = false,
	isTruncatedStart = false,
	isTruncatedEnd = false,
}: {
	elementId: string
	className?: string
	style?: CSSProperties
	event: CalendarEvent
	disableDrag?: boolean
	/** Set by the horizontal events layer when the bar continues past the visible range. */
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
}) {
```

Delete the double-cast block inside `DefaultEventContent` (draggable-event.tsx:52-58):

```ts
		// Check if this event has truncation information
		const enhancedEvent = event as unknown as {
			isTruncatedStart?: boolean
			isTruncatedEnd?: boolean
		}
		const isTruncatedStart = enhancedEvent.isTruncatedStart
		const isTruncatedEnd = enhancedEvent.isTruncatedEnd
```

(the component body below it already reads `isTruncatedStart`/`isTruncatedEnd`, which now
resolve to the props). With the flags now real booleans, simplify the
`getBorderRadiusClass(Boolean(isTruncatedStart), Boolean(isTruncatedEnd))` call to
`getBorderRadiusClass(isTruncatedStart, isTruncatedEnd)`.

Update the memo comparator (draggable-event.tsx:132-143) — the flags now affect render
output, so they must participate:

```ts
export const DraggableEvent = memo(
	DraggableEventUnmemoized,
	(prevProps, nextProps) => {
		// Compare the essential props to prevent unnecessary re-renders
		return (
			prevProps.elementId === nextProps.elementId &&
			prevProps.disableDrag === nextProps.disableDrag &&
			prevProps.className === nextProps.className &&
			prevProps.event === nextProps.event &&
			prevProps.isTruncatedStart === nextProps.isTruncatedStart &&
			prevProps.isTruncatedEnd === nextProps.isTruncatedEnd
		)
	}
)
```

- [ ] **Step 4: `VerticalGridEventsLayer` reads the composed shape**

Replace the map block (vertical-grid-events-layer.tsx:45-69):

```tsx
			{todayEvents.map((event, index) => {
				const eventKey = `event-${event.id}-${index}-${days.at(0)?.toISOString()}-${resourceId ?? 'no-resource'}`
				const isShortEvent = event.end.diff(event.start, 'minute') <= 15

				return (
					<div
						className="absolute"
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `${event.left}%`,
							width: `calc(${event.width}% - var(--spacing) * 2)`,
							top: `${event.top}%`,
							height: `${event.height}%`,
						}}
					>
						<DraggableEvent
							className={cn('pointer-events-auto', {
								'[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
							})}
							elementId={eventKey}
							event={event}
						/>
					</div>
				)
			})}
```

with:

```tsx
			{todayEvents.map((positioned, index) => {
				const { event } = positioned
				const eventKey = `event-${event.id}-${index}-${days.at(0)?.toISOString()}-${resourceId ?? 'no-resource'}`
				const isShortEvent = event.end.diff(event.start, 'minute') <= 15

				return (
					<div
						className="absolute"
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `${positioned.left}%`,
							width: `calc(${positioned.width}% - var(--spacing) * 2)`,
							top: `${positioned.top}%`,
							height: `${positioned.height}%`,
						}}
					>
						<DraggableEvent
							className={cn('pointer-events-auto', {
								'[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
							})}
							elementId={eventKey}
							event={event}
						/>
					</div>
				)
			})}
```

The `DraggableEvent` now receives the clean nested `CalendarEvent` — this is what makes
Task 6 (the omitKeys deletion) sound, because drag data
(`draggable-event.tsx:41-48` → `calendar-dnd-context.tsx:85-88`) and click data
(`onEventClick(event)`) both carry exactly this prop.

- [ ] **Step 5: `HorizontalGridEventsLayer` derives the pixels (it now owns the math)**

Replace the whole file content of `horizontal-grid-events-layer.tsx` with:

```tsx
import { memo } from 'react'
import { CurrentTimeIndicator } from '@/components/current-time-indicator'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import type { Resource } from '@/features/resource-calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { DAY_NUMBER_HEIGHT } from '@/lib/constants'
import type { PositionedEvent } from '@/lib/layout/geometry'
import { keys } from '@/lib/utils/keys'

export interface HorizontalGridEventsLayerProps {
	gridType?: 'day' | 'hour'
	days: Dayjs[]
	resourceId?: string | number
	resource?: Resource
	'data-testid'?: string
	positionedEvents: PositionedEvent[]
	/** Pixel offset reserved above the bars (the day-number strip). */
	dayNumberHeight?: number
}

const NoMemoHorizontalGridEventsLayer: React.FC<
	HorizontalGridEventsLayerProps
> = ({
	gridType = 'day',
	days,
	resourceId,
	resource,
	'data-testid': dataTestId,
	positionedEvents,
	dayNumberHeight = DAY_NUMBER_HEIGHT,
}) => {
	const { eventHeight, eventSpacing } = useSmartCalendarContext()
	const weekStart = days.at(0)?.startOf('day')

	// Now-line is gated to hour-resolution horizontal grids (resource day horizontal,
	// resource week horizontal hourly). Day-resolution grids — regular MonthView and
	// resource MonthView — skip it; a 24h-percentage line per cell would be a
	// meaningless 1px sliver.
	const rangeStart = days.at(0)
	const rangeEnd = days.at(-1)?.add(1, gridType)
	const showNowLine = gridType === 'hour' && Boolean(rangeStart && rangeEnd)

	return (
		<div
			className="absolute inset-0 pointer-events-none z-10 overflow-clip"
			data-testid={dataTestId}
		>
			{showNowLine && rangeStart && rangeEnd && (
				<CurrentTimeIndicator
					axis="horizontal"
					rangeEnd={rangeEnd}
					rangeStart={rangeStart}
					resource={resource}
				/>
			)}
			{positionedEvents.map((positioned) => {
				const { event } = positioned
				const row = positioned.row ?? 0
				// Layout returns the abstract row; the renderer owns the CSS units.
				const top =
					dayNumberHeight + eventSpacing + row * (eventHeight + eventSpacing)
				const eventKey = `${event.id}-${row}-${weekStart?.toISOString()}-${resourceId ?? 'no-resource'}`

				return (
					<div
						className="absolute z-10 pointer-events-auto overflow-clip"
						data-left={positioned.left}
						data-testid={keys.container.horizontal.event(event.id)}
						data-top={top}
						data-width={positioned.width}
						key={keys.listKey(eventKey, 'wrapper')}
						style={{
							left: `calc(${positioned.left}% + var(--spacing) * 0.25)`,
							width: `calc(${positioned.width}% - var(--spacing) * 1)`,
							top: `${top}px`,
							height: `${eventHeight}px`,
						}}
					>
						<DraggableEvent
							className="h-full w-full shadow"
							elementId={eventKey}
							event={event}
							isTruncatedEnd={positioned.isTruncatedEnd}
							isTruncatedStart={positioned.isTruncatedStart}
						/>
					</div>
				)
			})}
		</div>
	)
}

export const HorizontalGridEventsLayer = memo(NoMemoHorizontalGridEventsLayer)
```

Three behavior-preserving identities to note: the React key previously read
`event.position` (horizontal-grid-events-layer.tsx:54) and now reads the same number as
`row`; `data-top` stays the same pixel number (formula and inputs identical, so the resource
suites' `parseFloat(getAttribute('data-top'))` assertions hold); `eventSpacing` in context
defaults to `GAP_BETWEEN_ELEMENTS`/`1` in both providers, matching the old layout-function
default.

- [ ] **Step 6: `HorizontalGridRow` re-routes `dayNumberHeight` to the renderer**

In `horizontal-grid-row.tsx`, the row currently feeds `dayNumberHeight` to the hook
(line 62-68) and not to the layer; that inverts.

Replace:

```ts
	// Compute events once at the row level — shared between GridCells and events layer
	const { positionedEvents, dayEventsMap } = useProcessedWeekEvents({
		days: flatDays,
		gridType,
		resourceId: resource?.id,
		dayNumberHeight,
		allDay,
	})
```

with:

```ts
	// Compute events once at the row level — shared between GridCells and events layer
	const { positionedEvents, dayEventsMap } = useProcessedWeekEvents({
		days: flatDays,
		gridType,
		resourceId: resource?.id,
		allDay,
	})
```

In the flat-columns events layer (lines 131-141), replace:

```tsx
					<div className="absolute inset-0 z-10 pointer-events-none">
						<HorizontalGridEventsLayer
							data-testid={keys.container.eventsLayer('horizontal', id)}
							days={flatDays}
							gridType={gridType}
							positionedEvents={positionedEvents}
							resource={resource}
							resourceId={resource?.id}
						/>
					</div>
```

with:

```tsx
					<div className="absolute inset-0 z-10 pointer-events-none">
						<HorizontalGridEventsLayer
							data-testid={keys.container.eventsLayer('horizontal', id)}
							dayNumberHeight={dayNumberHeight}
							days={flatDays}
							gridType={gridType}
							positionedEvents={positionedEvents}
							resource={resource}
							resourceId={resource?.id}
						/>
					</div>
```

In `GroupedColumn` (lines 176-182), replace the hook call:

```ts
		const { positionedEvents } = useProcessedWeekEvents({
			days,
			gridType,
			resourceId,
			dayNumberHeight,
			allDay,
		})
```

with:

```ts
		const { positionedEvents } = useProcessedWeekEvents({
			days,
			gridType,
			resourceId,
			allDay,
		})
```

and its events layer (lines 206-215), replace:

```tsx
				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
						data-testid={keys.container.eventsLayer('horizontal', id)}
						days={days}
						gridType={gridType}
						positionedEvents={positionedEvents}
						resource={resource}
						resourceId={resourceId}
					/>
				</div>
```

with:

```tsx
				<div className="absolute inset-0 z-10 pointer-events-none">
					<HorizontalGridEventsLayer
						data-testid={keys.container.eventsLayer('horizontal', id)}
						dayNumberHeight={dayNumberHeight}
						days={days}
						gridType={gridType}
						positionedEvents={positionedEvents}
						resource={resource}
						resourceId={resourceId}
					/>
				</div>
```

`dayNumberHeight` callers stay untouched and keep working: `all-day-row.tsx:42` and
`resource-event-grid.tsx:54` pass `0` (→ `top = 0 + spacing + ...`, exactly the old shim
math), MonthView passes nothing (→ the layer's `DAY_NUMBER_HEIGHT` default, exactly the old
layout-function default).

- [ ] **Step 7: Verify everything and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail` — in particular the Task 4 pixel suite in
`horizontal-grid-row.test.tsx`, the resource suites asserting `data-top`/`data-left`
(`resource-day-horizontal.test.tsx`, `resource-week-horizontal.test.tsx`), and the all-day
row suites must all pass unmodified.

Run: `grep -rn "from '@/lib/utils/position" packages/calendar/src --include='*.ts*'`
Expected: NO hits outside the two shim files themselves (consumers all import
`@/lib/layout/*` now).

```bash
git add packages/calendar/src/features/calendar/hooks packages/calendar/src/components
git commit -m "refactor(layout): consumers read composed PositionedEvent; truncation as real props"
```

---

### Task 6: Delete the recurrence `omitKeys` hack (and the now-dead helper)

The hack (`recurrence-handler.ts:296-297`) defensively stripped layout fields that leaked
into stored events because `PositionedEvent extends CalendarEvent` objects were handed to
`DraggableEvent`. **Verified leak path, now closed by Task 5:** the `targetEvent` reaching
`updateRecurringEvent` is always the `event` prop of a `DraggableEvent` — via drag
(`draggable-event.tsx:41-48` puts it in dnd data; `calendar-dnd-context.tsx:85-88` reads it;
`openEditDialog(event, updates)` → `recurrence-plugin.tsx:50-56` `applyEdit` →
`updateRecurringEvent({ targetEvent: event, ... })`) or via click
(`onEventClick(event)` with the same prop → selected event → form/scoped-edit path). All
three `DraggableEvent` call sites now pass clean events: both events layers pass
`positioned.event` (Task 5 steps 4-5) and `all-events-dialog.tsx:50-56` always passed raw
`CalendarEvent`s from `dayEventsMap`. No call site passes positioned objects anymore — the
hack is deleted, not relocated. (`'right'` in the old omit list never existed on either
positioned shape; it was cargo cult.)

**Files:**
- Modify: `packages/recurrence/src/utils/recurrence-handler.ts:3,295-303`
- Modify: `packages/calendar/src/lib/utils/index.ts:5-9` (drop the dead re-export)
- Modify: `packages/utils/src/helpers.ts` (delete the now-unused `omitKeys`)

- [ ] **Step 1: Replace the hack with a plain spread**

In `recurrence-handler.ts`, replace:

```ts
			const modifiedEvent: CalendarEvent = {
				// @ts-expect-error TODO: fix the types
				...omitKeys(targetEvent, ['width', 'height', 'top', 'left', 'right']),
				...updates,
				id: modifiedEventId,
				recurrenceId: targetEventStartISO, // This marks it as a modified instance
				uid: getEventParentUID(baseEvent), // Keep same UID as base event (iCalendar standard)
				rrule: undefined, // Standalone events don't have RRULE
			} as CalendarEvent
```

with:

```ts
			const modifiedEvent: CalendarEvent = {
				...targetEvent,
				...updates,
				id: modifiedEventId,
				recurrenceId: targetEventStartISO, // This marks it as a modified instance
				uid: getEventParentUID(baseEvent), // Keep same UID as base event (iCalendar standard)
				rrule: undefined, // Standalone events don't have RRULE
			}
```

(both the `@ts-expect-error` and the trailing `as CalendarEvent` go — the spread of a
`CalendarEvent` + `Partial<CalendarEvent>` + typed overrides needs neither.)

Update the import at line 3:

```ts
import { omitKeys, safeDate } from '@ilamy/utils/helpers'
```

to:

```ts
import { safeDate } from '@ilamy/utils/helpers'
```

- [ ] **Step 2: Remove the dead `omitKeys` surface**

Verified before deletion: `grep -rn "omitKeys" packages apps --include='*.ts*' | grep -v node_modules | grep -v dist`
after Step 1 must show only the definition (`packages/utils/src/helpers.ts:21`) and the
re-export (`packages/calendar/src/lib/utils/index.ts:9`). If anything else appears, STOP and
report.

In `packages/calendar/src/lib/utils/index.ts`, replace:

```ts
// `cn` lives in the shared @ilamy/ui package; `safeDate`/`omitKeys` live in the
// shared @ilamy/utils package. Re-exported here so the existing `@/lib/utils`
// call sites in core stay unchanged.
export { cn } from '@ilamy/ui/lib/utils'
export { omitKeys, safeDate } from '@ilamy/utils/helpers'
```

with:

```ts
// `cn` lives in the shared @ilamy/ui package; `safeDate` lives in the shared
// @ilamy/utils package. Re-exported here so the existing `@/lib/utils`
// call sites in core stay unchanged.
export { cn } from '@ilamy/ui/lib/utils'
export { safeDate } from '@ilamy/utils/helpers'
```

In `packages/utils/src/helpers.ts`, delete the `omitKeys` function and its doc comment
(lines 20-30):

```ts
/** Returns a shallow copy of `obj` with the given keys removed. */
export const omitKeys = <T extends object, K extends keyof T>(
	obj: T,
	keys: K[]
): Omit<T, K> => {
	const result = { ...obj }
	for (const key of keys) {
		delete result[key]
	}
	return result
}
```

- [ ] **Step 3: Verify (build first — recurrence type-checks against calendar's dist) and commit**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail` — the 154 recurrence tests (including the
`updateRecurringEvent` 'this'-scope suite) are the regression net for the spread change.

```bash
git add packages/recurrence/src/utils/recurrence-handler.ts packages/calendar/src/lib/utils/index.ts packages/utils/src/helpers.ts
git commit -m "refactor(recurrence): drop omitKeys layout-field strip; fields no longer leak into events"
```

---

### Task 7: Delete the shims and the dead `ProcessedCalendarEvent`

**Files:**
- Delete: `packages/calendar/src/lib/utils/position-day-events.ts` (shim)
- Delete: `packages/calendar/src/lib/utils/position-week-events.ts` (shim)
- Modify: `packages/calendar/src/components/types.ts` (delete `ProcessedCalendarEvent`)

- [ ] **Step 1: Prove the shims are orphaned, then delete them**

Run: `grep -rn "position-day-events\|position-week-events" packages apps --include='*.ts*' | grep -v node_modules | grep -v dist`
Expected: no output. If anything appears, STOP — a consumer was missed in Task 5.

```bash
git rm packages/calendar/src/lib/utils/position-day-events.ts packages/calendar/src/lib/utils/position-week-events.ts
```

- [ ] **Step 2: Delete `ProcessedCalendarEvent` (idempotent with Phase 0 Task 5)**

If Phase 0 already merged and removed it, skip this step. Otherwise, in
`packages/calendar/src/components/types.ts`, delete the interface and its doc comment
(lines 12-29) AND trim the header comment's stale last sentence. The whole file becomes:

```ts
// The public event model (CalendarEvent, WeekDays, BusinessHours) now lives in
// the shared `@ilamy/types` package, the lightweight contract a plugin depends
// on. Re-exported here so the existing `@/components/types` call sites across
// core stay unchanged.
export type {
	BusinessHours,
	CalendarEvent,
	WeekDays,
} from '@ilamy/types'
```

(It was a third near-duplicate positioned-event type with zero usages — verified by grep;
not in the public index.)

- [ ] **Step 3: Verify and commit**

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`. Type-check passing IS the proof nothing imported the deleted
surface.

```bash
git add -A packages/calendar/src/lib/utils packages/calendar/src/components/types.ts
git commit -m "refactor(layout): delete position-* strangler shims and dead ProcessedCalendarEvent"
```

---

### Task 8: Docs/path sweep, dev log, final CI gate, PR

The master plan mandates a docs + agent-instruction sweep per phase. References to the old
paths/functions (found by grep, excluding the master plan itself which documents the move):

**Files:**
- Modify: `docs/hooks-and-context.md:122,140`
- Modify: `docs/performance.md:31`
- Modify: `docs/types-and-interfaces.md:14`
- Modify: `.agents/commands/load-context.md:151-152`
- Modify: `AGENTS.md` (Key Paths; CLAUDE.md/GEMINI.md are symlinks to it — edit AGENTS.md only)
- Create/append: `docs/logs/<today YYYY-MM-DD>.md`

- [ ] **Step 1: Update the doc references**

`docs/hooks-and-context.md:122` — replace:

```
Filters out all-day events (those render in the all-day row). Calls `getPositionedDayEvents()` for layout.
```

with:

```
Filters out all-day events (those render in the all-day row). Calls `layoutVertical()` (`lib/layout/vertical.ts`) for layout.
```

`docs/hooks-and-context.md:140` — replace:

```
Calls `getPositionedEvents()` for multi-day layout with `dayMaxEvents` and `eventSpacing`.
```

with:

```
Calls `layoutHorizontal()` (`lib/layout/horizontal.ts`) for multi-day row packing with `dayMaxEvents`; the events layer derives pixel offsets from the returned `row`.
```

`docs/performance.md:31` — replace:

```
  │     └── positionedEvents = getPositionedEvents(events)      ← 1 positioning pass
```

with:

```
  │     └── positionedEvents = layoutHorizontal(events)         ← 1 positioning pass
```

`docs/types-and-interfaces.md:14` — replace the `positioning` line's
`position-day-events / position-week-events` with `lib/layout (geometry / vertical / horizontal)`
(keep the surrounding table/diagram formatting of that file intact).

`.agents/commands/load-context.md:151-152` — replace:

```
- `utils/position-day-events.ts` - Day view event positioning
- `utils/position-week-events.ts` - Week view event positioning
```

with:

```
- `layout/geometry.ts` - The shared composed PositionedEvent contract
- `layout/vertical.ts` - Day/week time-grid event layout (percent)
- `layout/horizontal.ts` - Month/all-day row packing (row index; renderer derives pixels)
```

`AGENTS.md` Key Paths — replace:

```
    utils/                                     # date-utils, position-*-events, export-ical (cn/safeDate re-exported from @ilamy/ui & @ilamy/utils)
```

with:

```
    layout/                                    # geometry.ts (PositionedEvent), vertical.ts, horizontal.ts
    utils/                                     # date-utils, export-ical (cn/safeDate re-exported from @ilamy/ui & @ilamy/utils)
```

No `docs/migration-v2.md` entry: both modules are internal (neither `PositionedEvent` nor
the layout functions appear in `packages/calendar/src/index.ts` — re-verify with
`grep -n "Positioned\|layoutVertical\|layoutHorizontal" packages/calendar/src/index.ts`,
expected: no output).

- [ ] **Step 2: Full CI gate**

Run: `bun run ci`
Expected: exits 0 (biome check → build → type-check → tests all green). The demo consuming
the freshly built dist is the canary for the internal churn.

- [ ] **Step 3: Dev log (mandatory per AGENTS.md)**

Append to today's `docs/logs/YYYY-MM-DD.md` (create if absent; delete the oldest log file if
the directory exceeds 10 files): summarize under `## Changes` as
`**[v2 phase 1]**: unified geometry — lib/layout/{geometry,vertical,horizontal} with ONE
composed PositionedEvent; position→row; renderer owns horizontal pixel math; DraggableEvent
truncation props replace the double-cast; recurrence omitKeys hack + @ts-expect-error
deleted; position-* shims and ProcessedCalendarEvent removed.` and list the files under
`## Files Modified`.

```bash
git add docs AGENTS.md .agents/commands/load-context.md
git commit -m "docs: update path references for the lib/layout move; phase 1 dev log"
```

- [ ] **Step 4: Ask the user to review; on explicit approval, push and open the PR**

Suggested title: `refactor(v2): phase 1 — unified geometry in lib/layout`
PR body links `docs/v2-overhaul-plan.md` (Phase 1) and this plan, and states the exit
criteria met: no duplicate same-named positioned-event types; the `DraggableEvent`
double-cast, the week function's `as PositionedEvent` cast, and the recurrence `omitKeys`
hack all removed; geometry tests run with zero DOM. NEVER push or post without explicit
approval in the user's latest message; chain the
`touch .claude/state/pr-post-approved.flag` ritual with the `gh pr create` command.

---

## Self-review notes

- **Spec coverage against the master plan's five Phase 1 bullets:** move suites with modules +
  factory helpers → Tasks 3-4; implement against the locked contract (composition, `row`
  rename including the React key, renderer-owned pixel math with moved tests) → Tasks 4-5;
  omitKeys hack deletion → Task 6; named-phase split (cluster → geometry → place) → done
  inside Tasks 3-4 rather than as a separate pass, because the rewrite to the composed shape
  already forces touching every line — splitting later would churn the same code twice. The
  tests are moved/rewritten FIRST in both tasks, so the split still happens "while green"
  in the red-green sense the master plan intends.
- **Strangler fidelity:** the master plan says "old files become re-export shims". Pure
  re-exports are impossible here because the contract (names AND shape) changes; the shims
  are thin adapters that reproduce the legacy shape (including the horizontal pixel math,
  copied verbatim from position-week-events.ts:108-110) so consumers stay byte-identical in
  behavior until Task 5. This honors the strangler intent — every task independently green —
  at the cost of ~40 temporary lines each, deleted in Task 7.
- **Discovered facts the design leans on:** drag data carries the `event` prop verbatim
  (draggable-event.tsx:41-48 → calendar-dnd-context.tsx:85-88 → recurrence-plugin.tsx:50-56),
  which is what makes the omitKeys deletion a true deletion (no call site still passes
  positioned objects — all-events-dialog.tsx:50-56 already passed clean events). The resource
  suites assert `data-top` as a NUMBER (`resource-week-horizontal.test.tsx:285` expects `1`
  = `0 + 1 + 0*(24+1)`), so the renderer keeps emitting `data-top` as the derived pixel
  value, not the row index. The repo's tsconfig has no `strict`/`exactOptionalPropertyTypes`,
  so `rrule: undefined` and the optional-field handling compile without casts.
- **Latent bug documented, not silently fixed:** the old horizontal `place()` spread
  `...event` AFTER the computed fields, so leaked stale `event.left` could override fresh
  geometry. Composition removes the entire bug class; no behavior change is observable
  because Task 5 stops the leak at its source in the same PR.
- **Test accounting:** 19 day tests → 20 in `vertical.test.ts` (Stability split into two);
  27 week tests → 19 in `horizontal.test.ts` (10 pixel pins retired, 2 shape pins added) +
  5 renderer tests in `horizontal-grid-row.test.tsx` covering all 10 retired assertions.
  No new test files anywhere; both moves use `git mv` for history.
- **Migration guide:** explicitly not needed — verified neither type nor function is exported
  from the public index; testids and `data-*` attributes (the public-ish testing harness)
  are preserved exactly.
- Order is fixed: Task 2 (type) before 3-4 (implementations), 4 Step 1 (pin renderer) before
  4 Steps 2-5 (move math), 5 (consumer swap) before 6 (the hack is only deletable once
  events are clean) and before 7 (shims orphaned). Task 6's build-first gate respects the
  dist-resolution landmine from the master plan.
