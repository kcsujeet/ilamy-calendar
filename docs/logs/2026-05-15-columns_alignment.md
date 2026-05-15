# Development Log - 2026-05-15

## Changes

- **[recurrence editor / i18n]**: Frequency `SelectItem` labels use `.toLowerCase()` on `t(FREQ_LABEL_KEYS)` (`day` / `week` / `month` / `year`). Tests updated to match.
- **[recurrence editor / fix]**: Re-wired `WeeklyRecurrenceFields` in customize panel when `freq === WEEKLY` (import existed but JSX block was missing).
- **[recurrence editor / presets]**: Header preset labels for `weeklyOnDay` and `monthlyOnWeekday` use full weekday names (`sunday`…`saturday` keys) via `FULL_DAY_NAME_KEYS`; weekly customize chips still use short `DAY_KEYS` (`sun`…`sat`).
- **[recurrence editor / docs]**: Purpose comments added above each helper in `recurrence-editor.tsx` (`applyMonthlyYearlyPatch`, `emitChange`, `handlePresetChange`, preset handlers, etc.).
- **[recurrence editor / i18n]**: Frequency dropdown shows unit nouns via `FREQ_LABEL_KEYS` (`day` / `week` / `month` / `year`). Customize row uses `t('repeatsEvery')`. Interval input keeps `aria-label={t('every')}` for a11y and tests.
- **[CI]**: `bun run ci` green — biome check, type-check, 864 tests, production build (lint/format fixes, typed event-form mocks, test helpers for customize panel).
- **[recurrence editor / layout]**: Customize header row is now a single inline phrase — `repeats every` label + interval `Input` + frequency `Select` (`col-span-full`), replacing the previous two-column “Repeats” / “Every” grid.
- **[recurrence editor / types]**: `normalizeByweekday` exported from `rrule-editor-utils.ts`; `selectedWeekdays` passed to `WeeklyRecurrenceFields` is narrowed to `Weekday[]` (fixes `ByWeekday[]` TS error at the weekly fields call site).
- **[recurrence editor / structure]**: `WeeklyRecurrenceFields` extracted to `weekly-recurrence-fields.tsx`; monthly file renamed to `monthly-recurrence-fields.tsx` (aligned with `yearly-recurrence-fields.tsx`).
- **[recurrence editor / UX]**: Customize-only detail panel — `CardContent` hidden unless preset is Customize (not merely disabled). On event submit, customize RRULEs that mismatch the start day snap via `alignStartWithRRule` / `occurrenceMatchesByRules` in `rrule-editor-utils.ts`.
- **[recurrence editor / presets]**: Replaced repeat checkbox with header preset select (Once, Every day, weekdays, weekly/monthly from event date, Customize). Card body always visible; detail fields disabled unless Customize. `recurrence-preset-utils` builds/detects presets from `referenceDate`.
- **[recurrence editor / header]**: Translated `repeat` label shown before the preset select (`Label` + flex row).
- **[recurrence editor / customize fix]**: `customizeMode` state keeps fields editable after choosing Customize (avoids `useEffect` re-detecting daily and locking again). Weekday preset detection fixed (`WEEKDAY_INDICES` MO–FR = rrule `0–4`, not `1–5`). Weekly day chips ordered by `firstDayOfWeek` from calendar context.
- **[recurrence editor / UX]**: (superseded) Repeat checkbox + label header — replaced by preset select above.
- **[recurrence editor / radios]**: Monthly and yearly "On day" / "On the" and Ends (Never/After/On) use `RadioGroup` instead of checkboxes. Yearly layout matches dcantatore: row "On" = month + day, row "On the" = position + weekday + of + month (`yearly-recurrence-fields.tsx`).
- **[recurrence editor]**: Full daily/weekly/monthly/yearly UI — `rrule-editor-utils` for parse/build/sanitize; `referenceDate` from event form; `on-the-recurrence-fields.tsx` for monthly.
- **[recurrence / fix]**: Editing seed event `22` no longer crashes — position select value `last` (not `"-1"`) and `normalizeOnTheDaySelection` prevent invalid `onTheDay` passed to `expandOnTheDay`.
- **[seed]**: Five aligned recurring demos — `20` DAILY, `21` WEEKLY (Wed), `22` MONTHLY last Friday `FR.nth(-1)`, `23` MONTHLY on day 15, `24` YEARLY on anchor month/day; `start` matches each rrule.
- **[seed / demo]**: Commented out multi-day seed events `6`, `8`, `12`; demo default view `week`.
- **[year-view]**: Month titles and mini-calendar weekday headers use `t()` instead of dayjs `format('MMMM')` and hardcoded English letters; mini grids respect `firstDayOfWeek` via `getMonthWeeks`.
- **[week view / column alignment]**: Shared `weekColumnTemplate` across header, all-day row, and `vertical-grid-body` (`bodyColumnTemplate`, `gridCell`, all-day inner grid).
- **[week view / gutter fix]**: First grid track uses fixed `minmax` (not plain `rem`, which expands via `minmax(auto, …)`). Tracks: `2.5rem` below `sm`, `7rem` at `sm+` (`WEEK_GUTTER_WIDTH_*` in `constants.ts`) for long i18n gutter labels (e.g. FR "Toute la journée").
- **[scope trim]**: Reverted scrollbar geometry, `ScrollArea` API extensions, sticky header-in-scroll, `CALENDAR_*_REGION` constants, shell flex rewrites, and unrelated grid/year scrollbar refactors — scroll behavior unchanged.
- **[day/week view / scroll-to-now]**: Day/week views scroll to center the **current clock time** on enter (any date range). `scroll-to-current-time.ts` + `useScrollToCurrentTime` (`buildScrollEffectKey` includes view/date/hour range; double rAF + 100/300 ms retries). **Layout fix**: `60px` hour rows (`HOUR_ROW_HEIGHT_PX`), explicit body `height`, columns `h-auto`, `ScrollArea type="always"` + `viewportRef`. Trimmed over-engineered fallbacks after validation; `bun run ci` green (865 tests).
- **[week view / gutter alignment fix]**: MediWay overlap: `--spacing: 0.3rem` → `sm:w-16` = 4.8rem vs explicit `rem` tracks. Gutter cells use `WEEK_GUTTER_CELL_CLASS`; `AllDayCell` `gridGutter` on `columnTemplate` rows. Gutter width via `--week-gutter-width` + `WEEK_GRID_GUTTER_VARS_CLASS` (`2.5rem` / `sm:7rem`) and `getWeekColumnTemplate()` — removed `useWeekGridGutterTrack` (`matchMedia`) to fix Next.js hydration mismatch (server stuck at `2.5rem`, client at `7rem`).

