import { useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { useStableDays } from '@/hooks/use-stable-days'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
	dayNumberHeight?: number
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

export interface ProcessedWeekEventsResult {
	positionedEvents: ReturnType<typeof getPositionedEvents>
	dayEventsMap: Map<string, CalendarEvent[]>
}

export const useProcessedWeekEvents = ({
	days: rawDays,
	allDay,
	dayNumberHeight,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
	const {
		getEventsForDateRange,
		dayMaxEvents,
		eventSpacing,
		getEventsForResource,
	} = useSmartCalendarContext()

	const days = useStableDays(rawDays)

	const events = useMemo(() => {
		const weekStart = days.at(0)?.startOf('day')
		const weekEnd = days.at(-1)?.endOf('day')
		if (!weekStart || !weekEnd) return []
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
	}, [days, getEventsForDateRange, getEventsForResource, resourceId, allDay])

	const dayEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		for (const day of days) {
			const key = day.format('YYYY-MM-DD')
			const dayStart = day.startOf('day')
			const dayEnd = day.endOf('day')
			const dayEvents = events.filter((e) => {
				const startsInDay =
					e.start.isSameOrAfter(dayStart) && e.start.isSameOrBefore(dayEnd)
				const endsInDay =
					e.end.isSameOrAfter(dayStart) && e.end.isSameOrBefore(dayEnd)
				const spansDay = e.start.isBefore(dayStart) && e.end.isAfter(dayEnd)
				return startsInDay || endsInDay || spansDay
			})
			map.set(key, dayEvents)
		}
		return map
	}, [days, events])

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

	return { positionedEvents, dayEventsMap }
}
