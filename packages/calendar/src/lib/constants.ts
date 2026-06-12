import type { WeekDays } from '@/components'

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

export const DAY_NUMBER_TO_WEEK_DAYS: Record<number, WeekDays> = {
	0: 'sunday',
	1: 'monday',
	2: 'tuesday',
	3: 'wednesday',
	4: 'thursday',
	5: 'friday',
	6: 'saturday',
}

// Per-item stagger (seconds) for AnimatedSection sequences in view headers and
// the year grid. Previously the literal 0.05 pasted into 7 files.
export const HEADER_STAGGER_DELAY = 0.05
