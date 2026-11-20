import type { CalendarEvent } from '@ilamy/types'
import { add, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { useDragPreview } from '@/features/calendar/stores/drag-preview-context'
import { getDragPreviewEvent } from '@/features/calendar/utils/drag-preview'

interface UseDragPreviewEventInput {
	days: ZonedDate[]
	gridType: 'day' | 'hour'
	resourceId?: string | number
	allDay?: boolean
}

export const useDragPreviewEvent = ({
	days,
	gridType,
	resourceId,
	allDay,
}: UseDragPreviewEventInput): CalendarEvent | null => {
	const dragPreview = useDragPreview()

	const range = useMemo(() => {
		const last = days.at(-1)
		return {
			rangeStart: days.at(0),
			rangeEnd: last
				? add(add(last, 1, gridType), -1, 'millisecond')
				: undefined,
		}
	}, [days, gridType])

	return useMemo(
		() => getDragPreviewEvent(dragPreview, { ...range, resourceId, allDay }),
		[dragPreview, range, resourceId, allDay]
	)
}
