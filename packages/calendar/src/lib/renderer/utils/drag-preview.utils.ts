import { toOffsetIso } from '../../../index'
import type { InteractionPreview } from '../../interactions/calendar-pointer-engine'
import type { DomCalendarEvent } from '../types/renderer.types'

/**
 * Builds the transient preview event matching a snapped pointer drag/resize
 * operation, or `null` when no valid placement preview is active.
 */
export const resolveDragPreviewEvent = (
	dragPreview: InteractionPreview | null | undefined,
	visibleEvents: readonly DomCalendarEvent[]
): DomCalendarEvent | null => {
	if (
		!dragPreview?.allowed ||
		dragPreview.eventId === undefined ||
		!dragPreview.start ||
		!dragPreview.end
	) {
		return null
	}
	const source = visibleEvents.find(
		(item) => String(item.id) === String(dragPreview.eventId)
	)
	if (!source) return null
	return {
		...source,
		start: toOffsetIso(dragPreview.start),
		end: toOffsetIso(dragPreview.end),
		allDay: dragPreview.allDay ?? source.allDay,
		resourceId: dragPreview.resourceId ?? source.resourceId,
	}
}
