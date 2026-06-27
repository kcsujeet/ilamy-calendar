import { describe, expect, it } from 'bun:test'
import dayjs from '@ilamy/utils/dayjs'
import { render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { AllDayRow } from './all-day-row'

const mockDays = [
	dayjs('2025-01-13T00:00:00.000Z'),
	dayjs('2025-01-14T00:00:00.000Z'),
]

const renderAllDayRow = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={4}
			events={[]}
			initialDate={mockDays[0]}
			resources={[]}
		>
			<AllDayRow days={mockDays} {...props} />
		</CalendarProvider>
	)
}

describe('AllDayRow', () => {
	it('renders correctly', () => {
		renderAllDayRow()
		expect(screen.getByTestId('all-day-row')).toBeInTheDocument()
	})

	it('renders correct number of cells', () => {
		renderAllDayRow()
		// HorizontalGridRow uses GridCell which defaults to day-cell-{YYYY-MM-DD}
		expect(screen.getByTestId('day-cell-2025-01-13')).toBeInTheDocument()
		expect(screen.getByTestId('day-cell-2025-01-14')).toBeInTheDocument()
	})

	it('does not render day numbers in cells', () => {
		renderAllDayRow()
		// Day numbers are rendered with test-id "day-number-{date}"
		const dayNumbers = screen.queryAllByTestId(/^day-number-/)
		expect(dayNumbers).toHaveLength(0)
	})

	it('gives the cells a bottom border to separate the row from the time grid', () => {
		renderAllDayRow()
		// The all-day row is NOT the last row (the time grid follows), so its cells
		// keep border-b rather than being stripped to border-b-0.
		const cellClasses = screen
			.getByTestId('day-cell-2025-01-13')
			.className.split(' ')
		expect(cellClasses).toContain('border-b')
		expect(cellClasses).not.toContain('border-b-0')
	})

	it('does not stack a second bottom border (no thick/double line)', () => {
		const { container } = renderAllDayRow()
		// The cells own the single bottom border; the row wrapper must not also
		// carry border-b, otherwise the two stack into a thick line.
		const wrapper = container.querySelector('.min-h-fit')
		expect(wrapper).not.toBeNull()
		expect((wrapper?.className ?? '').split(' ')).not.toContain('border-b')
	})

	it('strips the rightmost cell right border so it does not double the calendar border', () => {
		renderAllDayRow()
		// The calendar body has a border all around; `last:border-r-0` drops the
		// last cell's right border so it does not stack with that outer border.
		const lastCellClasses = screen
			.getByTestId('day-cell-2025-01-14')
			.className.split(' ')
		expect(lastCellClasses).toContain('last:border-r-0')
	})
})
