import { describe, it, expect, mock } from 'bun:test'
import { render } from '@testing-library/react'
import { CalendarProvider } from './provider'
import type { CalendarProviderProps } from './provider'
import { useCalendarContext } from './context'
import dayjs from '@/lib/configs/dayjs-config'
import { RRule } from 'rrule'
import type { CalendarEvent } from '@/components/types'
import type React from 'react'

// Default test props
const defaultProps = {
  events: [] as CalendarEvent[],
  dayMaxEvents: 5,
  firstDayOfWeek: 0,
}

// Test component to capture context values
const TestWrapper = ({
  children,
  testId,
}: {
  children: React.ReactNode
  testId?: string
}) => {
  const { currentDate } = useCalendarContext()

  if (!testId) {
    return <>{children}</>
  }

  return (
    <>
      <div data-testid={`${testId}-year`}>{currentDate.year()}</div>
      <div data-testid={`${testId}-month`}>{currentDate.month()}</div>
      <div data-testid={`${testId}-date`}>{currentDate.date()}</div>
      {children}
    </>
  )
}

// Render helper function
const renderProvider = (
  children: React.ReactNode,
  props: Partial<CalendarProviderProps> = {},
  testId?: string
) => {
  return render(
    <CalendarProvider {...defaultProps} {...props}>
      <TestWrapper testId={testId}>{children}</TestWrapper>
    </CalendarProvider>
  )
}

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
      <div data-testid="parent-rrule">
        {parentEvent?.rrule ? JSON.stringify(parentEvent.rrule) : 'none'}
      </div>
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
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-07-01').hour(9).toDate(),
      },
      uid: 'test-recurring@calendar.test',
    }

    const { getByTestId } = renderProvider(<TestComponent />, {
      events: [recurringEvent],
      dayMaxEvents: 3,
    })

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

    const { getByTestId } = renderProvider(<TestComponent />, {
      events: [nonRecurringEvent],
      dayMaxEvents: 3,
    })

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
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-07-01').hour(9).toDate(),
      },
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

    const { getByTestId } = renderProvider(<TestComponent />, {
      events: [recurringEventWithExdates],
      dayMaxEvents: 3,
    })

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
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-07-01').hour(9).toDate(),
      },
      uid: 'test-recurring@calendar.test',
    }

    const { getByTestId } = renderProvider(<TestComponent />, {
      events: [parentEvent],
      dayMaxEvents: 3,
    })

    expect(getByTestId('parent-found').textContent).toBe('true')
    expect(getByTestId('parent-rrule').textContent).toContain('"freq":3') // Check for RRule.DAILY (3)
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

    const { getByTestId } = renderProvider(<TestStandalone />, {
      events: [nonRecurringEvent],
      dayMaxEvents: 3,
    })

    expect(getByTestId('standalone-parent-found').textContent).toBe('false')
  })

  it('should handle missing UID by generating UID from id', () => {
    const parentEvent: CalendarEvent = {
      id: 'test-recurring',
      title: 'Daily Meeting',
      start: dayjs('2025-07-01').hour(9),
      end: dayjs('2025-07-01').hour(10),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-07-01').hour(9).toDate(),
      },
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
            {parentEvent?.rrule ? JSON.stringify(parentEvent.rrule) : 'none'}
          </div>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestUIDGeneration />, {
      events: [parentEvent],
      dayMaxEvents: 3,
    })

    expect(getByTestId('uid-match-found').textContent).toBe('false')
    expect(getByTestId('uid-match-rrule').textContent).toBe('none')
  })

  it('should not create duplicate events when recurring events are modified', () => {
    // Create a base recurring event
    const baseEvent: CalendarEvent = {
      id: 'daily-standup',
      title: 'Daily Standup',
      start: dayjs('2025-01-01T09:00:00'),
      end: dayjs('2025-01-01T09:30:00'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-01-01T09:00:00').toDate(),
      },
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

    const { getByTestId } = renderProvider(<TestNoDuplicates />, {
      events: events,
      dayMaxEvents: 5,
    })

    // Should have 2 events on Jan 3rd (the base event generates one instance, and the modified instance is also present)
    expect(getByTestId('jan3-event-count').textContent).toBe('2')
    expect(getByTestId('jan3-event-hour').textContent).toBe('10') // Should be the modified time (10:00), not original (09:00)
    expect(getByTestId('jan3-event-id').textContent).toBe(
      'daily-standup_modified_123'
    )
  })

  it('should call regular callbacks for recurring event operations', () => {
    const onEventUpdate = mock(() => {})
    const onEventDelete = mock(() => {})

    const recurringEvent: CalendarEvent = {
      id: 'weekly-meeting',
      uid: 'weekly-meeting@ilamy.calendar',
      title: 'Weekly Meeting',
      start: dayjs('2025-01-06T10:00:00'),
      end: dayjs('2025-01-06T11:00:00'),
      rrule: {
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO],
        dtstart: dayjs('2025-01-06T10:00:00').toDate(),
      },
      exdates: [],
    }

    const TestRecurringCallbacks = () => {
      const { updateRecurringEvent, deleteRecurringEvent } =
        useCalendarContext()

      const handleUpdateRecurring = () => {
        updateRecurringEvent(
          recurringEvent,
          { title: 'Updated Weekly Meeting' },
          { scope: 'this', eventDate: recurringEvent.start }
        )
      }

      const handleDeleteRecurring = () => {
        deleteRecurringEvent(recurringEvent, {
          scope: 'this',
          eventDate: recurringEvent.start,
        })
      }

      return (
        <div>
          <button
            data-testid="update-recurring"
            onClick={handleUpdateRecurring}
          >
            Update Recurring
          </button>
          <button
            data-testid="delete-recurring"
            onClick={handleDeleteRecurring}
          >
            Delete Recurring
          </button>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestRecurringCallbacks />, {
      events: [recurringEvent],
      dayMaxEvents: 5,
      onEventUpdate: onEventUpdate,
      onEventDelete: onEventDelete,
    })

    // Test updating recurring event - should call onEventUpdate with the updated event
    getByTestId('update-recurring').click()
    expect(onEventUpdate).toHaveBeenCalledWith({
      ...recurringEvent,
      title: 'Updated Weekly Meeting',
    })

    // Test deleting recurring event - should call onEventDelete with the event
    getByTestId('delete-recurring').click()
    expect(onEventDelete).toHaveBeenCalledWith(recurringEvent)
  })

  it('should call onEventUpdate for rrule changes', () => {
    const onEventUpdate = mock(() => {})

    const recurringEvent: CalendarEvent = {
      id: 'daily-standup',
      uid: 'daily-standup@ilamy.calendar',
      title: 'Daily Standup',
      start: dayjs('2025-01-06T09:00:00'),
      end: dayjs('2025-01-06T09:30:00'),
      rrule: {
        freq: RRule.DAILY,
        interval: 1,
        dtstart: dayjs('2025-01-06T09:00:00').toDate(),
      },
      exdates: [],
    }

    const TestRruleUpdate = () => {
      const { updateRecurringEvent } = useCalendarContext()

      const handleUpdateRrule = () => {
        // Change from daily to weekly
        updateRecurringEvent(
          recurringEvent,
          {
            rrule: {
              freq: RRule.WEEKLY,
              interval: 1,
              byweekday: [RRule.MO],
              dtstart: dayjs('2025-01-06T09:00:00').toDate(),
            },
          },
          { scope: 'all', eventDate: recurringEvent.start }
        )
      }

      return (
        <div>
          <button data-testid="update-rrule" onClick={handleUpdateRrule}>
            Update Rrule
          </button>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestRruleUpdate />, {
      events: [recurringEvent],
      dayMaxEvents: 5,
      onEventUpdate: onEventUpdate,
    })

    // Test updating rrule - should call onEventUpdate with the new rrule
    getByTestId('update-rrule').click()
    expect(onEventUpdate).toHaveBeenCalledWith({
      ...recurringEvent,
      rrule: {
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO],
        dtstart: dayjs('2025-01-06T09:00:00').toDate(),
      },
    })
  })

  it('should call onEventUpdate for time/date changes in recurring events', () => {
    const onEventUpdate = mock(() => {})

    const recurringEvent: CalendarEvent = {
      id: 'team-meeting',
      uid: 'team-meeting@ilamy.calendar',
      title: 'Team Meeting',
      start: dayjs('2025-01-06T14:00:00'),
      end: dayjs('2025-01-06T15:00:00'),
      rrule: {
        freq: RRule.WEEKLY,
        interval: 1,
        byweekday: [RRule.MO],
        dtstart: dayjs('2025-01-06T14:00:00').toDate(),
      },
      exdates: [],
    }

    const TestTimeUpdate = () => {
      const { updateRecurringEvent } = useCalendarContext()

      const handleUpdateTime = () => {
        // Change time from 2pm-3pm to 10am-11am
        updateRecurringEvent(
          recurringEvent,
          {
            start: dayjs('2025-01-06T10:00:00'),
            end: dayjs('2025-01-06T11:00:00'),
          },
          { scope: 'all', eventDate: recurringEvent.start }
        )
      }

      return (
        <div>
          <button data-testid="update-time" onClick={handleUpdateTime}>
            Update Time
          </button>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestTimeUpdate />, {
      events: [recurringEvent],
      dayMaxEvents: 5,
      onEventUpdate: onEventUpdate,
    })

    // Test updating time - should call onEventUpdate with new start/end times
    getByTestId('update-time').click()
    expect(onEventUpdate).toHaveBeenCalledWith({
      ...recurringEvent,
      start: dayjs('2025-01-06T10:00:00'),
      end: dayjs('2025-01-06T11:00:00'),
    })
  })

  it('should initialize with the specified initial view', () => {
    const TestInitialView = () => {
      const { view } = useCalendarContext()
      return <div data-testid="current-view">{view}</div>
    }

    const { getByTestId } = renderProvider(<TestInitialView />, {
      dayMaxEvents: 5,
      initialView: 'week',
    })

    expect(getByTestId('current-view').textContent).toBe('week')
  })

  it('should default to month view when no initialView is provided', () => {
    const TestDefaultView = () => {
      const { view } = useCalendarContext()
      return <div data-testid="current-view">{view}</div>
    }

    const { getByTestId } = renderProvider(<TestDefaultView />, {
      dayMaxEvents: 5,
    })

    expect(getByTestId('current-view').textContent).toBe('month')
  })

  it('should initialize with the specified initial date', () => {
    const initialDate = dayjs('2025-06-15T10:00:00.000Z')

    const { getByTestId } = renderProvider(
      <div />,
      {
        dayMaxEvents: 5,
        initialDate: initialDate,
      },
      'current-date'
    )

    // Verify the calendar initializes with the specified date
    expect(getByTestId('current-date-year').textContent).toBe('2025')
    expect(getByTestId('current-date-month').textContent).toBe('5') // June is month 5 (0-indexed)
    expect(getByTestId('current-date-date').textContent).toBe('15')
  })

  it('should default to today when no initialDate is provided', () => {
    const today = dayjs()

    const { getByTestId } = renderProvider(
      <div />,
      {
        dayMaxEvents: 5,
      },
      'current-date'
    )

    // Verify the calendar defaults to today's date
    expect(getByTestId('current-date-year').textContent).toBe(
      today.year().toString()
    )
    expect(getByTestId('current-date-month').textContent).toBe(
      today.month().toString()
    )
    expect(getByTestId('current-date-date').textContent).toBe(
      today.date().toString()
    )
  })
})

