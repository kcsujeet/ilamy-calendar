import type { WeekDays } from '@/components'

export const GAP_BETWEEN_ELEMENTS = 1 // px (gap-1)
export const DAY_NUMBER_HEIGHT = 24 // px (h-6)
export const EVENT_BAR_HEIGHT = 24 // px (h-[24px])
export const DAY_MAX_EVENTS_DEFAULT = 4 // Default max events per day
// --- Reusable class strings ---

export const HEADER_ANIMATION =
	'animate-in slide-in-from-bottom duration-500 ease-out'
export const RESOURCE_CORNER =
	'w-20 sm:w-40 border-b border-r shrink-0 flex justify-center items-center sticky top-0 left-0 bg-background z-20'
export const RESOURCE_ROW_LABEL =
	'w-20 sm:w-40 sticky left-0 bg-background z-20 h-full'
export const TIME_COLUMN =
	'shrink-0 w-16 min-w-16 max-w-16 sticky left-0 bg-background z-20'
export const TIME_COLUMN_CELL =
	'text-muted-foreground p-2 text-right text-[10px] sm:text-xs flex flex-col items-center'
export const CELL_CLASS =
	'cursor-pointer overflow-clip p-1 hover:bg-accent min-h-[60px] relative border-r last:border-r-0 only:border-r border-b'
export const DISABLED_CELL_CLASSNAME =
	'bg-secondary text-muted-foreground pointer-events-none'
export const TODAY_HIGHLIGHT = 'bg-blue-50 text-blue-600'

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
