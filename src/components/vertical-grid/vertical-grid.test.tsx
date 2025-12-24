import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
import { VerticalGrid } from './vertical-grid'

const initialDate = dayjs('2025-01-01T00:00:00.000Z')
const mockColumns = [
	{
		id: 'col-1',
		days: [initialDate],
	},
]

const renderVerticalGrid = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={[]}
			initialDate={initialDate}
			resources={[]}
		>
			<VerticalGrid columns={mockColumns} {...props}>
				<div data-testid="grid-children">Header Content</div>
			</VerticalGrid>
		</ResourceCalendarProvider>
	)
}

describe('VerticalGrid', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders base structure correctly', () => {
		renderVerticalGrid()

		expect(screen.getByTestId(ids.verticalGrid.scroll)).toBeInTheDocument()
		expect(screen.getByTestId(ids.verticalGrid.header)).toBeInTheDocument()
		expect(screen.getByTestId(ids.verticalGrid.body)).toBeInTheDocument()
		expect(screen.getByTestId('grid-children')).toHaveTextContent(
			'Header Content'
		)
	})

	test('renders columns', () => {
		renderVerticalGrid()
		// VerticalGridCol renders with default id pattern vertical-col-{id}
		expect(screen.getByTestId(ids.verticalColumn('col-1'))).toBeInTheDocument()
	})

	test('renders all-day row when provided', () => {
		renderVerticalGrid({
			allDayRow: <div data-testid="mock-all-day">All Day Row</div>,
		})

		expect(screen.getByTestId(ids.verticalGrid.allDay)).toBeInTheDocument()
		expect(screen.getByText('All Day Row')).toBeInTheDocument()
	})

	test('applies custom classes', () => {
		renderVerticalGrid({
			classes: {
				header: 'custom-header-class',
				body: 'custom-body-class',
			},
		})

		expect(screen.getByTestId(ids.verticalGrid.header)).toHaveClass(
			'custom-header-class'
		)
		expect(screen.getByTestId(ids.verticalGrid.body)).toHaveClass(
			'custom-body-class'
		)
	})
})
