import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import dayjs from '@/lib/configs/dayjs-config'
import { HorizontalGrid } from './horizontal-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
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
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
		>
			<HorizontalGrid rows={mockRows}>
				<div>Header</div>
			</HorizontalGrid>
		</ResourceCalendarProvider>
	)
}

describe('HorizontalGrid Layout Regression', () => {
	beforeEach(() => {
		cleanup()
	})

	test('HorizontalGridRow should NOT have min-h-[60px] constraint to allow expansion', () => {
		renderGrid()
		const row = screen.getByTestId('horizontal-row-row-1')

		// The row should be fluid. If we have min-h-[60px] here, it fighting the cell's expansion.
		expect(row.className).not.toContain('min-h-[60px]')
		expect(row.className).toContain('flex-1')
	})

	test('GridCell (DroppableCell) SHOULD have min-h-[60px] to maintain default cell structure', () => {
		renderGrid()
		const cell = screen.getByTestId(
			`day-cell-${initialDate.format('YYYY-MM-DD')}`
		)

		// The cell itself should have the min-height to ensure the grid doesn't collapse to 0 when empty.
		expect(cell.className).toContain('min-h-[60px]')
	})

	test('GridCell content container should match parent dimensions (h-full w-full)', () => {
		renderGrid()
		const content = screen.getByTestId('grid-cell-content')

		// This ensures the content fills the potentially expanded row height and matches parent width.
		expect(content.className).toContain('h-full')
		expect(content.className).toContain('w-full')
	})

	test('ResourceCell should have h-full to stretch with row expansion', () => {
		renderGrid()
		const resourceCell = screen.getByTestId('horizontal-row-label-row-1')

		expect(resourceCell.className).toContain('h-full')
	})
})
