import { cn } from '@ilamy/ui/lib/utils'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import {
	getVerticalBarStyle,
	type VerticalPositionedEvent,
} from '@/lib/layout/geometry'
import { getDragSegment } from '@/lib/utils/grab-offset'

/** Identifies one bar: an event can be drawn once per column and per resource. */
export const getVerticalEventKey = (
	eventId: string | number,
	index: number,
	days: Dayjs[],
	resourceId?: string | number
) =>
	`event-${eventId}-${index}-${days.at(0)?.toISOString()}-${resourceId ?? 'no-resource'}`

interface VerticalEventBarProps {
	positioned: VerticalPositionedEvent
	elementId: string
	range: { start: Dayjs | undefined; end: Dayjs | undefined }
	resourceId?: string | number
	draggedEventId?: string | number
}

/** One event, placed by the layout pass and draggable from where it sits. */
export function VerticalEventBar({
	positioned,
	elementId,
	range,
	resourceId,
	draggedEventId,
}: VerticalEventBarProps) {
	const { event } = positioned
	// A bar this short has no room for the default two-line content.
	const isShortEvent = event.end.diff(event.start, 'minute') <= 15

	return (
		<div className="absolute" style={getVerticalBarStyle(positioned)}>
			<DraggableEvent
				className={cn('pointer-events-auto', {
					'[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
				})}
				dragSegment={getDragSegment(event, range, 'vertical')}
				elementId={elementId}
				event={event}
				isBeingDragged={draggedEventId === event.id}
				isTruncatedEnd={positioned.isTruncatedEnd}
				isTruncatedStart={positioned.isTruncatedStart}
				sourceResourceId={resourceId}
			/>
		</div>
	)
}
