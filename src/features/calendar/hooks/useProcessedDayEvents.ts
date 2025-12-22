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
			getEventsForResource: state.getEventsForResource,
		}))
	const dayStart = days.at(0).startOf('day')
	const dayEnd = days.at(-1).endOf('day')
	let events = getEventsForDateRange(dayStart, dayEnd)
	if (resourceId) {
		const resourceEvents = getEventsForResource(resourceId)
		events = events.filter((event) =>
			resourceEvents.some((e) => String(e.id) === String(event.id))
		)
	}

	const todayEvents = useMemo<PositionedEvent[]>(() => {
		return getPositionedDayEvents({
			days,
			events,
			gridType,
		})
	}, [days, gridType, events])

	return todayEvents
}
