import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import { useDragPreview } from '@/contexts/drag-preview-context'
import { getDragPreviewEvent } from '@/lib/utils/drag-preview'

interface UseDragPreviewEventInput {
	days: Dayjs[]
	gridType: 'day' | 'hour'
	resourceId?: string | number
	/** True for the all-day band, which shows only all-day events. */
	allDay?: boolean
}

/**
 * The event being dragged, positioned at its candidate times, as THIS grid
 * would show it — or null when the drag is elsewhere. Both grids ask the same
 * question and differ only in the layout they then run it through.
 */
export const useDragPreviewEvent = ({
	days,
	gridType,
	resourceId,
	allDay,
}: UseDragPreviewEventInput): CalendarEvent | null => {
	const dragPreview = useDragPreview()

	// Memoized as one value: `days.at(-1).add(...)` builds a new Dayjs every
	// render, so listing it as a dependency would make the memo below never hit.
	const range = useMemo(
		() => ({
			rangeStart: days.at(0),
			// `isPreviewOnTarget` takes the last instant, not the exclusive end.
			rangeEnd: days.at(-1)?.add(1, gridType).subtract(1, 'millisecond'),
		}),
		[days, gridType]
	)

	return useMemo(
		() => getDragPreviewEvent(dragPreview, { ...range, resourceId, allDay }),
		[dragPreview, range, resourceId, allDay]
	)
}
