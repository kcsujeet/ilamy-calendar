import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/app/calendar-provider'
import { CalendarDndContext } from '@/features/drag-and-drop/components/calendar-dnd-context'
import { MonthView } from '@/testing/view-harnesses'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = '2025-01-01T00:00:00Z'

const renderResourceMonthVertical = (props = {}) => {
	return render(
		<CalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			initialView="month"
			orientation="vertical"
			resources={mockResources}
			timezone="UTC"
			{...props}
		>
			<CalendarDndContext>
				<MonthView />
			</CalendarDndContext>
		</CalendarProvider>
	)
}

describe('ResourceMonthVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource month view structure', () => {
		renderResourceMonthVertical()

		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()
		expect(screen.getByTestId('vertical-col-date-col')).toBeInTheDocument()
	})

	test('renders day cells for each resource', () => {
		renderResourceMonthVertical()

		expect(
			screen.getByTestId('vertical-cell-2025-01-01-00-00-resource-1')
		).toBeInTheDocument()
		expect(
			screen.getByTestId('vertical-cell-2025-01-01-00-00-resource-2')
		).toBeInTheDocument()
	})

	test('renders correct number of cells based on days in month', () => {
		renderResourceMonthVertical()

		expect(
			screen.getByTestId('vertical-cell-2025-01-01-00-00-resource-1')
		).toBeInTheDocument()
		expect(
			screen.getByTestId('vertical-cell-2025-01-31-00-00-resource-1')
		).toBeInTheDocument()
	})
})
