import type { Resource } from '@ilamy/types'
import {
	CurrentTimeIndicator,
	type CurrentTimeIndicatorRenderProps,
} from '@ilamy/ui/components/current-time-indicator'
import type { ZonedDate } from '@ilamy/utils/temporal'
import { memo, type ReactNode } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useSlotProps } from '@/stores/calendar-theme-context'

interface CurrentTimeMarkerProps {
	rangeStart: ZonedDate
	rangeEnd: ZonedDate
	now?: ZonedDate
	resource?: Resource
	axis?: 'vertical' | 'horizontal'
	withDot?: boolean
}

/**
 * Calendar wrapper over the shared `@ilamy/ui` CurrentTimeIndicator: wires the
 * consumer's `renderCurrentTimeIndicator`, slot styling, and the current `view`
 * from context, adding `view`/`resource` to the computed position.
 */
const NoMemoCurrentTimeMarker = ({
	rangeStart,
	rangeEnd,
	now,
	resource,
	axis = 'vertical',
	withDot,
}: CurrentTimeMarkerProps) => {
	const { renderCurrentTimeIndicator, view } = useSmartCalendarContext(
		(state) => ({
			renderCurrentTimeIndicator: state.renderCurrentTimeIndicator,
			view: state.view,
		})
	)
	const indicatorSlot = useSlotProps('nowIndicator')

	let render:
		| ((props: CurrentTimeIndicatorRenderProps) => ReactNode)
		| undefined
	if (renderCurrentTimeIndicator) {
		render = (props) => renderCurrentTimeIndicator({ ...props, resource, view })
	}

	return (
		<CurrentTimeIndicator
			axis={axis}
			className={indicatorSlot.className}
			now={now}
			rangeEnd={rangeEnd}
			rangeStart={rangeStart}
			render={render}
			style={indicatorSlot.style}
			withDot={withDot}
		/>
	)
}

export const CurrentTimeMarker = memo(NoMemoCurrentTimeMarker)
