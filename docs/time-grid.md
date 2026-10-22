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

`src/utils/date-utils.ts`

Generates 24 dayjs objects for a given date, one per hour (0-23).

```typescript
getDayHours({ referenceDate, length? })
// Returns: [referenceDate@00:00, referenceDate@01:00, ..., referenceDate@23:00]
```

Uses `startOfDay.hour(i)` so that row N always represents "the hour labeled N". This keeps grid rows aligned across all columns in a week view.

### getViewHours

`src/features/calendar/utils/view-hours.ts`

Wraps `getDayHours` with optional business hours filtering. When `hideNonBusinessHours` is enabled, it filters hours to the business range (e.g., 9-17). Sub-hour boundaries (`'09:15'`) floor/ceil the range so the hour rows hosting a boundary stay visible.

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

Applies to: `views/day.tsx` (both the regular body and the resource arrangements it composes)

### Week Views (multiple columns)

Each column calls `getViewHours` with its own day as `referenceDate`. This ensures each column gets hours on the correct date.

```typescript
const columns = weekDays.map((day) => ({
  days: getViewHours({ referenceDate: day, ... }),
  ...
}))
```

The shared time column (left gutter) uses a single `getViewHours` call with `currentDate` for display labels only.

Applies to: `views/week.tsx` (both the regular body and the resource arrangements it composes)

## DST Handling

For which zone a date is anchored in before it ever reaches the grid, see
`docs/timezones.md`. This section is only about what a DST transition does to
hour generation once the zone is settled.

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

### Placing events and the now-line: clock time, not elapsed time

Rows (and the hour columns of a resource timeline) are labelled by clock hour,
so a bar and the current-time line are placed by clock time too:
`wallClockDiff` (`@ilamy/utils/helpers`) measures from the column's midnight
the way a clock face reads it. `layoutVertical`, `layoutHorizontal` and
`CurrentTimeIndicator` all use it. FullCalendar places them the same way: its
`DateMarker` holds the zone's wall-clock fields as a UTC date
(`timestampToMarker`, core `datelib/env.ts`) and `computeDateTop` measures from
the marker's start of day (timegrid `TimeColsSlatsCoords.ts`, v6.1.21).

dayjs diffs days and weeks by clock time already, but hours and minutes by the
time that passes (`zoneDelta` in dayjs `src/index.js`). With a plain
`diff(…, 'hour')`, 09:00 on a 23-hour day sat on the 8 AM row and on a 25-hour
day on the 10 AM row (#311). Nothing assumes a change is an hour long: the
offsets come from the IANA data the runtime's `Intl` API ships, so a zone that
moves by 30 minutes (Lord Howe Island) or changes its rules is placed the same
way. Tests pin both.

### The now-line and week numbers

The now-line is drawn only in hour grids and only while the `nowIndicator` prop
is `true` (default). `weekNumbers` and `weekNumberCalculation` choose the
number shown in the week headers and in month rows (`getWeekNumber`,
`utils/week-number.ts`). `'local'` is dayjs `week()`, the locale's own count,
which does not follow `firstDayOfWeek`; `'ISO'` is ISO 8601. A month row shows
the number of its first day.

`scrollTime` and `scrollToNow` scroll to the exact minute: the hour row (or the
slot cell holding now) plus the fraction of its height or width already
elapsed (`use-scroll-to-time.ts`). A time clamped to an edge row lands on that
row's edge, and a whole-day cell is brought to the edge without a fraction.

Limits worth knowing: the horizontal resource timelines have no all-day row, so
`allDaySlot` does not apply to them, and the horizontal resource month (and
every other grid that is not a regular month) shows no week numbers even with
`weekNumbers={true}`; only regular month rows do.

### Testing

`dayjs.tz.setDefault('America/New_York')` in a unit test exercises a DST zone
whatever the machine's zone (see `wallClockDiff`, `layoutVertical` and
`layoutHorizontal` tests). In the browser, the e2e harness takes the zone from
`?tz=` and the clock from `gotoScenario({ now })`: the `dst-days` scenario pins
a booking and the now-line on both 2025 change days.

