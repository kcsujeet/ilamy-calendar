import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { generateMockEvents } from '@/lib/utils/generator'
import { MonthView } from './month-view'

const weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Mock events for testing
const mockEvents: CalendarEvent[] = generateMockEvents()
const firstDayOfWeek = 0 // Default to Sunday
const dayMaxEvents = 3 // Default max events per day
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

const renderMonthView = (props = {}) => {
	const testId = 'current-date'
	return render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			firstDayOfWeek={firstDayOfWeek}
			locale={locale}
			{...props}
		>
			<TestWrapper testId={testId}>
				<MonthView />
			</TestWrapper>
		</CalendarProvider>
	)
}

describe('MonthView', () => {
	beforeEach(() => {
		// Reset the dayjs locale to default before each test
		locale = 'en'

		// render the MonthView with default props
		renderMonthView()
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
		const { container } = renderMonthView({ firstDayOfWeek: 1 }) // Set Monday as first day of week

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
			'weekday-header-mon'
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

	test('initializes with specified initial date - different month', () => {
		cleanup()
		const initialDate = dayjs('2025-06-15T10:00:00.000Z')
		renderMonthView({ initialDate })

		// Should have currentDate set to June 2025 (month 5, 0-indexed)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('5')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

		// Should have the specific date cell for June 15, 2025
		const june15Cell = screen.getByTestId('day-cell-2025-06-15')
		expect(june15Cell).toBeInTheDocument()
	})

	test('initializes with specified initial date - past date', () => {
		cleanup()
		const initialDate = dayjs('2020-01-15T10:00:00.000Z')
		renderMonthView({ initialDate })

		// Should have currentDate set to January 2020 (month 0)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('0')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')

		// Should have the specific date cell for January 15, 2020
		const jan15Cell = screen.getByTestId('day-cell-2020-01-15')
		expect(jan15Cell).toBeInTheDocument()
	})

	test('initializes with specified initial date - future date', () => {
		cleanup()
		const initialDate = dayjs('2030-12-25T10:00:00.000Z')
		renderMonthView({ initialDate })

		// Should have currentDate set to December 2030 (month 11)
		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('11')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')

		// Should have the specific date cell for December 25, 2030
		const dec25Cell = screen.getByTestId('day-cell-2030-12-25')
		expect(dec25Cell).toBeInTheDocument()
	})

	test('defaults to current month when no initial date provided', () => {
		cleanup()
		const today = dayjs()
		renderMonthView()

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

		// Should have the specific date cell for today
		const todayCell = screen.getByTestId(
			`day-cell-${today.format('YYYY-MM-DD')}`
		)
		expect(todayCell).toBeInTheDocument()
	})
})
