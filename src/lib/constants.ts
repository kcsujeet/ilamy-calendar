import type { WeekDays } from '@/components'

export const GAP_BETWEEN_ELEMENTS = 1 // px (gap-1)
export const DAY_NUMBER_HEIGHT = 24 // px (h-6)
export const EVENT_BAR_HEIGHT = 24 // px (h-[24px])
export const HOUR_ROW_HEIGHT_PX = 60 // px — matches vertical time-grid row min height
/** Week view gutter track below `sm` (explicit rem, not Tailwind spacing). */
export const WEEK_GUTTER_WIDTH_NARROW = '2.5rem'
/** Week view gutter track at `sm+`; fits long i18n labels (e.g. FR "Toute la journée"). */
export const WEEK_GUTTER_WIDTH_WIDE = '7rem'
/** Week view gutter grid child — width from `grid-template-columns`, not Tailwind `w-*` spacing. */
export const WEEK_GUTTER_CELL_CLASS =
	'min-w-0 w-full max-w-full overflow-x-clip'
/**
 * Sets `--week-gutter-width` via CSS (SSR-safe); pair with `getWeekColumnTemplate`.
 * Avoids `matchMedia` in React, which hydrates differently from the server on wide viewports.
 */
export const WEEK_GRID_GUTTER_VARS_CLASS = `[--week-gutter-width:${WEEK_GUTTER_WIDTH_NARROW}] sm:[--week-gutter-width:${WEEK_GUTTER_WIDTH_WIDE}]`

// Builds week header/body/all-day `grid-template-columns` using the gutter CSS variable.
export const getWeekColumnTemplate = (visibleDayCount: number): string =>
	`minmax(var(--week-gutter-width), var(--week-gutter-width)) repeat(${visibleDayCount}, minmax(0, 1fr))`
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
