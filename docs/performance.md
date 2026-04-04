# Performance Optimization Guide

This document explains the rendering performance optimizations in `@ilamy/calendar` and the architectural decisions behind them.

## Overview

The calendar renders large component trees — a resource month view has 6 resource rows × 30 day cells = 180+ cells, each with event layers and drag-and-drop support. Naive implementations cause multi-second renders. The optimizations below brought dev-mode render times from ~900ms to ~280ms (production ≈ 140ms).

## Key Optimizations

### 1. DOM-Based Drop Detection (Replacing `useDroppable`)

**Problem:** Every cell called `@dnd-kit`'s `useDroppable` hook, registering 180+ droppable zones. Each registration dispatches to DndContext, triggers DOM measurement, and cascades state updates.

**Solution:** Cells render as plain `<div>` elements with data attributes (`data-droppable-cell`, `data-date`, `data-resource-id`, etc.). Drop target detection uses `document.elementsFromPoint()` in the `handleDragEnd` handler instead of `@dnd-kit`'s collision system.

**Files:**
- `src/components/droppable-cell.tsx` — data attributes instead of `useDroppable`
- `src/components/drag-and-drop/calendar-dnd-context.tsx` — `findDropCellFromPointer()` for drop detection

**Trade-off:** We lose `@dnd-kit`'s built-in collision detection algorithms. The DOM query approach is simpler and sufficient for calendar cells. `useDraggable` is still used on events for drag initiation.

### 2. CSS Animations (Replacing Framer Motion)

**Problem:** `AnimatedSection` (AnimatePresence + motion.div) wrapped every DraggableEvent and every header cell. With ~30 events, this created 120 Framer Motion components. AnimatePresence's Presence lifecycle triggers multiple React render passes, cascading into 31 commits per navigation.

**Solution:** All animations use CSS via `tailwindcss-animate`:
- Headers: `animate-in zoom-in duration-500 ease-out` (defined as `HEADER_ANIMATION` constant)
- Events: `animate-in fade-in zoom-in-95 duration-500 ease-in-out`

CSS animations run on the browser's compositor thread — zero React re-renders, zero extra commits.

**Files:**
- `src/lib/constants.ts` — `HEADER_ANIMATION` constant
- `src/components/draggable-event/draggable-event.tsx` — CSS animation classes
- Deleted `src/components/animations/animated-section.tsx`
- Removed `motion` from `package.json`

### 3. Row-Level Event Computation Sharing

**Problem:** In month view, both GridCells (42 total) and event overlay layers (6 total) independently called `getEventsForDateRange`, totaling 48 filter passes over all processed events.

**Solution:** `useProcessedWeekEvents` is called once at the `HorizontalGridRow` level. It returns:
- `positionedEvents` — passed to `HorizontalGridEventsLayer` for the event overlay
- `dayEventsMap` — a `Map<string, CalendarEvent[]>` grouped by day, passed to each `GridCell` via `precomputedEvents` prop

This reduces 48 filter passes to 6 (one per row) + 6 small per-day groupings.

**Files:**
- `src/features/calendar/hooks/useProcessedWeekEvents.ts` — returns `{ positionedEvents, dayEventsMap }`
- `src/components/horizontal-grid/horizontal-grid-row.tsx` — calls hook at row level
- `src/components/grid-cell.tsx` — accepts `precomputedEvents` prop

### 4. Resource Calendar Fast Path

**Problem:** Resource calendar GridCells computed per-cell events (180 × `getEventsForDateRange`) even though the `HorizontalGridEventsLayer` overlay handles all event rendering.

**Solution:** `HorizontalGridRow` passes `shouldRenderEvents={false}` for resource calendar variant. GridCell skips event-related computation and renders a lightweight cell with just business-hour styling and click handling.

**Files:**
- `src/components/horizontal-grid/horizontal-grid-row.tsx` — `cellShouldRenderEvents = !isResourceCalendar`
- `src/components/grid-cell.tsx` — fast path when `shouldRenderEvents` is false

### 5. Lazy State Initialization

**Problem:** `useCalendarEngine` had 3 `useEffect` hooks (events, locale, timezone) that fired on mount, triggering 5+ `setState` calls. Each caused a separate React commit, cascading through all context consumers. This produced 43 commits on initial mount.

**Solution:** Initialize `useState` with lazy initializers that apply timezone and locale upfront:

