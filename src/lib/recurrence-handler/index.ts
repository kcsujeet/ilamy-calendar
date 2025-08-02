import type { CalendarEvent } from '@/components'
import dayjs from '@/lib/dayjs-config'
import { RRule } from 'rrule'
import { safeDate } from '../utils'

export const isRecurringEvent = (event: CalendarEvent) => {
  return Boolean(event.rrule || event.recurrenceId || event.uid)
}

interface GenerateRecurringEventsProps {
  event: CalendarEvent
  currentEvents: CalendarEvent[]
  startDate: dayjs.Dayjs
  endDate: dayjs.Dayjs
}

export const generateRecurringEvents = ({
  event,
  currentEvents,
  startDate,
  endDate,
}: GenerateRecurringEventsProps): CalendarEvent[] => {
  // If not a recurring event, return empty array
  if (!event.rrule) {
    return []
  }

  try {
    // Parse RRULE string and create rule with proper dtstart
    const baseRule = RRule.fromString(event.rrule)
    const rule = new RRule({
      ...baseRule.origOptions,
      dtstart: event.start.toDate(),
    })

    const overrides = currentEvents.filter(
      (e) => e.recurrenceId && e.uid === event.uid
    )

    // Generate occurrences within the date range
    const startDateTime = startDate.toDate()
    const endDateTime = endDate.toDate()
    const occurrences = rule.between(startDateTime, endDateTime, true)

    // Convert occurrences to CalendarEvent instances
    const recurringEvents: CalendarEvent[] = occurrences
      .map((occurrence, index) => {
        const occurrenceDate = dayjs(occurrence)
        const existingOverride = overrides.find((e) =>
          safeDate(e.recurrenceId).isSame(occurrenceDate)
        )

        // If there's an override, use it
        if (existingOverride) {
          return { ...event, ...existingOverride }
        }

        // Calculate the duration from the original event
        const originalDuration = event.end.diff(event.start)
        const newEndTime = occurrenceDate.add(originalDuration, 'millisecond')
        const recurringEventId = `${event.id}_${index}`
        const parentUID = event.uid || `${event.id}@ilamy.calendar`

        // Create the recurring event instance
        const recurringEvent: CalendarEvent = {
          ...event,
          id: recurringEventId,
          start: occurrenceDate,
          end: newEndTime,
          uid: parentUID, // Same UID as parent for proper grouping
          rrule: undefined, // Instance events don't have RRULE
        }

        return recurringEvent
      })
      .filter((recurringEvent) => {
        // Filter out EXDATE exclusions
        const hasExdates = event.exdates && event.exdates.length > 0
        if (!hasExdates) {
          return true
        }

        const eventStartISO = recurringEvent.start.toISOString()
        const isExcluded = event.exdates.includes(eventStartISO)
        return !isExcluded
      })

    return recurringEvents
  } catch (error) {
    // Handle malformed RRULE strings
    throw new Error(
      `Invalid RRULE string: ${event.rrule}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

interface UpdateRecurringEventProps {
  targetEvent: CalendarEvent
  updates: Partial<CalendarEvent>
  currentEvents: CalendarEvent[]
  scope: 'this' | 'following' | 'all'
}

export const updateRecurringEvent = ({
  targetEvent,
  updates,
  currentEvents,
  scope,
}: UpdateRecurringEventProps): CalendarEvent[] => {
  const updatedEvents = [...currentEvents]

  // Find the base recurring event
  const baseEventIndex = updatedEvents.findIndex((e) => {
    const parentUid = e.uid || `${e.id}@ilamy.calendar`
    return parentUid === targetEvent.uid && e.rrule && !e.recurrenceId
  })

  if (baseEventIndex === -1) {
    throw new Error('Base recurring event not found')
  }

  const baseEvent = updatedEvents[baseEventIndex]

  switch (scope) {
    case 'this': {
      // "This event only" - Add EXDATE to base event and create standalone modified event
      const targetEventStartISO = targetEvent.start.toISOString()
      const existingExdates = baseEvent.exdates || []
      const updatedExdates = [...existingExdates, targetEventStartISO]

      const updatedBaseEvent = {
        ...baseEvent,
        exdates: updatedExdates,
      }
      updatedEvents[baseEventIndex] = updatedBaseEvent

      // Create standalone modified event with recurrenceId
      const modifiedEventId = `${targetEvent.id}_modified_${Date.now()}`
      const modifiedEvent: CalendarEvent = {
        ...targetEvent,
        ...updates,
        id: modifiedEventId,
        recurrenceId: targetEventStartISO, // This marks it as a modified instance
        uid: baseEvent.uid, // Keep same UID as base event (iCalendar standard)
        rrule: undefined, // Standalone events don't have RRULE
      }
      updatedEvents.push(modifiedEvent)
      break
    }

    case 'following': {
      // "This and following" - Terminate original series and create new series

      // Calculate the termination date: day before target with end of day time
      // This ensures the last occurrence before target is included in the terminated series
      const dayBeforeTarget = targetEvent.start.subtract(1, 'day')
      const terminationDate = dayBeforeTarget
        .endOf('day')
        .format('YYYYMMDD[T]HHmmss[Z]')
      const terminatedRRule = `${baseEvent.rrule};UNTIL=${terminationDate}`

      // Update original series with UNTIL to end before target date
      const terminatedEvent = {
        ...baseEvent,
        rrule: terminatedRRule,
      }
      updatedEvents[baseEventIndex] = terminatedEvent

      // Create new series starting from target date
      const originalDuration = baseEvent.end.diff(baseEvent.start)
      const newSeriesStartTime = updates.start || targetEvent.start
      const newSeriesEndTime =
        updates.end || newSeriesStartTime.add(originalDuration)
      const newSeriesId = `${baseEvent.id}_following_${Date.now()}`
      const newSeriesUID = `${baseEvent.uid}_following`

      const newSeriesEvent: CalendarEvent = {
        ...baseEvent,
        ...updates,
        id: newSeriesId,
        uid: newSeriesUID, // New UID for new series
        start: newSeriesStartTime,
        end: newSeriesEndTime,
        recurrenceId: undefined, // This is a new base event, not an instance
      }
      updatedEvents.push(newSeriesEvent)
      break
    }

    case 'all': {
      // "All events" - Update the base recurring event
      const updatedBaseEvent = {
        ...baseEvent,
        ...updates,
      }
      updatedEvents[baseEventIndex] = updatedBaseEvent
      break
    }

    default:
      throw new Error(
        `Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
      )
  }

  return updatedEvents
}

