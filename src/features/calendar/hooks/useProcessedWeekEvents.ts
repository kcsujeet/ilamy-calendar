import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import type dayjs from '@/lib/configs/dayjs-config'
import { getPositionedEvents } from '@/lib/utils/position-week-events'
import { useMemo } from 'react'

interface UseProcessedWeekEventsProps {
  days: dayjs.Dayjs[]
  allDay?: boolean
  dayNumberHeight?: number
}

export const useProcessedWeekEvents = ({
  days,
  allDay,
  dayNumberHeight,
}: UseProcessedWeekEventsProps) => {
  const { getEventsForDateRange, dayMaxEvents, eventSpacing } =
    useCalendarContext()

  const weekStart = days[0].startOf('day')
  const weekEnd = days.at(-1).endOf('day')

  // Get all events that intersect with this week
  const positionedEvents = useMemo(() => {
    let events = getEventsForDateRange(weekStart, weekEnd)
    if (allDay) {
      events = events.filter((e) => e.allDay)
    }

    return getPositionedEvents({
      days,
      events,
      dayMaxEvents,
      dayNumberHeight,
      eventSpacing,
    })
  }, [
    getEventsForDateRange,
    weekStart,
    weekEnd,
    allDay,
    days,
    dayMaxEvents,
    dayNumberHeight,
    eventSpacing,
  ])

  return positionedEvents
}
