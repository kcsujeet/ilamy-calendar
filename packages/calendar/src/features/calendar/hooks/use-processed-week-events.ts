import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import {
	bucketEventsByColumn,
	getColumnBounds,
	getDefaultZone,
	getResourceEvents,
} from '@/features/calendar/utils/event-buckets'
import { keys } from '@/features/calendar/utils/keys'
import type { HorizontalPositionedEvent } from '@/features/calendar/utils/layout/geometry'
import { layoutHorizontal } from '@/features/calendar/utils/layout/horizontal'

interface UseProcessedWeekEventsProps {
	days: Dayjs[]
	allDay?: boolean
	resourceId?: string | number
	gridType?: 'day' | 'hour'
}

interface ProcessedWeekEventsResult {
	positionedEvents: HorizontalPositionedEvent[]
	columnEventsMap: Map<string, CalendarEvent[]>
}

export const useProcessedWeekEvents = ({
	days,
	allDay,
	resourceId,
	gridType,
}: UseProcessedWeekEventsProps): ProcessedWeekEventsResult => {
	const { getEventsForDateRange, dayMaxEvents } = useSmartCalendarContext()

	const defaultZone = getDefaultZone()
	const first = days.at(0)
	const last = days.at(-1)
	const weekStart = first && getColumnBounds(first, 'day', defaultZone).start
	const weekEnd = last && getColumnBounds(last, 'day', defaultZone).end

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []

		// The range's events are computed once and shared by every row; each row
		// reads its own resource's bucket of them.
		const rangeEvents = getEventsForDateRange(weekStart, weekEnd)
		const weekEvents = getResourceEvents(rangeEvents, resourceId)

		if (allDay) {
			return weekEvents.filter((e) => Boolean(e.allDay))
		}

		return weekEvents
	}, [getEventsForDateRange, weekStart, weekEnd, resourceId, allDay])

	const columnEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		const unit = gridType ?? 'day'
		const hasNoEvents = events.length === 0
		// Every column of an empty row is empty, and a resource row is usually
		// empty on most days: skip reading the columns' bounds.
		if (hasNoEvents) {
			for (const day of days) {
				map.set(keys.col.events(day), [])
			}
			return map
		}
		const columnBounds = days.map((day) =>
			getColumnBounds(day, unit, defaultZone)
		)
		const eventsPerColumn = bucketEventsByColumn(columnBounds, events)
		days.forEach((day, index) => {
			map.set(keys.col.events(day), eventsPerColumn.at(index) ?? [])
		})
		return map
	}, [days, events, gridType, defaultZone])

	const positionedEvents = useMemo(() => {
		return layoutHorizontal({
			days,
			events,
			dayMaxEvents,
			gridType,
		})
	}, [days, dayMaxEvents, events, gridType])

	return { positionedEvents, columnEventsMap }
}
