import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { useCalendarContext } from '@/features/calendar/contexts/calendar-context/context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
import YearView from './year-view'

// Mock events for testing - Use UTC to avoid timezone issues
const mockEvents: CalendarEvent[] = [
	// January
	{
		id: '1',
		title: 'New Year Party',
		start: dayjs.utc('2025-01-01T10:00:00Z'),
		end: dayjs.utc('2025-01-01T11:00:00Z'),
		color: 'blue',
	},
	// February
	{
		id: '2',
		title: 'Team Meeting',
		start: dayjs.utc('2025-02-15T14:00:00Z'),
		end: dayjs.utc('2025-02-15T15:00:00Z'),
		color: 'red',
	},
	{
		id: '3',
		title: 'Project Deadline',
		start: dayjs.utc('2025-02-28T09:00:00Z'),
		end: dayjs.utc('2025-02-28T17:00:00Z'),
		color: 'green',
	},
	// March (multiple events on same day)
	{
		id: '4',
		title: 'Event A',
		start: dayjs.utc('2025-03-10T10:00:00Z'),
		end: dayjs.utc('2025-03-10T11:00:00Z'),
		color: 'purple',
	},
	{
		id: '5',
		title: 'Event B',
		start: dayjs.utc('2025-03-10T12:00:00Z'),
		end: dayjs.utc('2025-03-10T13:00:00Z'),
		color: 'orange',
	},
	{
		id: '6',
		title: 'Event C',
		start: dayjs.utc('2025-03-10T15:00:00Z'),
		end: dayjs.utc('2025-03-10T16:00:00Z'),
		color: 'pink',
	},
	{
		id: '7',
		title: 'Event D',
		start: dayjs.utc('2025-03-10T18:00:00Z'),
		end: dayjs.utc('2025-03-10T19:00:00Z'),
		color: 'teal',
	},
	{
		id: '8',
		title: 'Event E',
		start: dayjs.utc('2025-03-10T20:00:00Z'),
		end: dayjs.utc('2025-03-10T21:00:00Z'),
		color: 'cyan',
	},
]

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

const renderYearView = (props = {}) => {
	const onDateChange = vi.fn()
	const onViewChange = vi.fn()
	const testId = 'current-date'

	const renderResult = render(
		<CalendarProvider
			events={mockEvents}
			initialDate={dayjs.utc('2025-01-01')}
			onDateChange={onDateChange}
			onViewChange={onViewChange}
			{...props}
		>
			<TestWrapper testId={testId}>
				<YearView />
			</TestWrapper>
		</CalendarProvider>
	)

	return {
		...renderResult,
		onDateChange,
		onViewChange,
	}
}

