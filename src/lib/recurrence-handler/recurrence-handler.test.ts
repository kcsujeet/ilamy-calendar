import { describe, it, expect } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import type { CalendarEvent } from '@/components'
import {
  generateRecurringEvents,
  updateRecurringEvent,
  deleteRecurringEvent,
  isRecurringEvent,
} from './index'

// Test helper to create a base recurring event
const createBaseRecurringEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id: 'recurring-1',
  title: 'Weekly Meeting',
  start: dayjs('2025-01-06T09:00:00'),
  end: dayjs('2025-01-06T10:00:00'),
  rrule: 'FREQ=WEEKLY;BYDAY=MO',
  uid: 'recurring-1@calendar.test',
  ...overrides,
})

// Test helper to create a target event instance
const createTargetEvent = (
  overrides: Partial<CalendarEvent> = {}
): CalendarEvent => ({
  id: 'recurring-1_2',
  title: 'Weekly Meeting',
  start: dayjs('2025-01-20T09:00:00'),
  end: dayjs('2025-01-20T10:00:00'),
  uid: 'recurring-1@calendar.test',
  ...overrides,
})

describe('isRecurringEvent', () => {
  it('should identify events with rrule as recurring', () => {
    const event = createBaseRecurringEvent()
    expect(isRecurringEvent(event)).toBeTruthy()
  })

  it('should identify events with recurrenceId as recurring', () => {
    const event = createTargetEvent({
      recurrenceId: '2025-01-20T09:00:00.000Z',
    })
    expect(isRecurringEvent(event)).toBeTruthy()
  })

  it('should not identify regular events as recurring', () => {
    const event = {
      ...createBaseRecurringEvent(),
      rrule: undefined,
      recurrenceId: undefined,
      uid: undefined,
    }
    expect(isRecurringEvent(event)).toBeFalsy()
  })
})

describe('generateRecurringEvents', () => {
  it('should generate weekly recurring events correctly', () => {
    const baseEvent = createBaseRecurringEvent()
    const startDate = dayjs('2025-01-01')
    const endDate = dayjs('2025-01-31')

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate,
      endDate,
    })

    expect(result).toHaveLength(4) // 4 Mondays in January 2025
    expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
    expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-13')
    expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-20')
    expect(result[3].start.format('YYYY-MM-DD')).toBe('2025-01-27')

    // Each instance should have unique ID and no rrule
    result.forEach((event, index) => {
      expect(event.id).toBe(`recurring-1_${index}`)
      expect(event.rrule).toBeUndefined()
      expect(event.uid).toBe('recurring-1@calendar.test')
    })
  })

  it('should exclude EXDATE events correctly', () => {
    const baseEvent = createBaseRecurringEvent({
      exdates: ['2025-01-13T09:00:00.000Z', '2025-01-27T09:00:00.000Z'],
    })
    const startDate = dayjs('2025-01-01')
    const endDate = dayjs('2025-01-31')

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate,
      endDate,
    })

    expect(result).toHaveLength(2) // 4 Mondays - 2 excluded = 2
    expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
    expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-20')
  })

  it('should handle overrides correctly', () => {
    const baseEvent = createBaseRecurringEvent()
    const overrideEvent: CalendarEvent = {
      ...createTargetEvent(),
      recurrenceId: '2025-01-13T09:00:00.000Z',
      title: 'Modified Meeting',
      start: dayjs('2025-01-13T14:00:00'),
      end: dayjs('2025-01-13T15:00:00'),
    }

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [overrideEvent],
      startDate: dayjs('2025-01-01'),
      endDate: dayjs('2025-01-31'),
    })

    expect(result).toHaveLength(4)

    // Find the overridden event
    const modifiedEvent = result.find((e) =>
      e.start.isSame(dayjs('2025-01-13T14:00:00'))
    )
    expect(modifiedEvent).toBeDefined()
    expect(modifiedEvent?.title).toBe('Modified Meeting')
  })

  it('should return empty array for non-recurring events', () => {
    const regularEvent = { ...createBaseRecurringEvent(), rrule: undefined }

    const result = generateRecurringEvents({
      event: regularEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-01'),
      endDate: dayjs('2025-01-31'),
    })

    expect(result).toHaveLength(0)
  })

  it('should throw error for invalid RRULE strings', () => {
    const invalidEvent = createBaseRecurringEvent({ rrule: 'INVALID_RRULE' })

    expect(() => {
      generateRecurringEvents({
        event: invalidEvent,
        currentEvents: [],
        startDate: dayjs('2025-01-01'),
        endDate: dayjs('2025-01-31'),
      })
    }).toThrow('Invalid RRULE string')
  })
})

