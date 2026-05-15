# Development Log - 2026-05-15

## Changes

- **[year-view]**: Month titles and mini-calendar weekday headers use `t()` instead of dayjs `format('MMMM')` and hardcoded English letters; mini grids respect `firstDayOfWeek` via `getMonthWeeks`.
- **[week view / column alignment]**: Shared `weekColumnTemplate` across header, all-day row, and `vertical-grid-body` (`bodyColumnTemplate`, `gridCell`, all-day inner grid).
- **[week view / gutter fix]**: First grid track uses `minmax(2.5rem, 2.5rem)` / `minmax(4rem, 4rem)` (not plain `4rem`, which expands via `minmax(auto, …)` when header/all-day content is wider). Time column gets the same `LEFT_COL_WIDTH` classes as the week corner and `AllDayCell`.
- **[scope trim]**: Reverted scrollbar geometry, `ScrollArea` API extensions, sticky header-in-scroll, `CALENDAR_*_REGION` constants, shell flex rewrites, and unrelated grid/year scrollbar refactors — scroll behavior unchanged.

## Files Modified

- `src/features/calendar/components/year-view/year-view.tsx` — `MONTH_KEYS`, translated weekday header letters, `firstDayOfWeek` on mini calendars
- `src/features/calendar/components/year-view/year-view.test.tsx` — translator month names, weekday letters, `firstDayOfWeek`
- `src/features/calendar/components/week-view/week-view.tsx` — `gutterTrack` with fixed `minmax`, `LEFT_COL_WIDTH` on time column, shared grid template
- `src/features/calendar/components/week-view/week-view.test.tsx` — gutter track lock + time column width classes; header layout assertions
- `src/components/vertical-grid/vertical-grid.tsx` — `bodyColumnTemplate`, CSS grid body
- `src/components/vertical-grid/vertical-grid-col.tsx` — `gridCell` layout mode
- `src/components/vertical-grid/vertical-grid-header-container.tsx` — header `w-full min-w-0`
- `src/components/all-day-row/all-day-row.tsx` — `columnTemplate` grid branch
- `src/components/all-day-row/all-day-cell.tsx` — gutter width matches time column
- `src/components/horizontal-grid/horizontal-grid-row.tsx` — `dayCellsGridTemplate`
- `src/components/horizontal-grid/horizontal-grid-row.test.tsx` — all-day width regression
- `src/components/animations/animated-section.tsx` — default `min-w-0` for grid children
- `src/components/grid-cell.tsx` — `min-w-0` on all-day droppable content
- `docs/time-grid.md` — week column alignment + fixed gutter track notes

## Notes

- Plain `rem` in `grid-template-columns` behaves as `minmax(auto, …)`; header “Week N” / “All day” widened the gutter while the body hour column (`min-w-0`) stayed narrower — fixed by locking min and max on the first track.
- Aligns year-view i18n with `month-header.tsx` / `title-content.tsx` patterns.
- `bun run ci` passes. Oldest `docs/logs/*.md` files pruned earlier to stay within the 10-file cap.
