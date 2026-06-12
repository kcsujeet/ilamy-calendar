# v2 Overhaul — Phase 2: One Provider — Engine Slices — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Baseline:** `main@abe1c73`. Execute after Phase 1; re-validate line numbers if Phase 1
touched these files (it should not — disjoint modules — but verify). Two known interactions:
Phase 1 rewires the geometry imports of `useProcessedDayEvents.ts` / `useProcessedWeekEvents.ts`
(their `getEventsForResource` filter blocks quoted in Task 7 are NOT part of Phase 1's diff,
but line numbers will shift), and Phase 0 removed `Resource.position` and tightened the `data`
fields, which may have shifted lines in `ilamy-resource-calendar.test.tsx` fixtures.

**Goal:** Split the 371-line `useCalendarEngine` into four slice hooks composed in one place
(config → pluginRuntime → navigation → data → interaction), delete the ~190 duplicated lines
between `CalendarProvider` and `ResourceCalendarProvider` (`editEvent` + `handleEventClick`
are verbatim identical; `handleDateClick` + the contextValue assembly are near-identical),
unify `handleDateClick` through an `openEventForm` that carries the cell's resource, and make
`useSmartCalendarContext` an honestly-typed selector with no `as` cast. Two deliberate
behavior/type changes ship with migration entries: the resource cell-click fallback now
respects the cell's `allDay` flag (the `allDay: false` hardcode was the bug), and the public
`getEventsForResource` becomes optional (it was required-but-runtime-undefined on regular
calendars).

**Architecture:**

```
CalendarProvider / ResourceCalendarProvider
  -> useCalendarContextValue(props)          # ONE assembly point for the shared context value
       -> useCalendarEngine(config)          # the composer (file stays at src/hooks/)
            1. useCalendarConfig             # t, currentLocale, dayMaxEvents, businessHours
            2. pluginRuntime (useMemo)       # named 5th cross-cutting dependency
            3. useCalendarNavigation         # currentDate/view/range/next/prev/today
            4. useCalendarData               # events + CRUD + scoped mutations
            5. useCalendarInteraction        # selection, event form, click handlers
            + locale & timezone effects      # config triggers that mutate navigation AND
                                             # data state — stay in the composer, not sliced
```

Key decisions, locked by the master plan (`docs/v2-overhaul-plan.md`, Phase 2) and this plan:

- **The composer stays in `src/hooks/use-calendar-engine.ts`.** The slices are plain hooks in
  `features/calendar/hooks/`, composed in order, passing values as parameters each render.
  Keeping the composition in the engine file (which the one provider calls) rather than inline
  in `provider.tsx` preserves `use-calendar-engine.test.ts` — 60+ tests that pin every slice's
  behavior through the exact same entry point — and keeps `src/testing/index.tsx` (a public
  entry that imports the provider by internal path) untouched. The provider composes the
  engine plus the presentation props; nothing is composed twice.
- **The timezone effect (`use-calendar-engine.ts:186-199`) stays in the composer** — it
  mutates navigation state (`setCurrentDate`) AND data state (`setCurrentEvents`) from a
  config trigger. The locale effect (`:177-184`) has the identical shape (config trigger
  mutating `currentLocale` + `currentDate`), so it stays in the composer for the same reason.
- **The merged context value is shape-identical.** The engine's two new handler fields are
  destructured off before the spread; the one field the old value carried that its type didn't
  declare (`locale`) is added to `CalendarContextType` so the annotated assembly compiles
  without changing the value. Memoization structure (one `useMemo`, same dependency list) is
  preserved so rerender behavior is unchanged.
- **The resource provider shrinks to prop-mapping over the same slices** via
  `useCalendarContextValue` (cross-feature import, tolerated until Phase 4 deletes the
  feature — precedent: it already imports `CalendarProviderProps` cross-feature today).

**Tech Stack:** TypeScript, React 19, bun, bunup, biome. Run everything from the repo root
unless a step says otherwise. NEVER start/stop the dev server. Conventional commits ≤ 100
chars. Code style: `.at()`, no `!`, no `any`, named exports, flat conditionals.

**Verification commands used throughout** (expected outputs given per step):

```bash
bun run type-check     # expect: exits 0, no errors
bun run test           # expect: "0 fail" in every package section
bun run build          # expect: exits 0 — REQUIRED before type-check whenever public
                       # types change (recurrence/demo resolve @ilamy/calendar via dist)
bun run check:fix      # biome lint+format; expect: no errors (warnings pre-exist)
```

---

### Task 1: Branch setup and green baseline

**Files:** none

- [ ] **Step 1: Create the feature branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/v2-phase2-provider-slices
```

- [ ] **Step 2: Confirm a green baseline**

Run: `bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: `0 fail` for both `@ilamy/calendar-recurrence` and `@ilamy/calendar`. If the
baseline is red, STOP and report — do not start on a broken main.

- [ ] **Step 3: Confirm Phase 1 did not touch this phase's files**

Run: `git log --oneline abe1c73..HEAD -- packages/calendar/src/features/calendar/contexts packages/calendar/src/features/resource-calendar/contexts packages/calendar/src/hooks/use-calendar-engine.ts packages/calendar/src/hooks/use-smart-calendar-context.ts`
Expected: no output. If commits appear, re-read those files and re-validate every quoted
"current code" block in this plan before proceeding.

---

### Task 2: FIRST — pin the resource provider's `handleDateClick` fallback and click-disable semantics

The resource context has NO provider-level tests today, and the subtlest divergences live
exactly there. Per the repo rule (never create new test files), these tests extend the
existing `ilamy-resource-calendar.test.tsx` suite, which already renders through the public
component. The probe rides in via the `headerComponent` prop (rendered inside the provider
tree — the existing "should render custom header when provided" test proves this), so even
the unreachable-from-DOM `allDay: true` input is exercised through the public component.

These tests pin CURRENT v1 behavior (including the `allDay: false` hardcode) and must pass
unchanged against the baseline. Task 6 flips exactly one of them, failing-first.

**Files:**
- Modify: `packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx`

- [ ] **Step 1: Add the imports and the probe component**

Below the existing imports (currently ending at line 15,
`import { IlamyResourceCalendar } from './ilamy-resource-calendar'`), the import block reads:

```ts
import type { EventFormProps } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'
import dayjs from '@/lib/configs/dayjs-config'
```

Add two imports so the block becomes:

```ts
import type { EventFormProps } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'
import type { CellInfo } from '@/features/calendar/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
```

Then add the probe component right after the `translator` / `customRenderEvent` helpers
(after line 20):

```tsx
// Renders inside the provider tree (via headerComponent) and forwards a fixed
// CellInfo into the context's onCellClick — lets tests drive the cell-click
// fallback with inputs (allDay: true) the resource DOM never produces.
const CellClickProbe = ({ info }: { info: CellInfo }) => {
	const { onCellClick } = useSmartCalendarContext()
	return (
		<button
			data-testid="probe-cell-click"
			onClick={() => onCellClick(info)}
			type="button"
		>
			probe cell click
		</button>
	)
}
```

- [ ] **Step 2: Surface `allDay` in the existing custom event form**

In `CustomResourceEventForm`, the current spans end with:

```tsx
		<span data-testid="selected-event-resource-ids">
			{selectedEvent?.resourceIds?.join(',') || 'no-resources'}
		</span>
```

Add one more span directly after it:

```tsx
		<span data-testid="selected-event-resource-ids">
			{selectedEvent?.resourceIds?.join(',') || 'no-resources'}
		</span>
		<span data-testid="selected-event-all-day">
			{selectedEvent?.allDay ? 'all-day' : 'timed'}
		</span>
```

- [ ] **Step 3: Add the pinning describe block**

At the end of the top-level `describe('IlamyResourceCalendar', ...)` block (after the
`describe('isCellDisabled (issue #79)', ...)` block), add:

