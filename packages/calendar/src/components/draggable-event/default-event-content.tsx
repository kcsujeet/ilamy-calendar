import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import { useGridAxis } from '@/contexts/grid-axis-context'
import {
	getEventSurfaceClasses,
	getEventSurfaceRadius,
	getEventSurfaceStyle,
} from '@/lib/utils/event-surface'

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
				getEventSurfaceClasses(event),
				'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
				getEventSurfaceRadius({ axis, isTruncatedStart, isTruncatedEnd })
			)}
			style={getEventSurfaceStyle(event)}
		>
			{/* Left continuation indicator */}
			{showStartMarker && (
				<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}

			{/* Event title */}
			<p
				className={cn(
					'text-[10px] font-semibold sm:text-xs mt-0.5',
					// Add slight padding to avoid overlap with indicators
					showStartMarker && 'pl-1',
					showEndMarker && 'pr-1'
				)}
			>
				{event.title}
			</p>

			{/* Right continuation indicator */}
			{showEndMarker && (
				<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}
		</div>
	)
}
