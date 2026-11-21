import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { HorizontalGrid } from './horizontal-grid'

const initialDate = '2025-01-01T00:00:00+00:00'
const mockRows = [
	{
		id: 'row-1',
		title: 'Row 1',
		resource: { id: 'row-1', title: 'Row 1', color: 'blue' },
		columns: [
			{
				id: 'col-1',
				day: initialDate,
				gridType: 'day' as const,
			},
		],
	},
]

const renderGrid = () => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
			timezone="UTC"
		>
			<HorizontalGrid rows={mockRows}>
				<div>Header</div>
			</HorizontalGrid>
		</CalendarProvider>
	)
}

describe('HorizontalGrid Layout Regression', () => {
	beforeEach(() => {
		cleanup()
	})

	test('HorizontalGridRow should NOT have min-h-[60px] constraint to allow expansion', () => {
		renderGrid()
		const row = screen.getByTestId('horizontal-row-row-1')

		expect(row.className).not.toContain('min-h-[60px]')
		expect(row.className).toContain('flex-1')
	})

	test('GridCell (DroppableCell) SHOULD have min-h-[60px] to maintain default cell structure', () => {
		renderGrid()
		const cell = screen.getByTestId('day-cell-2025-01-01')

		expect(cell.className).toContain('min-h-[60px]')
	})

	test('GridCell content container should match parent dimensions (h-full w-full)', () => {
		renderGrid()
		const content = screen.getByTestId('grid-cell-content')

		expect(content.className).toContain('h-full')
		expect(content.className).toContain('w-full')
	})

	test('ResourceCell should have h-full to stretch with row expansion', () => {
		renderGrid()
		const resourceCell = screen.getByTestId('horizontal-row-label-row-1')

		expect(resourceCell.className).toContain('h-full')
	})
})