describe('YearView', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('Basic Structure', () => {
		test('renders year view with scroll area and grid', () => {
			renderYearView()
			expect(screen.getByTestId(ids.yearView.container)).toBeInTheDocument()
			expect(screen.getByTestId(ids.yearView.grid)).toBeInTheDocument()
		})

		test('renders all 12 months', () => {
			renderYearView()
			const monthElements = screen.getAllByTestId(/year-month-\d{2}/)
			expect(monthElements).toHaveLength(12)
		})

		test('renders correct month titles', () => {
			renderYearView()
			expect(screen.getByText('January')).toBeInTheDocument()
			expect(screen.getByText('December')).toBeInTheDocument()
		})

		test('renders mini calendar for each month', () => {
			renderYearView()
			const miniCalendars = screen.getAllByTestId(/year-mini-calendar-\d{2}/)
			expect(miniCalendars).toHaveLength(12)
		})

		test('renders weekday headers in each mini calendar', () => {
			renderYearView()
			const miniCalendars = screen.getAllByTestId(/year-mini-calendar-\d{2}/)
			miniCalendars.forEach((calendar) => {
				const weekdayHeaders = Array.from(calendar.children).slice(0, 7)
				expect(weekdayHeaders).toHaveLength(7)
				expect(weekdayHeaders.map((el) => el.textContent?.trim())).toEqual([
					'S',
					'M',
					'T',
					'W',
					'T',
					'F',
					'S',
				])
			})
		})

		test('renders grid with responsive classes', () => {
			renderYearView()
			const grid = screen.getByTestId(ids.yearView.grid)
			expect(grid.className).toContain('sm:grid-cols-2')
			expect(grid.className).toContain('lg:grid-cols-3')
		})
	})

	describe('Event Count Badge', () => {
		test('displays correct event count for month with 6 events', async () => {
			const eventsWithSixInJan = [
				...mockEvents,
				{
					id: '10',
					title: 'Extra 1',
					start: dayjs.utc('2025-01-05'),
					end: dayjs.utc('2025-01-05'),
				},
				{
					id: '11',
					title: 'Extra 2',
					start: dayjs.utc('2025-01-10'),
					end: dayjs.utc('2025-01-10'),
				},
				{
					id: '12',
					title: 'Extra 3',
					start: dayjs.utc('2025-01-15'),
					end: dayjs.utc('2025-01-15'),
				},
				{
					id: '13',
					title: 'Extra 4',
					start: dayjs.utc('2025-01-20'),
					end: dayjs.utc('2025-01-20'),
				},
				{
					id: '14',
					title: 'Extra 5',
					start: dayjs.utc('2025-01-25'),
					end: dayjs.utc('2025-01-25'),
				},
			]
			renderYearView({ events: eventsWithSixInJan })
			const badge = await screen.findByTestId(ids.yearView.eventCount('01'))
			expect(badge.textContent?.toLowerCase()).toContain('6 events')
		})

		test('displays singular "event" for month with 1 event', async () => {
			renderYearView()
			const badge = await screen.findByTestId(ids.yearView.eventCount('01'))
			expect(badge.textContent?.toLowerCase()).toContain('1 event')
		})

		test('displays correct event count for month with 5 events', async () => {
			renderYearView()
			// March is month 03
			const badge = await screen.findByTestId(ids.yearView.eventCount('03'))
			expect(badge.textContent?.toLowerCase()).toContain('5 events')
		})

		test('does not show badge for months with no events', () => {
			renderYearView()
			// April is month 04
			const badge = screen.queryByTestId(ids.yearView.eventCount('04'))
			expect(badge).not.toBeInTheDocument()
		})
	})

	describe('Event Dots', () => {
		test('shows 1 dot for day with 1 event', () => {
			renderYearView()
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-01-01'))
			)
			const dotsContainer = within(dayCell).getByTestId('event-dots')
			const dots = dotsContainer.querySelectorAll('span')
			expect(dots).toHaveLength(1)
		})

		test('shows 2 dots for day with 2 events', () => {
			const eventsWithTwo = [
				...mockEvents,
				{
					id: '10',
					title: 'Another Event',
					start: dayjs.utc('2025-02-15T16:00:00Z'),
					end: dayjs.utc('2025-02-15T17:00:00Z'),
				},
			]
			renderYearView({ events: eventsWithTwo })
			const monthContainer = screen.getByTestId(ids.yearView.month('02'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-02-15'))
			)
			const dotsContainer = within(dayCell).getByTestId('event-dots')
			const dots = dotsContainer.querySelectorAll('span')
			expect(dots).toHaveLength(2)
		})

		test('shows 3 dots for day with 3 events', () => {
			renderYearView()
			const monthContainer = screen.getByTestId(ids.yearView.month('03'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-03-10'))
			)
			const dotsContainer = within(dayCell).getByTestId('event-dots')
			const dots = dotsContainer.querySelectorAll('span')
			expect(dots).toHaveLength(3)
		})

		test('shows max 3 dots for day with 5+ events', () => {
			renderYearView()
			const monthContainer = screen.getByTestId(ids.yearView.month('03'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-03-10'))
			)
			const dotsContainer = within(dayCell).getByTestId('event-dots')
			const dots = dotsContainer.querySelectorAll('span')
			expect(dots).toHaveLength(3)
		})

		test('shows no dots for day with no events', () => {
			renderYearView()
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-01-02'))
			)
			expect(
				within(dayCell).queryByTestId('event-dots')
			).not.toBeInTheDocument()
		})
	})

	describe('Day Cell Styling', () => {
		test('current selected date has muted background', () => {
			const selectedDate = dayjs.utc('2025-06-20')
			renderYearView({ initialDate: selectedDate })
			const monthContainer = screen.getByTestId(ids.yearView.month('06'))
			const selectedCell = within(monthContainer).getByTestId(
				ids.dayCell(selectedDate)
			)
			expect(selectedCell.className).toContain('bg-muted')
		})

		test('days outside current month have muted styling', () => {
			renderYearView()
			const dayOutside = dayjs.utc('2024-12-31')
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			const cell = within(monthContainer).getByTestId(ids.dayCell(dayOutside))
			expect(cell.className).toContain('text-muted-foreground')
		})

		test('days with events have font-medium class', () => {
			// Find a day with events that is not today/selected
			const eventDay = dayjs.utc('2025-02-15')
			renderYearView({ initialDate: dayjs.utc('2025-01-01') })
			const febContainer = screen.getByTestId(ids.yearView.month('02'))
			const cell = within(febContainer).getByTestId(ids.dayCell(eventDay))
			expect(cell.className).toContain('font-medium')
		})
	})

	describe('Click Interactions', () => {
		test('clicking month title navigates to month view', () => {
			const { onViewChange } = renderYearView()
			fireEvent.click(screen.getByTestId(ids.yearView.monthTitle('01')))
			expect(onViewChange).toHaveBeenCalledWith('month')
		})

		test('clicking day cell navigates to day view', () => {
			const { onViewChange, onDateChange } = renderYearView()
			const targetDate = dayjs.utc('2025-01-15')
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(targetDate)
			)
			fireEvent.click(dayCell)

			expect(onViewChange).toHaveBeenCalledWith('day')
			expect(onDateChange).toHaveBeenCalled()
		})

		test('day click does not bubble to month click', () => {
			const { onViewChange } = renderYearView()
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			fireEvent.click(
				within(monthContainer).getByTestId(ids.dayCell(dayjs.utc('2025-01-15')))
			)
			// Only onViewChange for 'day' should be called
			expect(onViewChange).toHaveBeenCalledWith('day')
			expect(onViewChange).not.toHaveBeenCalledWith('month')
		})
	})

	describe('Year Navigation', () => {
		test('displays correct year from initialDate', () => {
			renderYearView({ initialDate: dayjs.utc('2028-01-01') })
			expect(screen.getByTestId('current-date-year')).toHaveTextContent('2028')
		})

		test('renders days for the correct year', () => {
			renderYearView({ initialDate: dayjs.utc('2026-01-01') })
			const monthContainer = screen.getByTestId(ids.yearView.month('03'))
			const dayCell = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2026-03-10'))
			)
			expect(dayCell).toBeInTheDocument()
		})
	})

	describe('Mini Calendar Structure', () => {
		test('each mini calendar has 42 day cells (6 weeks)', () => {
			renderYearView()
			const miniCalendar = screen.getByTestId(ids.yearView.miniCalendar('01'))
			const dayCells = miniCalendar.querySelectorAll(
				'[data-testid^="day-cell-"]'
			)
			expect(dayCells).toHaveLength(42)
		})

		test('mini calendar includes days from adjacent months', () => {
			renderYearView() // Jan 2025
			const monthContainer = screen.getByTestId(ids.yearView.month('01'))
			const prevMonthDay = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2024-12-29'))
			)
			expect(prevMonthDay).toBeInTheDocument()
			expect(prevMonthDay.className).toContain('text-muted-foreground')

			const nextMonthDay = within(monthContainer).getByTestId(
				ids.dayCell(dayjs.utc('2025-02-08'))
			)
			expect(nextMonthDay).toBeInTheDocument()
			expect(nextMonthDay.className).toContain('text-muted-foreground')
		})
	})
})
