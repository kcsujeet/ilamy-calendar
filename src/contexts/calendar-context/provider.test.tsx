import { describe, it, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { CalendarProvider } from './provider'
import { useCalendarContext } from './context'
import dayjs from '@/lib/dayjs-config'
import type { CalendarEvent } from '@/components/types'

// Test component to access context
function TestComponent() {
  const { events, getEventsForDateRange, findParentRecurringEvent } =
    useCalendarContext()

  // Test on-demand generation for a specific range
  const rangeEvents = getEventsForDateRange(
    dayjs('2025-07-01'),
    dayjs('2025-07-07').endOf('day')
  )

  // Test parent finding for recurring event instances
  const testInstance: CalendarEvent = {
    id: 'test-recurring_1',
    title: 'Daily Meeting Instance',
    start: dayjs('2025-07-02').hour(9),
    end: dayjs('2025-07-02').hour(10),
    recurrenceId: '2025-07-02T09:00:00.000Z',
    uid: 'test-recurring@calendar.test',
  }

  const parentEvent = findParentRecurringEvent(testInstance)

  return (
    <div>
      <div data-testid="total-events">{events.length}</div>
      <div data-testid="range-events">{rangeEvents.length}</div>
      <div data-testid="parent-found">{parentEvent ? 'true' : 'false'}</div>
      <div data-testid="parent-rrule">{parentEvent?.rrule || 'none'}</div>
    </div>
  )
}

describe('CalendarProvider - On-Demand Generation', () => {
  it('should generate recurring events on-demand for current view only', () => {
    const recurringEvent: CalendarEvent = {
      id: 'test-recurring',
      title: 'Daily Meeting',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      rrule: 'FREQ=DAILY;INTERVAL=1',
      uid: 'test-recurring@calendar.test',
    }

    const { getByTestId } = render(
      <CalendarProvider events={[recurringEvent]} dayMaxEvents={3}>
        <TestComponent />
      </CalendarProvider>
    )

    // Should generate events for the current view range (7 days from July 1-7)
    const rangeEventsCount = Number.parseInt(
      getByTestId('range-events').textContent || '0'
    )
    expect(rangeEventsCount).toBe(7)
  })

  it('should handle non-recurring events efficiently', () => {
    const nonRecurringEvent: CalendarEvent = {
      id: 'test-single',
      title: 'One-time Meeting',
      start: dayjs('2025-07-03').hour(9),
      end: dayjs('2025-07-03').hour(10),
    }

    const { getByTestId } = render(
      <CalendarProvider events={[nonRecurringEvent]} dayMaxEvents={3}>
        <TestComponent />
      </CalendarProvider>
    )

    // Should include the single event in range
    const rangeEventsCount = Number.parseInt(
      getByTestId('range-events').textContent || '0'
    )
    expect(rangeEventsCount).toBe(1)
  })

  it('should exclude events with EXDATE exclusions', () => {
    const recurringEventWithExdates: CalendarEvent = {
      id: 'test-excluded',
      title: 'Meeting with Exclusions',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      rrule: 'FREQ=DAILY;INTERVAL=1',
      uid: 'test-excluded@calendar.test',
      exdates: [
        '2025-07-01T09:00:00.000Z',
        '2025-07-02T09:00:00.000Z',
        '2025-07-03T09:00:00.000Z',
        '2025-07-04T09:00:00.000Z',
        '2025-07-05T09:00:00.000Z',
        '2025-07-06T09:00:00.000Z',
        '2025-07-07T09:00:00.000Z',
      ], // Exclude all dates in range
    }

    const { getByTestId } = render(
      <CalendarProvider events={[recurringEventWithExdates]} dayMaxEvents={3}>
        <TestComponent />
      </CalendarProvider>
    )

    // Should not generate any events for excluded dates
    const rangeEventsCount = Number.parseInt(
      getByTestId('range-events').textContent || '0'
    )
    expect(rangeEventsCount).toBe(0)
  })
})

describe('CalendarProvider - findParentRecurringEvent', () => {
  it('should find parent event for recurring event instance', () => {
    const parentEvent: CalendarEvent = {
      id: 'test-recurring',
      title: 'Daily Meeting',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      rrule: 'FREQ=DAILY;INTERVAL=1',
      uid: 'test-recurring@calendar.test',
    }

    const { getByTestId } = render(
      <CalendarProvider events={[parentEvent]} dayMaxEvents={3}>
        <TestComponent />
      </CalendarProvider>
    )

    expect(getByTestId('parent-found').textContent).toBe('true')
    expect(getByTestId('parent-rrule').textContent).toBe(
      'FREQ=DAILY;INTERVAL=1'
    )
  })

  it('should return null for non-recurring event instance', () => {
    const nonRecurringEvent: CalendarEvent = {
      id: 'test-single',
      title: 'One-time Meeting',
      start: dayjs('2025-07-03').hour(9),
      end: dayjs('2025-07-03').hour(10),
    }

    // Create a standalone instance without parent
    const standaloneInstance: CalendarEvent = {
      id: 'standalone-instance',
      title: 'Standalone Instance',
      start: dayjs('2025-07-04').hour(9),
      end: dayjs('2025-07-04').hour(10),
      recurrenceId: '2025-07-04T09:00:00.000Z',
      uid: 'orphan@calendar.test', // No matching parent UID
    }

    function TestStandalone() {
      const { findParentRecurringEvent } = useCalendarContext()
      const parentEvent = findParentRecurringEvent(standaloneInstance)

      return (
        <div>
          <div data-testid="standalone-parent-found">
            {parentEvent ? 'true' : 'false'}
          </div>
        </div>
      )
    }

    const { getByTestId } = render(
      <CalendarProvider events={[nonRecurringEvent]} dayMaxEvents={3}>
        <TestStandalone />
      </CalendarProvider>
    )

    expect(getByTestId('standalone-parent-found').textContent).toBe('false')
  })

  it('should handle missing UID by generating UID from id', () => {
    const parentEvent: CalendarEvent = {
      id: 'test-recurring',
      title: 'Daily Meeting',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      rrule: 'FREQ=DAILY;INTERVAL=1',
      // No UID - should auto-generate
    }

    const instanceWithoutUID: CalendarEvent = {
      id: 'test-recurring_1',
      title: 'Daily Meeting Instance',
      start: dayjs('2025-07-02').hour(9),
      end: dayjs('2025-07-02').hour(10),
      recurrenceId: '2025-07-02T09:00:00.000Z',
      // No UID - should auto-generate and match parent
    }

    function TestUIDGeneration() {
      const { findParentRecurringEvent } = useCalendarContext()
      const parentEvent = findParentRecurringEvent(instanceWithoutUID)

      return (
        <div>
          <div data-testid="uid-match-found">
            {parentEvent ? 'true' : 'false'}
          </div>
          <div data-testid="uid-match-rrule">
            {parentEvent?.rrule || 'none'}
          </div>
        </div>
      )
    }

    const { getByTestId } = render(
      <CalendarProvider events={[parentEvent]} dayMaxEvents={3}>
        <TestUIDGeneration />
      </CalendarProvider>
    )

    expect(getByTestId('uid-match-found').textContent).toBe('true')
    expect(getByTestId('uid-match-rrule').textContent).toBe(
      'FREQ=DAILY;INTERVAL=1'
    )
  })

  it('should not create duplicate events when recurring events are modified', () => {
    // Create a base recurring event
    const baseEvent: CalendarEvent = {
      id: 'daily-standup',
      title: 'Daily Standup',
      start: dayjs('2025-01-01T09:00:00'),
      end: dayjs('2025-01-01T09:30:00'),
      rrule: 'FREQ=DAILY',
      uid: 'daily-standup@calendar',
    }

    // Create a modified instance (what gets created when user drags/edits an occurrence)
    const modifiedInstance: CalendarEvent = {
      id: 'daily-standup_modified_123',
      title: 'Daily Standup',
      start: dayjs('2025-01-03T10:00:00'), // Moved to different time
      end: dayjs('2025-01-03T10:30:00'),
      recurrenceId: '2025-01-03T09:00:00.000Z', // Original occurrence time
      uid: 'daily-standup@calendar', // Same UID as base
    }

    // Update base event with EXDATE to exclude the modified occurrence
    const baseEventWithExdate: CalendarEvent = {
      ...baseEvent,
      exdates: ['2025-01-03T09:00:00.000Z'],
    }

    const events = [baseEventWithExdate, modifiedInstance]

    function TestNoDuplicates() {
      const { getEventsForDateRange } = useCalendarContext()

      // Get events for a range that includes the modified date
      const rangeEvents = getEventsForDateRange(
        dayjs('2025-01-01'),
        dayjs('2025-01-05')
      )

      // Count events on the modified date (Jan 3rd)
      const jan3Events = rangeEvents.filter((event) =>
        event.start.isSame(dayjs('2025-01-03'), 'day')
      )

      return (
        <div>
          <div data-testid="jan3-event-count">{jan3Events.length}</div>
          <div data-testid="jan3-event-hour">
            {jan3Events[0]?.start.hour() || 'none'}
          </div>
          <div data-testid="jan3-event-id">{jan3Events[0]?.id || 'none'}</div>
        </div>
      )
    }

    const { getByTestId } = render(
      <CalendarProvider events={events} dayMaxEvents={5} firstDayOfWeek={0}>
        <TestNoDuplicates />
      </CalendarProvider>
    )

    // Should only have 1 event on Jan 3rd (the modified one), not 2
    expect(getByTestId('jan3-event-count').textContent).toBe('1')
    expect(getByTestId('jan3-event-hour').textContent).toBe('10') // Should be the modified time (10:00), not original (09:00)
    expect(getByTestId('jan3-event-id').textContent).toBe(
      'daily-standup_modified_123'
    )
  })
})
