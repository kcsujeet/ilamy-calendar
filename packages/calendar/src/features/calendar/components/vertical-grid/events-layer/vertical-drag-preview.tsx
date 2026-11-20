import { getVerticalBarStyle, type VerticalPositionedEvent } from '@ilamy/core'
import { cn } from '@ilamy/ui/lib/utils'
import { formatDate, parseDate, resolveZone } from '@ilamy/utils/temporal'
import { DragPreviewCard } from '@/features/calendar/components/drag-and-drop/drag-preview-card'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { STICKY_TITLE_CLASS } from '@/features/calendar/utils/event-surface'

interface VerticalDragPreviewProps {
	previewPositioned: VerticalPositionedEvent
}

export function VerticalDragPreview({
	previewPositioned,
}: VerticalDragPreviewProps) {
	const { timeFormat, currentLocale, timezone } = useSmartCalendarContext(
		(c) => ({
			timeFormat: c.timeFormat,
			currentLocale: c.currentLocale,
			timezone: c.timezone,
		})
	)
	const zone = resolveZone(timezone)
	const { event, isTruncatedStart, isTruncatedEnd } = previewPositioned
	const isTimed = !event.allDay
	const timeOptions: Intl.DateTimeFormatOptions = {
		hour: 'numeric',
		minute: '2-digit',
		hour12: timeFormat === '12-hour',
	}
	const start = parseDate(event.start, zone)
	const end = parseDate(event.end, zone)
	const formattedStart = start
		? formatDate(start, timeOptions, currentLocale)
		: ''
	const formattedEnd = end ? formatDate(end, timeOptions, currentLocale) : ''

	return (
		<DragPreviewCard
			contentClassName="px-1.5 py-1 relative"
			event={event}
			isTruncatedEnd={isTruncatedEnd}
			isTruncatedStart={isTruncatedStart}
			orientation="vertical"
			style={getVerticalBarStyle(previewPositioned)}
		>
			{isTimed && (
				<p className="text-[10px] font-semibold sm:text-xs">
					{formattedStart} – {formattedEnd}
				</p>
			)}
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
