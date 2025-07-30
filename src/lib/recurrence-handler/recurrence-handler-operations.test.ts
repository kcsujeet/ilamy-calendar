import { describe, expect, it } from 'bun:test'
import dayjs from '@/lib/dayjs-config'
import { RecurrenceHandler } from '@/lib/recurrence-handler/recurrence-handler'
import type { CalendarEvent } from '@/components/types'

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
      exceptions: [],
      updates: [],
    },
  }

  describe('updateRecurringEvent', () => {
    describe('scope: "this"', () => {
      it('should store an update for a single instance when scope is "this"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }
        const newEventData = {
          title: 'Updated Daily Standup',
          start: dayjs('2025-01-07T10:00:00'),
          end: dayjs('2025-01-07T10:30:00'),
        }

        const result = RecurrenceHandler.updateRecurringEvent(
          events,
          targetEvent,
          newEventData,
          {
            scope: 'this',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return the base event with an update stored
        expect(result).toHaveLength(1)

        const baseEventWithUpdate = result[0]
        expect(baseEventWithUpdate.recurrence?.updates).toHaveLength(1)

        const update = baseEventWithUpdate.recurrence?.updates?.[0]
        expect(update?.type).toBe('this')
        expect(update?.date.toISOString()).toBe('2025-01-07T09:00:00.000Z')
        expect(update?.updates.title).toBe('Updated Daily Standup')
        expect(update?.updates.start?.toISOString()).toBe(
          '2025-01-07T10:00:00.000Z'
        )
        expect(update?.updates.end?.toISOString()).toBe(
          '2025-01-07T10:30:00.000Z'
        )

        // Generate instances to verify the update is applied
        const startDate = dayjs('2025-01-06')
        const endDate = dayjs('2025-01-08')
        const instances = RecurrenceHandler.generateRecurringEvents(
          baseEventWithUpdate,
          startDate,
          endDate
        )

        expect(instances).toHaveLength(3) // 3 days of events

        // First instance (Jan 6) should be unchanged
        const jan6Instance = instances.find(
          (e) => dayjs(e.start).format('YYYY-MM-DD') === '2025-01-06'
        )
        expect(jan6Instance?.title).toBe('Daily Standup')
        expect(jan6Instance?.start.toISOString()).toBe(
          '2025-01-06T09:00:00.000Z'
        )

        // Second instance (Jan 7) should be updated
        const jan7Instance = instances.find(
          (e) => dayjs(e.start).format('YYYY-MM-DD') === '2025-01-07'
        )
        expect(jan7Instance?.title).toBe('Updated Daily Standup')
        expect(jan7Instance?.start.toISOString()).toBe(
          '2025-01-07T10:00:00.000Z'
        )
        expect(jan7Instance?.end.toISOString()).toBe('2025-01-07T10:30:00.000Z')
        expect(jan7Instance?.isModified).toBe(true)

        // Third instance (Jan 8) should be unchanged
        const jan8Instance = instances.find(
          (e) => dayjs(e.start).format('YYYY-MM-DD') === '2025-01-08'
        )
        expect(jan8Instance?.title).toBe('Daily Standup')
        expect(jan8Instance?.start.toISOString()).toBe(
          '2025-01-08T09:00:00.000Z'
        )
      })
    })

    describe('scope: "following"', () => {
      it('should create new series and terminate original when scope is "following"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }
        const newEventData = {
          title: 'Updated Following Standups',
          start: dayjs('2025-01-07T10:00:00'),
          end: dayjs('2025-01-07T10:30:00'),
        }

        const result = RecurrenceHandler.updateRecurringEvent(
          events,
          targetEvent,
          newEventData,
          {
            scope: 'following',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return 2 events: original with modified end date + new series
        expect(result).toHaveLength(2)

        const originalEvent = result.find((e) => e.id === 'recurring-event')
        const newSeries = result.find((e) => String(e.id).includes('following'))

        expect(originalEvent).toBeDefined()
        expect(newSeries).toBeDefined()

        // Original should be terminated before the target date (no exceptions needed)
        // The recurrence pattern should be modified to end before Jan 7
        expect(originalEvent?.recurrence?.endType).toBe('on')
        expect(
          originalEvent?.recurrence?.endDate?.isBefore(dayjs('2025-01-07'))
        ).toBe(true)

        // New series should have updated data and new start date
        expect(newSeries?.title).toBe('Updated Following Standups')
        expect(newSeries?.start.toISOString()).toBe('2025-01-07T10:00:00.000Z')
        expect(newSeries?.end.toISOString()).toBe('2025-01-07T10:30:00.000Z')

        // New series should have its own recurrence pattern starting from Jan 7
        expect(newSeries?.recurrence?.frequency).toBe('daily')
        expect(newSeries?.recurrence?.interval).toBe(1)
      })
    })

    describe('scope: "all"', () => {
      it('should update the base event when scope is "all"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }
        const newEventData = {
          title: 'Updated All Standups',
          start: dayjs('2025-01-06T10:00:00'),
          end: dayjs('2025-01-06T10:30:00'),
        }

        const result = RecurrenceHandler.updateRecurringEvent(
          events,
          targetEvent,
          newEventData,
          {
            scope: 'all',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return 1 event with updated base properties
        expect(result).toHaveLength(1)

        const updatedEvent = result[0]
        expect(updatedEvent.title).toBe('Updated All Standups')
        expect(updatedEvent.start.toISOString()).toBe(
          '2025-01-06T10:00:00.000Z'
        )
        expect(updatedEvent.end.toISOString()).toBe('2025-01-06T10:30:00.000Z')
      })
    })
  })

  describe('deleteRecurringEvent', () => {
    describe('scope: "this"', () => {
      it('should add a "this" exception when scope is "this"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }

        const result = RecurrenceHandler.deleteRecurringEvent(
          events,
          targetEvent,
          {
            scope: 'this',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return the base event with an exception
        expect(result).toHaveLength(1)

        const baseEventWithException = result[0]
        expect(baseEventWithException.recurrence?.exceptions).toHaveLength(1)
        expect(baseEventWithException.recurrence?.exceptions?.[0].type).toBe(
          'this'
        )
        expect(
          baseEventWithException.recurrence?.exceptions?.[0].date.toISOString()
        ).toBe('2025-01-07T09:00:00.000Z')

        // Generate instances to verify deletion
        const startDate = dayjs('2025-01-06')
        const endDate = dayjs('2025-01-08')
        const instances = RecurrenceHandler.generateRecurringEvents(
          baseEventWithException,
          startDate,
          endDate
        )
        expect(instances).toHaveLength(2) // Should exclude Jan 7 instance

        const dates = instances.map((e) => dayjs(e.start).format('YYYY-MM-DD'))
        expect(dates).toEqual(['2025-01-06', '2025-01-08'])
      })
    })

    describe('scope: "following"', () => {
      it('should add a "following" exception when scope is "following"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }

        const result = RecurrenceHandler.deleteRecurringEvent(
          events,
          targetEvent,
          {
            scope: 'following',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return the base event with an exception
        expect(result).toHaveLength(1)

        const baseEventWithException = result[0]
        expect(baseEventWithException.recurrence?.exceptions).toHaveLength(1)
        expect(baseEventWithException.recurrence?.exceptions?.[0].type).toBe(
          'following'
        )
        expect(
          baseEventWithException.recurrence?.exceptions?.[0].date.toISOString()
        ).toBe('2025-01-07T09:00:00.000Z')

        // Generate instances to verify deletion
        const startDate = dayjs('2025-01-06')
        const endDate = dayjs('2025-01-10')
        const instances = RecurrenceHandler.generateRecurringEvents(
          baseEventWithException,
          startDate,
          endDate
        )
        expect(instances).toHaveLength(1) // Should only have Jan 6 instance

        const dates = instances.map((e) => dayjs(e.start).format('YYYY-MM-DD'))
        expect(dates).toEqual(['2025-01-06'])
      })
    })

    describe('scope: "all"', () => {
      it('should add an "all" exception when scope is "all"', () => {
        const events = [baseEvent]
        const targetEvent = { ...baseEvent }

        const result = RecurrenceHandler.deleteRecurringEvent(
          events,
          targetEvent,
          {
            scope: 'all',
            eventDate: dayjs('2025-01-07T09:00:00'),
          }
        )

        // Should return the base event with an exception
        expect(result).toHaveLength(1)

        const baseEventWithException = result[0]
        expect(baseEventWithException.recurrence?.exceptions).toHaveLength(1)
        expect(baseEventWithException.recurrence?.exceptions?.[0].type).toBe(
          'all'
        )

        // Generate instances to verify deletion
        const startDate = dayjs('2025-01-06')
        const endDate = dayjs('2025-01-10')
        const instances = RecurrenceHandler.generateRecurringEvents(
          baseEventWithException,
          startDate,
          endDate
        )
        expect(instances).toHaveLength(0) // All instances should be excluded
      })
    })
  })
})
