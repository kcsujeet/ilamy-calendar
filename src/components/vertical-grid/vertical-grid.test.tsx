import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { VerticalGrid } from './vertical-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockColumns = [
	{
		id: 'col-1',
		day: initialDate,
		days: [initialDate.hour(9), initialDate.hour(10)],
	},
]

const renderVerticalGrid = (props = {}) => {
	return render(
		<CalendarProvider dayMaxEvents={3} initialDate={initialDate}>
			<VerticalGrid columns={mockColumns} {...props}>
				<div data-testid="grid-children">Header Content</div>
			</VerticalGrid>
		</CalendarProvider>
	)
}

describe('VerticalGrid', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders base structure correctly', () => {
		renderVerticalGrid()

		expect(screen.getByTestId('vertical-grid-scroll')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-header')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-grid-body')).toBeInTheDocument()
		expect(screen.getByTestId('grid-children')).toHaveTextContent(
			'Header Content'
		)
	})

	test('renders columns', () => {
		renderVerticalGrid()
		expect(screen.getByTestId('vertical-col-col-1')).toBeInTheDocument()
	})

	test('renders all-day row when provided', () => {
		renderVerticalGrid({
			allDayRow: <div data-testid="mock-all-day">All Day Row</div>,
		})

		expect(screen.getByTestId('vertical-grid-all-day')).toBeInTheDocument()
		expect(screen.getByTestId('mock-all-day')).toHaveTextContent('All Day Row')
	})

	test('applies custom classes', () => {
		renderVerticalGrid({
			classes: {
				header: 'custom-header-class',
				body: 'custom-body-class',
				allDay: 'custom-allday-class',
			},
			allDayRow: <div>All Day</div>,
		})

		expect(screen.getByTestId('vertical-grid-header')).toHaveClass(
			'custom-header-class'
		)
		expect(screen.getByTestId('vertical-grid-body')).toHaveClass(
			'custom-body-class'
		)
		expect(screen.getByTestId('vertical-grid-all-day')).toHaveClass(
			'custom-allday-class'
		)
	})

	test('calculates data-relative columnIndex correctly', () => {
		const columnsWithTime = [
			{ id: 'time', day: initialDate, days: [initialDate], noEvents: true },
			{ id: 'data-1', day: initialDate, days: [initialDate] },
			{ id: 'data-2', day: initialDate, days: [initialDate] },
		]

		render(
			<CalendarProvider dayMaxEvents={3} initialDate={initialDate}>
				<VerticalGrid columns={columnsWithTime} />
			</CalendarProvider>
		)

		// We can't easily check internal props of children without mocking,
		// but we can check if the events layers are rendered with expected testids
		// if they used the index in their testid.
		// Since VerticalGridCol uses the id in its testid, and VerticalGridEventsLayer
		// uses the id too.

		// Let's just verify the structure for now, and rely on the logic being correct.
		// To truly test this, we'd need to mock VerticalGridCol.
		expect(
			screen.getByTestId('vertical-col-time').getAttribute('data-column-index')
		).toBe('-1')
		expect(
			screen
				.getByTestId('vertical-col-data-1')
				.getAttribute('data-column-index')
		).toBe('0')
		expect(
			screen
				.getByTestId('vertical-col-data-2')
				.getAttribute('data-column-index')
		).toBe('1')
	})

	test('resets columnIndex for non-adjacent columns of the same day (Resource Week behavior)', () => {
		const resourceWeekColumns = [
			{ id: 'R1-Mon', day: initialDate, days: [initialDate] },
			{
				id: 'R1-Tue',
				day: initialDate.add(1, 'day'),
				days: [initialDate.add(1, 'day')],
			},
			{ id: 'R2-Mon', day: initialDate, days: [initialDate] },
		]

		render(
			<CalendarProvider dayMaxEvents={3} initialDate={initialDate}>
				<VerticalGrid columns={resourceWeekColumns} />
			</CalendarProvider>
		)

		expect(
			screen
				.getByTestId('vertical-col-R1-Mon')
				.getAttribute('data-column-index')
		).toBe('0')
		expect(
			screen
				.getByTestId('vertical-col-R1-Tue')
				.getAttribute('data-column-index')
		).toBe('0')
		expect(
			screen
				.getByTestId('vertical-col-R2-Mon')
				.getAttribute('data-column-index')
		).toBe('0')
	})
})
