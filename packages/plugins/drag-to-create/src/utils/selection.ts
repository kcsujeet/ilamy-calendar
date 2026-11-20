import { isAfter, type ZonedDate } from '@ilamy/utils/temporal'
import type { RawCell } from './read-cell'

const DRAG_THRESHOLD_PX = 2

export const exceedsThreshold = (
	dx: number,
	dy: number,
	min: number = DRAG_THRESHOLD_PX
): boolean => Math.hypot(dx, dy) >= min

export const isSameRegion = (start: RawCell, candidate: RawCell): boolean => {
	const sameAllDay = start.allDay === candidate.allDay
	const sameResource = start.resourceId === candidate.resourceId
	return sameAllDay && sameResource
}

export interface DragSelection {
	start: ZonedDate
	end: ZonedDate
	allDay: boolean
	resourceId?: string
}

export const computeRange = (a: RawCell, b: RawCell): DragSelection => {
	const reversed = isAfter(a.start, b.start)
	const first = reversed ? b : a
	const second = reversed ? a : b
	return {
		start: first.start,
		end: second.end,
		allDay: first.allDay,
		resourceId: first.resourceId,
	}
}