```tsx
	describe('cell click fallback (no onCellClick)', () => {
		const allDayCellInfo: CellInfo = {
			start: dayjs('2025-08-04T00:00:00.000Z'),
			end: dayjs('2025-08-04T23:59:59.999Z'),
			allDay: true,
			resource: mockResources.at(0),
		}

		it('opens the form with a new event carrying the clicked cell resource', async () => {
			render(
				<IlamyResourceCalendar
					events={[]}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					renderEventForm={CustomResourceEventForm}
					resources={mockResources}
				/>
			)

			const row = screen.getByTestId('horizontal-row-resource-2')
			fireEvent.click(within(row).getByTestId('day-cell-2025-08-04'))

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})
			expect(screen.getByTestId('selected-event-title')).toHaveTextContent(
				'New Event'
			)
			expect(
				screen.getByTestId('selected-event-resource-id')
			).toHaveTextContent('resource-2')
			expect(screen.getByTestId('selected-event-all-day')).toHaveTextContent(
				'timed'
			)
		})

		it('hardcodes allDay: false even when the clicked cell is an all-day cell (v1 behavior pin)', async () => {
			render(
				<IlamyResourceCalendar
					events={[]}
					headerComponent={<CellClickProbe info={allDayCellInfo} />}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					renderEventForm={CustomResourceEventForm}
					resources={mockResources}
				/>
			)

			fireEvent.click(screen.getByTestId('probe-cell-click'))

			await waitFor(() => {
				expect(screen.getByTestId('form-open')).toHaveTextContent('open')
			})
			expect(screen.getByTestId('selected-event-all-day')).toHaveTextContent(
				'timed'
			)
			expect(
				screen.getByTestId('selected-event-resource-id')
			).toHaveTextContent('resource-1')
		})

		it('ignores the fallback entirely when disableCellClick is set', () => {
			render(
				<IlamyResourceCalendar
					disableCellClick={true}
					events={[]}
					headerComponent={<CellClickProbe info={allDayCellInfo} />}
					initialDate={dayjs('2025-08-04T00:00:00.000Z')}
					initialView="month"
					renderEventForm={CustomResourceEventForm}
					resources={mockResources}
				/>
			)

			fireEvent.click(screen.getByTestId('probe-cell-click'))

			expect(screen.getByTestId('form-open')).toHaveTextContent('closed')
		})
	})
```

- [ ] **Step 4: Verify the pins pass against current code, then commit**

Run: `cd packages/calendar && bun test src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx 2>&1 | tail -3 && cd ../..`
Expected: `0 fail`, 3 more tests passing than baseline. These are pins of v1 behavior — if
any of the three fails, the assumption about current behavior is wrong: STOP and report.

Run: `bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

```bash
git add packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx
git commit -m "test(resource-calendar): pin handleDateClick fallback and click-disable semantics"
```

---

### Task 3: Split the engine into four slice hooks + composer (mechanical, behavior-preserving)

Pure extraction: every hook body moves VERBATIM from `use-calendar-engine.ts` into its slice;
the engine becomes the composer. `use-calendar-engine.test.ts` (60+ tests covering locale,
navigation units/ranges, CRUD, scoped mutations, event form, timezone reactivity, prop sync)
plus `provider.test.tsx` and the full suite are the regression net — the TDD deletion/move
exception applies, no new tests. `CalendarEngineConfig` and `CalendarEngineReturn` are
byte-identical after this task.

**Files:**
- Create: `packages/calendar/src/features/calendar/hooks/use-calendar-config.ts`
- Create: `packages/calendar/src/features/calendar/hooks/use-calendar-navigation.ts`
- Create: `packages/calendar/src/features/calendar/hooks/use-calendar-data.ts`
- Create: `packages/calendar/src/features/calendar/hooks/use-calendar-interaction.ts`
- Rewrite: `packages/calendar/src/hooks/use-calendar-engine.ts` (371 → ~150 lines)

- [ ] **Step 1: Create `use-calendar-config.ts`**

The `t` memo is engine lines 146-150 verbatim; `currentLocale` state is line 141;
`dayMaxEvents: DAY_MAX_EVENTS_DEFAULT` is return line 343.

```ts
import { useMemo, useState } from 'react'
import type { BusinessHours } from '@/components/types'
import { DAY_MAX_EVENTS_DEFAULT } from '@/lib/constants'
import { defaultTranslations } from '@/lib/translations/default'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'

export interface CalendarConfigParams {
	firstDayOfWeek: number
	businessHours?: BusinessHours | BusinessHours[]
	locale?: string
	translations?: Translations
	translator?: TranslatorFunction
}

export interface CalendarConfigSlice {
	firstDayOfWeek: number
	dayMaxEvents: number
	businessHours?: BusinessHours | BusinessHours[]
	currentLocale: string
	setCurrentLocale: React.Dispatch<React.SetStateAction<string>>
	t: TranslatorFunction
}

/**
 * Config slice: static configuration, i18n, and locale state. The locale
 * EFFECT (which also touches navigation state) lives in the composer.
 */
export const useCalendarConfig = ({
	firstDayOfWeek,
	businessHours,
	locale,
	translations,
	translator,
}: CalendarConfigParams): CalendarConfigSlice => {
	const [currentLocale, setCurrentLocale] = useState(locale || 'en')

	const t: TranslatorFunction = useMemo(() => {
		if (translator) return translator
		const dict = translations || defaultTranslations
		return (key: string) => dict[key as keyof Translations] || key
	}, [translations, translator])

	return {
		firstDayOfWeek,
		dayMaxEvents: DAY_MAX_EVENTS_DEFAULT,
		businessHours,
		currentLocale,
		setCurrentLocale,
		t,
	}
}
```

- [ ] **Step 2: Create `use-calendar-navigation.ts`**

`VIEW_UNITS` and `calculateViewRange` move verbatim from engine lines 82-108; the state and
callbacks from lines 133-136, 161-163, 201-233, 323-332.

```ts
import { useCallback, useState } from 'react'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import dayjs, {
	type Dayjs,
	type ManipulateType,
} from '@/lib/configs/dayjs-config'
import { getMonthWeeks, getWeekDays } from '@/lib/utils/date-utils'
import type { CalendarView } from '@/types'

const VIEW_UNITS: Record<string, ManipulateType> = {
	day: 'day',
	week: 'week',
	month: 'month',
	year: 'year',
}

const calculateViewRange = (
	date: Dayjs,
	view: CalendarView,
	firstDayOfWeek: number
): { start: Dayjs; end: Dayjs } => {
	if (view === 'day' || view === 'year') {
		return { start: date.startOf(view), end: date.endOf(view) }
	}
	if (view === 'week') {
		const days = getWeekDays(date, firstDayOfWeek)
		const weekStart = days.at(0) ?? date
		const weekEnd = days.at(-1) ?? date
		return { start: weekStart.startOf('day'), end: weekEnd.endOf('day') }
	}
	// month view: 6 weeks × 7 days — also the default range for plugin/unknown views
	const weeks = getMonthWeeks(date, firstDayOfWeek)
	const gridStart = weeks.at(0)?.at(0) ?? date
	const gridEnd = weeks.at(-1)?.at(-1) ?? date
	return { start: gridStart.startOf('day'), end: gridEnd.endOf('day') }
}

export interface CalendarNavigationParams {
	initialDate: Dayjs
	initialView: CalendarView
	firstDayOfWeek: number
	onDateChange?: (date: Dayjs, range: { start: Dayjs; end: Dayjs }) => void
	onViewChange?: (view: CalendarView) => void
	pluginRuntime: PluginRuntime
}

export interface CalendarNavigationSlice {
	currentDate: Dayjs
	setCurrentDate: React.Dispatch<React.SetStateAction<Dayjs>>
	view: CalendarView
	setView: (view: CalendarView) => void
	selectDate: (date: Dayjs) => void
	nextPeriod: () => void
	prevPeriod: () => void
	today: () => void
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
}

