import type { Resource } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { CurrentTimeMarker } from '@/features/calendar/components/current-time-marker'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'

interface GridNowLineProps {
	days: Dayjs[]
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
	const rangeEnd = days.at(-1)?.add(1, gridType)
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
