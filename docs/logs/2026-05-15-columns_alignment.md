# Development Log - 2026-05-15

## Changes

- **[year-view]**: Month titles and mini-calendar weekday headers use `t()` instead of dayjs `format('MMMM')` and hardcoded English letters; mini grids respect `firstDayOfWeek` via `getMonthWeeks`.
- **[week view / column alignment]**: Shared `weekColumnTemplate` across header, all-day row, and `vertical-grid-body` (`bodyColumnTemplate`, `gridCell`, all-day inner grid).
- **[week view / gutter fix]**: First grid track uses fixed `minmax` (not plain `rem`, which expands via `minmax(auto, …)`). Tracks: `2.5rem` below `sm`, `7rem` at `sm+` (`WEEK_GUTTER_WIDTH_*` in `constants.ts`) for long i18n gutter labels (e.g. FR "Toute la journée").
- **[scope trim]**: Reverted scrollbar geometry, `ScrollArea` API extensions, sticky header-in-scroll, `CALENDAR_*_REGION` constants, shell flex rewrites, and unrelated grid/year scrollbar refactors — scroll behavior unchanged.
- **[day/week view / scroll-to-now]**: Day/week views scroll to center the **current clock time** on enter (any date range). `scroll-to-current-time.ts` + `useScrollToCurrentTime` (`buildScrollEffectKey` includes view/date/hour range; double rAF + 100/300 ms retries). **Layout fix**: `60px` hour rows (`HOUR_ROW_HEIGHT_PX`), explicit body `height`, columns `h-auto`, `ScrollArea type="always"` + `viewportRef`. Trimmed over-engineered fallbacks after validation; `bun run ci` green (865 tests).
- **[week view / gutter alignment fix]**: MediWay overlap: `--spacing: 0.3rem` → `sm:w-16` = 4.8rem vs explicit `rem` tracks. Gutter cells use `WEEK_GUTTER_CELL_CLASS`; `AllDayCell` `gridGutter` on `columnTemplate` rows. Gutter width via `--week-gutter-width` + `WEEK_GRID_GUTTER_VARS_CLASS` (`2.5rem` / `sm:7rem`) and `getWeekColumnTemplate()` — removed `useWeekGridGutterTrack` (`matchMedia`) to fix Next.js hydration mismatch (server stuck at `2.5rem`, client at `7rem`).

## Files Modified

- `src/features/calendar/components/year-view/year-view.tsx` — `MONTH_KEYS`, translated weekday header letters, `firstDayOfWeek` on mini calendars
- `src/features/calendar/components/year-view/year-view.test.tsx` — translator month names, weekday letters, `firstDayOfWeek`
- `src/features/calendar/components/week-view/week-view.tsx` — `getWeekColumnTemplate`, `WEEK_GRID_GUTTER_VARS_CLASS` on header/body/all-day grids; no `matchMedia`
- `src/lib/constants.test.ts` — `getWeekColumnTemplate` unit test
- `src/features/calendar/components/week-view/week-view.test.tsx` — gutter `2.5rem`/`7rem` tracks, `w-full` gutter cells (no `w-16`)
- `src/components/vertical-grid/vertical-grid-col.tsx` — `gridCell` + hour grids: `60px` rows, column `h-auto` (not `h-full`)
- `src/lib/constants.ts` — `HOUR_ROW_HEIGHT_PX`; `WEEK_GUTTER_*`; `WEEK_GRID_GUTTER_VARS_CLASS`; `getWeekColumnTemplate`
- `src/components/vertical-grid/vertical-grid-header-container.tsx` — header `w-full min-w-0`
- `src/components/all-day-row/all-day-row.tsx` — `columnTemplate` grid branch; `AllDayCell gridGutter`
- `src/components/all-day-row/all-day-cell.tsx` — `gridGutter` mode uses `WEEK_GUTTER_CELL_CLASS`; flex/resource mode keeps `w-10`/`sm:w-16`
- `src/components/all-day-row/all-day-row.test.tsx` — grid gutter `w-full` regression
- `src/components/horizontal-grid/horizontal-grid-row.tsx` — `dayCellsGridTemplate`
- `src/components/horizontal-grid/horizontal-grid-row.test.tsx` — all-day width regression
- `src/components/animations/animated-section.tsx` — default `min-w-0` for grid children
- `src/components/grid-cell.tsx` — `min-w-0` on all-day droppable content
- `docs/time-grid.md` — week column alignment; gutter tracks `2.5rem`/`7rem`; cells must not use spacing-based `w-*`

## Notes

- Plain `rem` in `grid-template-columns` behaves as `minmax(auto, …)`; header “Week N” / “All day” widened the gutter while the body hour column (`min-w-0`) stayed narrower — fixed by locking min and max on the first track.
- Aligns year-view i18n with `month-header.tsx` / `title-content.tsx` patterns.
- `bun run ci` passes. Oldest `docs/logs/*.md` files pruned earlier to stay within the 10-file cap.
