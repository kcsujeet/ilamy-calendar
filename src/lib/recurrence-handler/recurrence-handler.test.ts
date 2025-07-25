import { describe, it, expect, beforeEach } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import { RecurrenceHandler } from './recurrence-handler'
import type { CalendarEvent, EventRecurrence } from '@/components/types'

describe('RecurrenceHandler', () => {
  let baseEvent: CalendarEvent

  beforeEach(() => {
    // Create a consistent base event for testing
    baseEvent = {
      id: 'test-event-1',
      title: 'Test Meeting',
      start: dayjs('2025-01-06').hour(9).minute(0), // Monday 9 AM
      end: dayjs('2025-01-06').hour(10).minute(0), // Monday 10 AM
      color: 'blue',
    }
  })

  describe('generateRecurringEvents', () => {
    it('should return original event when no recurrence is specified', () => {
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        baseEvent,
        startDate,
        endDate
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(baseEvent)
    })

    it('should generate daily recurring events correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'after',
        count: 5,
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      expect(result).toHaveLength(5)
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06') // Original start
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-07') // Next day
      expect(result[4].start.format('YYYY-MM-DD')).toBe('2025-01-10') // 5th occurrence

      // Verify all events have correct properties
      result.forEach((event, index) => {
        expect(event.isRecurring).toBe(true)
        expect(event.parentEventId).toBe(baseEvent.id)
        expect(event.id).toBe(
          `${baseEvent.id}_${result[index].start.toISOString()}`
        )
      })
    })

    it('should generate weekly recurring events with specific days', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        endType: 'after',
        count: 6,
        daysOfWeek: ['monday', 'wednesday', 'friday'], // Monday, Wednesday, Friday
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      expect(result).toHaveLength(6)

      // Check that all events fall on correct days of week
      result.forEach((event) => {
        const dayOfWeek = event.start.day()
        expect([1, 3, 5]).toContain(dayOfWeek)
      })

      // Verify sequence: Mon 6th, Wed 8th, Fri 10th, Mon 13th, Wed 15th, Fri 17th
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06') // Monday
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-08') // Wednesday
      expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-10') // Friday
      expect(result[3].start.format('YYYY-MM-DD')).toBe('2025-01-13') // Monday
    })

    it('should handle every-2-weeks pattern correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 2, // Every 2 weeks
        endType: 'after',
        count: 4,
        daysOfWeek: ['monday'], // Mondays only
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-03-01')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      expect(result).toHaveLength(4)
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06') // Week 1 Monday
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-20') // Week 3 Monday (skip week 2)
      expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-02-03') // Week 5 Monday
      expect(result[3].start.format('YYYY-MM-DD')).toBe('2025-02-17') // Week 7 Monday
    })

    it('should stop at end date when endType is "on"', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'on',
        endDate: dayjs('2025-01-10'),
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      // Should generate from Jan 6-10 (5 days)
      expect(result).toHaveLength(5)
      expect(result[result.length - 1].start.format('YYYY-MM-DD')).toBe(
        '2025-01-10'
      )
    })

    it('should respect exceptions in recurrence pattern', () => {
      const exceptions = [
        dayjs('2025-01-07'), // Skip Tuesday
        dayjs('2025-01-09'), // Skip Thursday
      ]

      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'after',
        count: 10,
        exceptions,
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      // Should have 10 occurrences but skip the exception dates
      expect(result).toHaveLength(10)

      const resultDates = result.map((event) =>
        event.start.format('YYYY-MM-DD')
      )
      expect(resultDates).not.toContain('2025-01-07')
      expect(resultDates).not.toContain('2025-01-09')
    })

    it('should handle monthly recurrence correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'monthly',
        interval: 1,
        endType: 'after',
        count: 3,
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-12-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      expect(result).toHaveLength(3)
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06') // January 6th
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-02-06') // February 6th
      expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-03-06') // March 6th
    })

    it('should handle yearly recurrence correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 1,
        endType: 'after',
        count: 3,
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2027-12-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      expect(result).toHaveLength(3)
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06') // 2025
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2026-01-06') // 2026
      expect(result[2].start.format('YYYY-MM-DD')).toBe('2027-01-06') // 2027
    })

    it('should preserve event duration across all instances', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'after',
        count: 3,
      }

      // 2-hour event
      const longEvent = {
        ...baseEvent,
        end: baseEvent.start.add(2, 'hour'),
        recurrence,
      }

      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        longEvent,
        startDate,
        endDate
      )

      result.forEach((event) => {
        const duration = event.end.diff(event.start, 'hour')
        expect(duration).toBe(2)
      })
    })

    it('should prevent infinite loops with safety limit', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'never', // This could theoretically go forever
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2030-12-31') // Very large range

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      // Should stop at safety limit of 1000 occurrences
      expect(result.length).toBeLessThanOrEqual(1000)
    })

    it('should only generate events within the specified date range', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-08') // Start after the base event
      const endDate = dayjs('2025-01-12') // Limited range

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      result.forEach((event) => {
        expect(event.start.isSameOrAfter(startDate, 'day')).toBe(true)
        expect(event.start.isSameOrBefore(endDate, 'day')).toBe(true)
      })
    })
  })

  describe('getRecurrenceDescription', () => {
    it('should generate correct description for daily recurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
      }

      const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
      expect(description).toBe('Daily')
    })

    it('should generate correct description for every N days', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 3,
        endType: 'never',
      }

      const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
      expect(description).toBe('Every 3 days')
    })

    it('should generate correct description for weekly with specific days', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        endType: 'never',
        daysOfWeek: ['monday', 'wednesday', 'friday'], // Monday, Wednesday, Friday
      }

      const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
      expect(description).toBe('Weekly on monday, wednesday, friday')
    })

    it('should generate correct description with end date', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        endType: 'on',
        endDate: dayjs('2025-12-31'),
      }

      const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
      expect(description).toBe('Weekly, until Dec 31, 2025')
    })

    it('should generate correct description with occurrence count', () => {
      const recurrence: EventRecurrence = {
        frequency: 'monthly',
        interval: 2,
        endType: 'after',
        count: 5,
      }

      const description = RecurrenceHandler.getRecurrenceDescription(recurrence)
      expect(description).toBe('Every 2 months, 5 times')
    })

    it('should handle singular vs plural correctly in descriptions', () => {
      const singleRecurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 1,
        endType: 'after',
        count: 1,
      }

      const pluralRecurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 1,
        endType: 'after',
        count: 3,
      }

      expect(RecurrenceHandler.getRecurrenceDescription(singleRecurrence)).toBe(
        'Yearly, 1 time'
      )
      expect(RecurrenceHandler.getRecurrenceDescription(pluralRecurrence)).toBe(
        'Yearly, 3 times'
      )
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle empty daysOfWeek array gracefully', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        endType: 'after',
        count: 3,
        daysOfWeek: [], // Empty array
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )

      // Should fall back to weekly without specific days
      expect(result).toHaveLength(3)
      expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
      expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-13')
      expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-20')
    })

    it('should handle events that start before the generation range', () => {
      const pastEvent = {
        ...baseEvent,
        start: dayjs('2024-12-30').hour(9),
        end: dayjs('2024-12-30').hour(10),
        recurrence: {
          frequency: 'daily' as const,
          interval: 1,
          endType: 'after' as const,
          count: 10,
        },
      }

      const startDate = dayjs('2025-01-05') // After base event
      const endDate = dayjs('2025-01-15')

      const result = RecurrenceHandler.generateRecurringEvents(
        pastEvent,
        startDate,
        endDate
      )

      // Should only include events within the range
      result.forEach((event) => {
        expect(event.start.isSameOrAfter(startDate)).toBe(true)
      })
    })

    it('should handle zero or negative intervals gracefully', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 0, // Invalid interval
        endType: 'after',
        count: 3,
      }

      const eventWithRecurrence = { ...baseEvent, recurrence }
      const startDate = dayjs('2025-01-01')
      const endDate = dayjs('2025-01-31')

      // This should not crash or create infinite loops
      const result = RecurrenceHandler.generateRecurringEvents(
        eventWithRecurrence,
        startDate,
        endDate
      )
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
