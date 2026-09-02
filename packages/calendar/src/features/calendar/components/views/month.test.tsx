import { beforeEach, describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { useSmartCalendarContext } from '@/features/calendar/hooks/use-smart-calendar-context'
import { generateMockEvents } from '@/testing/generator'
import { MonthView } from '@/testing/view-harnesses'

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
	const { currentDate } = useSmartCalendarContext()
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
		const container = screen.getByTestId('horizontal-grid-scroll')
		expect(container).toBeInTheDocument()

		// Should have weekday header structure
		const headerContainer = screen.getByTestId('month-header')
		expect(headerContainer).toBeInTheDocument()

		// Should have calendar grid structure
		const gridContainer = screen.getByTestId('horizontal-grid-body')
		expect(gridContainer).toBeInTheDocument()
	})

	test('renders MonthView with correct weekday headers starting from Sunday', () => {
		// Check that all weekday headers are present using test IDs
		weekDays.forEach((day) => {
			expect(
				screen.getByTestId(`month-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		})
	})

	test('animates the weekday label only, leaving the header cell static', () => {
		cleanup()
		renderMonthView()

		const cell = screen.getByTestId('month-header-weekday-mon')
		const animated = cell.querySelector('.animate-in')

		// The cell keeps its background and layout; only the text inside enters,
		// matching the year view. No stagger.
		expect(cell.className).not.toContain('animate-in')
		expect(animated).not.toBeNull()
		expect(animated?.textContent).toBe('Mon')
		expect((animated as HTMLElement).style.animationDelay).toBe('0s')

		// The cell centers the wrapper. Without this the inline-block wrapper
		// sits on the text baseline and the label rides high in the row.
		expect(cell.className).toContain('items-center')
	})

	test('renders MonthView with correct weekday headers starting from Monday', () => {
		cleanup() // Clean up previous renders
		const { container } = renderMonthView({ firstDayOfWeek: 1 }) // Set Monday as first day of week

		// When starting from Monday, all weekdays should still be present
		weekDays.forEach((day) => {
			expect(
				screen.getByTestId(`month-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		})

		const monthHeader = container.querySelector('[data-testid="month-header"]')
		// first day of week should be Monday
		if (!monthHeader) throw new Error('monthHeader not found')
		expect(monthHeader.firstChild).toHaveAttribute(
			'data-testid',
			'month-header-weekday-mon'
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

	test('opens all-events dialog listing every event of the day via the more link', () => {
		cleanup()
		const day = dayjs('2025-06-10T00:00:00.000Z')
		const titles = ['Standup', 'Design Sync', 'Code Review', 'Retro']
		const dayEvents: CalendarEvent[] = titles.map((title, index) => ({
			id: `dialog-event-${index}`,
			title,
			start: day.hour(9 + index),
			end: day.hour(10 + index),
		}))

		renderMonthView({ events: dayEvents, initialDate: day })

		// dayMaxEvents is 3, so one event overflows into the more link
		fireEvent.click(screen.getByText('+1 more'))

		const dialog = screen.getByRole('dialog')
		expect(
			within(dialog).getByText(day.format('MMMM D, YYYY'))
		).toBeInTheDocument()
		titles.forEach((title) => {
			expect(within(dialog).getByText(title)).toBeInTheDocument()
		})
	})

	// The month grid pads its first and last rows with days from the
	// neighbouring months so every week is seven cells wide. Those cells are
	// context, not part of the month being edited. What they do about it is
	// `outsidePeriodBehavior`; the default is to stay out of the way.
	describe('days padded in from the neighbouring months', () => {
		// March 2025 starts on a Saturday, so the first row is padded with
		// 23-28 February and the last with 1-5 April.
		const march = dayjs('2025-03-15T00:00:00.000Z')
		const cellOn = (date: string) => screen.getByTestId(`day-cell-${date}`)

		const renderMarch = (props = {}) => {
			cleanup()
			renderMonthView({ initialDate: march, ...props })
		}

		test('are disabled by default', () => {
			renderMarch()

			expect(cellOn('2025-02-26').dataset.disabled).toBe('true')
			expect(cellOn('2025-04-02').dataset.disabled).toBe('true')
			// A day the month actually owns stays interactive.
			expect(cellOn('2025-03-12').dataset.disabled).toBe('false')
		})

		test('are ordinary cells when interactive', () => {
			renderMarch({ outsidePeriodBehavior: 'interactive' })

			expect(cellOn('2025-02-26').dataset.disabled).toBe('false')
			expect(cellOn('2025-04-02').dataset.disabled).toBe('false')
		})

		test('open the create flow when interactive, rather than navigating', () => {
			const onCellClick = mock(() => {})
			renderMarch({ outsidePeriodBehavior: 'interactive', onCellClick })

			fireEvent.click(cellOn('2025-04-02'))

			expect(onCellClick).toHaveBeenCalledTimes(1)
		})

		test('move the calendar to that day when navigate', () => {
			const onDateChange = mock(() => {})
			renderMarch({ outsidePeriodBehavior: 'navigate', onDateChange })

			fireEvent.click(cellOn('2025-04-02'))

			// The grid now shows April, so the header follows the click.
			expect(screen.getByTestId('current-date-month')).toHaveTextContent('3')
			expect(onDateChange).toHaveBeenCalled()
		})

		test('do not also open the create flow when navigate', () => {
			const onCellClick = mock(() => {})
			renderMarch({ outsidePeriodBehavior: 'navigate', onCellClick })

			fireEvent.click(cellOn('2025-04-02'))

			// One click, one answer: arriving in April is the whole action.
			expect(onCellClick).not.toHaveBeenCalled()
		})

		test('leave days the month owns alone in every mode', () => {
			const onCellClick = mock(() => {})
			renderMarch({ outsidePeriodBehavior: 'navigate', onCellClick })

			fireEvent.click(cellOn('2025-03-12'))

			expect(onCellClick).toHaveBeenCalledTimes(1)
		})
	})
})

const resourceList: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const renderResourceMonthHorizontal = (props = {}) =>
	render(
		<CalendarProvider
			dayMaxEvents={dayMaxEvents}
			events={mockEvents}
			initialView="month"
			orientation="horizontal"
			resources={resourceList}
			{...props}
		>
			<CalendarDndContext>
				<MonthView />
			</CalendarDndContext>
		</CalendarProvider>
	)

describe('ResourceMonthHorizontal', () => {
	// Regression for #205: the resource month (horizontal) header must highlight
	// today, the same way the resource week header does. Only the header renders a
	// today-aware DayLabel in this arrangement, so exactly one cell is highlighted.
	test('highlights today in the day header', () => {
		cleanup()
		const today = dayjs()

		const { container } = renderResourceMonthHorizontal({ initialDate: today })

		const highlighted = container.querySelectorAll('[data-today="true"]')
		expect(highlighted).toHaveLength(1)
		expect(highlighted.item(0)).toHaveTextContent(today.format('D'))
	})
})
