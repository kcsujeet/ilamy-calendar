import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
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

		// VerticalGridCol uses day-cell-{date}-{hour}-{minute}-{resourceId}

		expect(
			screen.getByTestId(
				ids.dayCell(initialDate.date(1), undefined, mockResources[0].id)
			)
		).toBeInTheDocument()
		expect(
			screen.getByTestId(
				ids.dayCell(initialDate.date(1), undefined, mockResources[1].id)
			)
		).toBeInTheDocument()
	})

	test('renders correct number of cells based on days in month', () => {
		renderResourceMonthVertical()
		const dayCellsForResource1 = screen.getAllByTestId(
			new RegExp(`^day-cell-.*-resource-${mockResources[0].id}`)
		)
		expect(dayCellsForResource1.length).toBe(31)

		const dayCellsForResource2 = screen.getAllByTestId(
			new RegExp(`^day-cell-.*-resource-${mockResources[1].id}`)
		)
		expect(dayCellsForResource2.length).toBe(31)
	})
})
