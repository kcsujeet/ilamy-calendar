import type { Resource } from '@ilamy/types'
import {
	CurrentTimeIndicator,
	type CurrentTimeIndicatorRenderProps,
} from '@ilamy/ui/components/current-time-indicator'
import { cn } from '@ilamy/ui/lib/utils'
import type { ZonedDate } from '@ilamy/utils/temporal'
import { type CSSProperties, memo, type ReactNode } from 'react'
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
	withDot = true,
}: CurrentTimeMarkerProps) => {
	const { renderCurrentTimeIndicator, view } = useSmartCalendarContext(
		(state) => ({
			renderCurrentTimeIndicator: state.renderCurrentTimeIndicator,
			view: state.view,
		})
	)
	const indicatorSlot = useSlotProps('nowIndicator')

	const render = (props: CurrentTimeIndicatorRenderProps): ReactNode => {
		if (renderCurrentTimeIndicator) {
			return renderCurrentTimeIndicator({ ...props, resource, view })
		}
		const isHorizontal = props.axis === 'horizontal'
		const positionClass = isHorizontal
			? 'top-0 bottom-0 -translate-x-1/2 flex-col'
			: 'right-0 left-0 -translate-y-1/2'
		const lineClass = isHorizontal
			? 'w-0.5 flex-1 bg-red-500'
			: 'h-0.5 flex-1 bg-red-500'
		const positionStyle: CSSProperties = isHorizontal
			? { left: `${props.progress}%` }
			: { top: `${props.progress}%` }

		return (
			<div
				className={cn(
					'absolute z-50 flex items-center pointer-events-none',
					positionClass,
					indicatorSlot.className
				)}
				data-ilamy-slot="now-indicator"
				data-testid="current-time-indicator"
				style={{ ...indicatorSlot.style, ...positionStyle }}
			>
				{withDot && (
					<div
						className="size-2 shrink-0 rounded-full bg-red-500"
						data-testid="current-time-dot"
					/>
				)}
				<div className={lineClass} />
			</div>
		)
	}

	return (
		<CurrentTimeIndicator
			axis={axis}
			now={now}
			rangeEnd={rangeEnd}
			rangeStart={rangeStart}
			render={render}
		/>
	)
}

export const CurrentTimeMarker = memo(NoMemoCurrentTimeMarker)
