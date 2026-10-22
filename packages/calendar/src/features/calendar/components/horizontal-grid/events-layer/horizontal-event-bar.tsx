import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { isSameDay } from '@ilamy/utils/helpers'
import { DraggableEvent } from '@/features/calendar/components/draggable-event/draggable-event'
import type { ResizeGranularity } from '@/features/calendar/components/draggable-event/resize-handle'
import { getDragSegment } from '@/features/calendar/utils/grab-offset'
import { keys } from '@/features/calendar/utils/keys'
import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from '@/features/calendar/utils/layout/geometry'

/** Identifies one bar: a row draws an event once per stacking row and resource. */
export const getHorizontalEventKey = (
	positioned: HorizontalPositionedEvent,
	weekStart: Dayjs | undefined,
	resourceId?: string | number
) =>
	`${positioned.event.id}-${positioned.row}-${weekStart?.toISOString()}-${resourceId ?? 'no-resource'}`

/**
 * What a resize of this bar snaps to. A grid of hours snaps to its cells; a
 * grid of days snaps to whole days, except for a single-day timed event, which
 * reads as a dot there and is not resizable (FullCalendar,
 * `daygrid/event-rendering.ts:13-26`, v7.1.1).
 */
const getResizeGranularity = (
	event: CalendarEvent,
	gridType: 'day' | 'hour'
): ResizeGranularity | undefined => {
	if (gridType === 'hour') {
		return 'slot'
	}
	const hasSpan = event.end.isAfter(event.start)
	const lastCoveredInstant = hasSpan
		? event.end.subtract(1, 'millisecond')
		: event.start
	// `isSameDay`, not `isSame(…, 'day')`: every bar asks this on every render,
	// and the unit form goes through dayjs-timezone's `startOf` (see helpers).
	// Both instants come from one event, so they share its zone.
	const isSingleDay = isSameDay(event.start, lastCoveredInstant)
	const isDot = !event.allDay && isSingleDay
	return isDot ? undefined : 'day'
}

interface HorizontalEventBarProps {
	positioned: HorizontalPositionedEvent
	gridType: 'day' | 'hour'
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
	gridType,
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
				resizeGranularity={getResizeGranularity(event, gridType)}
				sourceResourceId={resourceId}
			/>
		</div>
	)
}
