import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { CSSProperties, ReactNode } from 'react'
import {
	eventSurfaceClasses,
	eventSurfaceRadius,
} from '@/lib/utils/event-surface'
import { keys } from '@/lib/utils/keys'

interface DragPreviewCardProps {
	/** Which grid drew it — the two differ only in placement and label layout. */
	orientation: 'vertical' | 'horizontal'
	/** The event being dragged, so the mirror wears its colour. */
	event: CalendarEvent
	/** Placement only, from the same layout pass that places real bars. */
	style: CSSProperties
	/**
	 * Whether the row or column cut this span, from the same layout pass that
	 * tells a real bar. The mirror squares the cut side for the same reason the
	 * bar does: the span continues past the edge.
	 */
	isTruncatedStart?: boolean
	isTruncatedEnd?: boolean
	/** Layout for the label row; the card owns everything outside it. */
	contentClassName?: string
	children: ReactNode
}

/**
 * The snapped mirror of the event being dragged: where it would land if the
 * pointer were released now, drawn in the grid rather than under the cursor.
 *
 * Opaque, and the strongest surface on screen while a drag is in flight. This
 * is FullCalendar's mirror, which carries no opacity rule at all — only the bar
 * left BEHIND is dimmed. A translucent mirror inverts that: the thing you are
 * actually moving ends up fainter than the grid it is crossing.
 *
 * The outline is the part fill alone cannot do. A mirror painted only in the
 * event's own colour is invisible in the case that matters most — dragging
 * within a run of same-hue bars, where the pastel it copies is the pastel it is
 * standing on. So it is ringed in `foreground` and separated from that ring by
 * the same `border-card` hairline a real bar wears: fill, gap, hard edge. The
 * ring is a theme token rather than a tint of the event, so it contrasts every
 * fill a consumer can supply, and it appears ONLY on the mirror — the earlier
 * worry about a hard box in a monochrome theme was about outlining resting
 * bars, which are still drawn without one.
 *
 * `backgroundColor` is given as both a class and an inline style, the way
 * `DefaultEventContent` does it: a consumer may supply either a Tailwind class
 * or a CSS colour, and only one of the two will apply.
 */
export function DragPreviewCard({
	orientation,
	event,
	style,
	isTruncatedStart = false,
	isTruncatedEnd = false,
	contentClassName,
	children,
}: DragPreviewCardProps) {
	return (
		<div
			className={cn(
				'absolute z-20 pointer-events-none transition-none overflow-clip',
				'shadow-xl ring-2 ring-foreground border-[1.5px] border-card',
				eventSurfaceRadius(isTruncatedStart, isTruncatedEnd),
				eventSurfaceClasses(event)
			)}
			data-testid={keys.dragPreview(orientation)}
			style={{ ...style, backgroundColor: event.backgroundColor }}
		>
			<div
				className={cn(
					'h-full w-full text-left overflow-clip',
					contentClassName
				)}
			>
				{children}
			</div>
		</div>
	)
}
