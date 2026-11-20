/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EventForm } from '@/features/calendar/components/event-form/event-form'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'

const mockResources: Resource[] = [
	{
		id: 'R1',
		title: 'Resource 1',
		businessHours: { startTime: 10, endTime: 16, daysOfWeek: ['monday'] },
	},
]

describe('EventForm Resource Business Hours (4.0.5)', () => {
	beforeEach(() => {
		cleanup()
	})

	const renderMondayEventForm = (providerProps = {}) => {
		const selectedEvent: CalendarEvent = {
			id: '1',
			title: 'Test Event',
			start: '2025-01-06T12:00:00+00:00',
			end: '2025-01-06T13:00:00+00:00',
			resourceId: 'R1',
		}

		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate="2025-01-06T12:00:00Z"
				resources={mockResources}
				timezone="UTC"
				{...providerProps}
			>
				<EventForm onClose={() => {}} selectedEvent={selectedEvent} />
			</CalendarProvider>
		)
	}

	test('respects resource-specific business hours for time display', () => {
		renderMondayEventForm({ eventConstraint: 'businessHours' })

		const startTimeButton = screen.getByTestId('time-picker-start-time')
		expect(startTimeButton).toBeInTheDocument()
		expect(startTimeButton).toHaveTextContent('12:00 PM')
	})

	test('DatePicker does NOT disable non-business days when eventConstraint is omitted (4.0.5)', async () => {
		renderMondayEventForm()

		const startDateSection = screen.getByText('Start Date').parentElement
		const startDateButton = startDateSection?.querySelector('button')
		if (!startDateButton) throw new Error('Could not find start date button')

		fireEvent.click(startDateButton)
		const grid = await screen.findByRole('grid')
		expect(grid).toBeInTheDocument()

		const day5 = screen.getByRole('gridcell', { name: /^5$/ })
		expect(day5.getAttribute('data-disabled')).not.toBe('true')
	})

	test('DatePicker disables non-business days for the assigned resource when eventConstraint="businessHours"', async () => {
		renderMondayEventForm({ eventConstraint: 'businessHours' })

		const startDateSection = screen.getByText('Start Date').parentElement
		const startDateButton = startDateSection?.querySelector('button')
		if (!startDateButton) throw new Error('Could not find start date button')

		fireEvent.click(startDateButton)
		const grid = await screen.findByRole('grid')
		expect(grid).toBeInTheDocument()

		// Sunday (Jan 5) should be disabled for R1
		const day5 = screen.getByRole('gridcell', { name: /^5$/ })
		expect(day5.getAttribute('data-disabled')).toBe('true')

		// Monday (Jan 6) should be enabled
		const day6 = screen.getByRole('gridcell', { name: /^6$/ })
		expect(day6.getAttribute('aria-disabled') || 'false').toBe('false')
	})
})
