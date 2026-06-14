import type { Dayjs } from '@ilamy/utils/dayjs'
import dayjs from '@ilamy/utils/dayjs'
import { memo, type ReactNode } from 'react'

export interface CurrentTimeIndicatorRenderProps {
	/** "Now" (or the injected reference time). */
	currentTime: Dayjs
	/** Start of the container's timeline. */
	rangeStart: Dayjs
	/** End of the container's timeline. */
	rangeEnd: Dayjs
	/** Position of `currentTime` within the range, 0-100. */
	progress: number
	/** 'vertical' → `top` offset; 'horizontal' → `left` offset. */
	axis: 'vertical' | 'horizontal'
}

export interface CurrentTimeIndicatorProps {
	rangeStart: Dayjs
	rangeEnd: Dayjs
	/** Reference time for "now" (defaults to the current time; useful for tests). */
	now?: Dayjs
	axis?: 'vertical' | 'horizontal'
	/** Custom renderer; receives the computed position. Falls back to a red line. */
	render?: (props: CurrentTimeIndicatorRenderProps) => ReactNode
	/**
	 * Show the dot at the line's start. Default true. Set false to dedupe the dot
	 * across stacked segments that share one line (e.g. per-resource rows).
	 */
	withDot?: boolean
}

/**
 * Shared, context-free current-time marker. Computes the current time's position
 * within `[rangeStart, rangeEnd]` and renders a red line there (or `render`),
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
}: CurrentTimeIndicatorProps) => {
	const now = propNow ?? dayjs()
	// Core dayjs only (no plugin methods) so this stays a leaf with the plain
	// dayjs type: within range is [rangeStart, rangeEnd).
	const nowMs = now.valueOf()
	const isWithinRange =
		nowMs >= rangeStart.valueOf() && nowMs < rangeEnd.valueOf()
	if (!isWithinRange) {
		return null
	}

	const totalDuration = rangeEnd.diff(rangeStart, 'minute')
	const minutesFromStart = now.diff(rangeStart, 'minute')
	const progress = (minutesFromStart / totalDuration) * 100

	if (render) {
		return (
			<>{render({ currentTime: now, rangeStart, rangeEnd, progress, axis })}</>
		)
	}

	if (axis === 'horizontal') {
		return (
			<div
				className="absolute top-0 bottom-0 z-50 flex -translate-x-1/2 flex-col items-center pointer-events-none"
				data-testid="current-time-indicator"
				style={{ left: `${progress}%` }}
			>
				{withDot && <div className="size-2 shrink-0 rounded-full bg-red-500" />}
				<div className="w-0.5 flex-1 bg-red-500" />
			</div>
		)
	}

	return (
		<div
			className="absolute right-0 left-0 z-50 flex -translate-y-1/2 items-center pointer-events-none"
			data-testid="current-time-indicator"
			style={{ top: `${progress}%` }}
		>
			{withDot && <div className="size-2 shrink-0 rounded-full bg-red-500" />}
			<div className="h-0.5 flex-1 bg-red-500" />
		</div>
	)
}

export const CurrentTimeIndicator = memo(NoMemoCurrentTimeIndicator)
