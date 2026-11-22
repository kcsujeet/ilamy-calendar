import type { CalendarEvent } from '@ilamy/types'
import { add, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { useDragPreview } from '@/stores/drag-preview-context'
import { getDragPreviewEvent } from '@/utils/drag-preview.utils'

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
		let rangeEnd: ZonedDate | undefined
		if (last) {
			rangeEnd = add(add(last, 1, gridType), -1, 'millisecond')
		}
		return {
			rangeStart: days.at(0),
			rangeEnd,
		}
	}, [days, gridType])

	return useMemo(
		() => getDragPreviewEvent(dragPreview, { ...range, resourceId, allDay }),
		[dragPreview, range, resourceId, allDay]
	)
}