## Resizing

A bar offers a handle on an edge only when that edge is the event's own: the end handle on the segment that
really ends (`isEnd`), the start handle (with `eventResizableFromStart`) on the segment that really starts
(`isStart`), as in FullCalendar (`StandardEvent.tsx:95-96`, v7.1.1). A single-day timed event in a grid of days
(month, resource month) reads as a dot there and has no handle (`daygrid/event-rendering.ts:13-26`); in a grid
of hours it does.

The pointer's cell decides the new edge (`calculateResizeTimes`):

- In a time grid the end edge snaps to the END of the hovered slot (exclusive, RFC 5545 DTEND) and the start
  edge to the START of it, in `slotDuration` steps (an hour cell in a horizontal timeline is an hour).
- In a grid of days both snap to whole days. An all-day event ends at the midnight after the hovered day; a
  timed block keeps its time of day on the hovered day.
- The new time is rebuilt from a zoneless string on the hovered day, never with `.hour()` setters, so a slot on
  a clock-change day is the wall-clock slot and not an hour out.
- A result with end at or before start is no change (FullCalendar's null mutation, `EventResizing.ts:249-300`):
  the preview shows the original and nothing is committed or refused.
- A resize stays in the component it started in (`interaction.ts:44-48`): hovering the all-day row from the
  time grid, or the reverse, is ignored.
- A resize never changes the resource; hovering another lane maps to the same time on the event's own. Whether
  that time is closed (business hours of the event's own resource, the month's padding days, `isCellDisabled`)
  is judged on the event's own lane too, not on the lane under the pointer.
- Resize needs a mouse or a pen. On touch-only devices (`@media (hover: none)`) the handles are hidden and
  events can be moved but not resized until event selection lands (roadmap 4.1.3): FullCalendar only resizes an
  already-selected event on touch (`EventResizing.ts:86-88`, v7.1.1), and a 6px strip took taps and long-presses
  from the bar around it.
- Known limitation: a bar replays its 500ms entrance animation after every commit, and a resize started inside
  that window (several resizes of one event in quick succession) can be dropped without a trace. Resizes started
  once the bar has settled always commit.

## VerticalGrid Component

`src/features/calendar/components/vertical-grid/vertical-grid.tsx`

Renders the grid structure: header, optional all-day row, and scrollable body with time rows.

### Props

- `columns`: Array of column definitions, each with `id`, `days` (hour slots), `day` (calendar date), `gridType`, and optional `renderCell`.
- `gridType`: `'hour'` for time-based grids.
- `slotDurationMinutes`: Minutes per row (`15`, `30`, or `60`). `60` is one cell per hour with no sub-hour lines; `15` draws four cells per hour with dashed separators. Sourced from the public `slotDuration` prop on `IlamyCalendar` / `IlamyResourceCalendar`.
- `allDayRow`: Optional all-day event row rendered above the grid. The view renderer leaves it out when the `allDaySlot` prop is `false`. The vertical layout already draws no all-day event in an hour grid (it belongs to the row), so nothing else changes.
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
| `src/utils/date-utils.ts` | `getDayHours` — generates hourly slots |
| `src/features/calendar/utils/view-hours.ts` | `getViewHours` — filters by business hours |
| `src/features/calendar/utils/business-hours.ts` | `calculateBusinessHoursRange` — computes min/max hours |
| `src/features/calendar/components/vertical-grid/vertical-grid.tsx` | Grid layout and structure |
| `src/features/calendar/components/vertical-grid/vertical-grid-col.tsx` | Column rendering with DST-safe keys |
| `src/features/calendar/components/vertical-grid/vertical-grid-events-layer.tsx` | Event overlay positioning |
| `src/features/calendar/components/grid-cell/grid-cell.tsx` | Individual droppable grid cell (its parts live beside it in `grid-cell/`) |
