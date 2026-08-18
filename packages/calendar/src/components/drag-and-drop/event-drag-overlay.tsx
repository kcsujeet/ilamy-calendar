import { DragOverlay } from '@dnd-kit/core'
import type { CalendarEvent } from '@ilamy/types'
import type React from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { DraggableEvent } from '@/components/draggable-event/draggable-event'

interface EventDragOverlayProps {
	activeEvent: CalendarEvent | null
	presentation?: {
		className?: string
		style?: CSSProperties
		isTruncatedStart?: boolean
		isTruncatedEnd?: boolean
	}
	size?: { width: number; height: number }
	sourcePosition?: { left: number; top: number }
	snapTarget?: { axis: 'vertical' | 'horizontal'; coordinate: number }
}

export const EventDragOverlay: React.FC<EventDragOverlayProps> = ({
	activeEvent,
	presentation,
	size,
	sourcePosition,
	snapTarget,
}) => {
	if (typeof document === 'undefined') {
		return null
	}

	return createPortal(
		<DragOverlay
			adjustScale={false}
			dropAnimation={null}
			modifiers={[
				({ transform }) => {
					if (!snapTarget || !sourcePosition) {
						return transform
					}
					if (snapTarget.axis === 'vertical') {
						return {
							...transform,
							y: snapTarget.coordinate - sourcePosition.top,
						}
					}
					return {
						...transform,
						x: snapTarget.coordinate - sourcePosition.left,
					}
				},
			]}
			style={{ height: size?.height, width: size?.width }}
		>
			{activeEvent && (
				<div
					data-testid="event-drag-overlay"
					style={{ height: size?.height, width: size?.width }}
				>
					<DraggableEvent
						className={presentation?.className}
						disableAnimation
						disableDrag
						elementId={`drag-overlay-${String(activeEvent.id)}`}
						event={activeEvent}
						isTruncatedEnd={presentation?.isTruncatedEnd}
						isTruncatedStart={presentation?.isTruncatedStart}
						style={presentation?.style}
					/>
				</div>
			)}
		</DragOverlay>,
		document.body
	)
}
