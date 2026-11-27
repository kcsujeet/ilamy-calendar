/** @jsxImportSource preact */
import type { HorizontalCellLayout } from '../../../index'
import type {
	DomCalendarEvent,
	DomCalendarOptions,
	RendererActions,
} from '../types/renderer.types'
import { buildSlotProps } from '../utils/slot-props.utils'

interface MoreEventsButtonProps {
	cellLayout: HorizontalCellLayout | undefined
	dateIso: string
	getTitle: () => string
	options: DomCalendarOptions
	actions: RendererActions
	testId?: string
	extraStyle?: Record<string, string | number | undefined>
}

/** Renders the overflow "+N more" button when a cell has hidden events. */
export const MoreEventsButton = ({
	cellLayout,
	dateIso,
	getTitle,
	options,
	actions,
	testId,
	extraStyle,
}: MoreEventsButtonProps) => {
	if (!cellLayout || cellLayout.hiddenCount <= 0) return null
	const moreSlot = buildSlotProps(
		options.slotProps,
		'moreLink',
		actions.ownerState,
		undefined,
		extraStyle
	)
	return (
		<button
			className={moreSlot.className}
			data-ilamy-slot="more-link"
			data-testid={testId}
			onClick={(evt) => {
				evt.stopPropagation()
				const cellEvents = cellLayout.events as DomCalendarEvent[]
				if (options.onMoreEventsClick) {
					options.onMoreEventsClick(dateIso, cellEvents)
					return
				}
				actions.openOverflowDialog(dateIso, getTitle(), cellEvents)
			}}
			style={moreSlot.style}
			type="button"
		>
			{`+${cellLayout.hiddenCount} ${actions.t('more')}`}
		</button>
	)
}
