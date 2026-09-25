import { cn } from '@ilamy/ui/lib/utils'
import { DragPreviewCard } from '@/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	getVerticalBarStyle,
	type VerticalPositionedEvent,
} from '@/lib/layout/geometry'
import { getTimeOfDayPattern } from '@/lib/utils/date-utils'
import { STICKY_TITLE_CLASS } from '@/lib/utils/event-surface'

interface VerticalDragPreviewProps {
	previewPositioned: VerticalPositionedEvent
}

/** The snapped mirror, placed by the same layout pass that places real bars. */
export function VerticalDragPreview({
	previewPositioned,
}: VerticalDragPreviewProps) {
	const timeFormat = useSmartCalendarContext((c) => c.timeFormat)
	const { event, isTruncatedStart, isTruncatedEnd } = previewPositioned
	const pattern = getTimeOfDayPattern(timeFormat)

	return (
		<DragPreviewCard
			contentClassName="px-1.5 py-1 relative"
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
			orientation="vertical"
			style={getVerticalBarStyle(previewPositioned)}
		>
			<p className="text-[10px] font-semibold sm:text-xs">
				{event.start.format(pattern)} – {event.end.format(pattern)}
			</p>
			<p
				className={cn(
					'text-[10px] font-bold sm:text-xs truncate',
					STICKY_TITLE_CLASS.vertical
				)}
			>
				{event.title}
			</p>
		</DragPreviewCard>
	)
}
