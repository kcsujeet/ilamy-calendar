import type { Resource } from '@ilamy/types'
import {
	type CurrentTimeIndicatorRenderProps,
	CurrentTimeIndicator as UiCurrentTimeIndicator,
} from '@ilamy/ui/components/current-time-indicator'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { memo, type ReactNode } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface CurrentTimeIndicatorProps {
	rangeStart: Dayjs
	rangeEnd: Dayjs
	now?: Dayjs
	resource?: Resource
	axis?: 'vertical' | 'horizontal'
	withDot?: boolean
}

/**
 * Calendar wrapper over the shared `@ilamy/ui` current-time marker: wires the
 * consumer's `renderCurrentTimeIndicator` and the current `view` from context,
 * adding `view`/`resource` to the shared component's computed position.
 */
const NoMemoCurrentTimeIndicator = ({
	rangeStart,
	rangeEnd,
	now,
	resource,
	axis = 'vertical',
	withDot,
}: CurrentTimeIndicatorProps) => {
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
		<UiCurrentTimeIndicator
			axis={axis}
			now={now}
			rangeEnd={rangeEnd}
			rangeStart={rangeStart}
			render={render}
			withDot={withDot}
		/>
	)
}

export const CurrentTimeIndicator = memo(NoMemoCurrentTimeIndicator)
