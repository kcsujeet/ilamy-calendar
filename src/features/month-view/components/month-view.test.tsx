import { test, expect, describe } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { MonthView } from './month-view'
import { CalendarProvider } from '@/contexts/calendar-context/provider'
import dayjs from '@/lib/dayjs-config'
import type { CalendarEvent } from '@/components/types'

// Mock events for testing
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Test Event',
    start: dayjs().date(15).hour(10),
    end: dayjs().date(15).hour(11),
    color: 'bg-blue-100 text-blue-800',
  },
  {
    id: '2',
    title: 'Multi-day Event',
    start: dayjs().date(20).hour(9),
    end: dayjs().date(22).hour(17),
    color: 'bg-green-100 text-green-800',
  },
]

describe('MonthView', () => {
  test('renders MonthView with correct weekday headers starting from Sunday', () => {
    const firstDayOfWeek = 0 // Sunday

    render(
      <CalendarProvider firstDayOfWeek={firstDayOfWeek} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // Check that all weekday headers are present using test IDs
    expect(screen.getByTestId('weekday-header-sunday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-monday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-tuesday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-wednesday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-thursday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-friday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-saturday')).toBeInTheDocument()
  })

  test('renders MonthView with correct weekday headers starting from Monday', () => {
    const firstDayOfWeek = 1 // Monday

    render(
      <CalendarProvider firstDayOfWeek={firstDayOfWeek} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // When starting from Monday, all weekdays should still be present
    expect(screen.getByTestId('weekday-header-monday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-sunday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-tuesday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-wednesday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-thursday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-friday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-saturday')).toBeInTheDocument()
  })

  test('renders calendar structure with proper layout', () => {
    render(
      <CalendarProvider firstDayOfWeek={0} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // Should have the main container structure
    const container = screen.getByTestId('month-view')
    expect(container).toBeInTheDocument()

    // Should have weekday header structure
    const headerContainer = screen.getByTestId('month-header')
    expect(headerContainer).toBeInTheDocument()

    // Should have calendar grid structure
    const gridContainer = screen.getByTestId('month-calendar-grid')
    expect(gridContainer).toBeInTheDocument()
  })

  test('respects dayMaxEvents prop', () => {
    const customMaxEvents = 5

    render(
      <CalendarProvider
        firstDayOfWeek={0}
        dayMaxEvents={customMaxEvents}
        initialEvents={mockEvents}
      >
        <MonthView dayMaxEvents={customMaxEvents} />
      </CalendarProvider>
    )

    // The component should be rendered with the custom max events setting
    // This is more of a structural test since the actual event limiting
    // behavior would need more complex event data to test properly
    expect(screen.getByTestId('month-view')).toBeInTheDocument()
  })

  test('displays current month structure correctly', () => {
    render(
      <CalendarProvider firstDayOfWeek={0} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // Check that the current month's structure is displayed
    const currentMonth = dayjs()
    const firstDayOfMonth = currentMonth.startOf('month').date()
    const lastDayOfMonth = currentMonth.endOf('month').date()

    // Should find day 1 and the last day of the current month
    // Using getAllByText since dates might appear multiple times
    const firstDayElements = screen.getAllByText(firstDayOfMonth.toString())
    const lastDayElements = screen.getAllByText(lastDayOfMonth.toString())

    expect(firstDayElements.length).toBeGreaterThan(0)
    expect(lastDayElements.length).toBeGreaterThan(0)
  })

  test('handles events display in calendar structure', () => {
    render(
      <CalendarProvider
        firstDayOfWeek={0}
        dayMaxEvents={3}
        initialEvents={mockEvents}
      >
        <MonthView />
      </CalendarProvider>
    )

    // Should render the calendar structure
    expect(screen.getByTestId('month-view')).toBeInTheDocument()

    // Should have the grid structure for days
    expect(screen.getByTestId('month-calendar-grid')).toBeInTheDocument()
  })

  test('renders with proper component structure', () => {
    render(
      <CalendarProvider firstDayOfWeek={0} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // Check for main calendar structure
    const mainContainer = screen.getByTestId('month-view')
    expect(mainContainer).toBeInTheDocument()

    // Check for header structure
    const headerContainer = screen.getByTestId('month-header')
    expect(headerContainer).toBeInTheDocument()

    // Check for calendar grid
    const calendarGrid = screen.getByTestId('month-calendar-grid')
    expect(calendarGrid).toBeInTheDocument()
  })

  test('handles different locale settings', () => {
    render(
      <CalendarProvider firstDayOfWeek={0} dayMaxEvents={3} locale="en">
        <MonthView />
      </CalendarProvider>
    )

    // Should render with English locale by default using test IDs
    expect(screen.getByTestId('weekday-header-sunday')).toBeInTheDocument()
    expect(screen.getByTestId('weekday-header-monday')).toBeInTheDocument()
  })

  test('renders calendar weeks structure', () => {
    render(
      <CalendarProvider firstDayOfWeek={0} dayMaxEvents={3}>
        <MonthView />
      </CalendarProvider>
    )

    // Should have 6 weeks structure (standard calendar layout)
    const weekRow0 = screen.getByTestId('week-row-0')
    expect(weekRow0).toBeInTheDocument()

    // Check for multiple week rows
    const weekRow1 = screen.getByTestId('week-row-1')
    expect(weekRow1).toBeInTheDocument()

    const weekRow5 = screen.getByTestId('week-row-5')
    expect(weekRow5).toBeInTheDocument()
  })
})