/** Navigation slice: current date/view state, period stepping, range math. */
export const useCalendarNavigation = ({
	initialDate,
	initialView,
	firstDayOfWeek,
	onDateChange,
	onViewChange,
	pluginRuntime,
}: CalendarNavigationParams): CalendarNavigationSlice => {
	const [currentDate, setCurrentDate] = useState<Dayjs>(
		dayjs.isDayjs(initialDate) ? initialDate : dayjs(initialDate)
	)
	const [view, setView] = useState<CalendarView>(initialView)

	const getCurrentViewRange = useCallback(() => {
		return calculateViewRange(currentDate, view, firstDayOfWeek)
	}, [currentDate, view, firstDayOfWeek])

	const updateDateAndNotify = useCallback(
		(newDate: Dayjs) => {
			setCurrentDate(newDate)
			const range = calculateViewRange(newDate, view, firstDayOfWeek)
			onDateChange?.(newDate, range)
		},
		[onDateChange, view, firstDayOfWeek]
	)

	const selectDate = updateDateAndNotify

	const navigatePeriod = useCallback(
		(direction: 1 | -1) => {
			const unit =
				VIEW_UNITS[view] ??
				pluginRuntime.getViews().find((v) => v.name === view)?.navigationUnit ??
				'day'
			let newDate = currentDate.subtract(1, unit)
			if (direction === 1) {
				newDate = currentDate.add(1, unit)
			}
			updateDateAndNotify(newDate)
		},
		[currentDate, view, updateDateAndNotify, pluginRuntime]
	)

	const nextPeriod = useCallback(() => navigatePeriod(1), [navigatePeriod])
	const prevPeriod = useCallback(() => navigatePeriod(-1), [navigatePeriod])

	const today = useCallback(
		() => updateDateAndNotify(dayjs()),
		[updateDateAndNotify]
	)

	const handleViewChange = useCallback(
		(newView: CalendarView) => {
			setView(newView)
			onViewChange?.(newView)
			// View change affects visible range — notify consumers
			const range = calculateViewRange(currentDate, newView, firstDayOfWeek)
			onDateChange?.(currentDate, range)
		},
		[onViewChange, onDateChange, currentDate, firstDayOfWeek]
	)

	return {
		currentDate,
		setCurrentDate,
		view,
		setView: handleViewChange,
		selectDate,
		nextPeriod,
		prevPeriod,
		today,
		getCurrentViewRange,
	}
}
```

- [ ] **Step 3: Create `use-calendar-data.ts`**

Bodies verbatim from engine lines 137, 142, 152-159, 165-175, 235-296.

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { PluginRuntime } from '@/features/plugins/lib/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'

export interface CalendarDataParams {
	events: CalendarEvent[]
	pluginRuntime: PluginRuntime
	getCurrentViewRange: () => { start: Dayjs; end: Dayjs }
	onEventAdd?: (event: CalendarEvent) => void
	onEventUpdate?: (event: CalendarEvent) => void
	onEventDelete?: (event: CalendarEvent) => void
}

export interface CalendarDataSlice {
	events: CalendarEvent[]
	rawEvents: CalendarEvent[]
	setCurrentEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>
	getEventsForDateRange: (startDate: Dayjs, endDate: Dayjs) => CalendarEvent[]
	addEvent: (event: CalendarEvent) => void
	updateEvent: (eventId: string | number, event: Partial<CalendarEvent>) => void
	deleteEvent: (eventId: string | number) => void
	applyScopedEdit: (
		event: CalendarEvent,
		updates: Partial<CalendarEvent>,
		scope: unknown
	) => void
	applyScopedDelete: (event: CalendarEvent, scope: unknown) => void
}

/** Data slice: event store, prop sync, CRUD, and plugin-scoped mutations. */
export const useCalendarData = ({
	events,
	pluginRuntime,
	getCurrentViewRange,
	onEventAdd,
	onEventUpdate,
	onEventDelete,
}: CalendarDataParams): CalendarDataSlice => {
	const [currentEvents, setCurrentEvents] = useState<CalendarEvent[]>(events)
	const lastEventsProp = useRef(events)

	const getEventsForDateRange = useCallback(
		(startDate: Dayjs, endDate: Dayjs): CalendarEvent[] =>
			pluginRuntime.transformEvents(currentEvents, {
				start: startDate,
				end: endDate,
			}),
		[currentEvents, pluginRuntime]
	)

	const processedEvents = useMemo(() => {
		const { start, end } = getCurrentViewRange()
		return getEventsForDateRange(start, end)
	}, [getEventsForDateRange, getCurrentViewRange])

	useEffect(() => {
		if (events !== lastEventsProp.current) {
			setCurrentEvents(events)
			lastEventsProp.current = events
		}
	}, [events])

	const addEvent = useCallback(
		(event: CalendarEvent) => {
			setCurrentEvents((prev) => [...prev, event])
			onEventAdd?.(event)
		},
		[onEventAdd]
	)

	const updateEvent = useCallback(
		(eventId: string | number, updates: Partial<CalendarEvent>) => {
			const eventToUpdate = currentEvents.find((event) => event.id === eventId)
			if (!eventToUpdate) {
				return
			}

			const newEvent = { ...eventToUpdate, ...updates }
			setCurrentEvents((prev) =>
				prev.map((event) => (event.id === eventId ? newEvent : event))
			)
			onEventUpdate?.(newEvent)
		},
		[currentEvents, onEventUpdate]
	)

	const applyScopedEdit = useCallback(
		(event: CalendarEvent, updates: Partial<CalendarEvent>, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyEdit) {
				return
			}
			onEventUpdate?.({ ...event, ...updates })
			setCurrentEvents(
				manager.applyEdit({ event, updates, currentEvents, scope })
			)
		},
		[currentEvents, onEventUpdate, pluginRuntime]
	)

	const applyScopedDelete = useCallback(
		(event: CalendarEvent, scope: unknown) => {
			const manager = pluginRuntime.getEventManager(event)
			if (!manager?.applyDelete) {
				return
			}
			onEventDelete?.(event)
			setCurrentEvents(manager.applyDelete({ event, currentEvents, scope }))
		},
		[currentEvents, onEventDelete, pluginRuntime]
	)

	const deleteEvent = useCallback(
		(eventId: string | number) => {
			const eventToDelete = currentEvents.find((e) => e.id === eventId)
			if (!eventToDelete) {
				return
			}

			setCurrentEvents((prev) => prev.filter((e) => e.id !== eventId))
			onEventDelete?.(eventToDelete)
		},
		[currentEvents, onEventDelete]
	)

	return {
		events: processedEvents,
		rawEvents: currentEvents,
		setCurrentEvents,
		getEventsForDateRange,
		addEvent,
		updateEvent,
		deleteEvent,
		applyScopedEdit,
		applyScopedDelete,
	}
}
```

- [ ] **Step 4: Create `use-calendar-interaction.ts`**

Bodies verbatim from engine lines 138-140, 298-321. (The click handlers join this slice in
Task 5; `openEventForm` gains resource support in Task 4.)

```ts
import { useCallback, useState } from 'react'
import type { CalendarEvent } from '@/components/types'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import type { TranslatorFunction } from '@/lib/translations/types'

export interface CalendarInteractionParams {
	currentDate: Dayjs
	t: TranslatorFunction
}

export interface CalendarInteractionSlice {
	isEventFormOpen: boolean
	selectedEvent: CalendarEvent | null
	selectedDate: Dayjs | null
	setIsEventFormOpen: React.Dispatch<React.SetStateAction<boolean>>
	setSelectedEvent: React.Dispatch<React.SetStateAction<CalendarEvent | null>>
	setSelectedDate: React.Dispatch<React.SetStateAction<Dayjs | null>>
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
	closeEventForm: () => void
}

/** Interaction slice: selection state and the event form lifecycle. */
export const useCalendarInteraction = ({
	currentDate,
	t,
}: CalendarInteractionParams): CalendarInteractionSlice => {
	const [isEventFormOpen, setIsEventFormOpen] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null)

	const openEventForm = useCallback(
		(eventData?: Partial<CalendarEvent>) => {
			if (eventData?.start) {
				setSelectedDate(eventData.start)
			}
			const start = eventData?.start ?? currentDate
			setSelectedEvent({
				title: t('newEvent'),
				start,
				end: eventData?.end ?? start.add(1, 'hour'),
				resourceId: eventData?.resourceId,
				description: '',
				allDay: eventData?.allDay ?? false,
			} as CalendarEvent)
			setIsEventFormOpen(true)
		},
		[currentDate, t]
	)

	const closeEventForm = useCallback(() => {
		setSelectedDate(null)
		setSelectedEvent(null)
		setIsEventFormOpen(false)
	}, [])

	return {
		isEventFormOpen,
		selectedEvent,
		selectedDate,
		setIsEventFormOpen,
		setSelectedEvent,
		setSelectedDate,
		openEventForm,
		closeEventForm,
	}
}
```

- [ ] **Step 5: Rewrite `use-calendar-engine.ts` as the composer**

`CalendarEngineConfig` (lines 23-39) and `CalendarEngineReturn` (lines 41-80) stay
byte-identical — keep them exactly as they are in the current file. Replace everything from
`const VIEW_UNITS` (line 82) to the end of the file with the composer, and replace the import
block with:

```ts
import {
	type ComponentType,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import type { BusinessHours, CalendarEvent } from '@/components/types'
import { useCalendarConfig } from '@/features/calendar/hooks/use-calendar-config'
import { useCalendarData } from '@/features/calendar/hooks/use-calendar-data'
import { useCalendarInteraction } from '@/features/calendar/hooks/use-calendar-interaction'
import { useCalendarNavigation } from '@/features/calendar/hooks/use-calendar-navigation'
import { createPluginRuntime } from '@/features/plugins/lib/create-plugin-runtime'
import type { IlamyPlugin, PluginView } from '@/features/plugins/lib/types'
import dayjs, { type Dayjs } from '@/lib/configs/dayjs-config'
import type { Translations, TranslatorFunction } from '@/lib/translations/types'
import type { CalendarView } from '@/types'
```

