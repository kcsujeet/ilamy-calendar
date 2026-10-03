import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { overlapsRange } from '@ilamy/utils/helpers'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { filterEventsForResource } from '@/lib/events/pipeline'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'
import { keys } from '@/lib/utils/keys'

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

	const first = days.at(0)
	const last = days.at(-1)
	const weekStart = first?.startOf('day')
	const weekEnd = last?.endOf('day')

	const events = useMemo(() => {
		if (!weekStart || !weekEnd) return []

		const rangeEvents = getEventsForDateRange(weekStart, weekEnd)
		let weekEvents = filterEventsForResource(rangeEvents, resourceId)

		if (allDay) {
			weekEvents = weekEvents.filter((e) => Boolean(e.allDay))
		}

		return weekEvents
	}, [getEventsForDateRange, weekStart, weekEnd, resourceId, allDay])

	const columnEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		const unit = gridType ?? 'day'
		const hasNoEvents = events.length === 0
		for (const day of days) {
			// Every column of an empty row is empty. Bounding a column costs two
			// zone conversions, and a resource row is usually empty on most days.
			if (hasNoEvents) {
				map.set(keys.col.events(day), [])
				continue
			}
			const columnStart = day.startOf(unit)
			const columnEnd = day.endOf(unit)
			const columnEvents = events.filter((e) =>
				overlapsRange(e, columnStart, columnEnd)
			)
			map.set(keys.col.events(day), columnEvents)
		}
		return map
	}, [days, events, gridType])

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
