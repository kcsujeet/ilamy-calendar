import { beforeEach, describe, expect, it } from 'bun:test'
import { parseDate, type ZonedDate } from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { AllDayRow } from './all-day-row'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

const mockDays = [
	atUtc('2025-01-13T00:00:00.000Z'),
	atUtc('2025-01-14T00:00:00.000Z'),
]

const renderAllDayRow = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={4}
			events={[]}
			initialDate="2025-01-13T00:00:00Z"
			resources={[]}
			timezone="UTC"
		>
			<AllDayRow days={mockDays} {...props} />
		</CalendarProvider>
	)
}

describe('AllDayRow', () => {
	beforeEach(() => {
		cleanup()
	})

	it('renders correctly', () => {
		renderAllDayRow()
		expect(screen.getByTestId('all-day-row')).toBeInTheDocument()
	})

	it('renders correct number of cells', () => {
		renderAllDayRow()
		expect(screen.getByTestId('day-cell-2025-01-13')).toBeInTheDocument()
		expect(screen.getByTestId('day-cell-2025-01-14')).toBeInTheDocument()
	})

	it('does not render day numbers in cells', () => {
		renderAllDayRow()
		const dayNumbers = screen.queryAllByTestId(/^day-number-/)
		expect(dayNumbers).toHaveLength(0)
	})

	it('separates the row from the time grid without per-cell borders', () => {
		renderAllDayRow()
		const getCellClasses = screen
			.getByTestId('day-cell-2025-01-13')
			.className.split(' ')
		expect(getCellClasses).not.toContain('border-b')
		expect(getCellClasses).not.toContain('border-b-0')
		const rowClasses = screen.getByTestId('all-day-row').className.split(' ')
		expect(rowClasses).toContain('gap-px')
		expect(rowClasses).toContain('bg-border')
	})

	it('does not stack a second bottom border (no thick/double line)', () => {
		const { container } = renderAllDayRow()
		const wrapper = container.querySelector('.min-h-fit')
		expect(wrapper).not.toBeNull()
		expect((wrapper?.className ?? '').split(' ')).not.toContain('border-b')
	})

	it('draws cell separators via gap-px instead of per-cell right borders', () => {
		renderAllDayRow()
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