(`ManipulateType`, `getMonthWeeks`/`getWeekDays`, `defaultTranslations`, `useCallback`,
`useState`, and `DAY_MAX_EVENTS_DEFAULT` all moved into the slices. The engine importing from
`@/features/calendar/hooks` is the tolerated shared→feature inversion until Phase 4's final
`git mv` sweep — precedent: this file already imports `@/features/plugins/lib/*` today.)

The composer body:

```ts
export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn => {
	const {
		events = [],
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate = dayjs(),
		businessHours,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		onViewChange,
		locale,
		timezone,
		translations,
		translator,
	} = config

	const { plugins = [] } = config

	// Slices, composed in order: config → pluginRuntime → navigation → data →
	// interaction. pluginRuntime is the named fifth cross-cutting dependency
	// (data, navigation, AND the provider's renderSlot/getProviders consume it).
	const configSlice = useCalendarConfig({
		firstDayOfWeek,
		businessHours,
		locale,
		translations,
		translator,
	})

	const pluginRuntime = useMemo(() => createPluginRuntime(plugins), [plugins])

	const navigation = useCalendarNavigation({
		initialDate,
		initialView,
		firstDayOfWeek,
		onDateChange,
		onViewChange,
		pluginRuntime,
	})

	const data = useCalendarData({
		events,
		pluginRuntime,
		getCurrentViewRange: navigation.getCurrentViewRange,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
	})

	const interaction = useCalendarInteraction({
		currentDate: navigation.currentDate,
		t: configSlice.t,
	})

	// Cross-cutting effects: a config-prop trigger mutates navigation AND data
	// state, so they live here in the composer, not inside any single slice.
	const { setCurrentLocale } = configSlice
	const { setCurrentDate } = navigation
	const { setCurrentEvents } = data

	const lastLocaleProp = useRef<string | undefined>(undefined)
	useEffect(() => {
		if (locale && locale !== lastLocaleProp.current) {
			setCurrentLocale(locale)
			dayjs.locale(locale)
			setCurrentDate((prevDate) => prevDate.locale(locale))
			lastLocaleProp.current = locale
		}
	}, [locale, setCurrentLocale, setCurrentDate])

	const lastTimezoneProp = useRef(timezone)
	useEffect(() => {
		if (timezone && timezone !== lastTimezoneProp.current) {
			dayjs.tz.setDefault(timezone)
			setCurrentDate((prev) => prev.tz(timezone))
			setCurrentEvents((prev) =>
				prev.map((e) => ({
					...e,
					start: e.start.tz(timezone),
					end: e.end.tz(timezone),
				}))
			)
			lastTimezoneProp.current = timezone
		}
	}, [timezone, setCurrentDate, setCurrentEvents])

	return {
		currentDate: navigation.currentDate,
		view: navigation.view,
		events: data.events,
		rawEvents: data.rawEvents,
		isEventFormOpen: interaction.isEventFormOpen,
		selectedEvent: interaction.selectedEvent,
		selectedDate: interaction.selectedDate,
		firstDayOfWeek,
		dayMaxEvents: configSlice.dayMaxEvents,
		currentLocale: configSlice.currentLocale,
		businessHours,
		setCurrentDate: navigation.setCurrentDate,
		selectDate: navigation.selectDate,
		setView: navigation.setView,
		nextPeriod: navigation.nextPeriod,
		prevPeriod: navigation.prevPeriod,
		today: navigation.today,
		addEvent: data.addEvent,
		updateEvent: data.updateEvent,
		applyScopedEdit: data.applyScopedEdit,
		applyScopedDelete: data.applyScopedDelete,
		deleteEvent: data.deleteEvent,
		openEventForm: interaction.openEventForm,
		closeEventForm: interaction.closeEventForm,
		setSelectedEvent: interaction.setSelectedEvent,
		setIsEventFormOpen: interaction.setIsEventFormOpen,
		setSelectedDate: interaction.setSelectedDate,
		getEventsForDateRange: data.getEventsForDateRange,
		getEventManager: pluginRuntime.getEventManager,
		renderSlot: pluginRuntime.renderSlot,
		collect: pluginRuntime.collect,
		getViews: pluginRuntime.getViews,
		getProviders: pluginRuntime.getProviders,
		t: configSlice.t,
	}
}
```

- [ ] **Step 6: Verify and commit**

Run: `cd packages/calendar && bun test src/hooks/use-calendar-engine.test.ts 2>&1 | tail -3 && cd ../..`
Expected: `0 fail` — every engine test passes against the composed slices, unmodified.

Run: `bun run check:fix && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

```bash
git add packages/calendar/src/features/calendar/hooks packages/calendar/src/hooks/use-calendar-engine.ts
git commit -m "refactor(engine): split useCalendarEngine into config/navigation/data/interaction slices"
```

---

### Task 4: TDD — extend `openEventForm` to carry the cell's resource

`CellInfo.resource` is silently dropped by the engine path today: `openEventForm` accepts
`Partial<CalendarEvent>`, which has `resourceId` but no `resource`, so when the regular
provider's `handleDateClick` does `calendarEngine.openEventForm(info)` the resource never
reaches the new event. This task makes `openEventForm` accept the full cell info — the
prerequisite for Task 6's unification.

**Files:**
- Modify: `packages/calendar/src/hooks/use-calendar-engine.test.ts` (failing tests first)
- Modify: `packages/calendar/src/features/calendar/types/index.ts` (new `OpenEventFormInput`)
- Modify: `packages/calendar/src/features/calendar/hooks/use-calendar-interaction.ts`
- Modify: `packages/calendar/src/hooks/use-calendar-engine.ts` (return type only)
- Modify: `packages/calendar/src/hooks/use-smart-calendar-context.ts` (widen `IlamyCalendarApi.openEventForm`)
- Modify: `packages/calendar/src/index.ts` (export the new type)

- [ ] **Step 1: RED — add the failing tests**

In `use-calendar-engine.test.ts`, inside `describe('event form', ...)` after the
`'should open event form with specific date'` test, add:

```ts
		it('should carry the clicked cell resource into the new event', () => {
			const { result } = renderHook(() => useCalendarEngine(defaultConfig))

			const start = dayjs('2025-03-15T14:00:00.000Z')
			act(() =>
				result.current.openEventForm({
					start,
					end: start.add(30, 'minute'),
					allDay: true,
					resource: { id: 'room-1', title: 'Room 1' },
				})
			)

			expect(result.current.selectedEvent?.resourceId).toBe('room-1')
			expect(result.current.selectedEvent?.allDay).toBe(true)
		})

		it('should prefer an explicit resourceId over the carried resource', () => {
			const { result } = renderHook(() => useCalendarEngine(defaultConfig))

			act(() =>
				result.current.openEventForm({
					resourceId: 'explicit-id',
					resource: { id: 'room-1', title: 'Room 1' },
				})
			)

			expect(result.current.selectedEvent?.resourceId).toBe('explicit-id')
		})
```

Run: `cd packages/calendar && bun test src/hooks/use-calendar-engine.test.ts 2>&1 | tail -5 && cd ../..`
Expected: `1 fail` — `should carry the clicked cell resource into the new event` fails with
`expect(received).toBe('room-1')` receiving `undefined` (bun strips types at runtime, so the
red shows as an assertion failure; `bun run type-check` would also flag the unknown `resource`
key). The explicit-resourceId test passes already. Do not proceed until you have seen this
failure.

- [ ] **Step 2: GREEN — add `OpenEventFormInput` to the feature types**

In `packages/calendar/src/features/calendar/types/index.ts`, directly after the `CellInfo`
interface (currently lines 54-63, ending `allDay?: boolean\n}`), add:

```ts
/**
 * Input accepted by `openEventForm`. A partial event, optionally carrying the
 * full resource of the clicked cell (`CellInfo` is assignable as-is). When no
 * explicit `resourceId` is given, the carried resource's id is used.
 */
export type OpenEventFormInput = Partial<CalendarEvent> & {
	resource?: Resource
}
```

(`CalendarEvent` and `Resource` are already imported in this file.)

- [ ] **Step 3: GREEN — implement in the interaction slice**

In `use-calendar-interaction.ts`, add the type import:

```ts
import type { OpenEventFormInput } from '@/features/calendar/types'
```

change the slice interface line:

```ts
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
```

to:

```ts
	openEventForm: (eventData?: OpenEventFormInput) => void
```

and replace the `openEventForm` callback body:

```ts
	const openEventForm = useCallback(
		(eventData?: Partial<CalendarEvent>) => {
			if (eventData?.start) {
				setSelectedDate(eventData.start)
			}
			const start = eventData?.start ?? currentDate
			setSelectedEvent({
				title: t('newEvent'),
				start,
				end: eventData?.end ?? start.add(1, 'hour'),
				resourceId: eventData?.resourceId,
				description: '',
				allDay: eventData?.allDay ?? false,
			} as CalendarEvent)
			setIsEventFormOpen(true)
		},
		[currentDate, t]
	)
