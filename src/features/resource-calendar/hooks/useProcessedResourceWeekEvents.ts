import { useResourceCalendarContext } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'

interface UseProcessedResourceWeekEventsProps {
  days: dayjs.Dayjs[]
  gridType?: 'day' | 'hour'
  maxEventsPerResource?: number
  resourceId: string | number
}

export const useProcessedResourceWeekEvents = ({
  days,
  gridType = 'day',
  maxEventsPerResource = 3,
  resourceId,
}: UseProcessedResourceWeekEventsProps) => {
  const { getEventsForResource, getEventsForDateRange } =
    useResourceCalendarContext()

  const startDate = days[0].startOf('day')
  const endDate = days.at(-1).endOf('day')
  const resourceEvents = getEventsForResource(resourceId)
  const visibleEvents = getEventsForDateRange(startDate, endDate)

  return getPositionedEvents({
    days,
    events: resourceEvents.filter((event) =>
      visibleEvents.some((e) => e.id === event.id)
    ),
    dayMaxEvents: maxEventsPerResource,
    dayNumberHeight: 0,
    gridType,
  })
}
