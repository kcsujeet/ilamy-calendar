import { cn } from '@ilamy/ui/lib/utils'
import { DragPreviewCard } from '@/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from '@/lib/layout/geometry'
import { getTimeOfDayPattern } from '@/lib/utils/date-utils'
import { STICKY_TITLE_CLASS } from '@/lib/utils/event-surface'

interface HorizontalDragPreviewProps {
	previewPositioned: HorizontalPositionedEvent
	top: number
}

/** The snapped mirror, placed by the same layout pass that places real bars. */
export function HorizontalDragPreview({
	previewPositioned,
	top,
}: HorizontalDragPreviewProps) {
	const { timeFormat, eventHeight } = useSmartCalendarContext((c) => ({
		timeFormat: c.timeFormat,
		eventHeight: c.eventHeight,
	}))
	const { event, isTruncatedStart, isTruncatedEnd } = previewPositioned

	return (
		<DragPreviewCard
			contentClassName="px-1.5 flex items-center gap-1"
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
			orientation="horizontal"
			style={getHorizontalBarStyle(previewPositioned, top, eventHeight)}
		>
			{!event.allDay && (
				<span className="text-[10px] font-semibold sm:text-xs">
					{event.start.format(getTimeOfDayPattern(timeFormat))}
				</span>
			)}
			<span
				className={cn(
					'text-[10px] font-bold sm:text-xs truncate',
					STICKY_TITLE_CLASS.horizontal
				)}
			>
				{event.title}
			</span>
		</DragPreviewCard>
	)
}
