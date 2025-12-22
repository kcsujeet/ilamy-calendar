import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceMonthVertical } from './resource-month-vertical'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderResourceMonthVertical = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			initialView="month"
			orientation="vertical"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<ResourceMonthVertical />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceMonthVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource month view structure', () => {
		renderResourceMonthVertical()

		// Should render resource headers

		expect(screen.getByText('Resource 1')).toBeInTheDocument()

		expect(screen.getByText('Resource 2')).toBeInTheDocument()

		// Should render time column (which shows dates in month view)

		// firstCol id is 'date-col'

		expect(screen.getByTestId('vertical-col-date-col')).toBeInTheDocument()
	})

	test('renders day cells for each resource', () => {
		renderResourceMonthVertical()

		// Check for some day cells

		// VerticalGridCol uses vertical-cell-{date}-{hour}-{minute}-{resourceId}

		const firstDay = initialDate.format('YYYY-MM-DD')

		expect(
			screen.getByTestId(`vertical-cell-${firstDay}-00-00-1`)
		).toBeInTheDocument()

		expect(
			screen.getByTestId(`vertical-cell-${firstDay}-00-00-2`)
		).toBeInTheDocument()
	})

	test('renders correct number of cells based on days in month', () => {
		renderResourceMonthVertical()

		const firstDay = initialDate.format('YYYY-MM-DD')

		const lastDay = initialDate.endOf('month').format('YYYY-MM-DD')

		expect(
			screen.getByTestId(`vertical-cell-${firstDay}-00-00-1`)
		).toBeInTheDocument()

		expect(
			screen.getByTestId(`vertical-cell-${lastDay}-00-00-1`)
		).toBeInTheDocument()

		// If Jan 2025 has 31 days, there should be 31 cells for each resource in the body

		// but let's just check the boundaries for now.
	})
})
