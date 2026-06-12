import { useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import type { Dayjs } from '@/lib/configs/dayjs-config'
import {
	eventOverlapsRange,
	filterEventsForResource,
} from '@/lib/events/pipeline'
import type { PositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'
import { getDayKey } from '@/lib/utils/date-utils'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
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
		return layoutHorizontal({
			days,
			events,
			dayMaxEvents,
			gridType,
		})
	}, [days, dayMaxEvents, events, gridType])

	return { positionedEvents, dayEventsMap }
}
