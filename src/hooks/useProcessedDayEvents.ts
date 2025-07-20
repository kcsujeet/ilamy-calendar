import { useCalendarContext } from '@/contexts/calendar-context/context'
import dayjs from '@/lib/dayjs-config'
import { useMemo } from 'react'
import type { CalendarEvent } from '@/components/types'

interface ProcessedEvent extends CalendarEvent {
  left: number // Left position in percentage
  width: number // Width in percentage
  top: number // Top position in percentage
  height: number // Height in percentage
  zIndex?: number // Z-index for layering overlapping events
}

interface UseProcessedDayEventsProps {
  day: dayjs.Dayjs // The specific day this column represents
}

export const useProcessedDayEvents = ({ day }: UseProcessedDayEventsProps) => {
  const { getEventsForDateRange } = useCalendarContext()

  const todayEvents = useMemo<ProcessedEvent[]>(() => {
    let eventsForDay = getEventsForDateRange(
      day.startOf('day'),
      day.endOf('day')
    )

    // Filter out all-day events and sort by start time
    eventsForDay = eventsForDay
      .filter((e) => !e.all_day)
      .toSorted((a, b) => a.start.diff(b.start))

    if (eventsForDay.length === 0) {
      return []
    }

    // Step 1: Group events into clusters of overlapping events
    const clusters: CalendarEvent[][] = []
    let currentCluster: CalendarEvent[] = []
    let lastEventEnd: dayjs.Dayjs | null = null
    for (const event of eventsForDay) {
      if (lastEventEnd && event.start.isSameOrAfter(lastEventEnd)) {
        if (currentCluster.length > 0) {
          clusters.push(currentCluster)
        }
        currentCluster = []
      }
      currentCluster.push(event)
      lastEventEnd = lastEventEnd
        ? dayjs.max(lastEventEnd, event.end)
        : event.end
    }
    if (currentCluster.length > 0) {
      clusters.push(currentCluster)
    }

    // Step 2: For each cluster, use a more intelligent column assignment
    const processedEvents: ProcessedEvent[] = []
    for (const cluster of clusters) {
      if (cluster.length === 1) {
        // Single event takes full width
        const event = cluster[0]
        const startTime = event.start.hour() + event.start.minute() / 60
        let endTime = event.end.hour() + event.end.minute() / 60
        if (endTime < startTime) {
          // If the event ends on the next day, set end time to 24 hours
          endTime = 24
        }
        const totalDuration = endTime - startTime
        const top = (startTime / 24) * 100
        const height = (totalDuration / 24) * 100
        processedEvents.push({ ...event, left: 0, width: 100, top, height })
        continue
      }

      // Multiple events - use layered positioning approach
      // Sort by duration (longest first), then by start time
      const sortedEvents = [...cluster].sort((a, b) => {
        const aDuration = a.end.diff(a.start, 'minute')
        const bDuration = b.end.diff(b.start, 'minute')

        // Longer events first
        if (aDuration !== bDuration) {
          return bDuration - aDuration
        }

        // If same duration, earlier start time first
        return a.start.diff(b.start)
      })

      // Process events with layered positioning
      const totalEvents = sortedEvents.length

      // Calculate dynamic offset based on number of overlapping events
      // Fewer events = larger individual offsets, more events = smaller offsets
      let maxOffset: number
      if (totalEvents === 2) {
        maxOffset = 25 // 25% offset for 2 events
      } else if (totalEvents === 3) {
        maxOffset = 50 // 50% total for 3 events (25% each)
      } else if (totalEvents === 4) {
        maxOffset = 60 // 60% total for 4 events (20% each)
      } else {
        maxOffset = 70 // 70% total for 5+ events
      }

      const offsetPerEvent = totalEvents > 1 ? maxOffset / (totalEvents - 1) : 0

      for (let i = 0; i < sortedEvents.length; i++) {
        const event = sortedEvents[i]
        const startTime = event.start.hour() + event.start.minute() / 60
        let endTime = event.end.hour() + event.end.minute() / 60

        if (endTime < startTime) {
          // If the event ends on the next day, set end time to 24 hours
          endTime = 24
        }

        const totalDuration = endTime - startTime
        const top = (startTime / 24) * 100
        const height = (totalDuration / 24) * 100

        // Calculate positioning based on layer and total events
        let left: number
        let width: number
        let zIndex: number

        if (i === 0) {
          // First event (longest) takes full width at bottom
          left = 0
          width = 100
          zIndex = 1
        } else {
          // Subsequent events are offset dynamically based on total event count
          left = offsetPerEvent * i
          width = 100 - left // Remaining width
          zIndex = i + 1 // Higher z-index for events on top
        }

        processedEvents.push({
          ...event,
          left,
          width,
          top,
          height,
          zIndex,
        })
      }
    }

    return processedEvents
  }, [day, getEventsForDateRange])

  return todayEvents
}
