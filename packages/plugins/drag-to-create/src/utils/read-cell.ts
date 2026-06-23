import type { Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'

/**
 * A grid cell's identity, read from the self-describing data attributes that
 * `DroppableCell` emits (`data-start`/`data-end`/`data-resource-id`/`data-all-day`).
 */
export interface RawCell {
	start: Dayjs
	end: Dayjs
	resourceId?: string
	allDay: boolean
	/** The cell element itself (for geometry / mirror positioning). */
	element: HTMLElement
}

/**
 * Find the grid cell at or above `el` and read its range/identity. Returns null
 * when `el` is not inside a cell (e.g. pointer over an event or empty gutter), or
 * the cell is disabled.
 *
 * `data-start`/`data-end` are UTC ISO strings (the cell emits `toISOString()`).
 * They MUST be parsed with `dayjs.utc()`: the configured dayjs aliases the
 * `dayjs()` constructor to `dayjs.tz()`, which (under a `setDefault` timezone)
 * reads a `Z` string by its literal wall-clock — so `dayjs('…T03:00Z')` would
 * yield 03:00, not the 00:00 the instant represents. `dayjs.utc(iso)` parses the
 * instant correctly; `.tz(timezone)` then renders it in calendar-local time.
 *
 * Reconstructing in the calendar timezone matters both for a correct
 * `openEventForm` payload AND so the same-day clamp in `isSameRegion` compares
 * calendar days, not UTC days (a 23:59 cell would otherwise read as the next
 * UTC day). With no `timezone` (regular calendar) we render in the local zone.
 */
export const readCell = (
	el: Element | null | undefined,
	timezone?: string
): RawCell | null => {
	const cell = el?.closest<HTMLElement>('[data-start]')
	if (!cell) {
		return null
	}
	if (cell.dataset.disabled === 'true') {
		return null
	}
	const start = cell.dataset.start
	const end = cell.dataset.end
	if (!start || !end) {
		return null
	}
	const toCalendarTime = (iso: string): Dayjs =>
		timezone ? dayjs.utc(iso).tz(timezone) : dayjs.utc(iso).local()
	return {
		start: toCalendarTime(start),
		end: toCalendarTime(end),
		resourceId: cell.dataset.resourceId,
		allDay: cell.dataset.allDay === 'true',
		element: cell,
	}
}
