import {
	getResourceEvents,
	type HorizontalCellLayout,
	type HorizontalPositionedEvent,
	layoutHorizontal,
} from '@ilamy/core'
import { toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { getColumnBounds } from '@/features/views/utils/event-buckets.utils'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

interface UseProcessedWeekEventsProps {
	days: ZonedDate[]
	allDay?: boolean
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

interface ProcessedWeekEventsResult {
	positionedEvents: HorizontalPositionedEvent[]
	columnLayouts: Map<ZonedDate, HorizontalCellLayout>
}

export const useProcessedWeekEvents = ({
	days,
	allDay,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
	const { getEventsForDateRange, dayMaxEvents } = useSmartCalendarContext()

	const first = days.at(0)
	const last = days.at(-1)
	const weekStart = first && getColumnBounds(first, 'day').start
	const weekEnd = last && getColumnBounds(last, 'day').end

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []
		const rangeEvents = getEventsForDateRange(
			toOffsetIso(weekStart),
			toOffsetIso(weekEnd)
		)
		const weekEvents = getResourceEvents(rangeEvents, resourceId)
		return allDay ? weekEvents.filter((e) => Boolean(e.allDay)) : weekEvents
	}, [getEventsForDateRange, weekStart, weekEnd, resourceId, allDay])

	const { positionedEvents, columnLayouts: layouts } = useMemo(
		() => layoutHorizontal({ days, events, dayMaxEvents, gridType }),
		[days, dayMaxEvents, events, gridType]
	)

	const columnLayouts = useMemo(() => {
		const layoutByColumn = new Map<ZonedDate, HorizontalCellLayout>()
		days.forEach((day, index) => {
			const layout = layouts.at(index)
			if (layout) layoutByColumn.set(day, layout)
		})
		return layoutByColumn
	}, [days, layouts])

	return { positionedEvents, columnLayouts }
}
