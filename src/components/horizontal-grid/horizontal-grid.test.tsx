import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context/provider'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
import { HorizontalGrid } from './horizontal-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockDays = [initialDate, initialDate.add(1, 'day')]
const mockRows = [
	{
		id: 'res-1',
		title: 'Resource 1',
		resource: { id: 'res-1', title: 'Resource 1', color: 'blue' },
		columns: [
			{
				id: 'label-col',
				day: dayjs(),
				gridType: 'day' as const,
				renderCell: ({ resource }: { resource?: Resource }) => (
					<div data-testid={ids.resourceCell(resource?.id || '')}>
						{resource?.title}
					</div>
				),
			},
			...mockDays.map((day) => ({
				id: `col-${day.toISOString()}`,
				day,
				gridType: 'day' as const,
			})),
		],
	},
]

const renderHorizontalGrid = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
		>
			<HorizontalGrid rows={mockRows} {...props}>
				<div data-testid="grid-children">Header Content</div>
			</HorizontalGrid>
		</ResourceCalendarProvider>
	)
}

describe('HorizontalGrid', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders base structure correctly', () => {
		renderHorizontalGrid()

		expect(screen.getByTestId(ids.horizontalGrid.scroll)).toBeInTheDocument()
		expect(screen.getByTestId(ids.horizontalGrid.header)).toBeInTheDocument()
		expect(screen.getByTestId(ids.horizontalGrid.body)).toBeInTheDocument()
		expect(screen.getByTestId('grid-children')).toHaveTextContent(
			'Header Content'
		)
	})

	test('renders rows and labels', () => {
		renderHorizontalGrid()
		expect(screen.getByTestId(ids.resourceRow('res-1'))).toBeInTheDocument()
		expect(screen.getByTestId(ids.resourceCell('res-1'))).toHaveTextContent(
			'Resource 1'
		)
	})

	test('renders cells in rows', () => {
		renderHorizontalGrid()

		// GridCell by default has data-testid="day-cell-{YYYY-MM-DD}"

		expect(
			screen.getByTestId(ids.dayCell(mockDays[0], undefined, 'res-1'))
		).toBeInTheDocument()

		expect(
			screen.getByTestId(ids.dayCell(mockDays[1], undefined, 'res-1'))
		).toBeInTheDocument()
	})

	test('applies custom classes', () => {
		renderHorizontalGrid({
			classes: {
				header: 'custom-header-class',
				body: 'custom-body-class',
			},
		})

		expect(screen.getByTestId(ids.horizontalGrid.header)).toHaveClass(
			'custom-header-class'
		)
		expect(screen.getByTestId(ids.horizontalGrid.body)).toHaveClass(
			'custom-body-class'
		)
	})
})
