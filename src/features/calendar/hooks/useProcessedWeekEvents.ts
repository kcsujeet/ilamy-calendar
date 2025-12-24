import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'

interface UseProcessedWeekEventsProps {
	days: dayjs.Dayjs[]
	allDay?: boolean
	dayNumberHeight?: number
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

export const useProcessedWeekEvents = ({
	days,
	allDay,
	dayNumberHeight,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps) => {
	const {
		getEventsForDateRange,
		dayMaxEvents,
		eventSpacing,
		getEventsForResource,
	} = useSmartCalendarContext((state) => ({
		getEventsForDateRange: state.getEventsForDateRange,
		dayMaxEvents: state.dayMaxEvents,
		eventSpacing: state.eventSpacing,
		getEventsForResource: state.getEventsForResource,
	}))

	const weekStart = days.at(0).startOf('day')
	const weekEnd = days.at(-1).endOf('day')

	const events = useMemo(() => {
		let weekEvents = getEventsForDateRange(weekStart, weekEnd)
		if (resourceId) {
			const resourceEvents = getEventsForResource(resourceId)
			weekEvents = weekEvents.filter((event) =>
				resourceEvents.some((e) => String(e.id) === String(event.id))
			)
		}

		if (allDay) {
			weekEvents = weekEvents.filter((e) => !!e.allDay === allDay)
		}

		return weekEvents
	}, [
		getEventsForDateRange,
		getEventsForResource,
		weekStart,
		weekEnd,
		resourceId,
		allDay,
	])

	// Get all events that intersect with this week
	const positionedEvents = useMemo(() => {
		return getPositionedEvents({
			days,
			events,
			dayMaxEvents,
			dayNumberHeight,
			eventSpacing,
			gridType,
		})
	}, [days, dayMaxEvents, dayNumberHeight, eventSpacing, events, gridType])

	return positionedEvents
}
