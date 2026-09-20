import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { overlapsRange } from '@ilamy/utils/helpers'
import type { DragPreviewState } from '@/contexts/drag-preview-context'

/**
 * What a grid (or a single cell) is showing, so the drag preview can be tested
 * against it the same way real events are.
 */
export interface DragPreviewTarget {
	/** First instant shown. */
	rangeStart: Dayjs | undefined
	/**
	 * LAST instant shown, inclusive — `overlapsRange`'s convention, which the
	 * sibling hooks feed with `endOf(unit)`. Passing an exclusive end here
	 * makes the range one instant too long and highlights the next cell.
	 */
	rangeEnd: Dayjs | undefined
	resourceId?: string | number
	/**
	 * True for the all-day band, which shows only all-day events. A month row
	 * and a day cell take both kinds, mirroring `useProcessedWeekEvents`, whose
	 * filter is likewise a no-op unless `allDay` is set.
	 */
	allDay?: boolean
}

/**
 * Whether the event being dragged would land on this target. One predicate for
 * both readers: the grids (to draw the snapped mirror) and the cells (to paint
 * the highlight). Two copies of this drifted apart once already (#248), which
 * is why the overlap half defers to `@ilamy/utils`.
 */
export const isPreviewOnTarget = (
	dragPreview: DragPreviewState | null,
	{ rangeStart, rangeEnd, resourceId, allDay }: DragPreviewTarget
): boolean => {
	if (!dragPreview || !rangeStart || !rangeEnd) {
		return false
	}

	const targetTakesOnlyAllDay = Boolean(allDay)
	if (targetTakesOnlyAllDay && !dragPreview.allDay) {
		return false
	}

	const previewHasResource = dragPreview.resourceId !== undefined
	const targetHasResource = resourceId !== undefined
	const isOtherResource =
		previewHasResource &&
		targetHasResource &&
		dragPreview.resourceId !== resourceId
	if (isOtherResource) {
		return false
	}

	const candidate = { start: dragPreview.start, end: dragPreview.end }
	return overlapsRange(candidate, rangeStart, rangeEnd)
}

/**
 * The dragged event positioned at its candidate times, ready to be handed to
 * the same layout function that places real events, or null when the drag is
 * not over this target.
 */
export const getDragPreviewEvent = (
	dragPreview: DragPreviewState | null,
	target: DragPreviewTarget
): CalendarEvent | null => {
	if (!dragPreview || !isPreviewOnTarget(dragPreview, target)) {
		return null
	}

	return {
		...dragPreview.event,
		start: dragPreview.start,
		end: dragPreview.end,
		allDay: dragPreview.allDay,
	}
}
