import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { useDateTimeFormatters } from '@/hooks/use-date-time-formatters'
import { useCalendarTheme } from '@/stores/calendar-theme-context'
import { useGridAxis } from '@/stores/grid-axis-context'
import {
	getEventSurfaceClasses,
	getEventSurfaceRadius,
	getEventSurfaceStyle,
	STICKY_TITLE_CLASS,
} from '@/utils/event-surface.utils'

export interface DefaultEventContentProps {
	event: CalendarEvent
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
}

export function DefaultEventContent({
	event,
	isTruncatedStart,
	isTruncatedEnd,
}: DefaultEventContentProps) {
	const axis = useGridAxis()
	const { unstyled, slotProps } = useCalendarTheme()
	const { formatEventTime } = useDateTimeFormatters()
	const eventTimeText = formatEventTime(event)
	const usesThemeSlotBg =
		!event.backgroundColor &&
		!event.color &&
		Boolean(slotProps.eventBar?.style?.backgroundColor)

	// A stripe at `left-0`/`right-0` says "this span continues sideways", which
	// is what a month row cuts along. A time column cuts along the other axis —
	// an overnight event continues DOWNWARD — so the same stripe there marks two
	// edges the event does not actually run past. FullCalendar marks continuation
	// in daygrid only; timegrid carries no such affordance, and neither does this.
	const marksContinuation = axis === 'horizontal'
	const showStartMarker = marksContinuation && isTruncatedStart
	const showEndMarker = marksContinuation && isTruncatedEnd

	return (
		<div
			className={cn(
				getEventSurfaceClasses(event, !unstyled && !usesThemeSlotBg),
				'h-full w-full text-left overflow-clip relative',
				!unstyled && 'px-1 border-[1.5px] border-card',
				!unstyled &&
					getEventSurfaceRadius({ axis, isTruncatedStart, isTruncatedEnd })
			)}
			style={getEventSurfaceStyle(event)}
		>
			{/* Left continuation indicator */}
			{showStartMarker && !unstyled && (
				<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}

			{/* Event title */}
			<p
				className={cn(
					!unstyled && 'text-[10px] font-semibold sm:text-xs mt-0.5',
					STICKY_TITLE_CLASS[axis],
					// Add slight padding to avoid overlap with indicators
					showStartMarker && !unstyled && 'pl-1',
					showEndMarker && !unstyled && 'pr-1'
				)}
			>
				{eventTimeText && (
					<span className="mr-1 font-normal">{eventTimeText}</span>
				)}
				{event.title}
			</p>

			{/* Right continuation indicator */}
			{showEndMarker && !unstyled && (
				<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}
		</div>
	)
}
