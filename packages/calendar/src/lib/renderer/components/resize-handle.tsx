/** @jsxImportSource preact */
import type { CalendarOwnerState, CalendarSlotProps } from '../../../index'
import { rendererKeys } from '../utils/keys.utils'
import { buildSlotProps } from '../utils/slot-props.utils'

interface ResizeHandleProps {
	edge: 'start' | 'end'
	axis: 'horizontal' | 'vertical'
	eventId: string | number
	slotProps?: CalendarSlotProps
	ownerState: CalendarOwnerState
}

/** Hover-revealed 3-dot VS Code style resize handle rendered on editable event bars. */
export const ResizeHandle = ({
	edge,
	axis,
	eventId,
	slotProps,
	ownerState,
}: ResizeHandleProps) => {
	const resolved = buildSlotProps(slotProps, 'resizeHandle', ownerState)
	return (
		<div
			aria-hidden="true"
			className={resolved.className}
			data-event-id={String(eventId)}
			data-ilamy-slot="resize-handle"
			data-resize-axis={axis}
			data-resize-handle={edge}
			data-testid={rendererKeys.testId.resizeHandle(edge, eventId)}
			style={resolved.style}
		>
			<span aria-hidden="true" data-ilamy-part="resize-dots" />
		</div>
	)
}
