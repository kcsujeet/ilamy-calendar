import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { getWeekColumnTemplate } from '@/lib/constants'
import { AllDayRow } from './all-day-row'

const mockDays = [
	dayjs('2025-01-13T00:00:00.000Z'),
	dayjs('2025-01-14T00:00:00.000Z'),
]

const renderAllDayRow = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={4}
			events={[]}
			initialDate={mockDays[0]}
			resources={[]}
		>
			<AllDayRow days={mockDays} {...props} />
		</ResourceCalendarProvider>
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

	it('uses grid gutter cell width when columnTemplate is set', () => {
		const columnTemplate = getWeekColumnTemplate(2)
		const { container } = renderAllDayRow({ columnTemplate })
		const row = screen.getByTestId('all-day-row')
		expect(row.style.gridTemplateColumns).toBe(columnTemplate)

		const gutter = container.querySelector('.border-r.sticky')
		expect(gutter?.className).toContain('w-full')
		expect(gutter?.className).toContain('min-w-0')
		expect(gutter?.className).not.toContain('w-16')
	})
})
