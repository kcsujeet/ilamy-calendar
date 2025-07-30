import type {
  CalendarEvent,
  EventRecurrence,
  RecurrenceException,
  RecurrenceUpdate,
} from '@/components/types'
import type dayjs from '@/lib/dayjs-config'
import { DAY_NUMBER_TO_WEEK_DAYS, WEEK_DAYS_NUMBER_MAP } from '../constants'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'

/**
 * Enhanced recurrence engine that handles Google Calendar-style recurrence patterns
 * Supports daily, weekly, monthly, yearly frequencies with advanced options
 */
export class RecurrenceHandler {
  /**
   * Generates recurring event instances based on recurrence pattern
   * Similar to Google Calendar's recurrence logic
   * For non-recurring events, returns the event if it falls within the range
   */
  static generateRecurringEvents(
    baseEvent: CalendarEvent,
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs
  ): CalendarEvent[] {
    if (!baseEvent.recurrence) {
      // Check if the base event falls within the range
      if (
        baseEvent.start.isSameOrAfter(startDate) &&
        baseEvent.start.isSameOrBefore(endDate)
      ) {
        return [baseEvent]
      }
      return []
    }

    const events: CalendarEvent[] = []
    const recurrence = baseEvent.recurrence

    const eventDuration = baseEvent.end.diff(baseEvent.start)

    let currentDate = baseEvent.start.clone()
    let occurrenceCount = 0

    // Generate instances until we hit our limits
    while (
      currentDate.isBefore(endDate) ||
      currentDate.isSame(endDate, 'day')
    ) {
      // Check end conditions before processing
      if (
        recurrence.endType === 'on' &&
        recurrence.endDate &&
        currentDate.isAfter(recurrence.endDate, 'day')
      ) {
        break
      }
      if (
        recurrence.endType === 'after' &&
        recurrence.count &&
        occurrenceCount >= recurrence.count
      ) {
        break
      }

      // Check if this date should be included
      if (
        this.shouldIncludeDate(currentDate, recurrence) &&
        currentDate.isSameOrAfter(startDate) &&
        (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day'))
      ) {
        // Skip if this date is in exceptions
        const isException = recurrence.exceptions?.some((exception) =>
          this.isDateExcluded(currentDate, exception)
        )

        if (!isException) {
          const eventStart = currentDate.clone()
          const eventEnd = eventStart.add(eventDuration, 'millisecond')

          // Check if there's an update for this specific date
          const updateForDate = recurrence.updates?.find(
            (update) =>
              update.date.isSame(currentDate, 'day') && update.type === 'this'
          )

          const eventInstance = {
            ...baseEvent,
            id: `${baseEvent.id}_${currentDate.toISOString()}`,
            start: eventStart,
            end: eventEnd,
            isRecurring: true,
            parentEventId: baseEvent.id,
            originalStart: baseEvent.start,
            originalEnd: baseEvent.end,
          }

          // Apply any updates for this specific date
          if (updateForDate) {
            Object.assign(eventInstance, updateForDate.updates)
            eventInstance.isModified = true
          }

          events.push(eventInstance)

          occurrenceCount++
        }
      }

      // Move to next occurrence
      currentDate = this.getNextOccurrence(currentDate, recurrence)

      // Safety check to prevent infinite loops
      if (occurrenceCount >= 1000) {
        break
      }
    }

    return events
  }

  /**
   * Checks if a date should be excluded based on recurrence exceptions
   */
  private static isDateExcluded(
    date: dayjs.Dayjs,
    exception: RecurrenceException
  ): boolean {
    const exceptionDate = exception.date

    switch (exception.type) {
      case 'this':
        // Exclude only the specific date
        return date.isSame(exceptionDate, 'day')

      case 'following':
        // Exclude this date and all following dates
        return date.isSameOrAfter(exceptionDate, 'day')

      case 'all':
        // This would exclude the entire series, should be handled at a higher level
        return true

      default:
        return false
    }
  }

  /**
   * Determines if a specific date should be included based on recurrence rules
   */
  private static shouldIncludeDate(
    date: dayjs.Dayjs,
    recurrence: EventRecurrence
  ): boolean {
    switch (recurrence.frequency) {
      case 'weekly':
        // For weekly recurrence, check if the day of week is selected
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          return recurrence.daysOfWeek.includes(
            DAY_NUMBER_TO_WEEK_DAYS[date.day()]
          )
        }
        return true

      default:
        return true
    }
  }

