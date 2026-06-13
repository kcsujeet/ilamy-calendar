import type { WeekDays } from '@ilamy/types'

export const GAP_BETWEEN_ELEMENTS = 1 // px (gap-1)
export const DAY_NUMBER_HEIGHT = 24 // px (h-6)
export const EVENT_BAR_HEIGHT = 24 // px (h-[24px])
export const DAY_MAX_EVENTS_DEFAULT = 4 // Default max events per day
export const DISABLED_CELL_CLASSNAME =
	'bg-secondary text-muted-foreground pointer-events-none'

export const WEEK_DAYS_NUMBER_MAP: Record<WeekDays, number> = {
	sunday: 0,
	monday: 1,
	tuesday: 2,
	wednesday: 3,
	thursday: 4,
	friday: 5,
	saturday: 6,
}

// Per-item stagger (seconds) for AnimatedSection sequences in view headers and
// the year grid. Previously the literal 0.05 pasted into 7 files.
export const HEADER_STAGGER_DELAY = 0.05

// Per-item stagger (seconds) for long hour sequences (a week of hour labels):
// at HEADER_STAGGER_DELAY a 168-item row would take ~8s to finish animating.
export const HOUR_STAGGER_DELAY = 0.005

// Header height contract: one header row (day labels, hour labels) is h-12;
// the grouped two-row header (day row stacked on hour row) must be exactly
// 2x that — h-24. Change them together.
export const HEADER_ROW_HEIGHT = 'h-12'
export const GROUPED_HEADER_HEIGHT = 'h-24'
