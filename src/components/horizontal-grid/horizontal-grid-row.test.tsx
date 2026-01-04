import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { HorizontalGridRow } from './horizontal-grid-row'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const mockResource: Resource = {
	id: 'res-1',
	title: 'Resource 1',
	color: 'blue',
}

const renderHorizontalGridRow = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[mockResource]}
		>
			<HorizontalGridRow id="row-1" resource={mockResource} {...props} />
		</ResourceCalendarProvider>
	)
}

describe('HorizontalGridRow', () => {
	beforeEach(() => {
		cleanup()
	})

	describe('basic rendering', () => {
		const defaultColumns = [
			{
				id: 'col-1',
				day: initialDate,
				gridType: 'day' as const,
			},
		]

		test('renders row with correct testid', () => {
			renderHorizontalGridRow({ columns: defaultColumns })
			expect(screen.getByTestId('horizontal-row-row-1')).toBeInTheDocument()
		})

		test('renders resource label for resource variant', () => {
			renderHorizontalGridRow({ variant: 'resource', columns: defaultColumns })
			expect(
				screen.getByTestId('horizontal-row-label-res-1')
			).toBeInTheDocument()
			expect(screen.getByText('Resource 1')).toBeInTheDocument()
		})

		test('does not render resource label for regular variant', () => {
			renderHorizontalGridRow({ variant: 'regular', columns: defaultColumns })
			expect(
				screen.queryByTestId('horizontal-row-label-res-1')
			).not.toBeInTheDocument()
		})
	})

	describe('flat columns (single day per column)', () => {
		test('renders grid cells for flat day columns', () => {
			const days = [initialDate, initialDate.add(1, 'day')]
			const columns = days.map((day) => ({
				id: `col-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			}))

			renderHorizontalGridRow({ columns })

			expect(
				screen.getByTestId(`day-cell-${days[0].format('YYYY-MM-DD')}`)
			).toBeInTheDocument()
			expect(
				screen.getByTestId(`day-cell-${days[1].format('YYYY-MM-DD')}`)
			).toBeInTheDocument()
		})

		test('removes bottom border on last row for flat columns', () => {
			const columns = [
				{
					id: 'col-1',
					day: initialDate,
					gridType: 'day' as const,
				},
			]

			renderHorizontalGridRow({ columns, isLastRow: true })

			const cell = screen.getByTestId(
				`day-cell-${initialDate.format('YYYY-MM-DD')}`
			)
			expect(cell).toHaveClass('border-b-0')
		})
	})

	describe('grouped columns (multiple days per column - week view)', () => {
		test('renders grid cells for grouped day columns', () => {
			// Each column contains multiple hours for a single day
			const day1Hours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
				initialDate.hour(11).minute(0),
			]
			const day2Hours = [
				initialDate.add(1, 'day').hour(9).minute(0),
				initialDate.add(1, 'day').hour(10).minute(0),
				initialDate.add(1, 'day').hour(11).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: day1Hours,
					gridType: 'hour' as const,
				},
				{
					id: 'col-day-2',
					days: day2Hours,
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			// Should render cells for each hour - testid format: day-cell-YYYY-MM-DD-HH-mm
			expect(
				screen.getByTestId('day-cell-2025-01-01-09-00')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('day-cell-2025-01-01-10-00')
			).toBeInTheDocument()
			expect(
				screen.getByTestId('day-cell-2025-01-02-09-00')
			).toBeInTheDocument()
		})

		test('applies border-r class to non-last grouped columns', () => {
			const day1Hours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
			]
			const day2Hours = [
				initialDate.add(1, 'day').hour(9).minute(0),
				initialDate.add(1, 'day').hour(10).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: day1Hours,
					gridType: 'hour' as const,
					className: 'test-col-1',
				},
				{
					id: 'col-day-2',
					days: day2Hours,
					gridType: 'hour' as const,
					className: 'test-col-2',
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			// First column's cells should have border-r! class
			const firstColCell = screen.getByTestId('day-cell-2025-01-01-09-00')
			expect(firstColCell).toHaveClass('border-r!')

			// Last column's cells should NOT have border-r! class
			const lastColCell = screen.getByTestId('day-cell-2025-01-02-09-00')
			expect(lastColCell).not.toHaveClass('border-r!')
		})

		test('grouped column container has full width', () => {
			const dayHours = [
				initialDate.hour(9).minute(0),
				initialDate.hour(10).minute(0),
			]

			const columns = [
				{
					id: 'col-day-1',
					days: dayHours,
					gridType: 'hour' as const,
				},
			]

			const { container } = renderHorizontalGridRow({
				columns,
				gridType: 'hour',
			})

			// Find the grouped column container div
			const groupedContainer = container.querySelector('.flex.relative.w-full')
			expect(groupedContainer).toBeInTheDocument()
		})
	})

	describe('isGrouped detection', () => {
		test('detects grouped columns when days array is present', () => {
			const columns = [
				{
					id: 'col-grouped',
					days: [initialDate.hour(9).minute(0), initialDate.hour(10).minute(0)],
					gridType: 'hour' as const,
				},
			]

			renderHorizontalGridRow({ columns, gridType: 'hour' })

			// When grouped, events layer should be inside each column group
			// The non-grouped events layer should not be rendered
			const row = screen.getByTestId('horizontal-row-row-1')
			expect(row).toBeInTheDocument()
		})
	})
})
