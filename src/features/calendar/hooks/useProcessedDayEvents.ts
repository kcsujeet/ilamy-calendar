import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import {
	getPositionedDayEvents,
	type PositionedEvent,
} from '@/lib/utils/position-day-events'

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
	const { getEventsForDateRange, getEventsForResource } =
		useSmartCalendarContext()
	const first = days.at(0)
	const last = days.at(-1)
	const dayStart = first?.startOf('day')
	const dayEnd = last?.endOf('day')

	const events = useMemo(() => {
		if (!dayStart || !dayEnd) return []
		let dayEvents = getEventsForDateRange(dayStart, dayEnd)
		if (resourceId) {
			const resourceEvents = getEventsForResource(resourceId)
			dayEvents = dayEvents.filter((event) =>
				resourceEvents.some((re) => String(re.id) === String(event.id))
			)
		}

		// Vertical grids (Day/Week/Resource Vertical) never render all-day events
		// as those are handled by the all-day-row or are not appropriate for the time grid.
		return dayEvents.filter((e) => !e.allDay)
	}, [
		dayStart,
		dayEnd,
		getEventsForDateRange,
		resourceId,
		getEventsForResource,
	])

	const todayEvents = useMemo<PositionedEvent[]>(() => {
		return getPositionedDayEvents({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])

	return todayEvents
}
