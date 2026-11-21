import type { DraggableSyntheticListeners } from '@dnd-kit/core'
import { cn } from '@ilamy/ui/lib/utils'
import type { CSSProperties } from 'react'
import { useSlotProps } from '@/stores/calendar-theme-context'
import { useGridAxis } from '@/stores/grid-axis-context'
import type { ResizeEdge, ResizeGranularity } from '@/utils/dnd.utils'

export type { ResizeGranularity }

interface ResizeHandleProps {
	edge: ResizeEdge
	listeners?: DraggableSyntheticListeners
}

const NO_HANDLE_ON_TOUCH = '[@media(hover:none)]:hidden'

/**
 * Pure-CSS 3-dot grip pattern (2px dots, 2px gap, 3 dots = 12px along axis).
 * Uses `currentColor` so it adapts to any event color, custom `renderEvent`,
 * dark/light theme, MUI, or StyleX with zero SVG overhead.
 */
const HORIZONTAL_DOTS_STYLE: CSSProperties = {
	width: '12px',
	height: '2px',
	backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
	backgroundSize: '4px 2px',
	backgroundRepeat: 'repeat-x',
}

const VERTICAL_DOTS_STYLE: CSSProperties = {
	width: '2px',
	height: '12px',
	backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
	backgroundSize: '2px 4px',
	backgroundRepeat: 'repeat-y',
}

/**
 * Visible hover-revealed resize strip along an event bar edge (4.0.9).
 * Invisible at rest; reveals a subtle 3-dot grip when the event bar is hovered
 * (`group-hover/event`) and strengthens with an edge tint on handle hover.
 */
export function ResizeHandle({ edge, listeners }: ResizeHandleProps) {
	const axis = useGridAxis()
	const isVertical = axis === 'vertical'
	const sideClass = {
		start: isVertical ? 'top-0 inset-x-0' : 'left-0 inset-y-0',
		end: isVertical ? 'bottom-0 inset-x-0' : 'right-0 inset-y-0',
	}[edge]
	// A third of the bar at most, so the strip never covers the middle that a
	// move is grabbed by, even on the shortest bar the grid can draw (6px fits
	// the 2px 3-dot grip cleanly without intruding on narrow horizontal bars).
	const sizeClass = isVertical ? 'h-1.5 max-h-1/3' : 'w-1.5 max-w-1/3'
	const cursorClass = isVertical ? 'cursor-ns-resize' : 'cursor-ew-resize'

	const handleSlot = useSlotProps('resizeHandle', {
		structuralClassName: cn(
			'absolute z-10 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover/event:opacity-60 hover:!opacity-100',
			sideClass,
			sizeClass,
			cursorClass,
			NO_HANDLE_ON_TOUCH
		),
		defaultClassName: 'hover:bg-current/15',
	})

	return (
		<div
			aria-hidden="true"
			className={handleSlot.className}
			data-resize-handle={edge}
			style={handleSlot.style}
			{...listeners}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none block"
				style={isVertical ? HORIZONTAL_DOTS_STYLE : VERTICAL_DOTS_STYLE}
			/>
		</div>
	)
}
