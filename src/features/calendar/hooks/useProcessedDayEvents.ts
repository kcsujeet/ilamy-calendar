import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useStableDays } from '@/hooks/use-stable-days'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import {
	getPositionedDayEvents,
	type PositionedEvent,
} from '@/lib/utils/position-day-events'

interface UseProcessedDayEventsProps {
	days: Dayjs[]
	gridType?: 'day' | 'hour'
	resourceId?: string | number
}

export const useProcessedDayEvents = ({
	days: rawDays,
	gridType,
	resourceId,
}: UseProcessedDayEventsProps) => {
	const { getEventsForDateRange, getEventsForResource } =
		useSmartCalendarContext()

	const days = useStableDays(rawDays)

	const events = useMemo(() => {
		const dayStart = days.at(0)?.startOf('day')
		const dayEnd = days.at(-1)?.endOf('day')
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
	}, [days, getEventsForDateRange, resourceId, getEventsForResource])

	const todayEvents = useMemo<PositionedEvent[]>(() => {
		return getPositionedDayEvents({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])

	return todayEvents
}
