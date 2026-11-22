import {
	getResourceEvents,
	layoutVertical,
	type VerticalPositionedEvent,
} from '@ilamy/core'
import { toOffsetIso, type ZonedDate } from '@ilamy/utils/temporal'
import { useMemo } from 'react'
import { getColumnBounds } from '@/features/views/utils/event-buckets.utils'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'

interface UseProcessedDayEventsProps {
	days: ZonedDate[]
	gridType?: 'day' | 'hour'
	resourceId?: string | number
}

export const useProcessedDayEvents = ({
	days,
	gridType,
	resourceId,
}: UseProcessedDayEventsProps): VerticalPositionedEvent[] => {
	const { getEventsForDateRange } = useSmartCalendarContext()
	const first = days.at(0)
	const last = days.at(-1)
	const dayStart = first && getColumnBounds(first, 'day').start
	const dayEnd = last && getColumnBounds(last, 'day').end

	const events = useMemo(() => {
		if (!dayStart || !dayEnd) return []
		const rangeEvents = getEventsForDateRange(
			toOffsetIso(dayStart),
			toOffsetIso(dayEnd)
		)
		return getResourceEvents(rangeEvents, resourceId)
	}, [dayStart, dayEnd, getEventsForDateRange, resourceId])

	return useMemo<VerticalPositionedEvent[]>(
		() => layoutVertical({ days, events, gridType }),
		[days, gridType, events]
	)
}
