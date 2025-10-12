import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'

interface UseProcessedWeekEventsProps {
  days: dayjs.Dayjs[]
}

export const useProcessedWeekEvents = ({
  days,
}: UseProcessedWeekEventsProps) => {
  const { getEventsForDateRange, dayMaxEvents } = useCalendarContext()

  const weekStart = days[0].startOf('day')
  const weekEnd = days[6].endOf('day')

  // Get all events that intersect with this week
  const events = getEventsForDateRange(weekStart, weekEnd)

  return getPositionedEvents({
    days,
    events,
    dayMaxEvents,
  })
}
