import type { Dayjs } from '@ilamy/calendar'
import type { RawCell } from './read-cell'

/** Match @dnd-kit's MouseSensor `distance: 2` so click-vs-drag feels identical. */
const DRAG_THRESHOLD_PX = 2

/** True once the pointer has moved far enough to count as a drag, not a click. */
export const exceedsThreshold = (
	dx: number,
	dy: number,
	min: number = DRAG_THRESHOLD_PX
): boolean => Math.hypot(dx, dy) >= min

/**
 * A cell that covers a whole day: a month / day-grid cell or an all-day-row cell.
 * Such cells may be selected across days (multi-day); sub-day timed slots clamp to
 * the start day. Derived from the cell's own range, so it holds in every view and
 * resource orientation without geometry-specific code.
 */
const FULL_DAY_HOURS = 23
const isFullDaySpan = (cell: RawCell): boolean =>
	cell.end.diff(cell.start, 'hour') >= FULL_DAY_HOURS

/**
 * The single-region invariant: a selection never mixes all-day and timed cells,
 * never spans resources (the resource clamp holds in both orientations), and a
 * timed (sub-day) selection stays within the start day. Full-day cells — the
 * month grid and the all-day row — may span days (multi-day). A candidate cell in
 * a different region is ignored, so the drag clamps to where it started.
 */
export const isSameRegion = (start: RawCell, candidate: RawCell): boolean => {
	if (start.allDay !== candidate.allDay) {
		return false
	}
	if (start.resourceId !== candidate.resourceId) {
		return false
	}
	if (!isFullDaySpan(start) && !start.start.isSame(candidate.start, 'day')) {
		return false
	}
	return true
}

export interface DragSelection {
	start: Dayjs
	end: Dayjs
	allDay: boolean
	resourceId?: string
}

/**
 * The committed range from two cells, normalized so `start <= end` regardless of
 * drag direction: from the earlier cell's start to the later cell's end.
 */
export const computeRange = (a: RawCell, b: RawCell): DragSelection => {
	const reversed = a.start.isAfter(b.start)
	const first = reversed ? b : a
	const second = reversed ? a : b
	return {
		start: first.start,
		end: second.end,
		allDay: first.allDay,
		resourceId: first.resourceId,
	}
}
