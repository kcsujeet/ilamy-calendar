import type { Resource } from '@ilamy/types'
import { memo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import dayjs from '@/lib/configs/dayjs-config'

interface CurrentTimeIndicatorProps {
	/** The start date/time of the container's timeline (e.g., top of the column) */
	rangeStart: Dayjs
	/** The end date/time of the container's timeline (e.g., bottom of the column) */
	rangeEnd: Dayjs
	/** Optional reference time for "now" (useful for testing) */
	now?: Dayjs
	/** The resource associated with this column (optional) */
	resource?: Resource
	/**
	 * Layout axis the indicator is rendered along. Defaults to `'vertical'`.
	 * - `'vertical'`: horizontal line positioned by `top: {progress}%` (day/week vertical grids).
	 * - `'horizontal'`: vertical line positioned by `left: {progress}%` (horizontal resource hour grids).
	 */
	axis?: 'vertical' | 'horizontal'
}

/**
 * Renders a red marker indicating the current time relative to a container's timeline.
 * Hides itself when `now` is outside the range. Switches orientation via the `axis` prop —
 * vertical (default) draws a horizontal line for vertical grids; horizontal draws a vertical
 * line for horizontal resource hour grids. Supports custom rendering via
 * `renderCurrentTimeIndicator` from context.
 */
const NoMemoCurrentTimeIndicator = ({
	rangeStart,
	rangeEnd,
	now: propNow,
	resource,
	axis = 'vertical',
}: CurrentTimeIndicatorProps) => {
	// Get render function and current view from context
	const { renderCurrentTimeIndicator, view } = useSmartCalendarContext(
		(state) => ({
			renderCurrentTimeIndicator: state.renderCurrentTimeIndicator,
			view: state.view,
		})
	)

	const now = propNow ?? dayjs()

	// Check if current time falls within this range
	const isWithinRange = now.isSameOrAfter(rangeStart) && now.isBefore(rangeEnd)

	if (!isWithinRange) {
		return null
	}

	const totalDuration = rangeEnd.diff(rangeStart, 'minute')
	const minutesFromStart = now.diff(rangeStart, 'minute')
	const progress = (minutesFromStart / totalDuration) * 100

	// If custom render function is provided via context, use it
	if (renderCurrentTimeIndicator) {
		return (
			<>
				{renderCurrentTimeIndicator({
					currentTime: now,
					rangeStart,
					rangeEnd,
					progress,
					resource,
					view,
					axis,
				})}
			</>
		)
	}

	// Default indicator rendering
	if (axis === 'horizontal') {
		return (
			<div
				className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none"
				data-testid="current-time-indicator"
				style={{
					left: `${progress}%`,
				}}
			/>
		)
	}

	return (
		<div
			className="absolute left-0 right-0 h-0.5 bg-red-500 z-50 pointer-events-none"
			data-testid="current-time-indicator"
			style={{
				top: `${progress}%`,
			}}
		/>
	)
}

export const CurrentTimeIndicator = memo(NoMemoCurrentTimeIndicator)