```

with:

```ts
	const openEventForm = useCallback(
		(eventData?: OpenEventFormInput) => {
			if (eventData?.start) {
				setSelectedDate(eventData.start)
			}
			const start = eventData?.start ?? currentDate
			const resourceId = eventData?.resourceId ?? eventData?.resource?.id
			setSelectedEvent({
				title: t('newEvent'),
				start,
				end: eventData?.end ?? start.add(1, 'hour'),
				resourceId,
				description: '',
				allDay: eventData?.allDay ?? false,
			} as CalendarEvent)
			setIsEventFormOpen(true)
		},
		[currentDate, t]
	)
```

- [ ] **Step 4: Propagate the signature to the engine return and the public API**

In `use-calendar-engine.ts`, change the `CalendarEngineReturn` line:

```ts
	openEventForm: (eventData?: Partial<CalendarEvent>) => void
```

to:

```ts
	openEventForm: (eventData?: OpenEventFormInput) => void
```

adding `import type { OpenEventFormInput } from '@/features/calendar/types'`.

In `use-smart-calendar-context.ts`, `IlamyCalendarApi` currently declares:

```ts
	readonly openEventForm: (eventData?: Partial<CalendarEvent>) => void
```

Widen it (additive — accepting more is not a break, no migration entry needed):

```ts
	readonly openEventForm: (eventData?: OpenEventFormInput) => void
