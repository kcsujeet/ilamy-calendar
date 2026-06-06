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

	test('container uses flex column layout for scroll containment', () => {
		renderVerticalGrid()

		const container = screen.getByTestId('vertical-grid-container')
		expect(container.className).toContain('flex')
		expect(container.className).toContain('flex-col')
	})

	test('scroll area is present for regular variant', () => {
		renderVerticalGrid({ variant: 'regular' })

		const scrollArea = screen.getByTestId('vertical-grid-scroll')
		expect(scrollArea).toBeInTheDocument()
	})

	test('all-day row container has minimum height', () => {
		renderVerticalGrid({
			allDayRow: <div data-testid="mock-all-day">All Day</div>,
		})

		const allDayContainer = screen.getByTestId('vertical-grid-all-day')
		expect(allDayContainer.className).toContain('min-h-12')
	})
})