describe('updateRecurringEvent', () => {
  describe('scope: "this"', () => {
    it('should update only the target event instance', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]
      const updates = {
        title: 'Modified Meeting',
        start: dayjs('2025-01-20T14:00:00'),
      }

      const result = updateRecurringEvent({
        targetEvent,
        updates,
        currentEvents,
        scope: 'this',
      })

      expect(result).toHaveLength(2) // base event + modified standalone event

      // Base event should have EXDATE
      const updatedBaseEvent = result.find((e) => e.id === baseEvent.id)
      expect(updatedBaseEvent?.exdates).toHaveLength(1)
      expect(updatedBaseEvent?.exdates).toContain('2025-01-20T09:00:00.000Z')

      // Should have new standalone modified event
      const modifiedEvent = result.find((e) => e.id !== baseEvent.id)
      expect(modifiedEvent?.title).toBe('Modified Meeting')
      expect(modifiedEvent?.recurrenceId).toBe('2025-01-20T09:00:00.000Z')
      expect(modifiedEvent?.uid).toBe(baseEvent.uid)
      expect(modifiedEvent?.rrule).toBeUndefined()
    })

    it('should preserve existing EXDATES when adding new one', () => {
      const baseEvent = createBaseRecurringEvent({
        exdates: ['2025-01-13T09:00:00.000Z'],
      })
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = updateRecurringEvent({
        targetEvent,
        updates: { title: 'Modified' },
        currentEvents,
        scope: 'this',
      })

      const updatedBaseEvent = result.find((e) => e.id === baseEvent.id)
      expect(updatedBaseEvent?.exdates).toHaveLength(2)
      expect(updatedBaseEvent?.exdates).toContain('2025-01-13T09:00:00.000Z')
      expect(updatedBaseEvent?.exdates).toContain('2025-01-20T09:00:00.000Z')
    })
  })

  describe('scope: "following"', () => {
    it('should terminate original series and create new series', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]
      const updates = {
        title: 'Modified Series',
        start: dayjs('2025-01-20T14:00:00'),
      }

      const result = updateRecurringEvent({
        targetEvent,
        updates,
        currentEvents,
        scope: 'following',
      })

      expect(result).toHaveLength(2) // terminated original + new series

      // Original series should be terminated with UNTIL
      const terminatedEvent = result.find((e) => e.id === baseEvent.id)
      expect(terminatedEvent?.rrule).toContain('UNTIL=20250119T')

      // New series should start from target date
      const newSeries = result.find((e) => e.id !== baseEvent.id)
      expect(newSeries?.title).toBe('Modified Series')
      expect(newSeries?.start.isSame(dayjs('2025-01-20T14:00:00'))).toEqual(
        true
      )
      expect(newSeries?.uid).toBe('recurring-1@calendar.test_following')
      expect(newSeries?.recurrenceId).toBeUndefined()
    })

    it('should handle edge case when target is first occurrence', () => {
      const baseEvent = createBaseRecurringEvent()
      const firstOccurrence = {
        ...createTargetEvent(),
        start: dayjs('2025-01-06T09:00:00'),
      }
      const currentEvents = [baseEvent]

      const result = updateRecurringEvent({
        targetEvent: firstOccurrence,
        updates: { title: 'New Series' },
        currentEvents,
        scope: 'following',
      })

      expect(result).toHaveLength(2)

      // Original should terminate before first occurrence (effectively making it empty)
      const terminatedEvent = result.find((e) => e.id === baseEvent.id)
      expect(terminatedEvent?.rrule).toContain('UNTIL=20250105T')
    })
  })

  describe('scope: "all"', () => {
    it('should update the base recurring event', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]
      const updates = { title: 'Updated All Events', rrule: 'FREQ=DAILY' }

      const result = updateRecurringEvent({
        targetEvent,
        updates,
        currentEvents,
        scope: 'all',
      })

      expect(result).toHaveLength(1)

      const updatedEvent = result[0]
      expect(updatedEvent.title).toBe('Updated All Events')
      expect(updatedEvent.rrule).toBe('FREQ=DAILY')
      expect(updatedEvent.id).toBe(baseEvent.id)
    })

    it('should preserve other events in the array', () => {
      const baseEvent = createBaseRecurringEvent()
      const otherEvent = createBaseRecurringEvent({
        id: 'other-event',
        uid: 'other@test',
      })
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent, otherEvent]

      const result = updateRecurringEvent({
        targetEvent,
        updates: { title: 'Updated' },
        currentEvents,
        scope: 'all',
      })

      expect(result).toHaveLength(2)
      expect(result.find((e) => e.id === 'other-event')).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should throw error when base recurring event not found', () => {
      const targetEvent = createTargetEvent()
      const currentEvents: CalendarEvent[] = []

      expect(() => {
        updateRecurringEvent({
          targetEvent,
          updates: { title: 'Test' },
          currentEvents,
          scope: 'this',
        })
      }).toThrow('Base recurring event not found')
    })

    it('should throw error for invalid scope', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      expect(() => {
        updateRecurringEvent({
          targetEvent,
          updates: { title: 'Test' },
          currentEvents,
          scope: 'invalid' as unknown as 'this',
        })
      }).toThrow(
        "Invalid scope: invalid. Must be 'this', 'following', or 'all'"
      )
    })
  })
})