```tsx
const [currentDate, setCurrentDate] = useState<Dayjs>(() => {
  let date = dayjs.isDayjs(initialDate) ? initialDate : dayjs(initialDate)
  if (timezone) { dayjs.tz.setDefault(timezone); date = date.tz(timezone) }
  if (locale) { dayjs.locale(locale); date = date.locale(locale) }
  return date
})
```

Effects are guarded with `useRef` to skip on mount — they only fire when props actually change after initialization.

**Files:**
- `src/hooks/use-calendar-engine.ts`

### 6. Stable useMemo Dependencies

**Problem:** `useProcessedWeekEvents` and `useProcessedDayEvents` computed `weekStart`/`weekEnd` via `.startOf('day')`/`.endOf('day')` outside their `useMemo` callbacks, then included the Dayjs objects as dependencies. Since these methods always return new instances, the memos busted on every render for every resource row.

**Solution:** Compute `.startOf()`/`.endOf()` inside the `useMemo` callback. Use the stable `days` array (from `useStableDays`) as the dependency instead.

**Files:**
- `src/features/calendar/hooks/useProcessedWeekEvents.ts`
- `src/features/calendar/hooks/useProcessedDayEvents.ts`

### 7. Navigation Transitions

**Problem:** Date and view navigation triggers synchronous state updates that cascade through the entire component tree.

**Solution:** Wrap navigation state updates in `React.startTransition`:

```tsx
const navigatePeriod = useCallback((direction: 1 | -1) => {
  startTransition(() => {
    setCurrentDate((prev) => { ... })
  })
}, [view, onDateChange, firstDayOfWeek])
```

This marks navigation as non-urgent, allowing React to keep the UI responsive and batch cascading updates from `useDraggable` registrations.

**Files:**
- `src/hooks/use-calendar-engine.ts` — `navigatePeriod`, `selectDate`, `today`, `handleViewChange`

## Shared Utilities

Repeated code patterns were extracted to reduce bundle size and improve maintainability:

### Hooks
| Hook | Purpose | Replaces |
|------|---------|----------|
| `useStableDays` | Stabilize Dayjs[] by value comparison | Inline ref patterns in 2 hooks |
| `useStableResources` | Stabilize Resource[] by ID comparison | Inline ref patterns in 2 components |
| `useCalendarHandlers` | editEvent, handleEventClick, handleDateClick | Identical callbacks in 2 providers |
| `useAllEventsDialog` | Dialog ref + open/close callbacks | Identical patterns in 2 providers |

### Utilities
| Utility | Purpose | Replaces |
|---------|---------|----------|
| `isEventInRange` | Event-range overlap check | 4 inline 6-line blocks |
| `getResourceBusinessHours` | Extract business hours from resources | 5 inline mappings |
| `createTimeColumn` | Factory for time column config object | 4 identical object literals |

### Components
| Component | Purpose | Replaces |
|-----------|---------|----------|
| `ResourceVerticalHeader` | Resource header row in vertical views | Identical JSX in 2 files |
| `ResourceAllDaySection` | All-day row with resource columns | Identical JSX in 2 files |
| `TimeHeaderRow` | Time label header in horizontal views | Identical JSX in 2 files |

### Class Constants
| Constant | Value | Used in |
|----------|-------|---------|
| `HEADER_ANIMATION` | `animate-in zoom-in duration-500 ease-out` | 7 header files |
| `RESOURCE_CORNER` | Sticky corner cell styling | 3 resource horizontal views |
| `RESOURCE_ROW_LABEL` | Sticky row label styling | horizontal-grid-row |
| `TIME_COLUMN` | Time/date column sizing + sticky | 4 vertical view files |
| `TIME_COLUMN_CELL` | Time column cell text styling | 5 renderCell functions |
| `CELL_CLASS` | Grid cell base styling | grid-cell |
| `TODAY_HIGHLIGHT` | Current day/hour highlight | 2 resource views |

## Drag-Over Hover Feedback

During drag, the `DragOverlay` has `pointer-events: none` so the pointer passes through to the cells underneath. The `hover:bg-accent` class on `CELL_CLASS` provides native CSS hover feedback without any React state or DOM manipulation.

## Performance Metrics

| Metric | Before | After |
|--------|--------|-------|
| Bundle size | 612 KB | 592 KB |
| Dependencies | includes `motion` | `motion` removed |
| Test suite | ~16s | ~6s |
| Commits per navigation (dev) | 43 | 11 |
| Resource month render (dev) | ~770ms | ~280ms |
| Regular month render (dev) | ~915ms | ~280ms |

Dev-mode numbers include React StrictMode overhead (doubles renders/effects). Production performance is approximately half the shown values.
