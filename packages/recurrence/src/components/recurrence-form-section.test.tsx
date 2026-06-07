import { describe, expect, it, mock } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import { fireEvent, render, screen } from '@testing-library/react'
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
			<CalendarTestProvider>
				<RecurrenceFormSection event={event} onChange={onChange} />
			</CalendarTestProvider>
		)

		// Toggling recurrence on emits a default rule with no dtstart, which the
		// form section anchors to event.start. With no start, that must not throw.
		const toggle = screen.getByTestId('toggle-recurrence')
		expect(() => fireEvent.click(toggle)).not.toThrow()
		expect(onChange).toHaveBeenCalled()
	})
})
