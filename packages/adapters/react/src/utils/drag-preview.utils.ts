import type { CalendarEvent } from '@ilamy/types'
import {
	overlapsRange,
	toOffsetIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import type { DragPreviewState } from '@/stores/drag-preview-context'

export interface DragPreviewTarget {
	/** First instant shown. */
	rangeStart: ZonedDate | undefined
	/** Last instant shown, inclusive (matching `overlapsRange`). */
	rangeEnd: ZonedDate | undefined
	resourceId?: string | number
	allDay?: boolean
}

/** Whether the event being dragged would land on this target. */
export const isPreviewOnTarget = (
	dragPreview: DragPreviewState | null,
	{ rangeStart, rangeEnd, resourceId, allDay }: DragPreviewTarget
): boolean => {
	if (!dragPreview || !rangeStart || !rangeEnd) {
		return false
	}
	if (!dragPreview.isDropAllowed) {
		return false
	}
	const targetTakesOnlyAllDay = Boolean(allDay)
	if (targetTakesOnlyAllDay && !dragPreview.allDay) {
		return false
	}

	const previewHasResource = dragPreview.resourceId !== undefined
	const targetHasResource = resourceId !== undefined
	const isDifferentResource = dragPreview.resourceId !== resourceId
	const isOtherResource =
		previewHasResource && targetHasResource && isDifferentResource
	if (isOtherResource) {
		return false
	}

	return overlapsRange(
		{ start: dragPreview.start, end: dragPreview.end },
		rangeStart,
		rangeEnd
	)
}

/** The dragged event positioned at its candidate times, or `null`. */
export const getDragPreviewEvent = (
	dragPreview: DragPreviewState | null,
	target: DragPreviewTarget
): CalendarEvent | null => {
	if (!dragPreview || !isPreviewOnTarget(dragPreview, target)) {
		return null
	}

	return {
		...dragPreview.event,
		start: toOffsetIso(dragPreview.start),
		end: toOffsetIso(dragPreview.end),
		allDay: dragPreview.allDay,
	}
}

/** Cursor worn by the page while dragging (`'not-allowed'` when refused). */
export const getDragCursor = (
	dragPreview: DragPreviewState | null
): 'not-allowed' | undefined =>
	dragPreview?.isDropAllowed === false ? 'not-allowed' : undefined
