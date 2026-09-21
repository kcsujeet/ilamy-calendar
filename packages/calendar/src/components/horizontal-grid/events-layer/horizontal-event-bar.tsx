import type { Dayjs } from '@ilamy/utils/dayjs'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'
import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from '@/lib/layout/geometry'
import { getDragSegment } from '@/lib/utils/grab-offset'
import { keys } from '@/lib/utils/keys'

/** Identifies one bar: a row draws an event once per stacking row and resource. */
export const getHorizontalEventKey = (
	positioned: HorizontalPositionedEvent,
	weekStart: Dayjs | undefined,
	resourceId?: string | number
) =>
	`${positioned.event.id}-${positioned.row}-${weekStart?.toISOString()}-${resourceId ?? 'no-resource'}`

interface HorizontalEventBarProps {
	positioned: HorizontalPositionedEvent
	elementId: string
	top: number
	eventHeight: number
	range: { start: Dayjs | undefined; end: Dayjs | undefined }
	resourceId?: string | number
	draggedEventId?: string | number
}

/** One event, spanning the columns the layout pass gave it. */
export function HorizontalEventBar({
	positioned,
	elementId,
	top,
	eventHeight,
	range,
	resourceId,
	draggedEventId,
}: HorizontalEventBarProps) {
	const { event, left, width } = positioned

	return (
		<div
			className="absolute z-10 pointer-events-auto overflow-clip"
			data-left={left}
			data-testid={keys.container.horizontal.event(event.id)}
			data-top={top}
			data-width={width}
			style={getHorizontalBarStyle(positioned, top, eventHeight)}
		>
			<DraggableEvent
				className="h-full w-full shadow"
				dragSegment={getDragSegment(event, range, 'horizontal')}
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