## Files Modified

- `src/features/recurrence/utils/recurrence-preset-utils.ts` — preset build/detect + weekday nth from reference date
- `src/features/recurrence/utils/recurrence-preset-utils.test.ts` — preset unit tests
- `src/features/recurrence/utils/rrule-editor-utils.ts` — parse/build/sanitize, start/RRULE alignment helpers, exported `normalizeByweekday`
- `src/features/recurrence/utils/rrule-editor-utils.test.ts` — alignment + unit tests
- `src/components/event-form/event-form.tsx` — align start on submit for customize recurrence
- `src/components/ui/radio-group.tsx` — Radix radio group (shadcn)
- `src/features/recurrence/components/recurrence-editor/yearly-recurrence-fields.tsx` — yearly On / On the rows with month selects
- `src/features/recurrence/components/recurrence-editor/weekly-recurrence-fields.tsx` — weekly repeat-on weekday checkboxes
- `src/features/recurrence/components/recurrence-editor/monthly-recurrence-fields.tsx` — monthly On day / On the (radios); renamed from `on-the-recurrence-fields.tsx`
- `src/features/recurrence/components/recurrence-editor/recurrence-editor.tsx` — preset/customize UI, `FREQ_LABEL_KEYS`, `FULL_DAY_NAME_KEYS` for preset labels, field components wiring, inline-function purpose comments
- `src/features/recurrence/components/recurrence-editor/recurrence-editor.test.tsx` — preset/customize flows; frequency assertions use lowercase day/week/month/year
- `src/components/event-form/event-form.test.tsx` — combobox count, preset select, monthly customize submit uses `month` frequency option
- `src/lib/translations/default.ts`, `types.ts` — `repeatsEvery`, `recurrenceOnce`, preset keys, `day`/`week`/`month`/`year` for frequency select
- `src/features/recurrence/utils/calendar-integration.test.ts` — monthly `nth(-1)` regression
- `src/components/event-form/event-form.tsx` — `referenceDate` prop
- `src/lib/translations/default.ts`, `types.ts` — recurrence editor keys
- `src/lib/seed.ts` — five recurring exemplars with aligned starts
- `src/components/demo/demo-page.tsx` — `initialView` default `week`
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

- Monthly "Day" (all weekdays + nth) can yield up to seven instances per month — intentional, matches react-rrule-builder behavior.
- Position select uses value `last` (not `"-1"`) so it cannot be mistaken for `onTheDay`; `normalizeOnTheDaySelection` + `expandOnTheDay` guard invalid day strings (fixes event 22 edit crash).
- Yearly "On the" row includes translated `of` between weekday and month selects.
- `@radix-ui/react-radio-group` added to package dependencies.
- Preset labels use `referenceDate` (weekday name, day of month, nth weekday in month). `customizeMode` is authoritative for enabling the fieldset; auto-detect from `value` must not override it. `selectValue` prefers `preset === 'once'` and local `preset` when parent `value` is still null/lagging. `useEffect` only syncs opts from non-null `value`.
- “Every weekday” incorrectly matched Customize before `WEEKDAY_INDICES` fix — that was why weekdays seemed to allow editing.
- Plain `rem` in `grid-template-columns` behaves as `minmax(auto, …)`; header “Week N” / “All day” widened the gutter while the body hour column (`min-w-0`) stayed narrower — fixed by locking min and max on the first track.
- Aligns year-view i18n with `month-header.tsx` / `title-content.tsx` patterns.
- Oldest `docs/logs/*.md` files pruned earlier to stay within the 10-file cap.
- Test helpers use `queryByTestId('frequency-select')` for customize panel visibility; interval tests use `getByLabelText('Every')` via `aria-label` on the interval input.
- `daily` / `weekly` / `monthly` / `yearly` keys remain for other UI; customize frequency select uses `day` / `week` / `month` / `year`.
