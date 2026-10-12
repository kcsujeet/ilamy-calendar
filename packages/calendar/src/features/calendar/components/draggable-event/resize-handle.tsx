import { useDraggable } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import { cn } from '@ilamy/ui/lib/utils'
import type { ResizeEdge } from '@/features/calendar/components/drag-and-drop/dnd-utils'
import { useGridAxis } from '@/features/calendar/stores/grid-axis-context'

/**
 * How finely a bar's cells divide time, which decides what a resize snaps to
 * and which cells it may hover: a time grid snaps to slots, a day grid to days.
 */
export type ResizeGranularity = 'slot' | 'day'

interface ResizeHandleProps {
	elementId: string
	event: CalendarEvent
	edge: ResizeEdge
	granularity: ResizeGranularity
	sourceResourceId?: string | number
}

/**
 * Gone, and so unpressable, where the primary input cannot hover (a phone or
 * tablet). A finger's hit-test is looser than the 6px strip, so the handle
 * swallowed taps and long-presses on the bar around it. FullCalendar resizes
 * on touch only an event that is already selected
 * (`EventResizing.ts:86-88`, v7.1.1) and ilamy has no selection yet (roadmap
 * 4.1.3), so on touch-only devices events move but do not resize.
 */
const NO_HANDLE_ON_TOUCH = '[@media(hover:none)]:hidden'

/**
 * The strip along one edge of a bar that resizes it. It is a draggable of its
 * own: dnd-kit lets the innermost draggable under the pointer take the press,
 * so the bar's move never starts from here. A pointer affordance only (keyboard
 * resize is a separate feature), hence `aria-hidden`.
 */
export function ResizeHandle({
	elementId,
	event,
	edge,
	granularity,
	sourceResourceId,
}: ResizeHandleProps) {
	const axis = useGridAxis()
	const { listeners, setNodeRef } = useDraggable({
		id: `${elementId}-resize-${edge}`,
		data: {
			type: 'calendar-event-resize',
			event,
			edge,
			granularity,
			sourceResourceId,
		},
	})

	const isVertical = axis === 'vertical'
	const sideClass = {
		start: isVertical ? 'top-0 inset-x-0' : 'left-0 inset-y-0',
		end: isVertical ? 'bottom-0 inset-x-0' : 'right-0 inset-y-0',
	}[edge]
	// A third of the bar at most, so the strip never covers the middle that a
	// move is grabbed by, even on the shortest bar the grid can draw.
	const sizeClass = isVertical ? 'h-1.5 max-h-1/3' : 'w-1.5 max-w-1/3'
	const cursorClass = isVertical ? 'cursor-ns-resize' : 'cursor-ew-resize'

	return (
		<div
			aria-hidden="true"
			className={cn(
				'absolute z-10',
				sideClass,
				sizeClass,
				cursorClass,
				NO_HANDLE_ON_TOUCH
			)}
			data-resize-handle={edge}
			ref={setNodeRef}
			{...listeners}
		/>
	)
}
