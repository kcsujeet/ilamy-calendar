import { describe, expect, it } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import { RecurrenceHandler } from '@/lib/recurrence-handler/recurrence-handler'
import type { CalendarEvent } from '@/components/types'
import type { RecurrenceEditOptions } from '@/features/recurrence/types'

describe('RecurrenceHandler - Recurring Event Operations', () => {
  const baseEvent: CalendarEvent = {
    id: 'recurring-event',
    title: 'Daily Standup',
    start: dayjs('2025-01-06T09:00:00'),
    end: dayjs('2025-01-06T09:30:00'),
    recurrence: {
      frequency: 'daily',
      interval: 1,
      endType: 'after',
      count: 5,
    },
  }

  const recurringEvents: CalendarEvent[] = [
    baseEvent,
    {
      id: 'recurring-event_2025-01-07T09:00:00.000Z',
      title: 'Daily Standup',
      start: dayjs('2025-01-07T09:00:00'),
      end: dayjs('2025-01-07T09:30:00'),
      isRecurring: true,
      parentEventId: 'recurring-event',
      originalStart: baseEvent.start,
      originalEnd: baseEvent.end,
    },
    {
      id: 'recurring-event_2025-01-08T09:00:00.000Z',
      title: 'Daily Standup',
      start: dayjs('2025-01-08T09:00:00'),
      end: dayjs('2025-01-08T09:30:00'),
      isRecurring: true,
      parentEventId: 'recurring-event',
      originalStart: baseEvent.start,
      originalEnd: baseEvent.end,
    },
    {
      id: 'recurring-event_2025-01-09T09:00:00.000Z',
      title: 'Daily Standup',
      start: dayjs('2025-01-09T09:00:00'),
      end: dayjs('2025-01-09T09:30:00'),
      isRecurring: true,
      parentEventId: 'recurring-event',
      originalStart: baseEvent.start,
      originalEnd: baseEvent.end,
    },
    {
      id: 'recurring-event_2025-01-10T09:00:00.000Z',
      title: 'Daily Standup',
      start: dayjs('2025-01-10T09:00:00'),
      end: dayjs('2025-01-10T09:30:00'),
      isRecurring: true,
      parentEventId: 'recurring-event',
      originalStart: baseEvent.start,
      originalEnd: baseEvent.end,
    },
  ]

  describe('updateRecurringEvent', () => {
    it('should update only this event when scope is "this"', () => {
      const targetEvent = recurringEvents[1] // Jan 7th
      const updates = { title: 'Special Standup' }
      const options: RecurrenceEditOptions = {
        scope: 'this',
        eventDate: dayjs('2025-01-07T09:00:00'),
      }

      const result = RecurrenceHandler.updateRecurringEvent(
        recurringEvents,
        targetEvent,
        updates,
        options
      )

      // Only the Jan 7th event should be updated
      expect(result[0].title).toBe('Daily Standup') // Jan 6th unchanged
      expect(result[1].title).toBe('Special Standup') // Jan 7th updated
      expect(result[2].title).toBe('Daily Standup') // Jan 8th unchanged
      expect(result[3].title).toBe('Daily Standup') // Jan 9th unchanged
      expect(result[4].title).toBe('Daily Standup') // Jan 10th unchanged
    })

    it('should update this and following events when scope is "following"', () => {
      const targetEvent = recurringEvents[2] // Jan 8th
      const updates = { title: 'Updated Standup' }
      const options: RecurrenceEditOptions = {
        scope: 'following',
        eventDate: dayjs('2025-01-08T09:00:00'),
      }

      const result = RecurrenceHandler.updateRecurringEvent(
        recurringEvents,
        targetEvent,
        updates,
        options
      )

      // Jan 8th and after should be updated
      expect(result[0].title).toBe('Updated Standup') // Parent event
      expect(result[1].title).toBe('Daily Standup') // Jan 7th unchanged
      expect(result[2].title).toBe('Updated Standup') // Jan 8th updated
      expect(result[3].title).toBe('Updated Standup') // Jan 9th updated
      expect(result[4].title).toBe('Updated Standup') // Jan 10th updated
    })

    it('should update all events when scope is "all"', () => {
      const targetEvent = recurringEvents[2] // Jan 8th
      const updates = { title: 'All Day Standup' }
      const options: RecurrenceEditOptions = {
        scope: 'all',
        eventDate: dayjs('2025-01-08T09:00:00'),
      }

      const result = RecurrenceHandler.updateRecurringEvent(
        recurringEvents,
        targetEvent,
        updates,
        options
      )

      // All events should be updated
      expect(result[0].title).toBe('All Day Standup') // Parent event
      expect(result[1].title).toBe('All Day Standup') // Jan 7th updated
      expect(result[2].title).toBe('All Day Standup') // Jan 8th updated
      expect(result[3].title).toBe('All Day Standup') // Jan 9th updated
      expect(result[4].title).toBe('All Day Standup') // Jan 10th updated
    })
  })

  describe('deleteRecurringEvent', () => {
    it('should delete only this event when scope is "this"', () => {
      const targetEvent = recurringEvents[1] // Jan 7th
      const options: RecurrenceEditOptions = {
        scope: 'this',
        eventDate: dayjs('2025-01-07T09:00:00'),
      }

      const result = RecurrenceHandler.deleteRecurringEvent(
        recurringEvents,
        targetEvent,
        options
      )

      expect(result).toHaveLength(4) // One event removed
      expect(
        result.find((e) => e.start.format('YYYY-MM-DD') === '2025-01-07')
      ).toBeUndefined()
      expect(
        result.find((e) => e.start.format('YYYY-MM-DD') === '2025-01-06')
      ).toBeDefined()
      expect(
        result.find((e) => e.start.format('YYYY-MM-DD') === '2025-01-08')
      ).toBeDefined()
    })

    it('should delete this and following events when scope is "following"', () => {
      const targetEvent = recurringEvents[2] // Jan 8th
      const options: RecurrenceEditOptions = {
        scope: 'following',
        eventDate: dayjs('2025-01-08T09:00:00'),
      }

      const result = RecurrenceHandler.deleteRecurringEvent(
        recurringEvents,
        targetEvent,
        options
      )

      expect(result).toHaveLength(1) // Only Jan 7th should remain
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-07')
    })

    it('should delete all events when scope is "all"', () => {
      const targetEvent = recurringEvents[2] // Jan 8th
      const options: RecurrenceEditOptions = {
        scope: 'all',
        eventDate: dayjs('2025-01-08T09:00:00'),
      }

      const result = RecurrenceHandler.deleteRecurringEvent(
        recurringEvents,
        targetEvent,
        options
      )

      expect(result).toHaveLength(0) // All events should be deleted
    })
  })

  describe('edge cases', () => {
    it('should handle mixed events (recurring and non-recurring)', () => {
      const mixedEvents = [
        ...recurringEvents,
        {
          id: 'single-event',
          title: 'One-time Meeting',
          start: dayjs('2025-01-07T14:00:00'),
          end: dayjs('2025-01-07T15:00:00'),
        },
      ]

      const targetEvent = recurringEvents[1] // Jan 7th recurring event
      const options: RecurrenceEditOptions = {
        scope: 'all',
        eventDate: dayjs('2025-01-07T09:00:00'),
      }

      const result = RecurrenceHandler.deleteRecurringEvent(
        mixedEvents,
        targetEvent,
        options
      )

      expect(result).toHaveLength(1) // Only the non-recurring event should remain
      expect(result[0].title).toBe('One-time Meeting')
    })
  })
})
