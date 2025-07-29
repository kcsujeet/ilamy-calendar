import { describe, it, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { CalendarProvider } from './provider'
import { useCalendarContext } from './context'
import dayjs from '@/lib/dayjs-config'
import type { CalendarEvent } from '@/components/types'

// Test component to access context
function TestComponent() {
  const { events, getEventsForDateRange } = useCalendarContext()

  // Test on-demand generation for a specific range
  const rangeEvents = getEventsForDateRange(
    dayjs('2025-07-01'),
    dayjs('2025-07-07')
  )

  return (
    <div>
      <div data-testid="total-events">{events.length}</div>
      <div data-testid="range-events">{rangeEvents.length}</div>
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
      recurrence: {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
      },
    }

    const { getByTestId } = render(
      <CalendarProvider events={[recurringEvent]} dayMaxEvents={3}>
        <TestComponent />
      </CalendarProvider>
    )

    // Should generate events for the current view range (7 days)
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

  it('should exclude events with "all" type exceptions', () => {
    const recurringEventWithAllException: CalendarEvent = {
      id: 'test-excluded',
      title: 'Cancelled Series',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      recurrence: {
        frequency: 'daily',
        interval: 1,
        endType: 'never',
        exceptions: [
          {
            date: dayjs('2025-07-01'),
            type: 'all',
            createdAt: dayjs('2025-07-01'),
          },
        ],
      },
    }

    const { getByTestId } = render(
      <CalendarProvider
        events={[recurringEventWithAllException]}
        dayMaxEvents={3}
      >
        <TestComponent />
      </CalendarProvider>
    )

    // Should not generate any events for excluded series
    const rangeEventsCount = Number.parseInt(
      getByTestId('range-events').textContent || '0'
    )
    expect(rangeEventsCount).toBe(0)
  })
})
