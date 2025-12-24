import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ids } from '@/lib/utils/ids'
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
			ids.verticalColumn(`day-col-${dateStr}-resource-1`)
		)
		expect(col1).toBeInTheDocument()

		// Find cell for Resource 1 at 09:00 using data-testid
		// VerticalGridCol uses day-cell-{date}-{hour}-{minute}-{resourceId}
		const resource1Cell = screen.getByTestId(
			ids.dayCell(initialDate, { hour: 9, minute: 0 }, '1')
		)
		expect(resource1Cell).toBeInTheDocument()
	})

	test('renders all day cells for each resource', () => {
		renderResourceDayVertical()
		const allDayRows = screen.getAllByTestId('all-day-row')
		// 1 for Resource 1, 1 for Resource 2
		expect(allDayRows.length).toBe(2)
	})

	test('renders 15-minute slots by default in Day View', () => {
		renderResourceDayVertical()

		// Should have 00, 15, 30, 45 slots
		expect(
			screen.getByTestId(ids.dayCell(initialDate, { hour: 9, minute: 0 }, '1'))
		).toBeInTheDocument()
		expect(
			screen.getByTestId(ids.dayCell(initialDate, { hour: 9, minute: 15 }, '1'))
		).toBeInTheDocument()
		expect(
			screen.getByTestId(ids.dayCell(initialDate, { hour: 9, minute: 30 }, '1'))
		).toBeInTheDocument()
		expect(
			screen.getByTestId(ids.dayCell(initialDate, { hour: 9, minute: 45 }, '1'))
		).toBeInTheDocument()
	})
})
