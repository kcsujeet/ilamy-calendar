import dayjs from 'dayjs'
import { memo } from 'react'

interface CurrentTimeIndicatorProps {
	/** The start date/time of the container's timeline (e.g., top of the column) */
	rangeStart: dayjs.Dayjs
	/** The end date/time of the container's timeline (e.g., bottom of the column) */
	rangeEnd: dayjs.Dayjs
	/** Optional reference time for "now" (useful for testing) */
	now?: dayjs.Dayjs
}

/**
 * Renders a horizontal red line indicating the current time relative to a vertical container's timeline.
 * The indicator handles its own visibility based on whether 'now' falls within the provided range.
 */
const NoMemoCurrentTimeIndicator = ({
	rangeStart,
	rangeEnd,
	now: propNow,
}: CurrentTimeIndicatorProps) => {
	const now = propNow ?? dayjs()

	// Check if current time falls within this range
	const isWithinRange = now.isSameOrAfter(rangeStart) && now.isBefore(rangeEnd)

	if (!isWithinRange) {
		return null
	}

	const totalDuration = rangeEnd.diff(rangeStart, 'minute')
	const minutesFromStart = now.diff(rangeStart, 'minute')
	const progress = (minutesFromStart / totalDuration) * 100

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
