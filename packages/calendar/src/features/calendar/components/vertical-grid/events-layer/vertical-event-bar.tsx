import { getVerticalBarStyle, type VerticalPositionedEvent } from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import {
	elapsedDiff,
	parseDate,
	resolveZone,
	toUtcIso,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { DraggableEvent } from '@/features/calendar/components/draggable-event/draggable-event'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { getDragSegment } from '@/features/calendar/utils/grab-offset'
import { keys } from '@/features/calendar/utils/keys'

export const getVerticalEventKey = (
	eventId: string | number,
	index: number,
	days: ZonedDate[],
	resourceId?: string | number
) => {
	const firstDay = days.at(0)
	return `event-${eventId}-${index}-${firstDay ? toUtcIso(firstDay) : undefined}-${resourceId ?? 'no-resource'}`
}

interface VerticalEventBarProps {
	positioned: VerticalPositionedEvent
	elementId: string
	range: { start: ZonedDate | undefined; end: ZonedDate | undefined }
	resourceId?: string | number
	draggedEventId?: string | number
	hiddenDays?: Set<number>
}

export function VerticalEventBar({
	positioned,
	elementId,
	range,
	resourceId,
	draggedEventId,
	hiddenDays,
}: VerticalEventBarProps) {
	const timezone = useSmartCalendarContext((c) => c.timezone)
	const zone = resolveZone(timezone)
	const { event } = positioned
	const start = parseDate(event.start, zone)
	const end = parseDate(event.end, zone)
	const isShortEvent = Boolean(
		start && end && elapsedDiff(end, start, 'minute') <= 15
	)

	return (
		<div
			className="absolute"
			data-testid={keys.container.verticalEvent(event.id)}
			style={getVerticalBarStyle(positioned)}
		>
			<DraggableEvent
				className={cn('pointer-events-auto', {
					'[&_p]:text-[10px] [&_p]:mt-0': isShortEvent,
				})}
				dragSegment={getDragSegment(event, range, 'vertical', hiddenDays)}
				elementId={elementId}
				event={event}
				isBeingDragged={draggedEventId === event.id}
				isTruncatedEnd={positioned.isTruncatedEnd}
				isTruncatedStart={positioned.isTruncatedStart}
				resizeGranularity="slot"
				sourceResourceId={resourceId}
			/>
		</div>
	)
}
