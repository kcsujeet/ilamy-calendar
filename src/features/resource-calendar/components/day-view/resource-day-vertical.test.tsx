import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceDayVertical } from './resource-day-vertical'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderResourceDayVertical = (props = {}) => {
	return render(
		<ResourceCalendarProvider
			dayMaxEvents={3}
			events={mockEvents}
			initialDate={initialDate}
			orientation="vertical"
			resources={mockResources}
			{...props}
		>
			<CalendarDndContext>
				<ResourceDayVertical />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceDayVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource day view structure', () => {
		renderResourceDayVertical()

		// Should render resource headers
		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()

		// Should render All Day row label (case insensitive)
		expect(screen.getByText(/All day/i)).toBeInTheDocument()

		// Should render time column
		// firstCol id is 'time-col'
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
	})

	test('renders resource columns in scroll area', () => {
		renderResourceDayVertical()

		// Check if resource columns exist
		// VerticalGridCol uses vertical-col-{id}
		const dateStr = initialDate.format('YYYY-MM-DD')
		const col1 = screen.getByTestId(
			`vertical-col-day-col-${dateStr}-resource-1`
		)
		expect(col1).toBeInTheDocument()

		// Find cell for Resource 1 at 09:00 using data-testid
		// VerticalGridCol uses vertical-cell-{date}-{hour}-{minute}-{resourceId}
		const resource1Cell = screen.getByTestId(`vertical-cell-${dateStr}-09-00-1`)
		expect(resource1Cell).toBeInTheDocument()
	})
})
