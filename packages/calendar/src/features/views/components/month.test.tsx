import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import {
	dayKey,
	endOf,
	formatDate,
	now,
	parseDate,
	startOf,
	toOffsetIso,
	withTime,
} from '@ilamy/utils/temporal'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react'
import type React from 'react'
import { CalendarProvider } from '@/app/calendar-provider'
import { CalendarDndContext } from '@/features/drag-and-drop/components/calendar-dnd-context'
import { useSmartCalendarContext } from '@/hooks/use-smart-calendar-context'
import { generateMockEvents } from '@/testing/generator'
import { MonthView } from '@/testing/view-harnesses'

const weekDays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const mockEvents: CalendarEvent[] = generateMockEvents()
const firstDayOfWeek = 0
const dayMaxEvents = 3
let locale = 'en'

const TestWrapper = ({
	children,
	testId,
}: {
	children: React.ReactNode
	testId: string
}) => {
	const { currentDate } = useSmartCalendarContext()
	const parsed = parseDate(currentDate, 'UTC')
	return (
		<>
			<div data-testid={`${testId}-year`}>{parsed?.year}</div>
			<div data-testid={`${testId}-month`}>{parsed?.month}</div>
			<div data-testid={`${testId}-date`}>{parsed?.day}</div>
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
			timezone="UTC"
			{...props}
		>
			<TestWrapper testId={testId}>
				<MonthView />
			</TestWrapper>
		</CalendarProvider>
	)
}

