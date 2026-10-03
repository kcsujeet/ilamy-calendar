import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { filterEventsForResource } from '@/features/calendar/utils/event-pipeline'
import type { VerticalPositionedEvent } from '@/features/calendar/utils/layout/geometry'
import { layoutVertical } from '@/features/calendar/utils/layout/vertical'

interface UseProcessedDayEventsProps {
	days: Dayjs[] // The specific day this column represents
	gridType?: 'day' | 'hour'
	resourceId?: string | number
}

export const useProcessedDayEvents = ({
	days,
	gridType,
	resourceId,
}: UseProcessedDayEventsProps) => {
	const { getEventsForDateRange } = useSmartCalendarContext()
	const first = days.at(0)
	const last = days.at(-1)
	const dayStart = first?.startOf('day')
	const dayEnd = last?.endOf('day')

	const events = useMemo(() => {
		if (!dayStart || !dayEnd) return []

		const rangeEvents = getEventsForDateRange(dayStart, dayEnd)
		const dayEvents = filterEventsForResource(rangeEvents, resourceId)

		// Vertical grids (Day/Week/Resource Vertical) never render all-day events
		// as those are handled by the all-day-row or are not appropriate for the time grid.
		return dayEvents.filter((e) => !e.allDay)
	}, [dayStart, dayEnd, getEventsForDateRange, resourceId])

	const todayEvents = useMemo<VerticalPositionedEvent[]>(() => {
		return layoutVertical({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])

	return todayEvents
}
