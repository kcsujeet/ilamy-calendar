/// <reference types="@testing-library/jest-dom" />
import { beforeEach, describe, expect, test } from 'bun:test'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EventForm } from '@/components/event-form/event-form'
import type { CalendarEvent } from '@/components/types'
import { ResourceCalendarProvider } from '@/features/resource-calendar/contexts/resource-calendar-context'
import type { Resource } from '@/features/resource-calendar/types'
import dayjs from '@/lib/configs/dayjs-config'

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

	test('respects resource-specific business hours for time constraints', () => {
		const monday = dayjs('2025-01-06T12:00:00.000Z')
		const selectedEvent: CalendarEvent = {
			id: '1',
			title: 'Test Event',
			start: monday,
			end: monday.add(1, 'hour'),
			resourceId: 'R1',
		}

		render(
			<ResourceCalendarProvider
				dayMaxEvents={3}
				initialDate={monday}
				resources={mockResources}
			>
				<EventForm onClose={() => {}} selectedEvent={selectedEvent} />
			</ResourceCalendarProvider>
		)

		const startTimeButton = screen.getByTestId('time-picker-start-time')
		expect(startTimeButton).toBeInTheDocument()
		expect(startTimeButton).toHaveTextContent('12:00 PM')
	})

	test('DatePicker disables non-business days for the assigned resource', async () => {
		const monday = dayjs('2025-01-06T12:00:00.000Z')
		const selectedEvent: CalendarEvent = {
			id: '1',
			title: 'Test Event',
			start: monday,
			end: monday.add(1, 'hour'),
			resourceId: 'R1',
		}

		render(
			<ResourceCalendarProvider
				dayMaxEvents={3}
				initialDate={monday}
				resources={mockResources}
			>
				<EventForm onClose={() => {}} selectedEvent={selectedEvent} />
			</ResourceCalendarProvider>
		)

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
