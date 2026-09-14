import type { CalendarEvent } from '@ilamy/types'
import type { Dayjs } from '@ilamy/utils/dayjs'
import { dayKey, overlapsRange } from '@ilamy/utils/helpers'
import { useMemo } from 'react'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { filterEventsForResource } from '@/lib/events/pipeline'
import type { HorizontalPositionedEvent } from '@/lib/layout/geometry'
import { layoutHorizontal } from '@/lib/layout/horizontal'

/**
 * Identifies the column a cell belongs to, so the map below can be read back by
 * the component rendering the cells.
 *
 * An hour grid draws 24 columns from the same calendar day, so a `YYYY-MM-DD`
 * key collapses all of them onto one entry and every cell is handed the whole
 * day (#280). Day columns keep the date key, which is already unique per column
 * and is what the month grids look up.
 */
export const columnKey = (
	day: Dayjs,
	gridType: 'day' | 'hour' = 'day'
): string => (gridType === 'hour' ? day.toISOString() : dayKey(day))

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

	const dayEventsMap = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>()
		const unit = gridType === 'hour' ? 'hour' : 'day'
		for (const day of days) {
			const columnStart = day.startOf(unit)
			const columnEnd = day.endOf(unit)
			const columnEvents = events.filter((e) =>
				overlapsRange(e, columnStart, columnEnd)
			)
			map.set(columnKey(day, gridType), columnEvents)
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

	return { positionedEvents, dayEventsMap }
}
