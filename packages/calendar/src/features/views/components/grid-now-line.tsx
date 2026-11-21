import type { Resource } from '@ilamy/types'
import { add, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { CurrentTimeMarker } from './current-time-marker'

interface GridNowLineProps {
	days: ZonedDate[]
	gridType: 'day' | 'hour'
	axis: 'vertical' | 'horizontal'
	resourceId?: string | number
	resource?: Resource
}

/**
 * The "now" line over one events layer. Drawn only in hour-resolution grids: in
 * day-resolution grids (month, resource month, resource week daily) a sub-day
 * percentage line would be a meaningless sliver.
 */
export const GridNowLine: React.FC<GridNowLineProps> = ({
	days,
	gridType,
	axis,
	resourceId,
	resource,
}) => {
	const { resources, nowIndicator } = useSmartCalendarContext((c) => ({
		resources: c.resources,
		nowIndicator: c.nowIndicator,
	}))
	const rangeStart = days.at(0)
	const lastSlot = days.at(-1)
	const rangeEnd = useMemo(
		() => (lastSlot ? add(lastSlot, 1, gridType) : undefined),
		[lastSlot, gridType]
	)
	const isHourGrid = gridType === 'hour'
	const hasRange = Boolean(rangeStart && rangeEnd)
	const showNowLine = nowIndicator && isHourGrid && hasRange
	// Stacked resource rows share one continuous now-line; only the first resource
	// (or a non-resource grid) draws the dot at its start, so it isn't repeated.
	const hasNoResourceAxis = resourceId === undefined
	const isFirstResource =
		hasNoResourceAxis || resources?.at(0)?.id === resourceId

	if (!(showNowLine && rangeStart && rangeEnd)) {
		return null
	}

	return (
		<CurrentTimeMarker
			axis={axis}
			rangeEnd={rangeEnd}
			rangeStart={rangeStart}
			resource={resource}
			withDot={isFirstResource}
		/>
	)
}
