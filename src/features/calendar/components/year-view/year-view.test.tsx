import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import YearView from './year-view'

const monthNames = [
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

// Create specific events for testing event counts and dots
const createTestEvents = (year: number): CalendarEvent[] => [
	// January: 3 events on Jan 15
	{
		id: '1',
		title: 'Jan Event 1',
		start: dayjs(`${year}-01-15T09:00:00.000Z`),
		end: dayjs(`${year}-01-15T10:00:00.000Z`),
	},
	{
		id: '2',
		title: 'Jan Event 2',
		start: dayjs(`${year}-01-15T11:00:00.000Z`),
		end: dayjs(`${year}-01-15T12:00:00.000Z`),
	},
	{
		id: '3',
		title: 'Jan Event 3',
		start: dayjs(`${year}-01-15T14:00:00.000Z`),
		end: dayjs(`${year}-01-15T15:00:00.000Z`),
	},
	// January: 2 events on Jan 20
	{
		id: '4',
		title: 'Jan Event 4',
		start: dayjs(`${year}-01-20T09:00:00.000Z`),
		end: dayjs(`${year}-01-20T10:00:00.000Z`),
	},
	{
		id: '5',
		title: 'Jan Event 5',
		start: dayjs(`${year}-01-20T11:00:00.000Z`),
		end: dayjs(`${year}-01-20T12:00:00.000Z`),
	},
	// January: 1 event on Jan 25
	{
		id: '6',
		title: 'Jan Event 6',
		start: dayjs(`${year}-01-25T09:00:00.000Z`),
		end: dayjs(`${year}-01-25T10:00:00.000Z`),
	},
	// February: 1 event
	{
		id: '7',
		title: 'Feb Event',
		start: dayjs(`${year}-02-10T09:00:00.000Z`),
		end: dayjs(`${year}-02-10T10:00:00.000Z`),
	},
	// March: 5 events (to test 3+ dots)
	{
		id: '8',
		title: 'Mar Event 1',
		start: dayjs(`${year}-03-05T09:00:00.000Z`),
		end: dayjs(`${year}-03-05T10:00:00.000Z`),
	},
	{
		id: '9',
		title: 'Mar Event 2',
		start: dayjs(`${year}-03-05T11:00:00.000Z`),
		end: dayjs(`${year}-03-05T12:00:00.000Z`),
	},
	{
		id: '10',
		title: 'Mar Event 3',
		start: dayjs(`${year}-03-05T13:00:00.000Z`),
		end: dayjs(`${year}-03-05T14:00:00.000Z`),
	},
	{
		id: '11',
		title: 'Mar Event 4',
		start: dayjs(`${year}-03-05T15:00:00.000Z`),
		end: dayjs(`${year}-03-05T16:00:00.000Z`),
	},
	{
		id: '12',
		title: 'Mar Event 5',
		start: dayjs(`${year}-03-05T17:00:00.000Z`),
		end: dayjs(`${year}-03-05T18:00:00.000Z`),
	},
]

// Test wrapper to capture context values and view changes
const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId: string
}) => {
	const { currentDate, view } = useCalendarContext()
	return (
		<>
			<div data-testid={`${testId}-year`}>{currentDate.year()}</div>
			<div data-testid={`${testId}-month`}>{currentDate.month()}</div>
			<div data-testid={`${testId}-date`}>{currentDate.date()}</div>
			<div data-testid={`${testId}-view`}>{view}</div>
			{children}
		</>
	)
}

const renderYearView = (props: Record<string, unknown> = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			firstDayOfWeek={0}
			locale="en"
			{...props}
		>
			<TestWrapper testId="ctx">
				<YearView />
			</TestWrapper>
		</CalendarProvider>
	)
}

