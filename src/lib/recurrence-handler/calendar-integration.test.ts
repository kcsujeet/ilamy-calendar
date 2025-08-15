import { describe, it, expect } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import { RRule } from 'rrule'
import { generateRecurringEvents } from './index'
import type { CalendarEvent } from '@/components/types'
import type { RRuleOptions } from './types'

describe('generateRecurringEvents - Calendar Provider Integration', () => {
  const baseEvent: CalendarEvent = {
    id: 'recurring-1',
    uid: 'recurring-1@ilamy.calendar',
    title: 'Weekly Meeting',
    start: dayjs('2025-01-06T09:00:00.000Z'), // Monday
    end: dayjs('2025-01-06T10:00:00.000Z'),
    rrule: {
      freq: RRule.WEEKLY,
      interval: 1,
      byweekday: [RRule.MO, RRule.WE, RRule.FR],
      dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(), // Match event start time
    },
    exdates: [],
  }

  const startDate = dayjs('2025-01-06').startOf('day')
  const endDate = dayjs('2025-01-20').endOf('day')

  it('should generate instances with same UID as parent and no recurrenceId', () => {
    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate,
      endDate,
    })

    // Should generate events: Jan 6,8,10 (week 1), Jan 13,15,17 (week 2), Jan 20 (week 3)
    expect(result).toHaveLength(7) // 2 full weeks × 3 days + 1 day from week 3

    // All instances should have same UID as parent (for proper grouping)
    result.forEach((instance) => {
      expect(instance.uid).toBe(baseEvent.uid) // Same UID as base event
      expect(instance.rrule).toBeUndefined() // No RRULE (identifies as instance)
      expect(instance.recurrenceId).toBeUndefined() // No recurrenceId (not modified)
    })

    // Check first event (original Monday)
    const firstEvent = result[0]
    expect(firstEvent.id).toBe('recurring-1_0')
    expect(firstEvent.title).toBe('Weekly Meeting')

    // Check Wednesday event
    const wednesdayEvent = result[1]
    expect(wednesdayEvent.start.toISOString()).toBe('2025-01-08T09:00:00.000Z')

    // Check Friday event
    const fridayEvent = result[2]
    expect(fridayEvent.start.toISOString()).toBe('2025-01-10T09:00:00.000Z')
  })

  it('should generate UID for parent when missing and use same UID for all instances', () => {
    const eventWithoutUID: CalendarEvent = {
      id: 'recurring-2',
      title: 'Daily Standup',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T09:30:00.000Z'),
      rrule: {
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO, RRule.WE, RRule.FR],
        dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(), // Match event start time
      },
    }

    const result = generateRecurringEvents({
      event: eventWithoutUID,
      currentEvents: [],
      startDate,
      endDate,
    })

    expect(result).toHaveLength(7)

    // All instances should have the same generated UID (not unique per instance)
    const expectedUID = `${eventWithoutUID.id}@ilamy.calendar`
    result.forEach((instance) => {
      expect(instance.uid).toBe(expectedUID) // Same generated UID for all instances
      expect(instance.rrule).toBeUndefined() // No RRULE (identifies as instance)
      expect(instance.recurrenceId).toBeUndefined() // No recurrenceId (not modified)
    })
  })

  it('should handle EXDATE exclusions correctly', () => {
    const eventWithExdates: CalendarEvent = {
      ...baseEvent,
      exdates: ['2025-01-08T09:00:00.000Z'], // Exclude Wednesday Jan 8
    }

    const result = generateRecurringEvents({
      event: eventWithExdates,
      currentEvents: [],
      startDate,
      endDate,
    })

    // Should have 6 events instead of 7 (excluding Jan 8)
    expect(result).toHaveLength(6)

    // Verify Wednesday Jan 8 is not included (check by start time)
    const excludedDate = result.find(
      (event) => event.start.toISOString() === '2025-01-08T09:00:00.000Z'
    )
    expect(excludedDate).toBeUndefined()

    // But Friday Jan 10 should still be there
    const fridayEvent = result.find(
      (event) => event.start.toISOString() === '2025-01-10T09:00:00.000Z'
    )
    expect(fridayEvent).toBeDefined()
  })

  it('should handle daily recurring events', () => {
    const dailyEvent: CalendarEvent = {
      id: 'daily-1',
      uid: 'daily-1@ilamy.calendar',
      title: 'Daily Standup',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T09:30:00.000Z'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(), // Match event start time
      },
      exdates: [],
    }

    const shortRange = dayjs('2025-01-06').startOf('day')
    const shortEnd = dayjs('2025-01-10').endOf('day')
    const result = generateRecurringEvents({
      event: dailyEvent,
      currentEvents: [],
      startDate: shortRange,
      endDate: shortEnd,
    })

    // Should generate 5 daily events (Jan 6-10)
    expect(result).toHaveLength(5)

    result.forEach((event, index) => {
      const expectedDate = dayjs('2025-01-06').add(index, 'day')
      expect(event.recurrenceId).toBeUndefined() // No recurrenceId for unmodified instances
      expect(event.start.toISOString()).toBe(expectedDate.hour(9).toISOString())
      expect(event.end.toISOString()).toBe(
        expectedDate.hour(9).minute(30).toISOString()
      )
    })
  })
})