describe('deleteRecurringEvent', () => {
  describe('scope: "this"', () => {
    it('should add EXDATE to exclude only target occurrence', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'this',
      })

      expect(result).toHaveLength(1)

      const updatedEvent = result[0]
      expect(updatedEvent.exdates).toHaveLength(1)
      expect(updatedEvent.exdates).toContain('2025-01-20T09:00:00.000Z')
      expect(updatedEvent.id).toBe(baseEvent.id)
    })

    it('should preserve existing EXDATES when adding new exclusion', () => {
      const baseEvent = createBaseRecurringEvent({
        exdates: ['2025-01-13T09:00:00.000Z', '2025-01-27T09:00:00.000Z'],
      })
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'this',
      })

      const updatedEvent = result[0]
      expect(updatedEvent.exdates).toHaveLength(3)
      expect(updatedEvent.exdates).toContain('2025-01-13T09:00:00.000Z')
      expect(updatedEvent.exdates).toContain('2025-01-27T09:00:00.000Z')
      expect(updatedEvent.exdates).toContain('2025-01-20T09:00:00.000Z')
    })
  })

  describe('scope: "following"', () => {
    it('should terminate series with UNTIL before target date', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'following',
      })

      expect(result).toHaveLength(1)

      const terminatedEvent = result[0]
      expect(terminatedEvent.rrule).toBe(
        'FREQ=WEEKLY;BYDAY=MO;UNTIL=20250119T090000Z'
      )
      expect(terminatedEvent.id).toBe(baseEvent.id)
    })

    it('should handle deletion from first occurrence correctly', () => {
      const baseEvent = createBaseRecurringEvent()
      const firstOccurrence = {
        ...createTargetEvent(),
        start: dayjs('2025-01-06T09:00:00'),
      }
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent: firstOccurrence,
        currentEvents,
        scope: 'following',
      })

      const terminatedEvent = result[0]
      expect(terminatedEvent.rrule).toContain('UNTIL=20250105T')
    })

    it('should handle existing UNTIL in RRULE correctly', () => {
      const baseEvent = createBaseRecurringEvent({
        rrule: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20251231T000000Z',
      })
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'following',
      })

      const terminatedEvent = result[0]
      // Should replace existing UNTIL with earlier termination date
      expect(terminatedEvent.rrule).toBe(
        'FREQ=WEEKLY;BYDAY=MO;UNTIL=20251231T000000Z;UNTIL=20250119T090000Z'
      )
    })
  })

  describe('scope: "all"', () => {
    it('should remove entire recurring series', () => {
      const baseEvent = createBaseRecurringEvent()
      const otherEvent = createBaseRecurringEvent({
        id: 'other',
        uid: 'other@test',
      })
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent, otherEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'all',
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('other')
      expect(
        result.find((e) => e.uid === 'recurring-1@calendar.test')
      ).toBeUndefined()
    })

    it('should handle empty result when only target series exists', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'all',
      })

      expect(result).toHaveLength(0)
    })

    it('should remove all events with same UID including overrides', () => {
      const baseEvent = createBaseRecurringEvent()
      const override1 = {
        ...createTargetEvent(),
        id: 'override1',
        recurrenceId: '2025-01-13T09:00:00.000Z',
      }
      const override2 = {
        ...createTargetEvent(),
        id: 'override2',
        recurrenceId: '2025-01-20T09:00:00.000Z',
      }
      const otherEvent = createBaseRecurringEvent({
        id: 'other',
        uid: 'other@test',
      })
      const currentEvents = [baseEvent, override1, override2, otherEvent]
      const targetEvent = createTargetEvent()

      const result = deleteRecurringEvent({
        targetEvent,
        currentEvents,
        scope: 'all',
      })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('other')
    })
  })

  describe('error handling', () => {
    it('should throw error when base recurring event not found', () => {
      const targetEvent = createTargetEvent()
      const currentEvents: CalendarEvent[] = []

      expect(() => {
        deleteRecurringEvent({
          targetEvent,
          currentEvents,
          scope: 'this',
        })
      }).toThrow('Base recurring event not found')
    })

    it('should throw error for invalid scope', () => {
      const baseEvent = createBaseRecurringEvent()
      const targetEvent = createTargetEvent()
      const currentEvents = [baseEvent]

      expect(() => {
        deleteRecurringEvent({
          targetEvent,
          currentEvents,
          scope: 'invalid' as unknown as 'this',
        })
      }).toThrow(
        "Invalid scope: invalid. Must be 'this', 'following', or 'all'"
      )
    })
  })
})