interface DeleteRecurringEventProps {
  targetEvent: CalendarEvent
  currentEvents: CalendarEvent[]
  scope: 'this' | 'following' | 'all'
}

export const deleteRecurringEvent = ({
  targetEvent,
  currentEvents,
  scope,
}: DeleteRecurringEventProps): CalendarEvent[] => {
  const updatedEvents = [...currentEvents]

  // Find the base recurring event
  const baseEventIndex = updatedEvents.findIndex((e) => {
    const parentUid = e.uid || `${e.id}@ilamy.calendar`
    return parentUid === targetEvent.uid && e.rrule && !e.recurrenceId
  })

  if (baseEventIndex === -1) {
    throw new Error('Base recurring event not found')
  }

  const baseEvent = updatedEvents[baseEventIndex]

  switch (scope) {
    case 'this': {
      // "This event only" - Add EXDATE to exclude this occurrence
      const targetEventStartISO = targetEvent.start.toISOString()
      const existingExdates = baseEvent.exdates || []
      const updatedExdates = [...existingExdates, targetEventStartISO]

      const updatedBaseEvent = { ...baseEvent, exdates: updatedExdates }
      updatedEvents[baseEventIndex] = updatedBaseEvent
      break
    }

    case 'following': {
      // "This and following" - Terminate series with UNTIL before target date

      // Calculate the termination date: day before target with end of day time
      // This ensures the last occurrence before target is included in the terminated series
      const dayBeforeTarget = targetEvent.start.subtract(1, 'day')
      const terminationDate = dayBeforeTarget
        .endOf('day')
        .format('YYYYMMDD[T]HHmmss[Z]')
      const terminatedRRule = `${baseEvent.rrule};UNTIL=${terminationDate}`

      const terminatedEvent = {
        ...baseEvent,
        rrule: terminatedRRule,
      }
      updatedEvents[baseEventIndex] = terminatedEvent
      break
    }

    case 'all': {
      // "All events" - Remove the entire recurring series
      const eventsWithoutTargetSeries = updatedEvents.filter(
        (e) => e.uid !== targetEvent.uid
      )
      return eventsWithoutTargetSeries
    }

    default:
      throw new Error(
        `Invalid scope: ${scope}. Must be 'this', 'following', or 'all'`
      )
  }

  return updatedEvents
}
