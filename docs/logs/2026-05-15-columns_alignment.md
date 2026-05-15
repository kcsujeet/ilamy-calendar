# Development Log - 2026-05-15

# column alignement

## Notes

- Aligns with `month-header.tsx` and `title-content.tsx` translation patterns.
- **[week view / column alignment]**: Kept the minimal tree for aligned week header, all-day row, and time grid: shared `weekColumnTemplate` (`gutter` + `repeat(N, minmax(0, 1fr))`), `bodyColumnTemplate` on `VerticalGrid`, `columnTemplate` + inner `dayCellsGridTemplate` on `AllDayRow`, `gridCell` on `VerticalGridCol`, gutter parity on `AllDayCell`, `AnimatedSection` / `GridCell` `min-w-0` where needed.
- **[scope trim]**: Dropped scrollbar geometry, `ScrollArea` API extensions, sticky header inside `VerticalGrid` scroll, `CALENDAR_*_REGION` constants, `IlamyCalendar` / resource shell flex rewrites, `horizontal-grid` / `year-view` scrollbar refactors, and demo-page debug edits — scrollbar and outer shell behave as before.
- **[docs]**: `docs/time-grid.md` — “Week view column alignment” subsection documenting the shared template.

## Files Modified

- `src/features/calendar/components/week-view/week-view.tsx` — `weekColumnTemplate`, CSS grid header, `bodyColumnTemplate`
- `src/features/calendar/components/week-view/week-view.test.tsx` — week header `w-full` / `min-w-0` assertions
- `src/components/vertical-grid/vertical-grid.tsx` — `bodyColumnTemplate`, CSS grid body when set
- `src/components/vertical-grid/vertical-grid-col.tsx` — `gridCell` layout mode
- `src/components/vertical-grid/vertical-grid-header-container.tsx` — header `w-full min-w-0`
- `src/components/all-day-row/all-day-row.tsx` — `columnTemplate` grid branch
- `src/components/all-day-row/all-day-cell.tsx` — gutter width matches time column
- `src/components/horizontal-grid/horizontal-grid-row.tsx` — `dayCellsGridTemplate` for all-day cells
- `src/components/horizontal-grid/horizontal-grid-row.test.tsx` — all-day width regression
- `src/components/animations/animated-section.tsx` — default `min-w-0` for grid children
- `src/components/grid-cell.tsx` — `min-w-0` on all-day droppable content
- `docs/time-grid.md` — week column alignment documentation

## Notes

`bun run ci` passes on the trimmed scope (826 tests). Oldest `docs/logs/*.md` files removed to stay within the 10-file cap.
