import { describe, expect, it, mock } from 'bun:test'
import { fireEvent, render, screen } from '@testing-library/react'
import type { CalendarEvent } from '@/components/types'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { RecurrenceFormSection } from './recurrence-form-section'

describe('RecurrenceFormSection', () => {
	it('enables recurrence without throwing when the event has no start', () => {
		const onChange = mock(() => {})
		// A draft event that has no `start` yet (selectedEvent can be incomplete).
		const event = {
			id: 'draft',
			title: 'No start yet',
		} as unknown as CalendarEvent

		render(
			<CalendarProvider dayMaxEvents={5} events={[]} firstDayOfWeek={0}>
				<RecurrenceFormSection event={event} onChange={onChange} />
			</CalendarProvider>
		)

		// Toggling recurrence on emits a default rule with no dtstart, which the
		// form section anchors to event.start. With no start, that must not throw.
		const toggle = screen.getByTestId('toggle-recurrence')
		expect(() => fireEvent.click(toggle)).not.toThrow()
		expect(onChange).toHaveBeenCalled()
	})
})
