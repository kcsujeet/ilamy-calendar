import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarDndContext } from '@/components/drag-and-drop/calendar-dnd-context'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'
import { ResourceWeekVertical } from './resource-week-vertical'

const mockResources: Resource[] = [
	{ id: '1', title: 'Resource 1' },
	{ id: '2', title: 'Resource 2' },
]

const mockEvents: CalendarEvent[] = []
const initialDate = dayjs('2025-01-01T00:00:00.000Z')

const renderResourceWeekVertical = (props = {}) => {
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
				<ResourceWeekVertical />
			</CalendarDndContext>
		</ResourceCalendarProvider>
	)
}

describe('ResourceWeekVertical', () => {
	beforeEach(() => {
		cleanup()
	})

	test('renders vertical resource week view structure', () => {
		renderResourceWeekVertical()

		// Should render resource headers
		expect(screen.getByText('Resource 1')).toBeInTheDocument()
		expect(screen.getByText('Resource 2')).toBeInTheDocument()

		// Should render All Day row label (case insensitive)
		expect(screen.getByText(/All day/i)).toBeInTheDocument()

		// Should render time column
		expect(screen.getByTestId('vertical-col-time-col')).toBeInTheDocument()
	})

	test('renders day columns for each resource', () => {
		renderResourceWeekVertical()

		// Check for some day columns
		// Format: vertical-col-day-col-{date}-resource-{id}
		const col1 = screen.getByTestId(
			`vertical-col-day-col-${initialDate.format('YYYY-MM-DD')}-resource-1`
		)
		expect(col1).toBeInTheDocument()
	})
})