describe('MonthView', () => {
	describe('across a DST transition', () => {
		test('renders 42 distinct days and the events in every week', () => {
			cleanup()
			const inTheDroppedWeek: CalendarEvent[] = [
				{
					id: 'dropped',
					title: 'Event in the dropped week',
					start: '2025-11-04T10:00:00+00:00',
					end: '2025-11-04T11:00:00+00:00',
				},
			]
			renderMonthView({
				events: inTheDroppedWeek,
				firstDayOfWeek: 1,
				initialDate: '2025-10-15T12:00:00Z',
				initialView: 'month',
				timezone: 'Europe/London',
			})

			const cells = screen.getAllByTestId(/^day-cell-/)
			const dates = cells.map((cell) =>
				cell.getAttribute('data-testid')?.replace('day-cell-', '')
			)

			expect(new Set(dates).size).toBe(42)
			expect(screen.getByText('Event in the dropped week')).toBeInTheDocument()
		})
	})

	beforeEach(() => {
		cleanup()
		locale = 'en'
		renderMonthView()
	})

	test('renders calendar structure with proper layout', () => {
		expect(screen.getByTestId('horizontal-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('month-header')).toBeInTheDocument()
		expect(screen.getByTestId('horizontal-grid-body')).toBeInTheDocument()
	})

	test('renders MonthView with correct weekday headers starting from Sunday', () => {
		for (const day of weekDays) {
			expect(
				screen.getByTestId(`month-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		}
	})

	test('animates the weekday label only, leaving the header cell static', () => {
		cleanup()
		renderMonthView()

		const cell = screen.getByTestId('month-header-weekday-mon')
		const animated = cell.querySelector('.animate-in')

		expect(cell.className).not.toContain('animate-in')
		expect(animated).not.toBeNull()
		expect(animated?.textContent).toBe('Mon')
		expect((animated as HTMLElement).style.animationDelay).toBe('0s')
		expect(cell.className).toContain('items-center')
	})

	test('renders MonthView with correct weekday headers starting from Monday', () => {
		cleanup()
		const { container } = renderMonthView({ firstDayOfWeek: 1 })

		for (const day of weekDays) {
			expect(
				screen.getByTestId(`month-header-weekday-${day.toLowerCase()}`)
			).toBeInTheDocument()
		}

		const monthHeader = container.querySelector('[data-testid="month-header"]')
		if (!monthHeader) throw new Error('monthHeader not found')
		expect(monthHeader.firstChild).toHaveAttribute(
			'data-testid',
			'month-header-weekday-mon'
		)
	})

	test('displays current month structure correctly', () => {
		const currentMonth = now('UTC')
		const firstDayOfMonth = startOf(currentMonth, 'month').day
		const lastDayOfMonth = endOf(currentMonth, 'month').day

		expect(screen.getAllByText(String(firstDayOfMonth)).length).toBeGreaterThan(
			0
		)
		expect(screen.getAllByText(String(lastDayOfMonth)).length).toBeGreaterThan(
			0
		)
	})

	test('initializes with specified initial date - different month', () => {
		cleanup()
		renderMonthView({ initialDate: '2025-06-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2025')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('6')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
		expect(screen.getByTestId('day-cell-2025-06-15')).toBeInTheDocument()
	})

	test('initializes with specified initial date - past date', () => {
		cleanup()
		renderMonthView({ initialDate: '2020-01-15T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2020')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('1')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('15')
		expect(screen.getByTestId('day-cell-2020-01-15')).toBeInTheDocument()
	})

	test('initializes with specified initial date - future date', () => {
		cleanup()
		renderMonthView({ initialDate: '2030-12-25T10:00:00Z' })

		expect(screen.getByTestId('current-date-year')).toHaveTextContent('2030')
		expect(screen.getByTestId('current-date-month')).toHaveTextContent('12')
		expect(screen.getByTestId('current-date-date')).toHaveTextContent('25')
		expect(screen.getByTestId('day-cell-2030-12-25')).toBeInTheDocument()
	})

	test('defaults to current month when no initial date provided', () => {
		cleanup()
		const today = now('UTC')
		renderMonthView()

		expect(screen.getByTestId('current-date-year')).toHaveTextContent(
			String(today.year)
		)
		expect(screen.getByTestId('current-date-month')).toHaveTextContent(
			String(today.month)
		)
		expect(screen.getByTestId('current-date-date')).toHaveTextContent(
			String(today.day)
		)
		expect(screen.getByTestId(`day-cell-${dayKey(today)}`)).toBeInTheDocument()
	})

	test('opens all-events dialog listing every event of the day via the more link', () => {
		cleanup()
		const day = parseDate('2025-06-10T00:00:00Z', 'UTC')
		if (!day) throw new Error('Invalid date')
		const titles = ['Standup', 'Design Sync', 'Code Review', 'Retro']
		const dayEvents: CalendarEvent[] = titles.map((title, index) => ({
			id: `dialog-event-${index}`,
			title,
			start: toOffsetIso(withTime(day, { hour: 9 + index })),
			end: toOffsetIso(withTime(day, { hour: 10 + index })),
		}))

		renderMonthView({ events: dayEvents, initialDate: toOffsetIso(day) })

		fireEvent.click(screen.getByText('+1 more'))

		const dialog = screen.getByRole('dialog')
		expect(
			within(dialog).getByText(
				formatDate(
					day,
					{ month: 'long', day: 'numeric', year: 'numeric' },
					'en'
				)
			)
		).toBeInTheDocument()
		for (const title of titles) {
			expect(within(dialog).getByText(title)).toBeInTheDocument()
		}
	})

	// In v4.0 (4.0.5), month padding days shade via data-non-business="true"
	// while remaining clickable (data-disabled="false").
	test('shades the days padded in from the neighbouring months without disabling them (4.0.5)', () => {
		cleanup()
		renderMonthView({ initialDate: '2025-03-15T00:00:00Z' })

		const cellOn = (date: string) => screen.getByTestId(`day-cell-${date}`)

		expect(cellOn('2025-02-26').dataset.nonBusiness).toBe('true')
		expect(cellOn('2025-02-26').dataset.disabled).toBe('false')
		expect(cellOn('2025-04-02').dataset.nonBusiness).toBe('true')
		expect(cellOn('2025-04-02').dataset.disabled).toBe('false')
		expect(cellOn('2025-03-12').dataset.nonBusiness).toBeUndefined()
		expect(cellOn('2025-03-12').dataset.disabled).toBe('false')
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
			timezone="UTC"
			{...props}
		>
			<CalendarDndContext>
				<MonthView />
			</CalendarDndContext>
		</CalendarProvider>
	)

describe('ResourceMonthHorizontal', () => {
	test('highlights today in the day header', () => {
		cleanup()
		const today = now('UTC')

		const { container } = renderResourceMonthHorizontal({
			initialDate: toOffsetIso(today),
		})

		const highlighted = container.querySelectorAll('[data-today="true"]')
		expect(highlighted).toHaveLength(1)
		expect(highlighted.item(0)).toHaveTextContent(String(today.day))
	})

	describe('week numbers', () => {
		const january2023 = '2023-01-15T12:00:00Z'
		const weekNumbersShown = () =>
			screen.queryAllByTestId('week-number').map((node) => node.textContent)

		test('shows none when weekNumbers is unset, as before', () => {
			cleanup()
			renderMonthView({ initialDate: january2023 })

			expect(weekNumbersShown()).toEqual([])
		})

		test('weekNumbers={false} shows none', () => {
			cleanup()
			renderMonthView({ initialDate: january2023, weekNumbers: false })

			expect(weekNumbersShown()).toEqual([])
		})

		test("weekNumbers shows one per row, counted from the row's first day", () => {
			cleanup()
			renderMonthView({ initialDate: january2023, weekNumbers: true })

			expect(weekNumbersShown()).toEqual(['1', '2', '3', '4', '5', '6'])
		})

		test("weekNumberCalculation='ISO' counts ISO weeks", () => {
			cleanup()
			renderMonthView({
				initialDate: january2023,
				weekNumbers: true,
				weekNumberCalculation: 'ISO',
			})

			expect(weekNumbersShown()).toEqual(['52', '1', '2', '3', '4', '5'])
		})
	})
})