describe('YearView', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('Basic Structure', () => {
		test('renders year view with scroll area and grid', () => {
			renderYearView()
			expect(screen.getByTestId('year-view')).toBeInTheDocument()
			expect(screen.getByTestId('year-grid')).toBeInTheDocument()
		})

		test('renders all 12 months', () => {
			renderYearView()
			for (let month = 1; month <= 12; month++) {
				const monthId = month.toString().padStart(2, '0')
				expect(screen.getByTestId(`year-month-${monthId}`)).toBeInTheDocument()
			}
		})

		test('renders correct month titles', () => {
			renderYearView()
			monthNames.forEach((name, i) => {
				const monthId = (i + 1).toString().padStart(2, '0')
				const title = screen.getByTestId(`year-month-title-${monthId}`)
				expect(title).toHaveTextContent(name)
			})
		})

		test('renders mini calendar for each month', () => {
			renderYearView()
			for (let month = 1; month <= 12; month++) {
				const monthId = month.toString().padStart(2, '0')
				expect(
					screen.getByTestId(`year-mini-calendar-${monthId}`)
				).toBeInTheDocument()
			}
		})

		test('renders weekday headers in each mini calendar', () => {
			renderYearView()
			// Each of 12 months has 7 day headers
			const sundayHeaders = screen.getAllByText('S')
			expect(sundayHeaders.length).toBe(24) // 2 S's per month * 12 months
		})

		test('renders grid with responsive classes', () => {
			renderYearView()
			const grid = screen.getByTestId('year-grid')
			expect(grid).toHaveClass(
				'grid',
				'grid-cols-1',
				'sm:grid-cols-2',
				'lg:grid-cols-3'
			)
		})
	})

	describe('Event Count Badge', () => {
		test('displays correct event count for month with 6 events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-15`) })

			// January has 6 events total
			const badge = screen.getByTestId('year-month-event-count-01')
			expect(badge).toHaveTextContent('6 Events')
		})

		test('displays singular "event" for month with 1 event', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-02-10`) })

			// February has 1 event
			const badge = screen.getByTestId('year-month-event-count-02')
			expect(badge).toHaveTextContent('1 Event')
		})

		test('displays correct event count for month with 5 events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-03-05`) })

			// March has 5 events
			const badge = screen.getByTestId('year-month-event-count-03')
			expect(badge).toHaveTextContent('5 Events')
		})

		test('does not show badge for months with no events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-04-01`) })

			// April has no events
			expect(
				screen.queryByTestId('year-month-event-count-04')
			).not.toBeInTheDocument()
		})

		test('badge has correct styling', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-15`) })

			const badge = screen.getByTestId('year-month-event-count-01')
			expect(badge).toHaveClass(
				'bg-primary',
				'text-primary-foreground',
				'rounded-full'
			)
		})
	})

	describe('Event Dots', () => {
		test('shows 1 dot for day with 1 event', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-25`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-25')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')
			expect(dots.length).toBe(1)
		})

		test('shows 2 dots for day with 2 events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-20`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-20')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')
			expect(dots.length).toBe(2)
		})

		test('shows 3 dots for day with 3 events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-15`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-15')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')
			expect(dots.length).toBe(3)
		})

		test('shows max 3 dots for day with 5+ events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-03-05`) })

			const dayCell = screen.getByTestId('year-day-2025-03-2025-03-05')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')
			expect(dots.length).toBe(3) // Max 3 dots even with 5 events
		})

		test('shows no dots for day with no events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-10`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-10')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')
			expect(dots.length).toBe(0)
		})

		test('dots have correct colors', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-15`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-15')
			const dots = dayCell.querySelectorAll('.rounded-full.h-\\[3px\\]')

			expect(dots[0]).toHaveClass('bg-primary')
			expect(dots[1]).toHaveClass('bg-blue-500')
			expect(dots[2]).toHaveClass('bg-green-500')
		})
	})

	describe('Day Cell Title Attribute', () => {
		test('shows correct title for day with 1 event', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-25`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-25')
			expect(dayCell).toHaveAttribute('title', '1 Event')
		})

		test('shows correct title for day with multiple events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-15`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-15')
			expect(dayCell).toHaveAttribute('title', '3 Events')
		})

		test('shows empty title for day with no events', () => {
			const year = 2025
			const events = createTestEvents(year)
			renderYearView({ events, initialDate: dayjs(`${year}-01-10`) })

			const dayCell = screen.getByTestId('year-day-2025-01-2025-01-10')
			expect(dayCell).toHaveAttribute('title', '')
		})
	})

	describe('Day Cell Styling', () => {
		test('today has primary background styling', () => {
			const today = dayjs()
			renderYearView({ initialDate: today })

			const todayCell = screen.getByTestId(
				`year-day-${today.format('YYYY-MM')}-${today.format('YYYY-MM-DD')}`
			)
			expect(todayCell).toHaveClass(
				'bg-primary',
				'text-primary-foreground',
				'rounded-full'
			)
		})

		test('current selected date (not today) has muted background', () => {
			const selectedDate = dayjs('2025-06-15')
			const today = dayjs()

			// Only test if selected date is not today
			if (!selectedDate.isSame(today, 'day')) {
				renderYearView({ initialDate: selectedDate })

				const selectedCell = screen.getByTestId('year-day-2025-06-2025-06-15')
				expect(selectedCell).toHaveClass(
					'bg-muted',
					'rounded-full',
					'font-bold'
				)
			}
		})

		test('days outside current month have muted styling', () => {
			// January 2025 starts on Wednesday, so Dec 29-31 2024 appear in the grid
			renderYearView({ initialDate: dayjs('2025-01-15') })

			const prevMonthDay = screen.getByTestId('year-day-2025-01-2024-12-29')
			expect(prevMonthDay).toHaveClass('text-muted-foreground', 'opacity-50')
		})

		test('days with events have font-medium class', () => {
			const year = 2025
			const events = createTestEvents(year)
			const today = dayjs()

			// Use a day that has events but is not today
			const testDate = dayjs(`${year}-01-25`)
			if (!testDate.isSame(today, 'day')) {
				renderYearView({ events, initialDate: dayjs(`${year}-02-01`) })

				const eventDay = screen.getByTestId('year-day-2025-01-2025-01-25')
				expect(eventDay).toHaveClass('font-medium')
			}
		})
	})

	describe('Click Interactions', () => {
		test('clicking month title navigates to month view', () => {
			renderYearView({ initialDate: dayjs('2025-01-15') })

			const monthTitle = screen.getByTestId('year-month-title-03')
			fireEvent.click(monthTitle)

			// Should change view to 'month'
			expect(screen.getByTestId('ctx-view')).toHaveTextContent('month')
			// Should update currentDate to March
			expect(screen.getByTestId('ctx-month')).toHaveTextContent('2')
		})

		test('clicking day cell navigates to day view', () => {
			renderYearView({ initialDate: dayjs('2025-01-15') })

			const dayCell = screen.getByTestId('year-day-2025-03-2025-03-10')
			fireEvent.click(dayCell)

			// Should change view to 'day'
			expect(screen.getByTestId('ctx-view')).toHaveTextContent('day')
			// Should update currentDate to March 10
			expect(screen.getByTestId('ctx-month')).toHaveTextContent('2')
			expect(screen.getByTestId('ctx-date')).toHaveTextContent('10')
		})

		test('day click does not bubble to month click', () => {
			renderYearView({ initialDate: dayjs('2025-01-15') })

			const dayCell = screen.getByTestId('year-day-2025-03-2025-03-10')
			fireEvent.click(dayCell)

			// Should be day view, not month view
			expect(screen.getByTestId('ctx-view')).toHaveTextContent('day')
		})
	})

	describe('Year Navigation', () => {
		test('displays correct year from initialDate', () => {
			renderYearView({ initialDate: dayjs('2030-06-15') })
			expect(screen.getByTestId('ctx-year')).toHaveTextContent('2030')
		})

		test('defaults to current year when no initialDate', () => {
			renderYearView()
			expect(screen.getByTestId('ctx-year')).toHaveTextContent(
				dayjs().year().toString()
			)
		})

		test('renders days for the correct year', () => {
			renderYearView({ initialDate: dayjs('2030-01-15') })

			// Should have January 2030 days
			expect(
				screen.getByTestId('year-day-2030-01-2030-01-01')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('year-day-2030-01-2030-01-31')
			).toBeInTheDocument()
		})
	})

	describe('Mini Calendar Structure', () => {
		test('each mini calendar has 42 day cells (6 weeks)', () => {
			renderYearView({ initialDate: dayjs('2025-01-15') })

			const januaryCalendar = screen.getByTestId('year-mini-calendar-01')
			const buttons = januaryCalendar.querySelectorAll('button[type="button"]')
			expect(buttons.length).toBe(42)
		})

		test('mini calendar includes days from adjacent months', () => {
			// January 2025 starts on Wednesday
			renderYearView({ initialDate: dayjs('2025-01-15') })

			// Should include December 2024 days
			expect(
				screen.getByTestId('year-day-2025-01-2024-12-29')
			).toBeInTheDocument()
			// Should include February 2025 days
			expect(
				screen.getByTestId('year-day-2025-01-2025-02-01')
			).toBeInTheDocument()
		})
	})
})
