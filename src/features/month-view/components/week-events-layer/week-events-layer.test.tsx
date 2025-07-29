import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/contexts/calendar-context/provider'
import dayjs from '@/lib/dayjs-config'
import { generateMockEvents } from '@/lib/utils'
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'bun:test'
import { WeekEventsLayer } from './week-events-layer'

const days = Array.from({ length: 7 }).map((_, i) =>
  dayjs().startOf('week').add(i, 'day')
)

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents({ count: 10 })
let dayMaxEvents = 5 // Default max events per day
const renderCalendar = (props = {}) => {
  return render(
    <CalendarProvider
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      {...props}
    >
      <WeekEventsLayer days={days} />
    </CalendarProvider>
  )
}

describe('WeekEventsLayer', () => {
  test('renders events for each day', () => {
    renderCalendar()

    expect(screen.getAllByRole('button')).toHaveLength(7) // 7 days in the week
  })

  test('respects dayMaxEvents', () => {
    // all events on the same day
    mockEvents.forEach((event) => {
      event.start = dayjs().startOf('day').add(1, 'hour')
      event.end = dayjs().startOf('day').add(2, 'hour')
    })
    renderCalendar()
    // should render only the max number of events per day
    expect(screen.getAllByRole('button').length).toBeLessThanOrEqual(
      dayMaxEvents
    )
  })

  test('renders multi-day events correctly with correct top, left and width values', () => {
    // Create a multi-day event spanning 3 days
    const multiDayEvent: CalendarEvent = {
      id: 'multi-day-1',
      title: 'Multi-day Event',
      start: dayjs().startOf('week').add(1, 'day').startOf('day'),
      end: dayjs().startOf('week').add(3, 'day').endOf('day'),
      color: 'blue',
    }

    renderCalendar({ events: [multiDayEvent] })

    const eventElement = screen.getByTestId(
      'week-event-layer-event-multi-day-1'
    )

    // Multi-day event should span 3 days (day 1, 2, 3)
    // Left position: (1/7) * 100 = ~14.29%
    // Width: (3/7) * 100 = ~42.86%
    expect(eventElement).toHaveStyle({
      left: expect.stringContaining('14.2'),
      width: expect.stringContaining('42.8'),
    })
  })

  test('renders event on the correct day', () => {
    // Create an event for Wednesday (day 3 of the week)
    const wednesdayEvent: CalendarEvent = {
      id: 'wednesday-event',
      title: 'Wednesday Event',
      start: dayjs().startOf('week').add(3, 'day').hour(10),
      end: dayjs().startOf('week').add(3, 'day').hour(11),
      color: 'green',
    }

    renderCalendar({ events: [wednesdayEvent] })

    const eventElement = screen.getByTestId(
      'week-event-layer-event-wednesday-event'
    )

    // Event should be positioned at Wednesday (3rd column)
    // Left position: (3/7) * 100 = ~42.86%
    expect(eventElement).toHaveStyle({
      left: expect.stringContaining('42.8'),
      width: expect.stringContaining('14.2'), // Single day width: (1/7) * 100
    })
  })

  test('renders event on next day if can not fit in current day', () => {
    // Set dayMaxEvents to 2 to create congestion
    const dayMaxEvents = 2

    // Create 2 events that start on Monday and end on Tuesday, filling Monday's slots
    const mondayTuesdayEvents: CalendarEvent[] = Array.from(
      { length: 2 },
      (_, i) => ({
        id: `monday-tuesday-event-${i}`,
        title: `Monday-Tuesday Event ${i}`,
        start: dayjs().startOf('week').startOf('day'), // Monday
        end: dayjs().startOf('week').add(1, 'day').endOf('day'), // Tuesday
        color: 'blue',
      })
    )

    // Create a shorter multi-day event that also starts on Monday but ends Wednesday
    // This should NOT be rendered on Monday (no space), but should be rendered Tue-Wed
    const shorterEvent: CalendarEvent = {
      id: 'shorter-event',
      title: 'Shorter Event',
      start: dayjs().startOf('week').startOf('day'), // Monday
      end: dayjs().startOf('week').add(2, 'day').endOf('day'), // Wednesday
      color: 'green',
    }

    const allEvents = [...mondayTuesdayEvents, shorterEvent]

    renderCalendar({ events: allEvents, dayMaxEvents })

    // The shorter event should be rendered, but starting from Tuesday (not Monday)
    const shorterEventElement = screen.getByTestId(
      'week-event-layer-event-shorter-event'
    )

    // Event should start from Tuesday (day 1) instead of Monday (day 0)
    // Left position: (1/7) * 100 = ~14.29% (Tuesday position)
    // Width: (2/7) * 100 = ~28.57% (Tuesday + Wednesday = 2 days)
    expect(shorterEventElement).toHaveStyle({
      left: expect.stringContaining('14.2'), // Tuesday position
      width: expect.stringContaining('28.5'), // 2 days width (Tue-Wed)
    })

    // At least one of the Monday-Tuesday events should be rendered
    expect(
      screen.getByTestId('week-event-layer-event-monday-tuesday-event-0')
    ).toBeInTheDocument()

    // Total events rendered should be at least 2 (shorter event + at least 1 Monday-Tuesday)
    const renderedEvents = screen.getAllByTestId(/week-event-layer-event-/)
    expect(renderedEvents.length).toBeGreaterThanOrEqual(2)
  })

  test('leaves no gaps in cells if event can be rendered', () => {
    // Create multi-day events that leave gaps in certain columns
    const events: CalendarEvent[] = [
      {
        id: 'sunday-wednesday-event',
        title: 'Sunday-Wednesday Event',
        start: dayjs().startOf('week').startOf('day'), // Sunday
        end: dayjs().startOf('week').add(3, 'day').endOf('day'), // Wednesday
        color: 'blue',
      },
      {
        id: 'tuesday-saturday-event',
        title: 'Tuesday-Saturday Event',
        start: dayjs().startOf('week').add(2, 'day').startOf('day'), // Tuesday
        end: dayjs().startOf('week').add(6, 'day').endOf('day'), // Saturday
        color: 'green',
      },
      {
        id: 'friday-saturday-event',
        title: 'Friday-Saturday Event',
        start: dayjs().startOf('week').add(5, 'day').startOf('day'), // Friday
        end: dayjs().startOf('week').add(6, 'day').endOf('day'), // Saturday
        color: 'red',
      },
      {
        id: 'thursday-event',
        title: 'Thursday Event',
        start: dayjs().startOf('week').add(4, 'day').hour(10), // Thursday (single day)
        end: dayjs().startOf('week').add(4, 'day').hour(11),
        color: 'yellow',
      },
    ]

    renderCalendar({ events })

    // Get the positioned events
    const sundayWednesdayEvent = screen.getByTestId(
      'week-event-layer-event-sunday-wednesday-event'
    )
    const tuesdaySaturdayEvent = screen.getByTestId(
      'week-event-layer-event-tuesday-saturday-event'
    )
    const fridaySaturdayEvent = screen.getByTestId(
      'week-event-layer-event-friday-saturday-event'
    )
    const thursdayEvent = screen.getByTestId(
      'week-event-layer-event-thursday-event'
    )

    // Check actual positioning values
    const sundayWednesdayTop = Number.parseInt(sundayWednesdayEvent.style.top)
    const tuesdaySaturdayTop = Number.parseInt(tuesdaySaturdayEvent.style.top)
    const fridaySaturdayTop = Number.parseInt(fridaySaturdayEvent.style.top)
    const thursdayTop = Number.parseInt(thursdayEvent.style.top)

    // Key test: Gap-filling behavior
    // Thursday event should fill the gap in row 0 (same as Sunday-Wednesday)
    // because Sunday-Wednesday doesn't cover Thursday
    expect(thursdayTop).toBe(sundayWednesdayTop)

    // Friday-Saturday should also reuse row 0 since it doesn't conflict with Sunday-Wednesday
    // (Sunday-Wednesday ends on Wednesday, Friday-Saturday starts on Friday)
    expect(fridaySaturdayTop).toBe(sundayWednesdayTop)

    // Tuesday-Saturday should be in a different row since it conflicts with Sunday-Wednesday
    expect(tuesdaySaturdayTop).not.toBe(sundayWednesdayTop)

    // All events should be rendered (no events dropped)
    expect(screen.getAllByTestId(/week-event-layer-event-/)).toHaveLength(4)

    // Verify efficient positioning: multiple events should share the same row when possible
    const allTops = [
      sundayWednesdayTop,
      tuesdaySaturdayTop,
      fridaySaturdayTop,
      thursdayTop,
    ]
    const uniqueTops = [...new Set(allTops)]

    // Should only use 2 unique rows instead of 4, proving gap-filling works
    expect(uniqueTops.length).toBe(2)
  })

  describe('Recurring Events', () => {
    test('renders weekly recurring events correctly', () => {
      // Create a weekly recurring event that repeats on Monday, Wednesday, Friday
      const weeklyRecurringEvent: CalendarEvent = {
        id: 'weekly-recurring-1',
        title: 'Weekly Team Meeting',
        start: dayjs().startOf('week').add(1, 'day').hour(9), // Monday 9 AM
        end: dayjs().startOf('week').add(1, 'day').hour(10), // Monday 10 AM
        color: 'blue',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endType: 'never',
          daysOfWeek: ['monday', 'wednesday', 'friday'],
        },
      }

      renderCalendar({ events: [weeklyRecurringEvent] })

      // Should render exactly 3 instances (Monday, Wednesday, Friday)
      const recurringEventInstances = screen.getAllByTestId(
        /week-event-layer-event-weekly-recurring-1/
      )
      expect(recurringEventInstances).toHaveLength(3)

      // Verify each instance has proper test IDs and basic structure
      recurringEventInstances.forEach((instance) => {
        // Verify it has the correct test ID pattern
        expect(instance.getAttribute('data-testid')).toMatch(
          /week-event-layer-event-weekly-recurring-1_.+/
        )
        // Verify the element exists and is rendered
        expect(instance).toBeInTheDocument()
      })
    })

    test('renders daily recurring events correctly', () => {
      // Create a daily recurring event
      const dailyRecurringEvent: CalendarEvent = {
        id: 'daily-recurring-1',
        title: 'Daily Standup',
        start: dayjs().startOf('week').hour(9), // Sunday 9 AM
        end: dayjs().startOf('week').hour(9.5), // Sunday 9:30 AM
        color: 'green',
        recurrence: {
          frequency: 'daily',
          interval: 1,
          endType: 'after',
          count: 5, // Only 5 occurrences
        },
      }

      renderCalendar({ events: [dailyRecurringEvent] })

      // Should render exactly 5 instances (count: 5)
      const dailyEventInstances = screen.getAllByTestId(
        /week-event-layer-event-daily-recurring-1/
      )
      expect(dailyEventInstances).toHaveLength(5)

      // Verify instances are properly rendered
      dailyEventInstances.forEach((instance) => {
        // Verify it has the correct test ID pattern
        expect(instance.getAttribute('data-testid')).toMatch(
          /week-event-layer-event-daily-recurring-1_.+/
        )
        // Verify the element exists and is rendered
        expect(instance).toBeInTheDocument()
      })
    })

    test('renders recurring events with proper positioning among non-recurring events', () => {
      const events: CalendarEvent[] = [
        // Non-recurring event on Monday
        {
          id: 'non-recurring-monday',
          title: 'One-time Meeting',
          start: dayjs().startOf('week').add(1, 'day').hour(10), // Monday 10 AM
          end: dayjs().startOf('week').add(1, 'day').hour(11), // Monday 11 AM
          color: 'red',
        },
        // Weekly recurring event on Monday
        {
          id: 'weekly-monday',
          title: 'Weekly Review',
          start: dayjs().startOf('week').add(1, 'day').hour(14), // Monday 2 PM
          end: dayjs().startOf('week').add(1, 'day').hour(15), // Monday 3 PM
          color: 'blue',
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endType: 'never',
            daysOfWeek: ['monday'],
          },
        },
        // Multi-day non-recurring event
        {
          id: 'multi-day-event',
          title: 'Conference',
          start: dayjs().startOf('week').add(2, 'day').startOf('day'), // Tuesday
          end: dayjs().startOf('week').add(4, 'day').endOf('day'), // Thursday
          color: 'purple',
        },
      ]

      renderCalendar({ events })

      // All events should be rendered with exact counts
      expect(
        screen.getByTestId('week-event-layer-event-non-recurring-monday')
      ).toBeInTheDocument()

      const recurringMondayInstances = screen.getAllByTestId(
        /week-event-layer-event-weekly-monday/
      )
      expect(recurringMondayInstances).toHaveLength(1) // Should be exactly 1 instance this week

      expect(
        screen.getByTestId('week-event-layer-event-multi-day-event')
      ).toBeInTheDocument()

      // Check positioning - recurring and non-recurring events should be positioned correctly
      const nonRecurringMonday = screen.getByTestId(
        'week-event-layer-event-non-recurring-monday'
      )
      const recurringMonday = recurringMondayInstances[0]

      // Both should be on Monday but at different vertical positions
      expect(nonRecurringMonday).toHaveStyle({
        left: expect.stringContaining('14.2'), // Monday position
      })
      expect(recurringMonday).toHaveStyle({
        left: expect.stringContaining('14.2'), // Monday position
      })

      // They should have different top positions (stacked vertically)
      const nonRecurringTop = Number.parseInt(nonRecurringMonday.style.top)
      const recurringTop = Number.parseInt(recurringMonday.style.top)
      expect(nonRecurringTop).not.toBe(recurringTop)
    })

    test('handles recurring events with exceptions', () => {
      // Create a weekly recurring event with an exception
      const weeklyWithException: CalendarEvent = {
        id: 'weekly-with-exception',
        title: 'Weekly Meeting with Exception',
        start: dayjs().startOf('week').add(1, 'day').hour(9), // Monday 9 AM
        end: dayjs().startOf('week').add(1, 'day').hour(10), // Monday 10 AM
        color: 'orange',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endType: 'never',
          daysOfWeek: ['monday'],
          exceptions: [
            dayjs().startOf('week').add(8, 'day'), // Skip next Monday
          ],
        },
      }

      renderCalendar({ events: [weeklyWithException] })

      // Should render exactly 1 instance (only this Monday, not the exception Monday)
      const mondayEventInstances = screen.getAllByTestId(
        /week-event-layer-event-weekly-with-exception/
      )
      expect(mondayEventInstances).toHaveLength(1)

      // The event should appear on this Monday (not the excepted one)
      const thisMonday = mondayEventInstances[0]
      expect(thisMonday).toHaveStyle({
        left: expect.stringContaining('14.2'), // Monday position
        width: expect.stringContaining('14.2'), // Single day width
      })

      // Verify it's positioned on Monday (day 1 of this week)
      const testIdPattern = thisMonday.getAttribute('data-testid')
      expect(testIdPattern).toMatch(/2025-07-28/) // This Monday's date, not the exception date
      expect(testIdPattern).not.toMatch(/2025-08-04/) // Should NOT contain the exception date
    })

    test('renders multiple recurring events with different frequencies', () => {
      const events: CalendarEvent[] = [
        // Daily recurring event
        {
          id: 'daily-event',
          title: 'Daily Check-in',
          start: dayjs().startOf('week').hour(8), // Sunday 8 AM
          end: dayjs().startOf('week').hour(8.5), // Sunday 8:30 AM
          color: 'green',
          recurrence: {
            frequency: 'daily',
            interval: 1,
            endType: 'after',
            count: 7,
          },
        },
        // Weekly recurring event
        {
          id: 'weekly-event',
          title: 'Weekly Planning',
          start: dayjs().startOf('week').hour(9), // Sunday 9 AM
          end: dayjs().startOf('week').hour(10), // Sunday 10 AM
          color: 'blue',
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endType: 'never',
            daysOfWeek: ['sunday'],
          },
        },
        // Monthly recurring event (appears once this week)
        {
          id: 'monthly-event',
          title: 'Monthly Review',
          start: dayjs().startOf('week').add(6, 'day').hour(15), // Saturday 3 PM
          end: dayjs().startOf('week').add(6, 'day').hour(16), // Saturday 4 PM
          color: 'purple',
          recurrence: {
            frequency: 'monthly',
            interval: 1,
            endType: 'never',
          },
        },
      ]

      renderCalendar({ events })

      // Should render exact counts for each recurring event type
      const dailyEventInstances = screen.getAllByTestId(
        /week-event-layer-event-daily-event/
      )
      const weeklyEventInstances = screen.getAllByTestId(
        /week-event-layer-event-weekly-event/
      )
      const monthlyEventInstances = screen.getAllByTestId(
        /week-event-layer-event-monthly-event/
      )

      // Daily event should appear 7 times (Sunday through Saturday)
      expect(dailyEventInstances).toHaveLength(7)

      // Weekly event should appear 1 time (only on Sunday)
      expect(weeklyEventInstances).toHaveLength(1)

      // Monthly event should appear 1 time (only on Saturday)
      expect(monthlyEventInstances).toHaveLength(1)

      const dailyEvent = dailyEventInstances[0] // Sunday instance
      const weeklyEvent = weeklyEventInstances[0] // Sunday instance
      const monthlyEvent = monthlyEventInstances[0] // Saturday instance

      // Daily and weekly events should be on Sunday
      expect(dailyEvent).toHaveStyle({
        left: expect.stringContaining('0'), // Sunday position
      })
      expect(weeklyEvent).toHaveStyle({
        left: expect.stringContaining('0'), // Sunday position
      })

      // Monthly event should be on Saturday
      expect(monthlyEvent).toHaveStyle({
        left: expect.stringContaining('85.7'), // Saturday position: (6/7) * 100
      })

      // Daily and weekly events should be stacked (different top positions)
      const dailyTop = Number.parseInt(dailyEvent.style.top)
      const weeklyTop = Number.parseInt(weeklyEvent.style.top)
      expect(dailyTop).not.toBe(weeklyTop)
    })

    test('handles recurring events with modified instances', () => {
      const events: CalendarEvent[] = [
        // Original recurring event
        {
          id: 'recurring-base',
          title: 'Weekly Meeting',
          start: dayjs().startOf('week').add(2, 'day').hour(10), // Tuesday 10 AM
          end: dayjs().startOf('week').add(2, 'day').hour(11), // Tuesday 11 AM
          color: 'blue',
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endType: 'never',
            daysOfWeek: ['tuesday'],
          },
        },
        // Modified instance (moved to Wednesday with different time)
        {
          id: 'recurring-modified',
          title: 'Weekly Meeting (Rescheduled)',
          start: dayjs().startOf('week').add(3, 'day').hour(14), // Wednesday 2 PM
          end: dayjs().startOf('week').add(3, 'day').hour(15), // Wednesday 3 PM
          color: 'red',
          parentEventId: 'recurring-base',
          isException: true,
          originalStart: dayjs().startOf('week').add(2, 'day').hour(10),
          originalEnd: dayjs().startOf('week').add(2, 'day').hour(11),
        },
      ]

      renderCalendar({ events })

      // Should render exactly 1 base recurring instance (the one not modified) and 1 modified instance
      const originalEventInstances = screen.getAllByTestId(
        /week-event-layer-event-recurring-base/
      )
      expect(originalEventInstances).toHaveLength(1)

      expect(
        screen.getByTestId('week-event-layer-event-recurring-modified')
      ).toBeInTheDocument()

      // Original should be on Tuesday
      const originalEvent = originalEventInstances[0]
      expect(originalEvent).toHaveStyle({
        left: expect.stringContaining('28.5'), // Tuesday position: (2/7) * 100
      })

      // Modified instance should be on Wednesday
      const modifiedEvent = screen.getByTestId(
        'week-event-layer-event-recurring-modified'
      )
      expect(modifiedEvent).toHaveStyle({
        left: expect.stringContaining('42.8'), // Wednesday position: (3/7) * 100
      })
    })

    test('handles bi-weekly recurring events correctly', () => {
      // Create a bi-weekly recurring event (every 2 weeks)
      const biWeeklyEvent: CalendarEvent = {
        id: 'bi-weekly-event',
        title: 'Bi-weekly Sync',
        start: dayjs().startOf('week').add(4, 'day').hour(11), // Thursday 11 AM
        end: dayjs().startOf('week').add(4, 'day').hour(12), // Thursday 12 PM
        color: 'cyan',
        recurrence: {
          frequency: 'weekly',
          interval: 2, // Every 2 weeks
          endType: 'after',
          count: 3,
          daysOfWeek: ['thursday'],
        },
      }

      renderCalendar({ events: [biWeeklyEvent] })

      // Should render exactly 1 event instance (only current week's Thursday)
      const thursdayEventInstances = screen.getAllByTestId(
        /week-event-layer-event-bi-weekly-event/
      )
      expect(thursdayEventInstances).toHaveLength(1)

      // Should be positioned on Thursday
      const thursdayEvent = thursdayEventInstances[0]
      expect(thursdayEvent).toHaveStyle({
        left: expect.stringContaining('57.1'), // Thursday position: (4/7) * 100
        width: expect.stringContaining('14.2'), // Single day width: (1/7) * 100
      })
    })

    test('handles recurring multi-day events', () => {
      // Create a weekly recurring multi-day event (weekend retreat every week)
      const weeklyMultiDay: CalendarEvent = {
        id: 'weekly-weekend',
        title: 'Weekend Workshop',
        start: dayjs().startOf('week').add(5, 'day').startOf('day'), // Friday
        end: dayjs().startOf('week').add(6, 'day').endOf('day'), // Saturday
        color: 'indigo',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          endType: 'after',
          count: 4,
          daysOfWeek: ['friday', 'saturday'],
        },
      }

      renderCalendar({ events: [weeklyMultiDay] })

      // Should render exactly 2 multi-day recurring event instances (one for Friday, one for Saturday)
      const weekendEventInstances = screen.getAllByTestId(
        /week-event-layer-event-weekly-weekend/
      )
      expect(weekendEventInstances).toHaveLength(2)

      // Each should have proper test IDs and basic structure
      weekendEventInstances.forEach((instance) => {
        // Verify it has the correct test ID pattern
        expect(instance.getAttribute('data-testid')).toMatch(
          /week-event-layer-event-weekly-weekend_.+/
        )
        // Verify the element exists and is rendered
        expect(instance).toBeInTheDocument()
      })
    })
  })
})
