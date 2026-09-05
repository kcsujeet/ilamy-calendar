import type { WeekDays } from '@ilamy/types'

export const GAP_BETWEEN_ELEMENTS = 1 // px (gap-1)
export const DAY_NUMBER_HEIGHT = 24 // px (h-6)
export const EVENT_BAR_HEIGHT = 24 // px (h-[24px])
export const DAY_MAX_EVENTS_DEFAULT = 4 // Default max events per day
// A faint, opaque shade mixed from the theme's own background/foreground so it
// adapts to any theme. bg-secondary sat right on the (faint) border lightness
// in the dark shadcn palette, hiding the grid lines on disabled cells. The grid
// line sits between background and foreground in lightness, so a SMALL mix keeps
// the fill near the background and clear of the border line in both light and
// dark; mixing further would drift the fill onto the line and hide it again.
export const DISABLED_CELL_CLASSNAME =
	'bg-[color-mix(in_oklch,var(--background),var(--foreground)_3%)] text-muted-foreground pointer-events-none'

// A cell outside the view's navigation period that is still usable — month
// padding under `interactive` or `navigate`. It cannot borrow the disabled look
// (it is not disabled) but it cannot look like an ordinary cell either, or the
// month boundary disappears and the grid stops saying which month it is
// showing. Half the mix of the disabled fill: visible as a band, not as a wall.
export const OUTSIDE_PERIOD_CELL_CLASSNAME =
	'bg-[color-mix(in_oklch,var(--background),var(--foreground)_1.5%)] text-muted-foreground'

export const WEEK_DAYS_NUMBER_MAP: Record<WeekDays, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
}

// Header height contract: one header row (day labels, hour labels) is h-12;
// the grouped two-row header (day row stacked on hour row) must be exactly
// 2x that — h-24. Change them together.
export const HEADER_ROW_HEIGHT = 'h-12'
export const GROUPED_HEADER_HEIGHT = 'h-24'