```

adding `OpenEventFormInput` to the existing `@/features/calendar/types` type import (the file
currently has no import from that path — add
`import type { OpenEventFormInput } from '@/features/calendar/types'`).

In `packages/calendar/src/index.ts`, the feature-types export block currently reads:

```ts
export type {
	CalendarClassesOverride,
	CellInfo,
	IlamyCalendarProps,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from './features/calendar/types'
```

Add the new type:

```ts
export type {
	CalendarClassesOverride,
	CellInfo,
	IlamyCalendarProps,
	OpenEventFormInput,
	RenderCurrentTimeIndicatorProps,
	SlotDuration,
} from './features/calendar/types'
```

- [ ] **Step 5: Verify (build first — public types changed) and commit**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail` — including the two Step-1 tests now green, and Task 2's pins
still green (no provider has switched paths yet).

```bash
git add packages/calendar/src/hooks packages/calendar/src/features/calendar docs packages/calendar/src/index.ts
git commit -m "feat(engine): openEventForm carries the clicked cell resource (OpenEventFormInput)"
```

---

### Task 5: Move the click handlers into the interaction slice; one shared `useCalendarContextValue`; slim `CalendarProvider`

Behavior-preserving for the regular calendar (its `handleDateClick` already delegated to
`openEventForm`, and `CellInfo.resource` is always `undefined` on regular grids). The full
suite — especially `provider.test.tsx` and the view-click integration tests — is the net.

**Files:**
- Modify: `packages/calendar/src/features/calendar/hooks/use-calendar-interaction.ts`
- Modify: `packages/calendar/src/hooks/use-calendar-engine.ts`
- Modify: `packages/calendar/src/features/calendar/contexts/calendar-context/context.ts`
- Rewrite: `packages/calendar/src/features/calendar/contexts/calendar-context/provider.tsx`

- [ ] **Step 1: Add the handlers to the interaction slice**

In `use-calendar-interaction.ts`, add `import type { CellInfo } from '@/features/calendar/types'`
(merge into the existing type import from that path), extend the params:

```ts
export interface CalendarInteractionParams {
	currentDate: Dayjs
	t: TranslatorFunction
	disableEventClick?: boolean
	disableCellClick?: boolean
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
}
```

extend the slice interface with:

```ts
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
```

destructure the new params in the hook signature
(`disableEventClick, disableCellClick, onEventClick, onCellClick`), and add the handlers
after `closeEventForm` — these are the lines deleted verbatim from BOTH providers
(`calendar-context/provider.tsx:129-165`, `resource-calendar-context/provider.tsx:145-194`),
with the resource copy's hand-rolled `newEvent` replaced by the now-resource-aware
`openEventForm`:

```ts
	// Internal: open the form pre-filled with an EXISTING event (clicked event).
	const editEvent = useCallback((event: CalendarEvent) => {
		setSelectedEvent(event)
		setIsEventFormOpen(true)
	}, [])

	const handleEventClick = useCallback(
		(event: CalendarEvent) => {
			if (disableEventClick) {
				return
			}
			if (onEventClick) {
				onEventClick(event)
			} else {
				editEvent(event)
			}
		},
		[disableEventClick, onEventClick, editEvent]
	)

	const handleDateClick = useCallback(
		(info: CellInfo) => {
			if (disableCellClick) {
				return
			}

			if (onCellClick) {
				onCellClick(info)
			} else {
				openEventForm(info)
			}
		},
		[onCellClick, disableCellClick, openEventForm]
	)
```

and add `handleEventClick, handleDateClick` to the return object. `editEvent` stays internal
to the slice — neither context value exposed it before, and the merged value must stay
shape-identical.

- [ ] **Step 2: Thread the click config through the engine**

In `use-calendar-engine.ts`:

Append to `CalendarEngineConfig` (after `plugins?: IlamyPlugin[]`):

```ts
	onEventClick?: (event: CalendarEvent) => void
	onCellClick?: (info: CellInfo) => void
	disableEventClick?: boolean
	disableCellClick?: boolean
```

(`CellInfo` is already imported since Task 4 — merge into that type import.)

Add below `CalendarEngineReturn`:

```ts
/**
 * Click handlers the engine derives from the interaction slice. Returned
 * ALONGSIDE CalendarEngineReturn and destructured off by the provider before
 * the context spread, so the merged context value keeps its exact v1 shape
 * (the handlers surface as `onEventClick` / `onCellClick`).
 */
export interface CalendarEngineHandlers {
	handleEventClick: (event: CalendarEvent) => void
	handleDateClick: (info: CellInfo) => void
}
```

Change the signature:

```ts
export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn => {
```

to:

```ts
export const useCalendarEngine = (
	config: CalendarEngineConfig
): CalendarEngineReturn & CalendarEngineHandlers => {
```

Add `onEventClick, onCellClick, disableEventClick, disableCellClick` to the config
destructure, change the interaction call to:

```ts
	const interaction = useCalendarInteraction({
		currentDate: navigation.currentDate,
		t: configSlice.t,
		disableEventClick,
		disableCellClick,
		onEventClick,
		onCellClick,
	})
```

and append to the return object (after `t: configSlice.t,`):

```ts
		handleEventClick: interaction.handleEventClick,
		handleDateClick: interaction.handleDateClick,
```

- [ ] **Step 3: Declare the context's hidden `locale` field**

The current provider puts `locale` into the context value (`provider.tsx:175`) but
`CalendarContextType` never declared it — the annotated assembly below needs it. In
`calendar-context/context.ts`, change:

```ts
	isCellDisabled?: (info: CellInfo) => boolean
	timezone?: string
```

to:

```ts
	isCellDisabled?: (info: CellInfo) => boolean
	locale?: string
	timezone?: string
```

(Value shape unchanged — this declares a field the value has carried all along.)

- [ ] **Step 4: Rewrite the provider around `useCalendarContextValue`**

In `calendar-context/provider.tsx`: keep the import block and the `CalendarProviderProps`
interface (lines 1-66) exactly as they are, except add `CalendarContextType` to the context
import — change line 20 from `import { CalendarContext } from './context'` to:

```ts
import { CalendarContext, type CalendarContextType } from './context'
```

and drop the now-unused `useCallback` from the react import (line 3 becomes
`import { useMemo } from 'react'`). Then replace EVERYTHING from line 68
(`export const CalendarProvider...`) to the end of the file with:

```tsx
/**
 * Builds the shared context value: engine slices + presentation props. The
 * single assembly point both providers consume — ResourceCalendarProvider
 * spreads this and adds the resource fields on top (until Phase 4 absorbs it).
 */
export const useCalendarContextValue = (
	props: Omit<CalendarProviderProps, 'children'>
): CalendarContextType => {
	const {
		events = [],
		firstDayOfWeek = 0,
		initialView = 'month',
		initialDate,
		renderEvent,
		onEventClick,
		onCellClick,
		isCellDisabled,
		onViewChange,
		onEventAdd,
		onEventUpdate,
		onEventDelete,
		onDateChange,
		locale,
		timezone,
		disableCellClick,
		disableEventClick,
		disableDragAndDrop,
		dayMaxEvents,
		eventSpacing = GAP_BETWEEN_ELEMENTS,
		eventHeight = EVENT_BAR_HEIGHT,
		stickyViewHeader = true,
		viewHeaderClassName = '',
		headerComponent,
		headerClassName,
		businessHours,
		renderEventForm,
		translations,
		translator,
		timeFormat = '12-hour',
		classesOverride,
		renderCurrentTimeIndicator,
		renderHour,
		hideNonBusinessHours = false,
		hideExportButton = false,
		hiddenDays,
		slotDuration = 60,
		scrollTime,
		plugins,
	} = props

	// The engine returns the context core plus the two click handlers; the
	// handlers are destructured OFF so the spread below keeps the exact v1
	// context shape (they re-enter as onEventClick / onCellClick).
	const { handleEventClick, handleDateClick, ...calendarEngine } =
		useCalendarEngine({
			events,
			firstDayOfWeek,
			initialView,
			initialDate,
			businessHours,
			onEventAdd,
			onEventUpdate,
			onEventDelete,
			onDateChange,
			onViewChange,
			locale,
			timezone,
			translations,
			translator,
			plugins,
			onEventClick,
			onCellClick,
			disableEventClick,
			disableCellClick,
		})

	return useMemo(
		() => ({
			...calendarEngine,
			renderEvent,
			onEventClick: handleEventClick,
			onCellClick: handleDateClick,
			isCellDisabled,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			renderEventForm,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			hideExportButton,
			hiddenDays,
			slotDuration,
			scrollTime,
		}),
		[
			calendarEngine,
			renderEvent,
			handleEventClick,
			handleDateClick,
			isCellDisabled,
			locale,
			timezone,
			disableCellClick,
			disableEventClick,
			disableDragAndDrop,
			dayMaxEvents,
			eventSpacing,
			eventHeight,
			stickyViewHeader,
			viewHeaderClassName,
			headerComponent,
			headerClassName,
			businessHours,
			renderEventForm,
			timeFormat,
			classesOverride,
			renderCurrentTimeIndicator,
			renderHour,
			hideNonBusinessHours,
			hideExportButton,
			hiddenDays,
			slotDuration,
			scrollTime,
		]
	)
}

export const CalendarProvider: React.FC<CalendarProviderProps> = ({
	children,
	...props
}) => {
	const contextValue = useCalendarContextValue(props)

	const wrappedChildren = composePluginProviders(
		contextValue.getProviders(),
		children
	)

	return (
		<CalendarContext.Provider value={contextValue}>
			{wrappedChildren}
		</CalendarContext.Provider>
	)
}
```

Note: `src/testing/index.tsx` imports `CalendarProvider` from this exact path
(`@/features/calendar/contexts/calendar-context/provider`) and it is the public `./testing`
entry — the file does NOT move and the export name is unchanged, so the entry needs no edit.
Verify anyway:

Run: `grep -n "calendar-context/provider" packages/calendar/src/testing/index.tsx`
Expected: the existing import line, unchanged.

- [ ] **Step 5: Verify and commit**

Run: `bun run check:fix && bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail`. Task 2's three resource pins still pass — the resource
provider has not switched paths yet.

```bash
git add packages/calendar/src/features/calendar packages/calendar/src/hooks/use-calendar-engine.ts
git commit -m "refactor(provider): click handlers move to interaction slice; shared useCalendarContextValue"
```

---

### Task 6: Resource provider becomes prop-mapping over the same slices (allDay behavior change, failing-first)

Deletes the duplicated `editEvent`/`handleEventClick`/`handleDateClick` and the mirrored
~80-line contextValue memo. The unified `handleDateClick` is the ENGINE's: it respects the
cell's `allDay` flag — the resource copy's `allDay: false` hardcode is the bug being fixed.
This is a behavior change: flip the Task 2 pin first and watch it fail.

**Files:**
- Modify: `packages/calendar/src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx`
- Rewrite: `packages/calendar/src/features/resource-calendar/contexts/resource-calendar-context/provider.tsx` (291 → ~125 lines)
- Append: `docs/migration-v2.md`

- [ ] **Step 1: RED — flip the pinned allDay expectation**

In the Task 2 describe block, replace the second test's title and final assertions:

```tsx
		it('hardcodes allDay: false even when the clicked cell is an all-day cell (v1 behavior pin)', async () => {
```

becomes:

```tsx
		it('respects the allDay flag of the clicked cell (v2 unified behavior)', async () => {
```

and:

```tsx
			expect(screen.getByTestId('selected-event-all-day')).toHaveTextContent(
				'timed'
			)
```

becomes:

```tsx
			expect(screen.getByTestId('selected-event-all-day')).toHaveTextContent(
				'all-day'
			)
```

Run: `cd packages/calendar && bun test src/features/resource-calendar/components/ilamy-resource-calendar/ilamy-resource-calendar.test.tsx 2>&1 | tail -5 && cd ../..`
Expected: `1 fail` — `respects the allDay flag of the clicked cell (v2 unified behavior)`
(the resource provider still hardcodes `allDay: false`). Do not proceed until you have seen
this failure.

- [ ] **Step 2: GREEN — rewrite the resource provider**

Replace the ENTIRE content of
`packages/calendar/src/features/resource-calendar/contexts/resource-calendar-context/provider.tsx`
with:

```tsx
import type React from 'react'
import { useCallback, useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import {
	type CalendarProviderProps,
	useCalendarContextValue,
} from '@/features/calendar/contexts/calendar-context/provider'
import { composePluginProviders } from '@/features/plugins/lib/compose-plugin-providers'
import type { Resource } from '@/features/resource-calendar/types'
import { ResourceCalendarContext } from './context'

const getEventResourceIds = (event: CalendarEvent): (string | number)[] => {
	if (event.resourceIds) {
		return event.resourceIds
	}
	if (event.resourceId !== undefined) {
		return [event.resourceId]
	}
	return []
}

interface ResourceCalendarProviderProps extends CalendarProviderProps {
	resources?: Resource[]
	renderResource?: (resource: Resource) => React.ReactNode
	orientation?: 'horizontal' | 'vertical'
	weekViewGranularity?: 'hourly' | 'daily'
}

/**
 * Prop-mapping over the shared context value: everything except the resource
 * axis comes from useCalendarContextValue (the same slices the regular
 * provider composes). Phase 4 deletes this provider entirely; until then the
 * cross-feature import is the tolerated strangler seam.
 */
export const ResourceCalendarProvider: React.FC<
	ResourceCalendarProviderProps
> = ({
	children,
	resources = [],
	renderResource,
	orientation = 'horizontal',
	weekViewGranularity = 'hourly',
	...props
}) => {
	const baseValue = useCalendarContextValue(props)

	// Resource utilities — both filters go through getEventResourceIds so single
	// and multi-resource events are handled uniformly.
	const getEventsForResource = useCallback(
		(resourceId: string | number): CalendarEvent[] =>
			baseValue.events.filter((e) =>
				getEventResourceIds(e).includes(resourceId)
			),
		[baseValue.events]
	)

	const getEventsForResources = useCallback(
		(resourceIds: (string | number)[]): CalendarEvent[] =>
			baseValue.events.filter((e) =>
				getEventResourceIds(e).some((id) => resourceIds.includes(id))
			),
		[baseValue.events]
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

	const contextValue = useMemo(
		() => ({
			...baseValue,
			resources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			getEventResourceIds,
			renderResource,
			orientation,
			weekViewGranularity,
		}),
		[
			baseValue,
			resources,
			getEventsForResource,
			getEventsForResources,
			getResourceById,
			isEventCrossResource,
			renderResource,
			orientation,
			weekViewGranularity,
		]
	)

	const wrappedChildren = composePluginProviders(
		baseValue.getProviders(),
		children
	)

	return (
		<ResourceCalendarContext.Provider value={contextValue}>
			{wrappedChildren}
		</ResourceCalendarContext.Provider>
	)
}
```

Default-equivalence audit (the old explicit defaults this rewrite drops in favor of
`useCalendarContextValue`'s): `eventSpacing = 1` ≡ `GAP_BETWEEN_ELEMENTS` (= 1,
`lib/constants.ts:3`); `eventHeight = EVENT_BAR_HEIGHT`, `firstDayOfWeek = 0`,
`initialView = 'month'`, `stickyViewHeader = true`, `viewHeaderClassName = ''`,
`timeFormat = '12-hour'`, `hideNonBusinessHours = false`, `hideExportButton = false`,
`slotDuration = 60` — all identical in both v1 providers. The unified fallback also changes
`end`/`title`/`selectedDate` handling NOT at all: `openEventForm` uses
`eventData?.end ?? start.add(1, 'hour')` (CellInfo always carries `end`), the same
`t('newEvent')` title, and sets `selectedDate` whenever `start` is present (always, for a
cell click).

- [ ] **Step 3: Verify GREEN, full suite**

Run: `cd packages/calendar && bun test src/features/resource-calendar 2>&1 | tail -3 && cd ../..`
Expected: `0 fail` — the flipped test passes, all seven resource suites pass.

Run: `bun run check:fix && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: exits 0; `0 fail`.

- [ ] **Step 4: Append the migration entry (same PR as the break — same task as the change)**

In `docs/migration-v2.md`, insert immediately BEFORE the `## Summary checklist` heading
(after Phase 0's "Type tightening" section):

```markdown
## Provider unification (v2 structure overhaul, Phase 2)

### Resource calendar: cell-click fallback now respects the cell's `allDay` flag

**Before (v1):** clicking a cell on `IlamyResourceCalendar` without a custom `onCellClick`
always pre-filled the event form with `allDay: false`, even for all-day cells.

**After (v2):** the pre-filled event respects the clicked cell's flag (`allDay: true` for
all-day cells), matching what `IlamyCalendar` has always done. If you depended on the old
hardcode, pass `onCellClick` and open the form yourself with the shape you want.
```

And add to the `## Summary checklist`:

```markdown
- [ ] Resource calendars: if you relied on cell-click always creating `allDay: false` events, handle it in `onCellClick`.
```

- [ ] **Step 5: Commit**

```bash
git add packages/calendar/src/features/resource-calendar docs/migration-v2.md
git commit -m "feat(resource-calendar)!: provider maps over shared slices; cell click respects allDay"
```

---

### Task 7: Honest `useSmartCalendarContext` — no cast, optional resource fields, optional public `getEventsForResource`

`useSmartCalendarContext` currently lies twice: the `as SmartCalendarContextType` cast claims
every regular calendar has the resource fields, and `IlamyCalendarApi.getEventsForResource`
is required-but-runtime-undefined on regular calendars (calling it crashes). Type-level
tightening (sanctioned v2 break) — the regression net is type-check + the full suite; the
runtime `?.` fixes change no observable behavior because the affected branches only run when
`resourceId` is set, which only happens on resource calendars where the function exists.

**Files:**
- Modify: `packages/calendar/src/hooks/use-smart-calendar-context.ts`
- Modify: `packages/calendar/src/components/grid-cell.tsx` (line ~84; re-validate after Phase 1)
- Modify: `packages/calendar/src/features/calendar/hooks/useProcessedDayEvents.ts` (line ~35)
- Modify: `packages/calendar/src/features/calendar/hooks/useProcessedWeekEvents.ts` (line ~55)
- Modify: 5 resource-feature files (destructure defaults; exact edits below)
- Append: `docs/migration-v2.md`

- [ ] **Step 1: Replace the type alias and kill the cast**

In `use-smart-calendar-context.ts`, add to the imports:

```ts
import type { CalendarContextType } from '@/features/calendar/contexts/calendar-context/context'
```

Replace:

```ts
/**
 * Full internal context type used by library components.
 */
export type SmartCalendarContextType = ResourceCalendarContextType
```

with:

```ts
/**
 * Resource-calendar additions, optional on the smart context: a regular
 * calendar provides none of them, and the type now says so instead of the old
 * unsafe cast pretending they are always present.
 */
type ResourceContextFields = Pick<
	ResourceCalendarContextType,
	| 'resources'
	| 'getEventsForResource'
	| 'getEventsForResources'
	| 'getResourceById'
	| 'isEventCrossResource'
	| 'getEventResourceIds'
	| 'renderResource'
	| 'orientation'
	| 'weekViewGranularity'
>

/**
 * Full internal context type used by library components.
 */
export type SmartCalendarContextType = CalendarContextType &
	Partial<ResourceContextFields>
```

Then replace the cast in the hook body:

```ts
	// In regular calendars, resource-specific fields will be undefined.
	const context = (resourceContext ||
		regularContext) as SmartCalendarContextType
```

with:

```ts
	// ResourceCalendarContextType extends CalendarContextType, so both context
	// values are assignable to the smart type without a cast; in regular
	// calendars the resource-specific fields are honestly undefined.
	const context = resourceContext ?? regularContext
```

- [ ] **Step 2: Make the public `getEventsForResource` optional**

In `IlamyCalendarApi`, replace:

```ts
	readonly getEventsForResource: (
		resourceId: string | number
	) => CalendarEvent[]
```

with:

```ts
	/**
	 * Only present on resource calendars (`IlamyResourceCalendar`); `undefined`
	 * on a regular calendar. Call as `getEventsForResource?.(id) ?? []`.
	 */
	readonly getEventsForResource?: (
		resourceId: string | number
	) => CalendarEvent[]
```

The passthrough line in `useIlamyCalendarContext`
(`getEventsForResource: context.getEventsForResource,`) compiles unchanged.

- [ ] **Step 3: Fix the three shared call sites with `?.`**

`components/grid-cell.tsx` (~line 81-86), current:

```ts
		if (resourceId) {
			return filterEventsByResource(
				todayEvents,
				getEventsForResource(resourceId) ?? []
			)
		}
```

replacement:

```ts
		if (resourceId) {
			return filterEventsByResource(
				todayEvents,
				getEventsForResource?.(resourceId) ?? []
			)
		}
```

`features/calendar/hooks/useProcessedDayEvents.ts` (~line 32-37), current:

```ts
		if (resourceId) {
			dayEvents = filterEventsByResource(
				dayEvents,
				getEventsForResource(resourceId)
			)
		}
```

replacement:

```ts
		if (resourceId) {
			dayEvents = filterEventsByResource(
				dayEvents,
				getEventsForResource?.(resourceId) ?? []
			)
		}
```

`features/calendar/hooks/useProcessedWeekEvents.ts` (~line 52-57), current:

```ts
		if (resourceId) {
			weekEvents = filterEventsByResource(
				weekEvents,
				getEventsForResource(resourceId)
			)
		}
```

replacement:

```ts
		if (resourceId) {
			weekEvents = filterEventsByResource(
				weekEvents,
				getEventsForResource?.(resourceId) ?? []
			)
		}
```

(Phase 1 rewired these two hooks' geometry imports — the filter blocks above are outside that
diff, but confirm the surrounding code before editing.)

- [ ] **Step 4: Default the `resources` destructures inside the resource feature**

These components only ever render under `ResourceCalendarProvider` where `resources` exists,
but the honest type makes it `Resource[] | undefined` — a destructure default is the
guard-free fix:

`features/resource-calendar/components/resource-event-grid.tsx:30`:
`const { resources } = useSmartCalendarContext()` →
`const { resources = [] } = useSmartCalendarContext()`

`features/resource-calendar/components/day-view/resource-day-vertical.tsx:13-19`:

```ts
	const {
		currentDate,
		resources,
		businessHours,
		hideNonBusinessHours,
		slotDuration,
	} = useSmartCalendarContext()
```

→ change the `resources,` line to `resources = [],`

`features/resource-calendar/components/day-view/resource-day-horizontal.tsx:9-10`:
`const { currentDate, t, businessHours, hideNonBusinessHours, resources } =` →
`const { currentDate, t, businessHours, hideNonBusinessHours, resources = [] } =`

`features/resource-calendar/components/month-view/resource-month-vertical.tsx:9`:
`const { currentDate, resources } = useSmartCalendarContext()` →
`const { currentDate, resources = [] } = useSmartCalendarContext()`

`features/resource-calendar/components/week-view/use-resource-week-view-data.ts:6-14`: change
the `resources,` line in the destructure to `resources = [],`

The remaining optional-field readers need no edits: `orientation === 'vertical'` and
`weekViewGranularity === 'hourly'` comparisons accept `undefined`; `view-controls.tsx:37`
already guards (`resources && resources.length > 0`); `droppable-cell.tsx:70` and
`use-effective-business-hours.ts:19-20` already use `getResourceById?.(...)` /
an explicit guard — their existing defensive code becomes type-justified instead of
dead-per-the-types.

- [ ] **Step 5: Type-check sweep for stragglers**

Run: `bun run type-check`
Expected: exits 0. If any further `'X' is possibly 'undefined'` errors surface in the
resource feature, apply the same destructure-default (arrays) or `?.` (functions) pattern —
never `!`, never `as`.

- [ ] **Step 6: Append the migration entry**

In `docs/migration-v2.md`, inside the `## Provider unification (v2 structure overhaul,
Phase 2)` section created in Task 6 (still before `## Summary checklist`), append:

```markdown
### `getEventsForResource` on `useIlamyCalendarContext()` is now optional

It only ever existed at runtime on resource calendars; the v1 type claimed it was always
present, so calling it on a regular calendar compiled and then crashed. v2 types it honestly.

**Before (v1)**

```ts
const { getEventsForResource } = useIlamyCalendarContext()
const roomEvents = getEventsForResource('room-1')
```

**After (v2)**

```ts
const { getEventsForResource } = useIlamyCalendarContext()
const roomEvents = getEventsForResource?.('room-1') ?? []
```
```

And add to the `## Summary checklist`:

```markdown
- [ ] Call `getEventsForResource?.(id) ?? []` — it is `undefined` on regular calendars now (the type finally says so).
```

- [ ] **Step 7: Verify (build first — public types changed) and commit**

Run: `bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail`.

```bash
git add packages/calendar/src docs/migration-v2.md
git commit -m "feat(context)!: honest SmartCalendarContextType, optional getEventsForResource"
```

---

### Task 8: Move `use-smart-calendar-context.ts` into `features/calendar/hooks/`

The selector is calendar-feature code (master plan target structure). History-preserving
`git mv` plus a mechanical import sweep. The file has no relative imports (all `@/` aliases),
so only its importers change.

**Files:**
- Move: `packages/calendar/src/hooks/use-smart-calendar-context.ts` → `packages/calendar/src/features/calendar/hooks/use-smart-calendar-context.ts`
- Modify: ~55 importer files (mechanical), `packages/calendar/src/index.ts`

- [ ] **Step 1: Move and sweep**

```bash
git mv packages/calendar/src/hooks/use-smart-calendar-context.ts packages/calendar/src/features/calendar/hooks/use-smart-calendar-context.ts
grep -rl "@/hooks/use-smart-calendar-context" packages/calendar/src | xargs sed -i '' "s|@/hooks/use-smart-calendar-context|@/features/calendar/hooks/use-smart-calendar-context|g"
```

Then in `packages/calendar/src/index.ts`, the public hook export currently reads:

```ts
export {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
} from './hooks/use-smart-calendar-context'
```

change the path to:

```ts
export {
	type IlamyCalendarApi,
	useIlamyCalendarContext,
} from './features/calendar/hooks/use-smart-calendar-context'
```

- [ ] **Step 2: Confirm nothing still points at the old path**

Run: `grep -rn "hooks/use-smart-calendar-context" packages apps --include='*.ts*' | grep -v node_modules | grep -v dist | grep -v "features/calendar/hooks"`
Expected: no output.

- [ ] **Step 3: Verify (entry files unmoved, dist layout unchanged — but rebuild anyway) and commit**

Run: `bun run check:fix && bun run build && bun run type-check && bun run test 2>&1 | grep -E ' (pass|fail)'`
Expected: all exit 0; `0 fail`. (`src/index.ts`, `src/testing/index.tsx`,
`src/plugins/recurrence.ts` are untouched, per the bunup entry/exports landmine.)

```bash
git add -A packages/calendar/src
git commit -m "refactor(hooks): move use-smart-calendar-context into features/calendar/hooks"
```

---

### Task 9: Final gate, docs sweep, dev log, PR

**Files:**
- Modify: `AGENTS.md`, `docs/hooks-and-context.md`, any other doc with stale paths
- Create/append: `docs/logs/<today YYYY-MM-DD>.md`

- [ ] **Step 1: Full CI gate**

Run: `bun run ci`
Expected: exits 0 (biome check → build → type-check → tests all green).

- [ ] **Step 2: Docs + agent-instruction sweep (mandatory per master plan)**

Run: `grep -rn "use-smart-calendar-context\|use-calendar-engine" docs AGENTS.md .agents --include='*.md' | grep -v logs | grep -v v2-overhaul`
Update every stale path/description. Known targets:

- `AGENTS.md` Key Paths — current:

```
  hooks/
    use-calendar-engine.ts                     # Main calendar engine
    use-smart-calendar-context.ts              # Type-safe context access
```

becomes:

```
  hooks/
    use-calendar-engine.ts                     # Engine composer (slices + cross-cutting effects)
```

and the `features/calendar/hooks/` line —
`hooks/                                   # useProcessedDayEvents, useProcessedWeekEvents` —
becomes:

```
      hooks/                                   # engine slices (use-calendar-{config,navigation,data,interaction}),
                                               #   use-smart-calendar-context, useProcessed*Events
```

- `docs/hooks-and-context.md` (17 path refs per the master plan's landmine list): update the
  engine/provider/smart-context sections to describe the slice composition and the new file
  locations. `docs/types-and-interfaces.md` and `docs/testing-guide.md`: fix any references
  to `src/hooks/use-smart-calendar-context.ts` and to `SmartCalendarContextType`'s old
  `= ResourceCalendarContextType` definition.

- [ ] **Step 3: Dev log (mandatory per CLAUDE.md — BEFORE reporting completion)**

Append to today's `docs/logs/YYYY-MM-DD.md` (create if absent; delete the oldest log file if
the directory exceeds 10). Summarize under `## Changes` as
`**[v2 phase 2]**: split useCalendarEngine into config/navigation/data/interaction slices
(timezone+locale effects stay in the composer); deleted ~190 duplicated provider lines via
shared useCalendarContextValue; openEventForm carries CellInfo.resource; resource cell-click
respects allDay (breaking, migration entry); SmartCalendarContextType honest, public
getEventsForResource optional (breaking, migration entry); use-smart-calendar-context moved
to features/calendar/hooks.` and list the files under `## Files Modified`.

- [ ] **Step 4: Ask the user to review; on explicit approval, push and open the PR**

Suggested title: `feat(v2)!: phase 2 — one provider, engine slices`
PR body links `docs/v2-overhaul-plan.md` (Phase 2) and the two new migration entries. NEVER
push or post without explicit approval in the user's latest message; chain the
`touch .claude/state/pr-post-approved.flag` ritual with the `gh pr create` command.

---

## Self-review notes

- **Spec coverage:** all five master-plan Phase 2 bullets are covered — resource-provider
  pins FIRST (Task 2, extending the existing `ilamy-resource-calendar.test.tsx` per the
  amendment, since no resource provider test file exists and new test files are forbidden);
  slice extraction in composition order with `pluginRuntime` as the named fifth dependency
  and the timezone effect kept in the composer (Task 3); `handleDateClick` unification via a
  resource-carrying `openEventForm` with the `allDay` decision as a failing-first behavior
  change + migration entry (Tasks 4-6); cast-free selector with honestly-optional resource
  fields, optional public `getEventsForResource`, and `?.` at `grid-cell.tsx` + both
  processed-events hooks (Task 7); the smart-context move (Task 8).
- **One deliberate extension of the amendment:** the locale effect
  (`use-calendar-engine.ts:177-184`) has the same cross-slice shape as the timezone effect
  (config trigger mutating navigation state), so it also stays in the composer. Slicing it
  mechanically would have required the config slice to receive navigation's setter before
  navigation exists in the composition order.
- **"Composed inside ONE provider" reading:** the slices are composed at exactly one point —
  `useCalendarEngine`, which the one shared `useCalendarContextValue` calls and the provider
  consumes. Keeping the composer in its current file (rather than inlining in `provider.tsx`)
  preserves the 60+ engine tests as the pin for the mechanical split and leaves the public
  `./testing` entry's provider import untouched. Phase 4's final `git mv` sweep relocates the
  composer into the feature.
- **Shape identity:** the engine's two new handler fields are destructured off before the
  context spread; the only type change to the context is declaring the `locale` field the
  value always carried. Memo structure and dependency lists match v1, so rerender behavior is
  unchanged.
- **Duplication deleted:** `editEvent` + `handleEventClick` (verbatim ×2), `handleDateClick`
  (near-identical ×2), and both ~60-line contextValue memos + mirrored dep arrays — the
  resource provider drops from 291 to ~125 lines, with the ~150-190 duplicated lines now
  existing once in the interaction slice and `useCalendarContextValue`.
- **Build-before-check** is applied in every task that touches public types (4, 5, 7, 8) —
  recurrence/demo resolve `@ilamy/calendar` through built `dist/*.d.ts`.
- **Ordering constraints:** Task 2 must precede everything (pins), Task 4 must precede Task 5
  (`handleDateClick` delegates to the resource-aware `openEventForm`), Task 5 must precede
  Task 6 (the resource provider consumes `useCalendarContextValue`), Task 7 should follow
  Task 6 (the honest types describe the final provider pair). Task 8 is independent after 7.