describe('Edge cases and stress tests', () => {
  it('should handle complex RRULE with COUNT limit', () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: 'FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10',
    })

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-01'),
      endDate: dayjs('2025-02-28'),
    })

    expect(result).toHaveLength(10)
  })

  it('should handle daily recurring event with interval', () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: 'FREQ=DAILY;INTERVAL=3',
    })

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-06'),
      endDate: dayjs('2025-01-20'),
    })

    expect(result).toHaveLength(5) // Every 3 days: 6, 9, 12, 15, 18
    expect(result[0].start.format('YYYY-MM-DD')).toBe('2025-01-06')
    expect(result[1].start.format('YYYY-MM-DD')).toBe('2025-01-09')
    expect(result[2].start.format('YYYY-MM-DD')).toBe('2025-01-12')
  })

  it('should handle monthly recurring event', () => {
    const baseEvent = createBaseRecurringEvent({
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
    })

    const result = generateRecurringEvents({
      event: baseEvent,
      currentEvents: [],
      startDate: dayjs('2025-01-01'),
      endDate: dayjs('2025-06-30'),
    })

    expect(result).toHaveLength(6) // Jan 15, Feb 15, Mar 15, Apr 15, May 15, Jun 15
  })

  it('should handle updating and then deleting same event', () => {
    const baseEvent = createBaseRecurringEvent()
    const targetEvent = createTargetEvent()
    let currentEvents = [baseEvent]

    // First update "this" event
    currentEvents = updateRecurringEvent({
      targetEvent,
      updates: { title: 'Modified' },
      currentEvents,
      scope: 'this',
    })

    expect(currentEvents).toHaveLength(2) // base + modified

    // Then delete the same occurrence
    const finalResult = deleteRecurringEvent({
      targetEvent,
      currentEvents,
      scope: 'this',
    })

    // Should have base event with 2 EXDATES (one from update, one from delete)
    const baseEventResult = finalResult.find((e) => e.rrule)
    expect(baseEventResult?.exdates).toHaveLength(2)
    expect(
      baseEventResult?.exdates?.filter((d) => d === '2025-01-20T09:00:00.000Z')
    ).toHaveLength(2)
  })

  it('should handle multiple "following" updates creating series chain', () => {
    const baseEvent = createBaseRecurringEvent()
    let currentEvents = [baseEvent]

    // Update "following" from first occurrence
    const firstTarget = {
      ...createTargetEvent(),
      start: dayjs('2025-01-06T09:00:00'),
    }
    currentEvents = updateRecurringEvent({
      targetEvent: firstTarget,
      updates: { title: 'First Split' },
      currentEvents,
      scope: 'following',
    })

    expect(currentEvents).toHaveLength(2) // terminated original + new series

    // Update "following" from later occurrence in new series
    const secondTarget = {
      ...createTargetEvent(),
      start: dayjs('2025-01-20T09:00:00'),
      uid: 'recurring-1@calendar.test_following',
    }
    currentEvents = updateRecurringEvent({
      targetEvent: secondTarget,
      updates: { title: 'Second Split' },
      currentEvents,
      scope: 'following',
    })

    expect(currentEvents).toHaveLength(3) // original terminated + first series terminated + second series
  })

  it('should preserve duration when creating new series in "following" scope', () => {
    const baseEvent = createBaseRecurringEvent({
      start: dayjs('2025-01-06T09:00:00'),
      end: dayjs('2025-01-06T11:30:00'), // 2.5 hour duration
    })
    const targetEvent = {
      ...createTargetEvent(),
      start: dayjs('2025-01-20T09:00:00'),
      end: dayjs('2025-01-20T11:30:00'),
    }

    const result = updateRecurringEvent({
      targetEvent,
      updates: { start: dayjs('2025-01-20T14:00:00') }, // Change start time
      currentEvents: [baseEvent],
      scope: 'following',
    })

    const newSeries = result.find((e) => e.uid?.includes('_following'))
    expect(newSeries?.start.format('HH:mm')).toBe('14:00')
    expect(newSeries?.end.format('HH:mm')).toBe('16:30') // Should preserve 2.5 hour duration
  })
})
