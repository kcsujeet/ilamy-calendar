import {
	now,
	toEpochMs,
	toOffsetIso,
	wallClockDiff,
	type ZonedDate,
} from '@ilamy/utils/temporal'
import { type CSSProperties, memo, type ReactNode } from 'react'
import { cn } from '../lib/utils'

export interface CurrentTimeIndicatorRenderProps {
	/** "Now" (or the injected reference time) as an ISO 8601 string with offset. */
	currentTime: string
	/** Start of the container's timeline as an ISO 8601 string with offset. */
	rangeStart: string
	/** End of the container's timeline as an ISO 8601 string with offset. */
	rangeEnd: string
	/** Position of `currentTime` within the range, 0-100. */
	progress: number
	/** 'vertical' → `top` offset; 'horizontal' → `left` offset. */
	axis: 'vertical' | 'horizontal'
}

interface CurrentTimeIndicatorProps {
	rangeStart: ZonedDate
	rangeEnd: ZonedDate
	/** Reference time for "now" (defaults to the current time in `rangeStart.timeZone`). */
	now?: ZonedDate
	axis?: 'vertical' | 'horizontal'
	/** Custom renderer; receives the computed position. Falls back to a red line. */
	render?: (props: CurrentTimeIndicatorRenderProps) => ReactNode
	/**
	 * Show the dot at the line's start. Default true. Set false to dedupe the dot
	 * across stacked segments that share one line (e.g. per-resource rows).
	 */
	withDot?: boolean
	className?: string
	style?: CSSProperties
}

/**
 * Shared, context-free current-time marker. Computes the current time's position
 * within `[rangeStart, rangeEnd)` and renders a red line there (or `render`),
 * hiding itself when now is outside the range. Consumers that need calendar
 * context (custom renderer, view, resource) wrap this and pass `render`.
 */
const NoMemoCurrentTimeIndicator = ({
	rangeStart,
	rangeEnd,
	now: propNow,
	axis = 'vertical',
	render,
	withDot = true,
	className,
	style,
}: CurrentTimeIndicatorProps) => {
	const currentTime = propNow ?? now(rangeStart.timeZoneId)
	const nowMs = toEpochMs(currentTime)
	const isWithinRange =
		nowMs >= toEpochMs(rangeStart) && nowMs < toEpochMs(rangeEnd)
	if (!isWithinRange) {
		return null
	}

	// Clock time, not elapsed time: the grid is labelled by clock hour, so on a
	// day the clocks change, elapsed time put the line an hour off (#311).
	const totalDuration = wallClockDiff(rangeEnd, rangeStart, 'minute')
	const minutesFromStart = wallClockDiff(currentTime, rangeStart, 'minute')
	const progress = (minutesFromStart / totalDuration) * 100

	if (render) {
		return (
			<>
				{render({
					currentTime: toOffsetIso(currentTime),
					rangeStart: toOffsetIso(rangeStart),
					rangeEnd: toOffsetIso(rangeEnd),
					progress,
					axis,
				})}
			</>
		)
	}

	if (axis === 'horizontal') {
		return (
			<div
				className={cn(
					'absolute top-0 bottom-0 z-50 flex -translate-x-1/2 flex-col items-center pointer-events-none',
					className
				)}
				data-testid="current-time-indicator"
				style={{ ...style, left: `${progress}%` }}
			>
				{withDot && (
					<div
						className="size-2 shrink-0 rounded-full bg-red-500"
						data-testid="current-time-dot"
					/>
				)}
				<div className="w-0.5 flex-1 bg-red-500" />
			</div>
		)
	}

	return (
		<div
			className={cn(
				'absolute right-0 left-0 z-50 flex -translate-y-1/2 items-center pointer-events-none',
				className
			)}
			data-testid="current-time-indicator"
			style={{ ...style, top: `${progress}%` }}
		>
			{withDot && (
				<div
					className="size-2 shrink-0 rounded-full bg-red-500"
					data-testid="current-time-dot"
				/>
			)}
			<div className="h-0.5 flex-1 bg-red-500" />
		</div>
	)
}

export const CurrentTimeIndicator = memo(NoMemoCurrentTimeIndicator)
