import type { Resource } from '@ilamy/types'
import {
	CurrentTimeIndicator,
	type CurrentTimeIndicatorRenderProps,
} from '@ilamy/ui/components/current-time-indicator'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, type ReactNode } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface CurrentTimeMarkerProps {
	rangeStart: Dayjs
	rangeEnd: Dayjs
	now?: Dayjs
	resource?: Resource
	axis?: 'vertical' | 'horizontal'
	withDot?: boolean
}

/**
 * Calendar wrapper over the shared `@ilamy/ui` CurrentTimeIndicator: wires the
 * consumer's `renderCurrentTimeIndicator` and the current `view` from context,
 * adding `view`/`resource` to the shared component's computed position.
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

	let render:
		| ((props: CurrentTimeIndicatorRenderProps) => ReactNode)
		| undefined
	if (renderCurrentTimeIndicator) {
		render = (props) => renderCurrentTimeIndicator({ ...props, resource, view })
	}

	return (
		<CurrentTimeIndicator
			axis={axis}
			now={now}
			rangeEnd={rangeEnd}
			rangeStart={rangeStart}
			render={render}
			withDot={withDot}
		/>
	)
}

export const CurrentTimeMarker = memo(NoMemoCurrentTimeMarker)
