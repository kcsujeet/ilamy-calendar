# Grid Border Frame Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Inline (not subagent) execution is required because the only way to confirm grid-line alignment is a human visual check in the running dev server.

**Goal:** Replace per-cell grid borders with `gap-px` + `bg-border` containers so the calendar body's single 4-side `border` frame is never doubled, in every view and resource arrangement.

**Architecture:** Grid lines come from 1px gaps that reveal a `bg-border` container background; cells are opaque (`bg-background`) and draw no borders. The calendar body keeps `border` (the only frame). Sub-hour slots keep a dashed border (the one exception). `GridCell` is shared by all grids, so the cell change + the container `gap-px bg-border` changes land together.

**Tech Stack:** React, Tailwind v4 (`gap-px`, `bg-border`, `bg-background`), bun test, happy-dom.

**Spec:** `docs/superpowers/specs/2026-06-27-grid-border-frame-design.md`

---

## The conversion recipe (applies to every grid family)

For each grid family: (a) the **cell** drops border utilities and gains/keeps an opaque `bg-*`; (b) the **container** that lays cells out gains `gap-px bg-border` and `p-0`; (c) remove `isLastRow`/`isLastColumn` strips, `last:border-r-0`, `border-r!`. Lines appear in the 1px gaps; the body `border` is the frame.

Reference class transforms:
- Cell: `... border-r border-b ...` → `... bg-background ...` (drop `border-r`/`border-b`/`border-r-0`/`border-b-0`).
- Container: `flex ...` → `flex gap-px bg-border ...` (and ensure no padding adds an outer gap).

---

## Task 1: Shared cell — drop borders, add opaque fill

**Files:**
- Modify: `packages/calendar/src/components/grid-cell.tsx` (base className ~126)
- Modify: `packages/calendar/src/components/droppable-cell.tsx` (disabled handling)
- Test: `packages/calendar/src/components/grid-cell.test.tsx`

- [ ] **Step 1: Update the failing test first.** In `grid-cell.test.tsx`, assert the rendered cell has `bg-background` and does NOT include `border-r`/`border-b`:
```ts
const classes = screen.getByTestId(/* existing cell testid */).className.split(' ')
expect(classes).toContain('bg-background')
expect(classes).not.toContain('border-r')
expect(classes).not.toContain('border-b')
```
- [ ] **Step 2: Run** `cd packages/calendar && bun test grid-cell.test.tsx` — expect FAIL (still has borders).
- [ ] **Step 3:** In `grid-cell.tsx`, change the base from
  `'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative border-r border-b min-w-0'`
  to `'cursor-pointer overflow-clip p-1 bg-background hover:bg-accent min-h-[60px] relative min-w-0'`.
- [ ] **Step 4:** `DISABLED_CELL_CLASSNAME` in `lib/constants.ts` is already `bg-secondary text-muted-foreground pointer-events-none` (opaque) — no change needed. Confirm `droppable-cell.tsx` adds no border.
- [ ] **Step 5: Run** the test — expect PASS.
- [ ] **Step 6:** Do NOT commit yet — grids have no lines until Task 2/3 add container gaps. Continue.

## Task 2: Horizontal grid (month + resource rows) — container gaps

