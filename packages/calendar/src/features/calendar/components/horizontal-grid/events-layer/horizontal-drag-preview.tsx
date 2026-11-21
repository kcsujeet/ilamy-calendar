import {
	getHorizontalBarStyle,
	type HorizontalPositionedEvent,
} from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import { formatDate, parseDate, resolveZone } from '@ilamy/utils/temporal'
import { DragPreviewCard } from '@/features/calendar/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { STICKY_TITLE_CLASS } from '@/features/calendar/utils/event-surface'

interface HorizontalDragPreviewProps {
	previewPositioned: HorizontalPositionedEvent
	top: number
}

/** The snapped mirror, placed by the same layout pass that places real bars. */
export function HorizontalDragPreview({
	previewPositioned,
	top,
}: HorizontalDragPreviewProps) {
	const { timeFormat, eventHeight, currentLocale, timezone } =
		useSmartCalendarContext((c) => ({
			timeFormat: c.timeFormat,
			eventHeight: c.eventHeight,
			currentLocale: c.currentLocale,
			timezone: c.timezone,
		}))
	const { event, isTruncatedStart, isTruncatedEnd } = previewPositioned
	const start = parseDate(event.start, resolveZone(timezone))
	let formattedStart = ''
	if (start) {
		formattedStart = formatDate(
			start,
			{
				hour: 'numeric',
				minute: '2-digit',
				hour12: timeFormat === '12-hour',
			},
			currentLocale
		)
	}

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
					{formattedStart}
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