describe('Monthly and Complex Patterns', () => {
  it('should handle monthly recurring events', () => {
    const monthlyEvent: CalendarEvent = {
      id: 'monthly-1',
      uid: 'monthly-1@ilamy.calendar',
      title: 'Monthly Review',
      start: dayjs('2025-01-06T14:00:00.000Z'),
      end: dayjs('2025-01-06T15:00:00.000Z'),
      rrule: {
        freq: RRule.MONTHLY,
        interval: 1,
        dtstart: dayjs('2025-01-06T14:00:00.000Z').toDate(), // Match event start time
      },
      exdates: [],
    }

    const longRange = dayjs('2025-01-01').startOf('day')
    const longEnd = dayjs('2025-04-30').endOf('day')
    const result = generateRecurringEvents({
      event: monthlyEvent,
      currentEvents: [],
      startDate: longRange,
      endDate: longEnd,
    })

    // Should generate 4 monthly events (Jan, Feb, Mar, Apr)
    expect(result).toHaveLength(4)

    // Check first occurrence (January 6) - no recurrenceId for unmodified instance
    expect(result[0].recurrenceId).toBeUndefined()
    expect(result[0].start.toISOString()).toBe('2025-01-06T14:00:00.000Z')

    // Check second occurrence (February 6)
    expect(result[1].recurrenceId).toBeUndefined()
    expect(result[1].start.toISOString()).toBe('2025-02-06T14:00:00.000Z')

    // Check third occurrence (March 6)
    expect(result[2].recurrenceId).toBeUndefined()
    expect(result[2].start.toISOString()).toBe('2025-03-06T14:00:00.000Z')

    // Check fourth occurrence (April 6)
    expect(result[3].recurrenceId).toBeUndefined()
    expect(result[3].start.toISOString()).toBe('2025-04-06T14:00:00.000Z')
  })

  it('should handle COUNT limits in RRULE', () => {
    const limitedEvent: CalendarEvent = {
      id: 'limited-1',
      uid: 'limited-1@ilamy.calendar',
      title: 'Limited Series',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T10:00:00.000Z'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        count: 3,
        dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(), // Match event start time
      },
      exdates: [],
    }

    const result = generateRecurringEvents({
      event: limitedEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-06').startOf('day'),
      endDate: dayjs('2025-01-20').endOf('day'),
    })

    // Should generate exactly 3 events due to COUNT=3
    expect(result).toHaveLength(3)

    expect(result[0].recurrenceId).toBeUndefined()
    expect(result[0].start.toISOString()).toBe('2025-01-06T09:00:00.000Z')
    expect(result[1].recurrenceId).toBeUndefined()
    expect(result[1].start.toISOString()).toBe('2025-01-07T09:00:00.000Z')
    expect(result[2].recurrenceId).toBeUndefined()
    expect(result[2].start.toISOString()).toBe('2025-01-08T09:00:00.000Z')
  })

  it('should handle UNTIL limits in RRULE', () => {
    const untilEvent: CalendarEvent = {
      id: 'until-1',
      uid: 'until-1@ilamy.calendar',
      title: 'Until Series',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T10:00:00.000Z'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        until: dayjs('2025-01-08T09:00:00.000Z').toDate(),
        dtstart: dayjs('2025-01-06T09:00:00.000Z').toDate(), // Match event start time
      },
      exdates: [],
    }

    const result = generateRecurringEvents({
      event: untilEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-06').startOf('day'),
      endDate: dayjs('2025-01-20').endOf('day'),
    })

    // Should generate events until Jan 8 (inclusive)
    expect(result).toHaveLength(3)

    expect(result[0].recurrenceId).toBeUndefined()
    expect(result[0].start.toISOString()).toBe('2025-01-06T09:00:00.000Z')
    expect(result[1].recurrenceId).toBeUndefined()
    expect(result[1].start.toISOString()).toBe('2025-01-07T09:00:00.000Z')
    expect(result[2].recurrenceId).toBeUndefined()
    expect(result[2].start.toISOString()).toBe('2025-01-08T09:00:00.000Z')
  })

  it('should include events that span through the date range even if they start before it', () => {
    // Long duration event (4 hours) that occurs daily
    const longDurationEvent: CalendarEvent = {
      id: 'long-duration-1',
      uid: 'long-duration-1@ilamy.calendar',
      title: 'Long Meeting',
      start: dayjs('2025-01-06T08:00:00.000Z'), // Starts at 8 AM
      end: dayjs('2025-01-06T12:00:00.000Z'), // Ends at 12 PM (4 hour duration)
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-01-06T08:00:00.000Z').toDate(),
      },
      exdates: [],
    }

    // Query range: 10 AM to 2 PM on a specific day
    // The event starts before the range (8 AM) but spans into it (ends at 12 PM)
    const queryStart = dayjs('2025-01-07T10:00:00.000Z') // 10 AM next day
    const queryEnd = dayjs('2025-01-07T14:00:00.000Z') // 2 PM next day

    const result = generateRecurringEvents({
      event: longDurationEvent,
      currentEvents: [],
      startDate: queryStart,
      endDate: queryEnd,
    })

    // Should include the Jan 7 event that spans through the query range
    expect(result).toHaveLength(1)
    expect(result[0].start.toISOString()).toBe('2025-01-07T08:00:00.000Z')
    expect(result[0].end.toISOString()).toBe('2025-01-07T12:00:00.000Z')
  })

  it('should not include events that end before the date range starts', () => {
    // Short event that ends before our query range
    const shortEvent: CalendarEvent = {
      id: 'short-1',
      uid: 'short-1@ilamy.calendar',
      title: 'Short Meeting',
      start: dayjs('2025-01-06T08:00:00.000Z'), // 8 AM
      end: dayjs('2025-01-06T09:00:00.000Z'), // 9 AM (1 hour duration)
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-01-06T08:00:00.000Z').toDate(),
      },
      exdates: [],
    }

    // Query range: 10 AM to 2 PM
    // The event ends at 9 AM, so it doesn't span into the range
    const queryStart = dayjs('2025-01-07T10:00:00.000Z')
    const queryEnd = dayjs('2025-01-07T14:00:00.000Z')

    const result = generateRecurringEvents({
      event: shortEvent,
      currentEvents: [],
      startDate: queryStart,
      endDate: queryEnd,
    })

    // Should not include any events since they don't span the query range
    expect(result).toHaveLength(0)
  })

  it('should return empty array for events without RRULE', () => {
    const nonRecurringEvent: CalendarEvent = {
      id: 'single-1',
      uid: 'single-1@ilamy.calendar',
      title: 'Single Event',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T10:00:00.000Z'),
      exdates: [],
    }

    const result = generateRecurringEvents({
      event: nonRecurringEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-06').startOf('day'),
      endDate: dayjs('2025-01-20').endOf('day'),
    })
    expect(result).toHaveLength(0)
  })

  it('should handle invalid RRULE options gracefully', () => {
    const malformedEvent: CalendarEvent = {
      id: 'malformed-1',
      uid: 'malformed-1@ilamy.calendar',
      title: 'Invalid RRULE',
      start: dayjs('2025-01-06T09:00:00.000Z'),
      end: dayjs('2025-01-06T10:00:00.000Z'),
      rrule: {
        freq: 'INVALID_FREQUENCY',
      } as unknown as RRuleOptions,
      exdates: [],
    }

    // Should throw an error for invalid RRULE options
    expect(() => {
      generateRecurringEvents({
        event: malformedEvent,
        currentEvents: [],
        startDate: dayjs('2025-01-06').startOf('day'),
        endDate: dayjs('2025-01-20').endOf('day'),
      })
    }).toThrow()
  })
})
