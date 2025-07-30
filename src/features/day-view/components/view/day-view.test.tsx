import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/contexts/calendar-context/provider'
import dayjs from '@/lib/dayjs-config'
import { generateMockEvents } from '@/lib/utils'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'bun:test'
import DayView from './day-view'

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents()
let firstDayOfWeek = 0 // Default to Sunday
let dayMaxEvents = 3 // Default max events per day
let locale = 'en' // Default locale

const renderDayView = (props = {}) => {
  return render(
    <CalendarProvider
      firstDayOfWeek={firstDayOfWeek}
      dayMaxEvents={dayMaxEvents}
      events={mockEvents}
      locale={locale}
      {...props}
    >
      <DayView />
    </CalendarProvider>
  )
}

describe('DayView', () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = 'en'
    cleanup()
  })

  test('renders day view structure with proper layout', () => {
    renderDayView()

    // Should have the main container structure
    const container = screen.getByTestId('day-view')
    expect(container).toBeInTheDocument()

    // Should have day header structure
    const headerContainer = screen.getByTestId('day-header')
    expect(headerContainer).toBeInTheDocument()

    // Should have all-day row structure
    const allDayContainer = screen.getByTestId('day-all-day-row')
    expect(allDayContainer).toBeInTheDocument()

    // Should have scroll area structure
    const scrollArea = screen.getByTestId('day-scroll-area')
    expect(scrollArea).toBeInTheDocument()

    // Should have time grid structure
    const timeGrid = screen.getByTestId('day-time-grid')
    expect(timeGrid).toBeInTheDocument()
  })

  test('renders time column with 24 hour slots', () => {
    renderDayView()

    const timeCol = screen.getByTestId('day-time-col')
    expect(timeCol).toBeInTheDocument()

    // Check for some specific hour slots
    expect(screen.getByTestId('day-time-hour-00')).toBeInTheDocument()
    expect(screen.getByTestId('day-time-hour-12')).toBeInTheDocument()
    expect(screen.getByTestId('day-time-hour-23')).toBeInTheDocument()
  })

  test('renders events column structure', () => {
    renderDayView()

    const eventsColumn = screen.getByTestId('day-events-column')
    expect(eventsColumn).toBeInTheDocument()

    const backgroundGrid = screen.getByTestId('day-background-grid')
    expect(backgroundGrid).toBeInTheDocument()

    const interactiveLayer = screen.getByTestId('day-interactive-layer')
    expect(interactiveLayer).toBeInTheDocument()
  })

  test('displays current date correctly in header', () => {
    // Use today's actual date since the component might be defaulting to current date
    const today = dayjs()
    renderDayView()

    const header = screen.getByTestId('day-header')
    expect(header).toBeInTheDocument()

    // Check for the current month and year that should be displayed
    const monthName = today.format('MMMM')
    const year = today.format('YYYY')

    expect(screen.getByText(new RegExp(monthName))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
  })

  test('shows today indicator for current day', () => {
    // Set the current date to today to ensure today indicator appears
    const today = dayjs()
    renderDayView({ initialDate: today.toDate() })

    // Today indicator should be present if viewing today
    const timeIndicator = screen.queryByTestId('day-current-time-indicator')

    // Should show today indicator when viewing current day
    if (today.isSame(dayjs(), 'day')) {
      expect(timeIndicator).toBeInTheDocument()
    }
  })

  //   test('does not show today indicator for other days', () => {
  //     // Set the date to a different day
  //     const otherDay = dayjs().add(1, 'day')
  //     renderDayView({ initialDate: otherDay.toDate() })

  //     // Today indicator should not be present
  //     const timeIndicator = screen.queryByTestId('day-current-time-indicator')
  //     expect(timeIndicator).toBeFalsy()
  //   })

  test('renders all-day events section', () => {
    renderDayView()

    const allDayRow = screen.getByTestId('day-all-day-row')
    expect(allDayRow).toBeInTheDocument()

    // Should have "All-day" label
    expect(screen.getByText('All-day')).toBeInTheDocument()
  })

  test('handles different locale settings', () => {
    renderDayView({ locale: 'en' })

    // Should render with English locale
    const header = screen.getByTestId('day-header')
    expect(header).toBeInTheDocument()
  })

  test('renders time grid with proper height calculation', () => {
    renderDayView()

    const timeGrid = screen.getByTestId('day-time-grid')
    expect(timeGrid).toBeInTheDocument()

    // Grid should have inline style for height calculation (24 hours * 60px)
    expect(timeGrid).toHaveStyle('height: 1440px')
  })

  test('shows today badge in header when viewing current day', () => {
    const today = dayjs()
    renderDayView({ initialDate: today.toDate() })

    // Should show "Today" badge when viewing current day
    if (today.isSame(dayjs(), 'day')) {
      expect(screen.getByText('Today')).toBeInTheDocument()
    }
  })

  //   test('does not show today badge when viewing other days', () => {
  //     const otherDay = dayjs().add(1, 'day')
  //     renderDayView({ initialDate: otherDay.toDate() })

  //     // Should not show "Today" badge for other days
  //     expect(screen.queryByText('Today')).toBeNull()
  //   })

  test('renders with proper scrollable structure', () => {
    renderDayView()

    // Check for scrollable container
    const scrollArea = screen.getByTestId('day-scroll-area')
    expect(scrollArea).toBeInTheDocument()

    // Check for time grid within scroll area
    const timeGrid = screen.getByTestId('day-time-grid')
    expect(timeGrid).toBeInTheDocument()
  })
})
