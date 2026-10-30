import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	getColumnBounds,
	getDefaultZone,
	getResourceEvents,
} from '@/features/calendar/utils/event-buckets'
import { keys } from '@/features/calendar/utils/keys'
import type {
	HorizontalCellLayout,
	HorizontalPositionedEvent,
} from '@/features/calendar/utils/layout/geometry'
import { layoutHorizontal } from '@/features/calendar/utils/layout/horizontal'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

interface ProcessedWeekEventsResult {
	positionedEvents: HorizontalPositionedEvent[]
	columnLayouts: Map<string, HorizontalCellLayout>
}

export const useProcessedWeekEvents = ({
	days,
	allDay,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
	const { getEventsForDateRange, dayMaxEvents } = useSmartCalendarContext()

	const defaultZone = getDefaultZone()
	const first = days.at(0)
	const last = days.at(-1)
	const weekStart = first && getColumnBounds(first, 'day', defaultZone).start
	const weekEnd = last && getColumnBounds(last, 'day', defaultZone).end

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []

		// The range's events are computed once and shared by every row; each row
		// reads its own resource's bucket of them.
		const rangeEvents = getEventsForDateRange(weekStart, weekEnd)
		const weekEvents = getResourceEvents(rangeEvents, resourceId)

		if (allDay) {
			return weekEvents.filter((e) => Boolean(e.allDay))
		}

		return weekEvents
	}, [getEventsForDateRange, weekStart, weekEnd, resourceId, allDay])

	const { positionedEvents, columnLayouts: layouts } = useMemo(() => {
		return layoutHorizontal({ days, events, dayMaxEvents, gridType })
	}, [days, dayMaxEvents, events, gridType])

	const columnLayouts = useMemo(() => {
		const map = new Map<string, HorizontalCellLayout>()
		days.forEach((day, index) => {
			const layout = layouts.at(index)
			if (!layout) return
			const columnKey = keys.col.events(day)
			map.set(columnKey, layout)
		})
		return map
	}, [days, layouts])

	return { positionedEvents, columnLayouts }
}
