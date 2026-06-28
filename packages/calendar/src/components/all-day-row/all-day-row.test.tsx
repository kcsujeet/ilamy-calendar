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

	it('separates the row from the time grid without per-cell borders', () => {
		renderAllDayRow()
		// Approach G: the all-day/time-grid separator is owned by the all-day
		// container (border-b on [data-testid="vertical-grid-all-day"]), not the
		// cells. The cells themselves carry no bottom border.
		const cellClasses = screen
			.getByTestId('day-cell-2025-01-13')
			.className.split(' ')
		expect(cellClasses).not.toContain('border-b')
		expect(cellClasses).not.toContain('border-b-0')
		// Inter-cell separators are drawn by the row via gap-px + bg-border.
		const rowClasses = screen.getByTestId('all-day-row').className.split(' ')
		expect(rowClasses).toContain('gap-px')
		expect(rowClasses).toContain('bg-border')
	})

	it('does not stack a second bottom border (no thick/double line)', () => {
		const { container } = renderAllDayRow()
		// The cells own the single bottom border; the row wrapper must not also
		// carry border-b, otherwise the two stack into a thick line.
		const wrapper = container.querySelector('.min-h-fit')
		expect(wrapper).not.toBeNull()
		expect((wrapper?.className ?? '').split(' ')).not.toContain('border-b')
	})

	it('draws cell separators via gap-px instead of per-cell right borders', () => {
		renderAllDayRow()
		// Approach G: no cell carries a right border (so none can double the outer
		// calendar border); the row draws inter-cell lines with gap-px + bg-border.
		const lastCellClasses = screen
			.getByTestId('day-cell-2025-01-14')
			.className.split(' ')
		expect(lastCellClasses).not.toContain('border-r')
		expect(lastCellClasses).not.toContain('last:border-r-0')
		const rowClasses = screen.getByTestId('all-day-row').className.split(' ')
		expect(rowClasses).toContain('gap-px')
		expect(rowClasses).toContain('bg-border')
	})
})
