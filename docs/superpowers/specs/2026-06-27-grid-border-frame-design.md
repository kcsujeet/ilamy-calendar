# Grid border frame — design

## Goal

A single, reusable mechanism for the calendar grid lines so the calendar body's
outer border is never doubled by edge cells, in every view (day/week/month/year)
and every resource arrangement. Replace the scattered per-cell border patches
(`isLastRow`/`isLastColumn` strips, `last:border-r-0`, `border-r!`) with one rule.

## Decisions (from brainstorming)

1. The outer frame stays a **symmetric 4-side `border`** on the calendar body —
   one owner of the frame.
2. This **replaces** the existing per-cell border machinery (no scattered
   strips/overrides left behind).
3. **Sub-hour (half-hour) dividers stay dashed** — a documented exception that
   keeps a dashed border on the sub-slot, since a gap can only be solid.

## Mechanism: lines from gaps, frame from the body

The grid lines are produced by **1px gaps that reveal a `bg-border` container**,
not by per-cell borders:

- **Calendar body**: keeps `border` (all four sides). It is the only thing that
  draws the outer frame.
- **Grid containers** (the wrappers that lay cells out in a row or column): add
  `gap-px bg-border`. The 1px gaps between children expose the container's
  `bg-border` background as the grid lines.
- **Cells**: become `bg-background` and drop **all** border utilities. Because
  the cell background is opaque, the container's `bg-border` only shows through
  the 1px gaps. Stateful fills stay opaque too (`hover:bg-accent`, disabled
  `bg-secondary`), so they keep occluding correctly.

Result: every line — internal or frame — is a single uniform `border-border`
stroke. Nothing a cell renders can reach the frame, so there is no doubling, with
no edge detection anywhere.

Why gaps and not `divide-x`/`divide-y`: `divide-*` adds a border to *every* child,
including each column's absolute events-layer overlay, producing stray lines.
`gap` ignores out-of-flow (absolute) children, so it is clean here.

Token facts (verified): `--color-border` is mapped in the demo theme's
`@theme inline` (`apps/demo/src/styles/globals.css`), so `bg-border` is a valid
utility; `border-border` is already applied globally. `gap-px` (1px) is already
used in `year-view.tsx`.

## The rule (what every grid follows)

> The calendar body draws the 4-side `border` frame. Every cell-layout container
> draws `gap-px bg-border`. Cells are `bg-background` (or another opaque fill) and
> draw no borders. Sub-hour slots are the only exception: a dashed border.

## Affected areas (audit)

Cells / shared:
- `components/grid-cell.tsx` — remove `border-r border-b` from the base; add
  `bg-background`. (The opaque fill is what occludes the container `bg-border`.)
- `components/droppable-cell.tsx` — drop `disabledClass` reliance on borders;
  disabled stays `bg-secondary` (opaque).

Vertical grid (day/week time grid):
- `vertical-grid.tsx` (columns wrapper → `gap-px bg-border`),
  `vertical-grid-col.tsx` (the hour-rows container → `gap-px bg-border`; cells
  lose `border-r`/`border-b`/`isLastColumn`/`isLastHour` strips), `gutter.tsx`.
- Sub-hour: the sub-slot keeps a dashed border (the one exception).

Horizontal grid (month + resource):
- `horizontal-grid.tsx` (rows wrapper → `gap-px bg-border`),
  `horizontal-grid-row.tsx` (row + `GroupedColumn`: remove `isLastRow`/
  `isLastCol` strips and `border-r!`; the row/group containers get `gap-px
  bg-border`), `month-header.tsx`, `month.tsx` (resource date header — drop
  `border-r`/`last:border-r-0`).

All-day row:
- `all-day-row.tsx`, `all-day-cell.tsx` — gaps for the cell line; the row's
  separator from the body comes from the body/grid structure, not a per-cell
  `border-b`.

Resource arrangements:
- `resource-axis.tsx` (remove `border-r!`), `resource-week-horizontal-day-header.tsx`,
  `resource-week-vertical-resource-header.tsx`, `resource-week-vertical-day-header.tsx`,
  `time-header-row.tsx`, `week.tsx` — convert per-cell borders to container gaps.

Out of scope:
- `components/ui/calendar.tsx` (the popover day picker) — its own small table in a
  popover, no outer-frame doubling. Left as-is.

## Cross-container alignment

The header, all-day row, and scrolling time-grid body are separate stacked
containers. For the vertical lines to be continuous top-to-bottom, their column
boundaries (and the 1px gaps) must align. They already share the flex-1 column
model, so they should; this must be verified visually at multiple widths and
under horizontal scroll during implementation. If a seam appears, the fix is to
ensure each stacked container uses the same column widths + `gap-px` (no
per-container ad-hoc spacing).

## Risks / things to watch

- Drag-to-create selection, the "today" highlight, and event blocks rely on cell
  backgrounds — confirm they still read against `bg-background` cells with gaps.
- The events layer is `absolute inset-0` over each column; gaps don't affect it.
- Horizontal/vertical scroll: the body frame stays put (it's on the body, not the
  scroll content); the lines scroll with content. Confirm no 1px seam at the
  scroll edges.

## Test invariants (specs to add/keep)

- No grid cell carries `border-r`/`border-b`/`border-r!`/`last:border-r-0` in any
  view or resource arrangement (sweep-style assertion on representative cells).
- A representative grid container carries `gap-px` and `bg-border`.
- Cells carry an opaque background (`bg-background`).
- The calendar body carries `border` (4-side frame).
- Sub-hour slots still carry a dashed border.
- Existing behavior tests (event rendering, drag-create, view switching) stay
  green.

## Migration / sequencing

Convert one grid family at a time, verifying visually after each: (1) month
(horizontal grid), (2) week/day (vertical grid + all-day), (3) resource
arrangements. Remove the per-cell strip machinery as each family is converted, so
no half-converted state leaves doubles.
