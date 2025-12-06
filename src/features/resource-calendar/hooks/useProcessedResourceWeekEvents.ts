import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'

interface UseProcessedResourceWeekEventsProps {
	days: dayjs.Dayjs[]
	gridType?: 'day' | 'hour'
	resourceId: string | number
}

export const useProcessedResourceWeekEvents = ({
	days,
	gridType = 'day',
	resourceId,
}: UseProcessedResourceWeekEventsProps) => {
	const {
		getEventsForResource,
		getEventsForDateRange,
		dayMaxEvents,
		eventSpacing,
	} = useResourceCalendarContext()

	const startDate = days[0].startOf('day')
	const endDate = days.at(-1).endOf('day')
	const resourceEvents = getEventsForResource(resourceId)
	const visibleEvents = getEventsForDateRange(startDate, endDate)

	return getPositionedEvents({
		days,
		events: resourceEvents.filter((event) =>
			visibleEvents.some((e) => e.id === event.id)
		),
		dayMaxEvents,
		dayNumberHeight: 0,
		gridType,
		eventSpacing,
	})
}
