import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from '@ilamy/core'
import type { CalendarEvent } from '@ilamy/types'
import {
	isAfter,
	isSameDay,
	parseDate,
	resolveZone,
	subtract,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { DraggableEvent } from '@/features/calendar/components/draggable-event/draggable-event'
import type { ResizeGranularity } from '@/features/calendar/components/draggable-event/resize-handle'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getDragSegment } from '@/features/calendar/utils/grab-offset'
import { keys } from '@/features/calendar/utils/keys'

/** Identifies one bar: a row draws an event once per stacking row and resource. */
export const getHorizontalEventKey = (
	positioned: HorizontalPositionedEvent,
	weekStart: ZonedDate | undefined,
	resourceId?: string | number
) =>
	`${positioned.event.id}-${positioned.row}-${weekStart ? toUtcIso(weekStart) : undefined}-${resourceId ?? 'no-resource'}`

/**
 * What a resize of this bar snaps to. A grid of hours snaps to its cells; a
 * grid of days snaps to whole days, except for a single-day timed event, which
 * reads as a dot there and is not resizable (FullCalendar,
 * `daygrid/event-rendering.ts:13-26`, v7.1.1).
 */
const getResizeGranularity = (
	event: CalendarEvent,
	gridType: 'day' | 'hour',
	timezone: string
): ResizeGranularity | undefined => {
	if (gridType === 'hour') {
		return 'slot'
	}
	const start = parseDate(event.start, timezone)
	const end = parseDate(event.end, timezone)
	if (!(start && end)) {
		return 'day'
	}
	const hasSpan = isAfter(end, start)
	const lastCoveredInstant = hasSpan ? subtract(end, 1, 'millisecond') : start
	const isSingleDay = isSameDay(start, lastCoveredInstant)
	const isDot = !event.allDay && isSingleDay
	return isDot ? undefined : 'day'
}

interface HorizontalEventBarProps {
	positioned: HorizontalPositionedEvent
	gridType: 'day' | 'hour'
	elementId: string
	top: number
	eventHeight: number
	range: { start: ZonedDate | undefined; end: ZonedDate | undefined }
	resourceId?: string | number
	draggedEventId?: string | number
	hiddenDays?: Set<number>
}

export function HorizontalEventBar({
	positioned,
	gridType,
	elementId,
	top,
	eventHeight,
	range,
	resourceId,
	draggedEventId,
	hiddenDays,
}: HorizontalEventBarProps) {
	const timezone = useSmartCalendarContext((c) => c.timezone)
	const zone = resolveZone(timezone)
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
				dragSegment={getDragSegment(event, range, 'horizontal', hiddenDays)}
				elementId={elementId}
				event={event}
				isBeingDragged={draggedEventId === event.id}
				isTruncatedEnd={positioned.isTruncatedEnd}
				isTruncatedStart={positioned.isTruncatedStart}
				resizeGranularity={getResizeGranularity(event, gridType, zone)}
				sourceResourceId={resourceId}
			/>
		</div>
	)
}
