# Development Log - 2026-05-15

## Changes

- **[year-view]**: Month titles and mini-calendar weekday headers now use `t()` translations instead of dayjs `format('MMMM')` and hardcoded English letters.
- **[year-view]**: Mini-calendar grids and weekday headers respect `firstDayOfWeek` via `getMonthWeeks` and reordered header keys.

## Files Modified

- `src/features/calendar/components/year-view/year-view.tsx` - `MONTH_KEYS` for month names; weekday headers use first uppercase letter of `sun`–`sat` translation keys.
- `src/features/calendar/components/year-view/year-view.test.tsx` - Tests for translator-provided month names, weekday header letters, and `firstDayOfWeek`.

## Notes

- Aligns with `month-header.tsx` and `title-content.tsx` translation patterns.
- Week gutter overlap (MediWay): `--spacing: 0.3rem` → spacing `w-*` ≠ `rem` grid tracks; use `WEEK_GUTTER_CELL_CLASS`. Gutter width: `--week-gutter-width` (CSS), not React state — `useWeekGridGutterTrack` caused hydration warnings and stuck `2.5rem` on SSR. Wide gutter `7rem` at `sm+` via `WEEK_GRID_GUTTER_VARS_CLASS`. Day view still uses flex `AllDayRow` + `w-16` time column (no week grid template); same `--spacing` pitfall if day gutter is aligned to a grid later.
- Day-view header: `Intl.DateTimeFormat.formatToParts` detects day-first locales; do not use dayjs `MMMM D` for user-facing dates when locale order matters. `title-content` `renderDayContent` and day-view header now share `date-locale-format.ts`.
