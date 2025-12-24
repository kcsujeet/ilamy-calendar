import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import {
	getPositionedDayEvents,
	type PositionedEvent,
} from '@/lib/utils/position-day-events'

interface UseProcessedDayEventsProps {
	days: dayjs.Dayjs[] // The specific day this column represents
	gridType?: 'day' | 'hour'
	resourceId?: string | number
}

export const useProcessedDayEvents = ({
	days,
	gridType,
	resourceId,
}: UseProcessedDayEventsProps) => {
	const { getEventsForDateRange, getEventsForResource } =
		useSmartCalendarContext((state) => ({
			getEventsForDateRange: state.getEventsForDateRange,
			getEventsForResource: state.getEventsForResource as
				| ((id: string | number) => any[])
				| undefined,
		}))
	const dayStart = days.at(0).startOf('day')
	const dayEnd = days.at(-1).endOf('day')

	const events = useMemo(() => {
		let dayEvents = getEventsForDateRange(dayStart, dayEnd)
		if (resourceId && getEventsForResource) {
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
