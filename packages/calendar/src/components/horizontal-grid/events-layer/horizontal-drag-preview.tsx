import { DragPreviewCard } from '@/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { timeOfDayPattern } from '@/lib/utils/date-utils'

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
	const { event, left, width, isTruncatedStart, isTruncatedEnd } =
		previewPositioned

	return (
		<DragPreviewCard
			contentClassName="px-1.5 flex items-center gap-1"
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
			orientation="horizontal"
			style={{
				left: `calc(${left}% + var(--spacing) * 0.25)`,
				width: `calc(${width}% - var(--spacing) * 1)`,
				top: `${top}px`,
				height: `${eventHeight}px`,
			}}
		>
			{!event.allDay && (
				<span className="text-[10px] font-semibold sm:text-xs">
					{event.start.format(timeOfDayPattern(timeFormat))}
				</span>
			)}
			<span className="text-[10px] font-bold sm:text-xs truncate">
				{event.title}
			</span>
		</DragPreviewCard>
	)
}
