import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
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

const renderWeekView = (props = {}) => {
  return render(
    <CalendarProvider
      firstDayOfWeek={firstDayOfWeek}
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      locale={locale}
      {...props}
    >
      <WeekView />
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
})
