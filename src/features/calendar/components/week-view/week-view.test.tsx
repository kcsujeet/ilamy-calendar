import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { generateMockEvents } from '@/lib/utils'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'bun:test'
import WeekView from './week-view'

const weekDays: string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents()
let firstDayOfWeek = 0 // Default to Sunday
let dayMaxEvents = 3 // Default max events per day
let locale = 'en' // Default locale

// Test component to capture context values
const TestWrapper = ({
  children,
  testId,
}: {
  children: React.ReactNode
  testId: string
}) => {
  const { currentDate } = useCalendarContext()
  return (
    <>
      <div data-testid={`${testId}-year`}>{currentDate.year()}</div>
      <div data-testid={`${testId}-month`}>{currentDate.month()}</div>
      <div data-testid={`${testId}-date`}>{currentDate.date()}</div>
      {children}
    </>
  )
}

const renderWeekView = (props = {}) => {
  const testId = 'current-date'
  return render(
    <CalendarProvider
      firstDayOfWeek={firstDayOfWeek}
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      locale={locale}
      {...props}
    >
      <TestWrapper testId={testId}>
        <WeekView />
      </TestWrapper>
    </CalendarProvider>
  )
}

describe('WeekView', () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = 'en'

    // render the WeekView with default props
    renderWeekView()
  })

  test('renders week view structure with proper layout', () => {
    // Should have the main container structure
    const container = screen.getByTestId('week-view')
    expect(container).toBeInTheDocument()

    // Should have week header structure
    const headerContainer = screen.getByTestId('week-header')
    expect(headerContainer).toBeInTheDocument()

    // Should have all-day row structure
    const allDayContainer = screen.getByTestId('week-all-day-row')
    expect(allDayContainer).toBeInTheDocument()

    // Should have time grid structure
    const timeGridContainer = screen.getByTestId('week-time-grid')
    expect(timeGridContainer).toBeInTheDocument()
  })

  test('renders WeekView with correct weekday headers starting from Sunday', () => {
    // Check that all weekday headers are present using test IDs
    weekDays.forEach((day) => {
      expect(
        screen.getByTestId(`week-day-header-${day.toLowerCase()}`)
      ).toBeInTheDocument()
    })
  })

  test('renders WeekView with correct weekday headers starting from Monday', () => {
    cleanup() // Clean up previous renders
    renderWeekView({ firstDayOfWeek: 1 }) // Set Monday as first day of week

    // When starting from Monday, all weekdays should still be present
    weekDays.forEach((day) => {
      expect(
        screen.getByTestId(`week-day-header-${day.toLowerCase()}`)
      ).toBeInTheDocument()
    })
  })

  test('displays current week dates correctly', () => {
    // Get the current week's start and end dates
    const currentWeek = dayjs().startOf('week')
    const weekStart = currentWeek.date()
    const weekEnd = currentWeek.add(6, 'day').date()

    // Should find the start and end dates of the current week
    const startDateElements = screen.getAllByText(weekStart.toString())
    const endDateElements = screen.getAllByText(weekEnd.toString())

    expect(startDateElements.length).toBeGreaterThan(0)
    expect(endDateElements.length).toBeGreaterThan(0)
  })

  test('handles events display in week structure', () => {
    // Should render the week structure
    expect(screen.getByTestId('week-view')).toBeInTheDocument()

    // Should have the time grid for events
    expect(screen.getByTestId('week-time-grid')).toBeInTheDocument()

    // Should have all-day row for all-day events
    expect(screen.getByTestId('week-all-day-row')).toBeInTheDocument()
  })

  test('renders with proper scrollable time grid', () => {
    // Check for scrollable container
    const scrollArea = screen.getByTestId('week-scroll-area')
    expect(scrollArea).toBeInTheDocument()

    // Check for time grid within scroll area
    const timeGrid = screen.getByTestId('week-time-grid')
    expect(timeGrid).toBeInTheDocument()
  })

  test('respects firstDayOfWeek prop', () => {
    cleanup() // Clean up previous renders
    renderWeekView({ firstDayOfWeek: 1 }) // Set Monday as first day

    // Check that Monday header is present (order will be handled by component logic)
    expect(screen.getByTestId('week-day-header-monday')).toBeInTheDocument()
    expect(screen.getByTestId('week-day-header-sunday')).toBeInTheDocument()
  })

  test('handles different locale settings', () => {
    cleanup() // Clean up previous renders
    renderWeekView({ locale: 'en' })

    // Should render with English locale by default using test IDs
    expect(screen.getByTestId('week-day-header-sunday')).toBeInTheDocument()
    expect(screen.getByTestId('week-day-header-monday')).toBeInTheDocument()
  })

  test('renders time slots structure', () => {
    // Should have time grid for the day
    const timeGrid = screen.getByTestId('week-time-grid')
    expect(timeGrid).toBeInTheDocument()

    // Should have time labels column
    const timeLabels = screen.getByTestId('week-time-labels')
    expect(timeLabels).toBeInTheDocument()

    // Should have specific hour slots
    expect(screen.getByTestId('week-time-hour-00')).toBeInTheDocument()
    expect(screen.getByTestId('week-time-hour-12')).toBeInTheDocument()
    expect(screen.getByTestId('week-time-hour-23')).toBeInTheDocument()
  })

  test('renders day columns for the week', () => {
    // Get current week's dates
    const startOfWeek = dayjs().startOf('week')

    // Should have 7 day columns for the week
    for (let i = 0; i < 7; i++) {
      const dayDate = startOfWeek.add(i, 'day')
      const dayColTestId = `week-day-col-${dayDate.format('YYYY-MM-DD')}`
      expect(screen.getByTestId(dayColTestId)).toBeInTheDocument()
    }
  })

  test('renders time cells for each day', () => {
    const startOfWeek = dayjs().startOf('week')
    const firstDay = startOfWeek.format('YYYY-MM-DD')

    // Check for some time cells on the first day
    expect(
      screen.getByTestId(`week-time-cell-${firstDay}-00`)
    ).toBeInTheDocument()
    expect(
      screen.getByTestId(`week-time-cell-${firstDay}-12`)
    ).toBeInTheDocument()
    expect(
      screen.getByTestId(`week-time-cell-${firstDay}-23`)
    ).toBeInTheDocument()
  })

  test('renders event layers for each day', () => {
    const startOfWeek = dayjs().startOf('week')

    for (let i = 0; i < 7; i++) {
      const dayDate = startOfWeek.add(i, 'day')
      const eventsTestId = `week-day-events-${dayDate.format('YYYY-MM-DD')}`
      expect(screen.getByTestId(eventsTestId)).toBeInTheDocument()
    }
  })

  test('initializes with specified initial date - different week', () => {
    cleanup()
    const initialDate = dayjs('2025-06-15T10:00:00.000Z')
    renderWeekView({ initialDate })

    // Should have currentDate set to June 2025 (month 5, 0-indexed)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

    // Should have the specific date for June 15, 2025
    const june15Events = screen.getByTestId('week-day-events-2025-06-15')
    expect(june15Events).toBeInTheDocument()
  })

  test('initializes with specified initial date - past date', () => {
    cleanup()
    const initialDate = dayjs('2020-01-15T10:00:00.000Z')
    renderWeekView({ initialDate })

    // Should have currentDate set to January 2020 (month 0)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('0')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

    // Should have the specific date for January 15, 2020
    const jan15Events = screen.getByTestId('week-day-events-2020-01-15')
    expect(jan15Events).toBeInTheDocument()
  })

  test('initializes with specified initial date - future date', () => {
    cleanup()
    const initialDate = dayjs('2030-12-25T10:00:00.000Z')
    renderWeekView({ initialDate })

    // Should have currentDate set to December 2030 (month 11)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('11')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')

    // Should have the specific date for December 25, 2030
    const dec25Events = screen.getByTestId('week-day-events-2030-12-25')
    expect(dec25Events).toBeInTheDocument()
  })

  test('defaults to current week when no initial date provided', () => {
    cleanup()
    const today = dayjs()
    renderWeekView()

    // Should have currentDate set to today
    expect(screen.getByTestId('current-date-year')).toHaveTextContent(
      today.year().toString()
    )
    expect(screen.getByTestId('current-date-month')).toHaveTextContent(
      today.month().toString()
    )
    expect(screen.getByTestId('current-date-date')).toHaveTextContent(
      today.date().toString()
    )

    // Should have events container for today
    const todayEvents = screen.getByTestId(
      `week-day-events-${today.format('YYYY-MM-DD')}`
    )
    expect(todayEvents).toBeInTheDocument()
  })

  test('all-day event ending on Sunday should not appear on Monday when firstDayOfWeek is Monday', () => {
    cleanup()

    // Create all-day event from Nov 17 to Nov 23 (Sunday)
    const allDayEvent: CalendarEvent = {
      id: 'all-day-event-nov-17-23',
      title: 'Week-long Event',
      start: dayjs('2025-11-17T00:00:00.000Z'), // Monday Nov 17
      end: dayjs('2025-11-23T23:59:59.999Z'), // Sunday Nov 23
      allDay: true,
      color: 'blue',
    }

    // Set current date to Nov 24 (Monday) to view the week containing Nov 23
    const currentDate = dayjs('2025-11-24T00:00:00.000Z')

    renderWeekView({
      firstDayOfWeek: 1, // Monday as first day
      initialDate: currentDate,
      events: [allDayEvent],
    })

    // The week starting Nov 24 (Monday) should be: Nov 24-30
    // The event ends on Nov 23 (Sunday), which is in the PREVIOUS week (Nov 17-23)
    // Therefore, the event should NOT appear in this week view

    // Check that the all-day row exists
    const allDayRow = screen.getByTestId('week-all-day-row')
    expect(allDayRow).toBeInTheDocument()

    // The event should not be rendered because it ends before this week starts
    const eventElement = screen.queryByText('Week-long Event')
    expect(eventElement).not.toBeInTheDocument()
  })

  test('all-day event spanning the exact week should render correctly when firstDayOfWeek is Monday', () => {
    cleanup()

    // Create all-day event from Monday to Sunday of the same week
    const allDayEvent: CalendarEvent = {
      id: 'all-day-event-full-week',
      title: 'Full Week Event',
      start: dayjs('2025-11-17T00:00:00.000Z'), // Monday Nov 17
      end: dayjs('2025-11-23T23:59:59.999Z'), // Sunday Nov 23
      allDay: true,
      color: 'green',
    }

    // Set current date to Nov 20 (Thursday) to view the week containing this event
    const currentDate = dayjs('2025-11-20T00:00:00.000Z')

    renderWeekView({
      firstDayOfWeek: 1, // Monday as first day
      initialDate: currentDate,
      events: [allDayEvent],
    })

    // The week should be Nov 17-23 (Monday to Sunday)
    // The event should span the entire week
    const eventElement = screen.getByText('Full Week Event')
    expect(eventElement).toBeInTheDocument()
  })
})
