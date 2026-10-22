import type { Dayjs } from '@ilamy/calendar'
import dayjs from '@ilamy/utils/dayjs'
import type { TimeAxis } from '@ilamy/utils/helpers'

/**
 * A grid cell's identity, read from the self-describing data attributes that
 * `DroppableCell` emits (`data-start`/`data-end`/`data-resource-id`/`data-all-day`).
 */
export interface RawCell {
	start: Dayjs
	end: Dayjs
	resourceId?: string
	allDay: boolean
	/**
	 * The size, in minutes, a selection snaps to inside this cell, and the axis
	 * time runs along in it. Present only on a time cell that snaps finer than
	 * itself (`data-snap-minutes`, `data-time-axis`).
	 */
	snapMinutes?: number
	axis?: TimeAxis
	/** The cell element itself (for geometry / mirror positioning). */
	element: HTMLElement
}

/**
 * The grid cell under a point, even when an event bar is drawn over it:
 * `elementFromPoint` would return the bar, which carries no cell attributes.
 */
export const cellElementAt = (point: {
	clientX: number
	clientY: number
}): Element | null => {
	const stack = document.elementsFromPoint(point.clientX, point.clientY)
	return stack.find((element) => element.hasAttribute('data-start')) ?? null
}

/**
 * Find the grid cell at or above `el` and read its range/identity. Returns null
 * when `el` is not inside a cell (e.g. pointer over an event or empty gutter), or
 * the cell is disabled.
 *
 * `data-start`/`data-end` are UTC ISO strings (the cell emits `toISOString()`).
 * They are parsed with `dayjs.utc()` and rendered through the explicit
 * `timezone` argument, so the reconstruction depends on nothing but its inputs:
 * the bare constructor would also read the instant correctly (#247) but would
 * render it in whatever zone `dayjs.tz.setDefault` last received.
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
	const snapMinutes = cell.dataset.snapMinutes
	const axis = cell.dataset.timeAxis
	return {
		start: toCalendarTime(start),
		end: toCalendarTime(end),
		resourceId: cell.dataset.resourceId,
		allDay: cell.dataset.allDay === 'true',
		snapMinutes: snapMinutes === undefined ? undefined : Number(snapMinutes),
		axis: axis === 'vertical' || axis === 'horizontal' ? axis : undefined,
		element: cell,
	}
}
