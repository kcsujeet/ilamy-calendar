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
    const sundayWednesdayTop = parseInt(sundayWednesdayEvent.style.top)
    const tuesdaySaturdayTop = parseInt(tuesdaySaturdayEvent.style.top)
    const fridaySaturdayTop = parseInt(fridaySaturdayEvent.style.top)
    const thursdayTop = parseInt(thursdayEvent.style.top)

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
})
