import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import {
	eventSurfaceClasses,
	eventSurfaceRadius,
	eventSurfaceStyle,
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
	return (
		<div
			className={cn(
				eventSurfaceClasses(event),
				'h-full w-full px-1 border-[1.5px] border-card text-left overflow-clip relative',
				eventSurfaceRadius(isTruncatedStart, isTruncatedEnd)
			)}
			style={eventSurfaceStyle(event)}
		>
			{/* Left continuation indicator */}
			{isTruncatedStart && (
				<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}

			{/* Event title */}
			<p
				className={cn(
					'text-[10px] font-semibold sm:text-xs mt-0.5',
					// Add slight padding to avoid overlap with indicators
					isTruncatedStart && 'pl-1',
					isTruncatedEnd && 'pr-1'
				)}
			>
				{event.title}
			</p>

			{/* Right continuation indicator */}
			{isTruncatedEnd && (
				<div className="absolute right-0 top-0 bottom-0 w-0.5 bg-foreground/25"></div>
			)}
		</div>
	)
}