**Files:**
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid-row.tsx` (rows of cells, GroupedColumn)
- Modify: `packages/calendar/src/components/horizontal-grid/horizontal-grid.tsx` (rows wrapper)
- Modify: `packages/calendar/src/features/calendar/components/views/month-header.tsx`, `month.tsx`
- Test: `horizontal-grid-row.test.tsx`

- [ ] **Step 1: Update tests.** Replace the `border-b-0`/`border-r-0` edge assertions with: the cell className has no `border-r`/`border-b`; the row container className includes `gap-px` and `bg-border`.
- [ ] **Step 2: Run** `bun test horizontal-grid-row.test.tsx` — expect FAIL.
- [ ] **Step 3:** In `horizontal-grid-row.tsx`: the cells row wrapper (`<div className="flex w-full min-w-0">`) → add `gap-px bg-border`. Remove `isLastRow && 'border-b-0'`, `isLastCol && 'border-r-0'`, and `!isLastCol && 'border-r!'` from the GridCell/GroupedColumn classNames. In `GroupedColumn`, the inner `<div className="flex w-full">` → `flex w-full gap-px bg-border`.
- [ ] **Step 4:** In `horizontal-grid.tsx`, the rows-stack wrapper → add `gap-px bg-border` so weeks are separated by gaps; drop the `isLastRow` plumbing if now unused.
- [ ] **Step 5:** `month-header.tsx` / `month.tsx` resource date headers: drop `border-r`/`last:border-r-0`/`border-b` on header cells; the header container gets `gap-px bg-border`; header keeps a `bg-border` separator below via the body structure.
- [ ] **Step 6: Run** the test — expect PASS. Then `bun test month.test.tsx` — expect PASS.
- [ ] **Step 7: VISUAL CHECK (month view, light + dark).** Confirm single uniform lines, 4-side frame, no doubles, no missing lines.

## Task 3: Vertical grid (day/week time grid) + gutter

**Files:**
- Modify: `packages/calendar/src/components/vertical-grid/vertical-grid.tsx` (columns wrapper)
- Modify: `packages/calendar/src/components/vertical-grid/vertical-grid-col.tsx` (hour-rows container + cells; sub-hour exception)
- Modify: `packages/calendar/src/components/vertical-grid/gutter.tsx`
- Test: `vertical-grid-col.test.tsx`

- [ ] **Step 1: Update tests.** Replace border-r/border-b/border-r-0/border-b-0 assertions with: cell has no `border-r`/`border-b`; the columns wrapper and the hour-rows grid include `gap-px bg-border`. Keep a sub-hour test: a sub-slot cell still carries `border-dashed`.
- [ ] **Step 2: Run** `bun test vertical-grid-col.test.tsx` — expect FAIL.
- [ ] **Step 3:** In `vertical-grid-col.tsx`: the inner time-slots grid (`<div className="w-full h-full relative grid" style=gridTemplateRows>`) → add `gap-px bg-border`. Remove the per-cell `border-b`, `isLastColumn ? 'border-r-0' : 'border-r'`, and `isBottomCell && 'border-b-0'`. For sub-hour (`hasSubHourSlots`), the inner `flex flex-col` of sub-slots → `flex flex-col gap-px` and each sub-slot keeps a dashed line via `border-b border-dashed` on all but the last (the documented exception).
- [ ] **Step 4:** In `vertical-grid.tsx`, the columns row (`relative flex flex-1 min-w-full w-fit`) → add `gap-px bg-border` (vertical separators between columns + gutter).
- [ ] **Step 5:** `gutter.tsx`: drop its `border-r`; the column gap provides the gutter/first-column separator.
- [ ] **Step 6: Run** `bun test vertical-grid` — expect PASS.
- [ ] **Step 7: VISUAL CHECK (week + day, light + dark, hourly + sub-hour).** Confirm uniform lines, dashed half-hours, frame, no doubles.

## Task 4: All-day row

**Files:**
- Modify: `packages/calendar/src/components/all-day-row/all-day-row.tsx`, `all-day-cell.tsx`
- Test: `all-day-row.test.tsx`

- [ ] **Step 1: Update tests.** Replace the border-b / last:border-r-0 assertions with: all-day cells have no `border-r`/`border-b`; the all-day cell-row container has `gap-px bg-border`; the all-day row is separated from the time grid by a `bg-border` gap (assert the wrapper structure).
- [ ] **Step 2: Run** `bun test all-day-row.test.tsx` — expect FAIL.
- [ ] **Step 3:** In `all-day-row.tsx`: the cell row uses `gap-px bg-border`; remove `border-r last:border-r-0` from the column `cell` className; the separator below the all-day row comes from a `gap-px bg-border` between the all-day container and the time grid (add at the shared parent in the week/day view, or a `bg-border` top edge on the time-grid container). `all-day-cell.tsx` (the spacer): drop `border-r border-b`, keep `bg-background`.
- [ ] **Step 4: Run** the test — expect PASS.
- [ ] **Step 5: VISUAL CHECK (week, all-day row).** Single separator above and below, aligned columns.

## Task 5: Resource arrangements

**Files:**
- Modify: `resource-axis.tsx` (remove `border-r!` in the AllDayRow cell className; container gaps), `resource-week-horizontal-day-header.tsx`, `resource-week-vertical-resource-header.tsx`, `resource-week-vertical-day-header.tsx`, `time-header-row.tsx`, `week.tsx`
- Test: the resource view test files (`resource-*.test.tsx`)

- [ ] **Step 1: Update tests.** For each arrangement's representative cell/header, assert no `border-r`/`border-b`/`border-r!`/`last:border-r-0`; container has `gap-px bg-border`.
- [ ] **Step 2: Run** the resource tests — expect FAIL.
- [ ] **Step 3:** Convert each: headers and cells drop border utilities + `border-r!`; their flex containers get `gap-px bg-border`; sticky resource/gutter columns keep `bg-background` (opaque) but no border (the gap is the separator).
- [ ] **Step 4: Run** the resource tests — expect PASS.
- [ ] **Step 5: VISUAL CHECK (resource: horizontal + vertical, hourly + daily, month + week).** Confirm every arrangement: uniform lines, 4-side frame, no doubles (the original report), aligned across header/all-day/body.

## Task 6: Full verification + cross-container alignment

**Files:** none (verification)

- [ ] **Step 1: Run** `cd packages/calendar && bun test` — expect 0 fail.
- [ ] **Step 2: Run** `bun run type-check` and `bunx biome check packages/calendar/src --diagnostic-level=error` — clean.
- [ ] **Step 3: Run** `bun run --filter '@ilamy/calendar' build` — clean. Rebuild dist for the demo.
- [ ] **Step 4: Run** `bunx fallow@2.90.0 audit --changed-since main --gate new-only --no-cache` — clean.
- [ ] **Step 5: VISUAL CHECK at widths 375/768/1024 + horizontal scroll**, every view + resource arrangement, light + dark: lines stay aligned across header/all-day/body, no 1px seams at scroll edges, no doubles, no missing edges.
- [ ] **Step 6: Update the dev log** (`docs/logs/2026-06-27.md`) with the gap-based grid-border conversion.

## Task 7: Commit

- [ ] **Step 1:** Once all visual checks pass:
```bash
git add -A
git commit -m "refactor(calendar): grid lines via gap + bg-border with one 4-side frame"
```

---

## Notes on sequencing

Tasks 1–5 leave the grid visually broken *between* tasks (the shared `GridCell` loses borders in Task 1 before all containers add gaps). Execute 1→5 in one continuous pass without committing in between; the first commit is Task 7 after the whole grid is converted and visually verified. Per-task VISUAL CHECK steps are the gate; do not proceed to the next family until the current one looks right.
