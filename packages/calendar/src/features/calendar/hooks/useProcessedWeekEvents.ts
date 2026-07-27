import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { bucketEventsByDay, buildDayIndex } from '@ilamy/utils/events'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { filterEventsForResource } from '@/lib/events/pipeline'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'
import { getDayKey } from '@/lib/utils/date-utils'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

interface ProcessedWeekEventsResult {
	positionedEvents: HorizontalPositionedEvent[]
	dayEventsMap: Map<string, CalendarEvent[]>
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
	const weekStart = first?.startOf('day')
	const weekEnd = last?.endOf('day')

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []

		let weekEvents = getEventsForDateRange(weekStart, weekEnd)
		if (resourceId) {
			weekEvents = filterEventsForResource(weekEvents, resourceId)
		}

		if (allDay) {
			weekEvents = weekEvents.filter((e) => Boolean(e.allDay))
		}

		return weekEvents
	}, [getEventsForDateRange, weekStart, weekEnd, resourceId, allDay])

	// Day boundaries depend only on the grid, not the events, so they survive
	// event changes. This matters more than it looks: with a default timezone
	// configured, each startOf/endOf re-derives the UTC offset, so computing
	// boundaries per event was among the most expensive things the grid did.
	const dayIndex = useMemo(() => buildDayIndex(days), [days])

	const dayEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		// One bucketing pass instead of re-filtering every event once per day. The
		// index carries both boundaries of every day, so a `hiddenDays`-filtered
		// column list stays correct: an event on a hidden day belongs to no column
		// rather than leaking into the preceding one.
		const buckets = bucketEventsByDay(events, dayIndex)
		days.forEach((day, dayPosition) => {
			map.set(getDayKey(day), buckets.at(dayPosition) ?? [])
		})
		return map
	}, [days, dayIndex, events])

	const positionedEvents = useMemo(() => {
		return layoutHorizontal({
			days,
			events,
			dayMaxEvents,
			gridType,
		})
	}, [days, dayMaxEvents, events, gridType])

	return { positionedEvents, dayEventsMap }
}
