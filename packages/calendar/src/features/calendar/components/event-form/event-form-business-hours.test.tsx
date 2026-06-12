/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, Resource } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EventForm } from '@/features/calendar/components/event-form/event-form'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'

const mockResources: Resource[] = [
	{
		id: 'R1',
		title: 'Resource 1',
		businessHours: { startTime: 10, endTime: 16, daysOfWeek: ['monday'] },
	},
]

describe('EventForm Resource Business Hours', () => {
	beforeEach(() => {
		cleanup()
	})

	// Render the form for an R1 event on Monday noon — shared construction.
	const renderMondayEventForm = () => {
		const monday = dayjs('2025-01-06T12:00:00.000Z')
		const selectedEvent: CalendarEvent = {
			id: '1',
			title: 'Test Event',
			start: monday,
			end: monday.add(1, 'hour'),
			resourceId: 'R1',
		}

		render(
			<CalendarProvider
				dayMaxEvents={3}
				initialDate={monday}
				resources={mockResources}
			>
				<EventForm onClose={() => {}} selectedEvent={selectedEvent} />
			</CalendarProvider>
		)
	}

	test('respects resource-specific business hours for time constraints', () => {
		renderMondayEventForm()

		const startTimeButton = screen.getByTestId('time-picker-start-time')
		expect(startTimeButton).toBeInTheDocument()
		expect(startTimeButton).toHaveTextContent('12:00 PM')
	})

	test('DatePicker disables non-business days for the assigned resource', async () => {
		renderMondayEventForm()

		// Find the button showing the date
		const startDateSection = screen.getByText('Start Date').parentElement
		const startDateButton = startDateSection?.querySelector('button')

		if (!startDateButton) throw new Error('Could not find start date button')

		fireEvent.click(startDateButton)

		// Wait for the calendar grid to appear
		const grid = await screen.findByRole('grid')
		expect(grid).toBeInTheDocument()

		// Sunday (Jan 5) should be disabled for R1
		// Use exact match for the day number to avoid matching 15, 25
		const day5 = screen.getByRole('gridcell', { name: /^5$/ })
		expect(day5.getAttribute('data-disabled')).toBe('true')

		// Monday (Jan 6) should be enabled
		const day6 = screen.getByRole('gridcell', { name: /^6$/ })
		expect(day6.getAttribute('aria-disabled') || 'false').toBe('false')
	})
})
