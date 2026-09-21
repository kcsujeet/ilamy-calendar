import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { CSSProperties, ReactNode } from 'react'
import {
	getEventSurfaceClasses,
	getEventSurfaceRadius,
	getEventSurfaceStyle,
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
	isTruncatedStart: boolean
	isTruncatedEnd: boolean
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
 * standing on. The ring is a theme token rather than a tint of the event, so it
 * contrasts every fill a consumer can supply. It appears ONLY on the mirror;
 * resting bars carry no outline, so a monochrome theme gets no hard box around
 * events at rest.
 *
 * It is an INSET ring, and that is not cosmetic. Tailwind's `ring` is a
 * box-shadow painted OUTSIDE the border box, and both events layers wrap their
 * subtree in `overflow-clip`; an outside ring is therefore shaved off on every
 * edge the mirror sits flush against — its left at `left: 0%`, its bottom
 * whenever the span runs past the visible hours — which drew an outline round
 * only the two edges that happened to sit inside the layer. `inset-ring` paints
 * within the box and cannot be clipped, so the outline closes.
 *
 * The colour is set here and ONLY here, as both class and inline style, the way
 * `DefaultEventContent` does it: a consumer may supply either a Tailwind class
 * or a CSS colour, and only one of the two will apply. The content layer inside
 * carries layout and nothing else — it is `h-full w-full`, and an inset shadow
 * paints below child content, so any fill re-applied there covers the outline
 * exactly. `event.color` is a trap for this: it may hold the whole fill
 * (`'bg-amber-100 text-amber-800'`), not just the text colour. Text colour
 * inherits from this element, so the inner layer never needs it.
 */
export function DragPreviewCard({
	orientation,
	event,
	style,
	isTruncatedStart,
	isTruncatedEnd,
	contentClassName,
	children,
}: DragPreviewCardProps) {
	return (
		<div
			className={cn(
				'absolute z-20 pointer-events-none transition-none overflow-clip',
				'shadow-xl inset-ring-2 inset-ring-foreground border-[1.5px] border-card',
				getEventSurfaceRadius({
					axis: orientation,
					isTruncatedStart,
					isTruncatedEnd,
				}),
				getEventSurfaceClasses(event)
			)}
			data-testid={keys.dragPreview(orientation)}
			style={{ ...style, ...getEventSurfaceStyle(event) }}
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
