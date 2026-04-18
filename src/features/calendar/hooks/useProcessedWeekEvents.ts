import { useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import { getDayKey } from '@/lib/utils/date-utils'
import {
	eventOverlapsRange,
	filterEventsByResource,
} from '@/lib/utils/event-utils'
import {
	getPositionedEvents,
	type PositionedEvent,
} from '@/lib/utils/position-week-events'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
	dayNumberHeight?: number
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

export interface ProcessedWeekEventsResult {
	positionedEvents: PositionedEvent[]
	dayEventsMap: Map<string, CalendarEvent[]>
}

export const useProcessedWeekEvents = ({
	days,
	allDay,
	dayNumberHeight,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
	const {
		getEventsForDateRange,
		dayMaxEvents,
		eventSpacing,
		eventHeight,
		getEventsForResource,
	} = useSmartCalendarContext()

	const first = days.at(0)
	const last = days.at(-1)
	const weekStart = first?.startOf('day')
	const weekEnd = last?.endOf('day')

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []
		let weekEvents = getEventsForDateRange(weekStart, weekEnd)
		if (resourceId) {
			weekEvents = filterEventsByResource(
				weekEvents,
				getEventsForResource(resourceId)
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

	const dayEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		for (const day of days) {
			const key = getDayKey(day)
			const dayStart = day.startOf('day')
			const dayEnd = day.endOf('day')
			const dayEvents = events.filter((e) =>
				eventOverlapsRange(e, dayStart, dayEnd)
			)
			map.set(key, dayEvents)
		}
		return map
	}, [days, events])

	const positionedEvents = useMemo(() => {
		return getPositionedEvents({
			days,
			events,
			dayMaxEvents,
			dayNumberHeight,
			eventSpacing,
			eventBarHeight: eventHeight,
			gridType,
		})
	}, [
		days,
		dayMaxEvents,
		dayNumberHeight,
		eventSpacing,
		eventHeight,
		events,
		gridType,
	])

	return { positionedEvents, dayEventsMap }
}
