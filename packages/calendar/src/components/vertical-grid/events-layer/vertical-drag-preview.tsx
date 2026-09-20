import { cn } from '@ilamy/ui/lib/utils'
import { DragPreviewCard } from '@/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { VerticalPositionedEvent } from '@/lib/layout/geometry'
import { timeOfDayPattern } from '@/lib/utils/date-utils'

interface VerticalDragPreviewProps {
	previewPositioned: VerticalPositionedEvent
}

/** The snapped mirror, placed by the same layout pass that places real bars. */
export function VerticalDragPreview({
	previewPositioned,
}: VerticalDragPreviewProps) {
	const timeFormat = useSmartCalendarContext((c) => c.timeFormat)
	const { event, left, width, top, height, isTruncatedStart, isTruncatedEnd } =
		previewPositioned
	const pattern = timeOfDayPattern(timeFormat)

	return (
		<DragPreviewCard
			contentClassName={cn('px-1.5 py-1 relative', event.color || 'text-white')}
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
			orientation="vertical"
			style={{
				left: `${left}%`,
				width: `calc(${width}% - var(--spacing) * 2)`,
				top: `${top}%`,
				height: `${height}%`,
			}}
		>
			<p className="text-[10px] font-semibold sm:text-xs">
				{event.start.format(pattern)} – {event.end.format(pattern)}
			</p>
			<p className="text-[10px] font-bold sm:text-xs truncate">{event.title}</p>
		</DragPreviewCard>
	)
}
