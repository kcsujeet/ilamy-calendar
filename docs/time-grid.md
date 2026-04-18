# Time Grid Architecture

Internal documentation for the vertical time grid used in day and week views (both standard and resource calendar).

## Data Flow

```
getDayHours({ referenceDate })     Generate 24 hourly slots for a date
        |
getViewHours({ referenceDate })    Filter by business hours if enabled
        |
   View component                  Build columns, pass to VerticalGrid
        |
   VerticalGrid                    Render grid rows + event overlay
        |
   VerticalGridCol                 Render cells per column
```

## Hour Generation

### getDayHours

`src/lib/utils/date-utils.ts`

Generates 24 dayjs objects for a given date, one per hour (0-23).

```typescript
getDayHours({ referenceDate, length? })
// Returns: [referenceDate@00:00, referenceDate@01:00, ..., referenceDate@23:00]
```

Uses `startOfDay.hour(i)` so that row N always represents "the hour labeled N". This keeps grid rows aligned across all columns in a week view.

### getViewHours

`src/features/calendar/utils/view-hours.ts`

Wraps `getDayHours` with optional business hours filtering. When `hideNonBusinessHours` is enabled, it filters hours to the business range (e.g., 9-17).

```typescript
getViewHours({ referenceDate, businessHours?, hideNonBusinessHours?, allDates?, resourceBusinessHours? })
```

- `allDates`: For week views, the union of all business hours across days determines the visible range.
- `resourceBusinessHours`: Additional business hours from resources are merged when calculating the range.

## View Patterns

### Day Views (single column)

Day views call `getViewHours` once with `currentDate` and use the result for both the time column and the day column.

```typescript
const hours = getViewHours({ referenceDate: currentDate, ... })
const timeCol = { days: hours, ... }
const dayCol  = { days: hours, ... }
```

Applies to: `day-view.tsx`, `resource-day-vertical.tsx`, `resource-day-horizontal.tsx`

### Week Views (multiple columns)

Each column calls `getViewHours` with its own day as `referenceDate`. This ensures each column gets hours on the correct date.

```typescript
const columns = weekDays.map((day) => ({
  days: getViewHours({ referenceDate: day, ... }),
  ...
}))
```

The shared time column (left gutter) uses a single `getViewHours` call with `currentDate` for display labels only.

Applies to: `week-view.tsx`, `resource-week-vertical.tsx`, `resource-week-horizontal.tsx`

## DST Handling

### The Problem

On DST spring-forward days (e.g., March 8, 2026 in America/Halifax), 2 AM doesn't exist. `dayjs('2026-03-08').hour(2)` returns a dayjs object with `.hour() === 3`.

This causes two issues:
1. **Duplicate hour values**: Both `.hour(2)` and `.hour(3)` return hour 3, producing duplicate React keys.
2. **Shared template corruption**: If all week columns share one hour array generated from a DST day, every column gets the corrupted hours.

### The Fix

Two changes prevent the bug:

**1. Array-index keys in VerticalGridCol** (`vertical-grid-col.tsx`)

React keys use the array index (`dayIndex`) instead of the hour string:

```typescript
// Before (broken on DST): key={`${id}-${hourStr}`}       -- duplicate "03"
// After (correct):         key={`${id}-${dayIndex}-${hourStr}`}
```

This prevents React from confusing two cells that happen to have the same hour value.

**2. Per-day hour generation in week views**

Each column generates its own hours via `getViewHours({ referenceDate: day })`. A DST day only affects its own column — the other 6 days are unaffected.

### Why .hour(i) over .add(i, 'hour')

`.hour(i)` sets the hour label. `.add(i, 'hour')` offsets from midnight.

On a spring-forward day:

| Index | `.hour(i)` | `.add(i, 'hour')` |
|-------|------------|--------------------|
| 0     | 0 AM       | 0 AM               |
| 1     | 1 AM       | 1 AM               |
| 2     | 3 AM *     | 3 AM               |
| 3     | 3 AM *     | 4 AM               |
| 4     | 4 AM       | 5 AM               |
| ...   | ...        | ... (shifted +1)   |
| 23    | 11 PM      | 12 AM next day     |

`.hour(i)` produces a duplicate at hour 3 but keeps rows aligned across week columns — row 9 is always "9 AM" in every column. `.add(i, 'hour')` avoids the duplicate but shifts the DST column by one row, misaligning it with the other 6 days.

Since the `dayIndex` key fix handles the duplicate, `.hour(i)` is correct for grid alignment.

### Testing Limitation

`bun test` runs in UTC, which has no DST transitions. DST bugs can only be verified manually in the browser with a DST timezone (e.g., `TZ=America/Halifax`).

## VerticalGrid Component

`src/components/vertical-grid/vertical-grid.tsx`

Renders the grid structure: header, optional all-day row, and scrollable body with time rows.

### Props

- `columns`: Array of column definitions, each with `id`, `days` (hour slots), `day` (calendar date), `gridType`, and optional `renderCell`.
- `gridType`: `'hour'` for time-based grids.
- `cellSlots`: Sub-hour divisions (e.g., `[0, 15, 30, 45]` for 15-min slots).
- `allDayRow`: Optional all-day event row rendered above the grid.
- `variant`: `'regular'` for standard calendar, omit for resource calendar.

### Column Definition

```typescript
{
  id: string              // Unique column ID (e.g., 'day-col-2025-06-15')
  day?: dayjs.Dayjs       // Calendar date (undefined for time column)
  days: dayjs.Dayjs[]     // Hour slots for this column
  gridType: 'hour'
  className?: string
  noEvents?: boolean      // True for the time-label column
  renderCell?: (date) =>  // Custom cell renderer (used by time column)
  resourceId?: string     // For resource calendar columns
  resource?: Resource     // For resource calendar columns
}
```

## Key Files

| File | Role |
|------|------|
| `src/lib/utils/date-utils.ts` | `getDayHours` — generates hourly slots |
| `src/features/calendar/utils/view-hours.ts` | `getViewHours` — filters by business hours |
| `src/features/calendar/utils/business-hours.ts` | `calculateBusinessHoursRange` — computes min/max hours |
| `src/components/vertical-grid/vertical-grid.tsx` | Grid layout and structure |
| `src/components/vertical-grid/vertical-grid-col.tsx` | Column rendering with DST-safe keys |
| `src/components/vertical-grid/vertical-grid-events-layer.tsx` | Event overlay positioning |
| `src/components/grid-cell.tsx` | Individual droppable grid cell |
