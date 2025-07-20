import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/contexts/calendar-context/provider'
import dayjs from '@/lib/dayjs-config'
import { generateMockEvents } from '@/lib/utils'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'bun:test'
import { MonthView } from './month-view'

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
const renderCalendar = (props = {}) => {
  return render(
    <CalendarProvider
      firstDayOfWeek={firstDayOfWeek}
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      locale={locale}
      {...props}
    >
      <MonthView />
    </CalendarProvider>
  )
}

describe('MonthView', () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = 'en'

    // render the MonthView with default props
    renderCalendar()
  })

  test('renders calendar structure with proper layout', () => {
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

  test('renders MonthView with correct weekday headers starting from Sunday', () => {
    // Check that all weekday headers are present using test IDs
    weekDays.forEach((day) => {
      expect(
        screen.getByTestId(`weekday-header-${day.toLowerCase()}`)
      ).toBeInTheDocument()
    })
  })

  test('renders MonthView with correct weekday headers starting from Monday', () => {
    cleanup() // Clean up previous renders
    const { container } = renderCalendar({ firstDayOfWeek: 1 }) // Set Monday as first day of week

    // When starting from Monday, all weekdays should still be present
    weekDays.forEach((day) => {
      expect(
        screen.getByTestId(`weekday-header-${day.toLowerCase()}`)
      ).toBeInTheDocument()
    })

    const monthHeader = container.querySelector('[data-testid="month-header"]')
    // first day of week should be Monday
    expect(monthHeader.firstChild).toHaveAttribute(
      'data-testid',
      'weekday-header-monday'
    )
  })

  test('displays current month structure correctly', () => {
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
})