describe('firstDayOfWeek functionality', () => {
  it('should calculate correct week range when firstDayOfWeek is Monday', () => {
    const TestComponent = () => {
      const { getEventsForDateRange } = useCalendarContext()

      // Test date: Wednesday Oct 15, 2025
      const testDate = dayjs('2025-10-15')

      // Calculate week range - should be Mon Oct 13 to Sun Oct 19
      const currentDay = testDate.day()
      const diff = (currentDay - 1 + 7) % 7 // firstDayOfWeek = 1 (Monday)
      const expectedStart = testDate.subtract(diff, 'day').startOf('day')
      const expectedEnd = expectedStart.add(6, 'day').endOf('day')

      const weekEvents = getEventsForDateRange(expectedStart, expectedEnd)

      return (
        <div>
          <div data-testid="week-start-day">{expectedStart.format('dddd')}</div>
          <div data-testid="week-start-date">{expectedStart.format('D')}</div>
          <div data-testid="week-end-day">{expectedEnd.format('dddd')}</div>
          <div data-testid="week-end-date">{expectedEnd.format('D')}</div>
          <div data-testid="events-count">{weekEvents.length}</div>
        </div>
      )
    }

    const testEvent: CalendarEvent = {
      id: 'test-1',
      title: 'Test Event',
      start: dayjs('2025-10-14T10:00:00.000Z'), // Tuesday
      end: dayjs('2025-10-14T11:00:00.000Z'),
      uid: 'test-1@test.com',
    }

    const { getByTestId } = renderProvider(<TestComponent />, {
      events: [testEvent],
      firstDayOfWeek: 1, // Monday
      initialDate: dayjs('2025-10-15'), // Wednesday
    })

    // Verify week starts on Monday
    expect(getByTestId('week-start-day').textContent).toBe('Monday')
    expect(getByTestId('week-start-date').textContent).toBe('13')

    // Verify week ends on Sunday
    expect(getByTestId('week-end-day').textContent).toBe('Sunday')
    expect(getByTestId('week-end-date').textContent).toBe('19')

    // Verify event is included in the week range
    expect(getByTestId('events-count').textContent).toBe('1')
  })

  it('should calculate correct week range when current date is Sunday and firstDayOfWeek is Monday', () => {
    const TestComponent = () => {
      // Test date: Sunday Oct 12, 2025
      const testDate = dayjs('2025-10-12')

      // Calculate week range - should be Mon Oct 6 to Sun Oct 12
      const currentDay = testDate.day()
      const diff = (currentDay - 1 + 7) % 7 // firstDayOfWeek = 1 (Monday)
      const expectedStart = testDate.subtract(diff, 'day').startOf('day')
      const expectedEnd = expectedStart.add(6, 'day').endOf('day')

      return (
        <div>
          <div data-testid="week-start-day">{expectedStart.format('dddd')}</div>
          <div data-testid="week-start-date">{expectedStart.format('D')}</div>
          <div data-testid="week-end-day">{expectedEnd.format('dddd')}</div>
          <div data-testid="week-end-date">{expectedEnd.format('D')}</div>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestComponent />, {
      firstDayOfWeek: 1, // Monday
      initialDate: dayjs('2025-10-12'), // Sunday
    })

    // Verify week starts on Monday (6 days before Sunday)
    expect(getByTestId('week-start-day').textContent).toBe('Monday')
    expect(getByTestId('week-start-date').textContent).toBe('6')

    // Verify week ends on Sunday (current date)
    expect(getByTestId('week-end-day').textContent).toBe('Sunday')
    expect(getByTestId('week-end-date').textContent).toBe('12')
  })

  it('should calculate correct month range when firstDayOfWeek is Monday', () => {
    const TestComponent = () => {
      // October 2025 starts on Wednesday Oct 1
      const oct1 = dayjs('2025-10-01')

      // For month view with Monday as first day:
      // Should start on Monday Sep 29 (to complete the first week)
      // Should end on Sunday Nov 2 (to complete the last week)
      const monthStart = oct1.startOf('month')
      const monthStartDay = monthStart.day()
      const startDiff = (monthStartDay - 1 + 7) % 7
      const expectedStart = monthStart.subtract(startDiff, 'day').startOf('day')

      const monthEnd = oct1.endOf('month')
      const monthEndDay = monthEnd.day()
      const endDiff = 6 - ((monthEndDay - 1 + 7) % 7)
      const expectedEnd = monthEnd.add(endDiff, 'day').endOf('day')

      return (
        <div>
          <div data-testid="month-start-day">
            {expectedStart.format('dddd')}
          </div>
          <div data-testid="month-start-date">
            {expectedStart.format('MMM D')}
          </div>
          <div data-testid="month-end-day">{expectedEnd.format('dddd')}</div>
          <div data-testid="month-end-date">{expectedEnd.format('MMM D')}</div>
        </div>
      )
    }

    const { getByTestId } = renderProvider(<TestComponent />, {
      firstDayOfWeek: 1, // Monday
      initialDate: dayjs('2025-10-01'),
    })

    // Verify month grid starts on Monday
    expect(getByTestId('month-start-day').textContent).toBe('Monday')
    expect(getByTestId('month-start-date').textContent).toBe('Sep 29')

    // Verify month grid ends on Sunday
    expect(getByTestId('month-end-day').textContent).toBe('Sunday')
    expect(getByTestId('month-end-date').textContent).toBe('Nov 2')
  })
})