  /**
   * Calculates the next occurrence date based on frequency and interval
   */
  private static getNextOccurrence(
    currentDate: dayjs.Dayjs,
    recurrence: EventRecurrence
  ): dayjs.Dayjs {
    const { frequency, interval } = recurrence

    switch (frequency) {
      case 'daily':
        return currentDate.add(interval, 'day')

      case 'weekly':
        if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
          // For weekly with specific days, find next selected day
          return this.getNextWeeklyOccurrence(currentDate, recurrence)
        }
        return currentDate.add(interval, 'week')

      case 'monthly':
        return currentDate.add(interval, 'month')

      case 'yearly':
        return currentDate.add(interval, 'year')

      default:
        return currentDate.add(1, 'day')
    }
  }

  /**
   * Handles weekly recurrence with specific days of week
   */
  private static getNextWeeklyOccurrence(
    currentDate: dayjs.Dayjs,
    recurrence: EventRecurrence
  ): dayjs.Dayjs {
    const { daysOfWeek, interval } = recurrence

    if (!daysOfWeek || daysOfWeek.length === 0) {
      return currentDate.add(interval, 'week')
    }

    // Sort days of week to find next occurrence
    const sortedDays = [...daysOfWeek].sort(
      (a, b) => WEEK_DAYS_NUMBER_MAP[a] - WEEK_DAYS_NUMBER_MAP[b]
    )
    const currentDayOfWeek = currentDate.day()

    // Find next day in current week
    const nextDayThisWeek = sortedDays.find(
      (day) => WEEK_DAYS_NUMBER_MAP[day] > currentDayOfWeek
    )

    if (nextDayThisWeek === undefined) {
      // Next occurrence is in the next interval of weeks
      const daysUntilNextWeek =
        7 - currentDayOfWeek + WEEK_DAYS_NUMBER_MAP[sortedDays[0]]
      const weeksToAdd = interval - 1
      return currentDate.add(daysUntilNextWeek + weeksToAdd * 7, 'day')
    }

    // Next occurrence is in the current week
    const daysToAdd = WEEK_DAYS_NUMBER_MAP[nextDayThisWeek] - currentDayOfWeek
    return currentDate.add(daysToAdd, 'day')
  }

  /**
   * Generates a human-readable description of the recurrence pattern
   */
  static getRecurrenceDescription(recurrence: EventRecurrence): string {
    const { frequency, interval, endType, count } = recurrence

    let description = ''

    // Frequency and interval
    if (interval === 1) {
      switch (frequency) {
        case 'daily':
          description = 'Daily'
          break
        case 'weekly':
          description = 'Weekly'
          break
        case 'monthly':
          description = 'Monthly'
          break
        case 'yearly':
          description = 'Yearly'
          break
      }
    } else {
      switch (frequency) {
        case 'daily':
          description = `Every ${interval} days`
          break
        case 'weekly':
          description = `Every ${interval} weeks`
          break
        case 'monthly':
          description = `Every ${interval} months`
          break
        case 'yearly':
          description = `Every ${interval} years`
          break
      }
    }

    // Days of week for weekly recurrence
    if (
      frequency === 'weekly' &&
      recurrence.daysOfWeek &&
      recurrence.daysOfWeek.length > 0
    ) {
      const selectedDays = recurrence.daysOfWeek.join(', ')
      description += ` on ${selectedDays}`
    }

    // End condition
    switch (endType) {
      case 'never':
        // No additional text needed
        break
      case 'on':
        if (recurrence.endDate) {
          description += `, until ${recurrence.endDate.format('MMM D, YYYY')}`
        }
        break
      case 'after':
        if (count) {
          description += `, ${count} time${count > 1 ? 's' : ''}`
        }
        break
    }

    return description
  }

  /**
   * Handles updating recurring events using the enhanced updates system
   */
  static updateRecurringEvent(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    updates: Partial<CalendarEvent>,
    options: RecurrenceEditOptions
  ): CalendarEvent[] {
    const { scope, eventDate } = options
    const parentId = String(targetEvent.parentEventId || targetEvent.id)

    // Find the base recurring event
    const baseEvent = events.find((e) => e.id === parentId)
    if (!baseEvent || !baseEvent.recurrence) {
      return events
    }

    switch (scope) {
      case 'this':
        return this.updateThisEvent(events, targetEvent, updates, eventDate)
      case 'following':
        return this.updateFollowingEvents(
          events,
          targetEvent,
          updates,
          eventDate
        )
      case 'all':
        return this.updateAllEvents(events, targetEvent, updates)
      default:
        return events
    }
  }

  /**
   * Handles deleting recurring events using the enhanced exception system
   * Instead of actually removing events, adds appropriate exceptions
   */
  static deleteRecurringEvent(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    options: RecurrenceEditOptions
  ): CalendarEvent[] {
    const { scope, eventDate } = options
    const parentId = targetEvent.parentEventId || targetEvent.id

    // Find the base recurring event
    const baseEvent = events.find((e) => e.id === parentId)
    if (!baseEvent || !baseEvent.recurrence) {
      return events
    }

    // Create the exception
    const exception: RecurrenceException = {
      date: eventDate,
      type: scope,
      createdAt: eventDate, // Using eventDate as createdAt for simplicity
    }

    // Update the base event with the new exception
    const updatedEvents = events.map((event) => {
      if (event.id === parentId) {
        const currentExceptions = event.recurrence?.exceptions || []
        return {
          ...event,
          recurrence: {
            ...event.recurrence!,
            exceptions: [...currentExceptions, exception],
          },
        }
      }
      return event
    })

    return updatedEvents
  }

  /**
   * Update only this specific event instance by storing the update in the recurrence pattern
   */
  private static updateThisEvent(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    updates: Partial<CalendarEvent>,
    eventDate: dayjs.Dayjs
  ): CalendarEvent[] {
    const parentId = String(targetEvent.parentEventId || targetEvent.id)

    // Create a recurrence update for this specific date
    const recurrenceUpdate: RecurrenceUpdate = {
      date: eventDate,
      type: 'this',
      updates: updates,
      createdAt: eventDate,
    }

    // Add the update to the base event's recurrence pattern
    return events.map((event) => {
      if (event.id === parentId) {
        const currentUpdates = event.recurrence?.updates || []

        // Remove any existing update for this date to avoid duplicates
        const filteredUpdates = currentUpdates.filter(
          (update) => !update.date.isSame(eventDate, 'day')
        )

        return {
          ...event,
          recurrence: {
            ...event.recurrence!,
            updates: [...filteredUpdates, recurrenceUpdate],
          },
        }
      }
      return event
    })
  }

  /**
   * Update this and all following events by creating modified overrides
   */
  private static updateFollowingEvents(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    updates: Partial<CalendarEvent>,
    eventDate: dayjs.Dayjs
  ): CalendarEvent[] {
    const parentId = String(targetEvent.parentEventId || targetEvent.id)

    // Find the base recurring event
    const baseEvent = events.find((e) => e.id === parentId)
    if (!baseEvent || !baseEvent.recurrence) {
      return events
    }

    // Create a new recurring event with the updates, starting from the target date
    const newRecurringEvent: CalendarEvent = {
      ...baseEvent,
      ...updates,
      id: `${parentId}_following_${eventDate.toISOString()}`,
      start: updates.start || eventDate,
      end:
        updates.end ||
        eventDate.add(baseEvent.end.diff(baseEvent.start), 'millisecond'),
      recurrence: {
        ...baseEvent.recurrence,
        exceptions: [], // New series starts clean
        updates: [], // New series starts clean
      },
      parentEventId: undefined,
      originalStart: updates.start || eventDate,
      originalEnd:
        updates.end ||
        eventDate.add(baseEvent.end.diff(baseEvent.start), 'millisecond'),
    }

    // Terminate the original series by setting an end date just before the target date
    const terminationDate = eventDate.subtract(1, 'day')

    const updatedEvents = events.map((event) => {
      if (event.id === parentId) {
        return {
          ...event,
          recurrence: {
            ...event.recurrence!,
            endType: 'on' as const,
            endDate: terminationDate,
            count: undefined, // Clear count when using end date
          },
        }
      }
      return event
    })

    // Add the new recurring series
    return [...updatedEvents, newRecurringEvent]
  }

  /**
   * Update all events in the recurring series by modifying the base event
   */
  private static updateAllEvents(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    updates: Partial<CalendarEvent>
  ): CalendarEvent[] {
    const parentId = String(targetEvent.parentEventId || targetEvent.id)

    // For "all" updates, we can safely update the base event since we want all instances to change
    return events.map((event) => {
      if (event.id === parentId) {
        return { ...event, ...updates }
      }
      return event
    })
  }

  /**
   * Delete only this specific event instance
   */
  private static deleteThisEvent(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    eventDate: dayjs.Dayjs
  ): CalendarEvent[] {
    const parentId = targetEvent.parentEventId || targetEvent.id

    return events.filter((event) => {
      // Remove only the specific recurring instance for this date
      if (
        (event.parentEventId === parentId || event.id === parentId) &&
        event.start.isSame(eventDate, 'day')
      ) {
        return false
      }
      return true
    })
  }

  /**
   * Delete this and all following events in the series
   */
  private static deleteFollowingEvents(
    events: CalendarEvent[],
    targetEvent: CalendarEvent,
    eventDate: dayjs.Dayjs
  ): CalendarEvent[] {
    const parentId = targetEvent.parentEventId || targetEvent.id

    return events.filter((event) => {
      // Remove the parent event and all instances on or after the target date
      if (
        (event.parentEventId === parentId || event.id === parentId) &&
        (event.start.isSameOrAfter(eventDate, 'day') || event.id === parentId)
      ) {
        return false
      }
      return true
    })
  }

  /**
   * Delete all events in the recurring series
   */
  private static deleteAllEvents(
    events: CalendarEvent[],
    targetEvent: CalendarEvent
  ): CalendarEvent[] {
    const parentId = targetEvent.parentEventId || targetEvent.id

    return events.filter((event) => {
      return !(event.parentEventId === parentId || event.id === parentId)
    })
  }
}
