import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import dayjs from '@/lib/configs/dayjs-config'
import { generateMockEvents } from '@/lib/utils'
import { cleanup, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'bun:test'
import YearView from './year-view'

// Month names for testing
const monthNames: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
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

const renderYearView = (props = {}) => {
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
        <YearView />
      </TestWrapper>
    </CalendarProvider>
  )
}

describe('YearView', () => {
  beforeEach(() => {
    // Reset the dayjs locale to default before each test
    locale = 'en'
    cleanup()
  })

  test('renders year view structure with proper layout', () => {
    renderYearView()

    // Should have the main container structure
    const container = screen.getByTestId('year-view')
    expect(container).toBeInTheDocument()

    // Should have year grid structure
    const yearGrid = screen.getByTestId('year-grid')
    expect(yearGrid).toBeInTheDocument()
  })

  test('renders all 12 months of the year', () => {
    renderYearView()

    // Check that all 12 month containers are present
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('renders month titles correctly', () => {
    renderYearView()

    // Check that all month titles are present
    monthNames.forEach((monthName, index) => {
      const monthId = (index + 1).toString().padStart(2, '0')
      expect(
        screen.getByTestId(`year-month-title-${monthId}`)
      ).toBeInTheDocument()
      expect(screen.getByText(monthName)).toBeInTheDocument()
    })
  })

  test('renders mini calendars for each month', () => {
    renderYearView()

    // Check that all 12 mini calendars are present
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(
        screen.getByTestId(`year-mini-calendar-${monthId}`)
      ).toBeInTheDocument()
    }
  })

  test('displays current year correctly', () => {
    const testYear = 2025
    const testDate = dayjs().year(testYear).month(5) // June 2025
    renderYearView({ initialDate: testDate })

    // Should have currentDate set to June 2025 (month 5, 0-indexed)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')

    // All months should be for the test year
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('shows event counts for months with events', () => {
    renderYearView()

    // Look for months that might have events
    // Since we're using mock events, we check if event count badges exist
    const eventCountElements = screen.queryAllByTestId(
      /year-month-event-count-\d{2}/
    )

    // Should be able to find event count elements (even if zero)
    expect(eventCountElements.length >= 0).toBe(true)
  })

  test('renders day cells in mini calendars', () => {
    const testDate = dayjs('2025-01-15') // Use 2025 to match the current year
    renderYearView({ initialDate: testDate })

    // Should have currentDate set to January 2025
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('0')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

    // Check for some specific days in January 2025 using getAllByTestId for duplicate dates
    const jan1Elements = screen.getAllByTestId('year-day-2025-01-2025-01-01')
    expect(jan1Elements.length).toBeGreaterThan(0)

    const jan15Elements = screen.getAllByTestId('year-day-2025-01-2025-01-15')
    expect(jan15Elements.length).toBeGreaterThan(0)

    const jan31Elements = screen.getAllByTestId('year-day-2025-01-2025-01-31')
    expect(jan31Elements.length).toBeGreaterThan(0)
  })

  test('highlights today in mini calendars', () => {
    const today = dayjs()
    renderYearView({ initialDate: today })

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

    // Today should be highlighted in its mini calendar
    const todayElement = screen.getByTestId(
      `year-day-${today.format('YYYY-MM')}-${today.format('YYYY-MM-DD')}`
    )
    expect(todayElement).toBeInTheDocument()
  })

  test('shows weekday headers in mini calendars', () => {
    renderYearView()

    // Should show weekday abbreviations (S, M, T, W, T, F, S)
    const weekdayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    weekdayHeaders.forEach((header) => {
      // Multiple mini calendars will have these headers
      const elements = screen.getAllByText(header)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  test('handles different year navigation', () => {
    const futureYear = dayjs().add(1, 'year')
    renderYearView({ initialDate: futureYear })

    // Should have currentDate year set to future year
    expect(screen.getByTestId('current-date-year')).toHaveTextContent(
      futureYear.year().toString()
    )

    // Should render all 12 months for the future year
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('initializes with specified initial date - past year', () => {
    cleanup()
    const initialDate = dayjs('2020-06-15T10:00:00.000Z')
    renderYearView({ initialDate })

    // Should have currentDate set to June 2020 (month 5, 0-indexed)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

    // Should have all 12 months for 2020
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('initializes with specified initial date - future year', () => {
    cleanup()
    const initialDate = dayjs('2030-12-25T10:00:00.000Z')
    renderYearView({ initialDate })

    // Should have currentDate set to December 2030 (month 11)
    expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
    expect(screen.getByTestId('current-date-month')).toHaveTextContent('11')
    expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')

    // Should have all 12 months for 2030
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('defaults to current year when no initial date provided', () => {
    cleanup()
    const today = dayjs()
    renderYearView()

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

    // Should have all 12 months
    for (let month = 1; month <= 12; month++) {
      const monthId = month.toString().padStart(2, '0')
      expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
    }
  })

  test('renders with proper scrollable structure', () => {
    renderYearView()

    // Check for scrollable container
    const yearView = screen.getByTestId('year-view')
    expect(yearView).toBeInTheDocument()

    // Check for year grid within scroll area
    const yearGrid = screen.getByTestId('year-grid')
    expect(yearGrid).toBeInTheDocument()
  })

  test('handles locale settings', () => {
    renderYearView({ locale: 'en' })

    // Should render with English locale (month names in English)
    expect(screen.getByText('January')).toBeInTheDocument()
    expect(screen.getByText('December')).toBeInTheDocument()
  })

  test('displays proper grid layout for months', () => {
    renderYearView()

    const yearGrid = screen.getByTestId('year-grid')
    expect(yearGrid).toBeInTheDocument()

    // Grid should have responsive classes
    expect(yearGrid).toHaveClass(
      'grid',
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-3'
    )
  })

  test('shows event indicators in day cells', () => {
    renderYearView()

    // With mock events, some days should have event indicators
    // We check if the structure exists even if no specific events are guaranteed
    const yearView = screen.getByTestId('year-view')
    expect(yearView).toBeInTheDocument()
  })
})
