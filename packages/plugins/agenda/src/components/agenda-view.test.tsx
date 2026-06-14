import { describe, expect, it } from 'bun:test'
import type { CalendarEvent } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import dayjs from '@ilamy/utils/dayjs'
import { fireEvent, render, screen } from '@testing-library/react'
import type { AgendaWindow } from '../utils/agenda-window'
import { AgendaView } from './agenda-view'

/** Surfaces the form-open state so a click's effect on context is observable. */
const FormProbe = () => {
	const { isEventFormOpen, selectedEvent } = useIlamyCalendarContext()
	return (
		<div data-testid="probe">
			{isEventFormOpen ? `open:${selectedEvent?.id}` : 'closed'}
		</div>
	)
}

const mkEvent = (
	id: string,
	title: string,
	startISO: string,
	endISO: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title,
	start: dayjs(startISO),
	end: dayjs(endISO),
	...extra,
})

const renderAgenda = (
	events: CalendarEvent[],
	window: AgendaWindow = 'month',
	initialDateISO = '2026-06-13'
) =>
	render(
		<CalendarTestProvider events={events} initialDate={dayjs(initialDateISO)}>
			<AgendaView window={window} />
		</CalendarTestProvider>
	)

const seed = [
	mkEvent('m', 'Meeting', '2026-06-13T09:00:00', '2026-06-13T10:00:00'),
	mkEvent('t', 'Trip', '2026-06-20T00:00:00', '2026-06-22T23:59:59', {
		allDay: true,
	}),
]

describe('AgendaView', () => {
	it('renders day groups in chronological order, skipping empty days', () => {
		const { container } = renderAgenda(seed)
		expect(screen.getByTestId('agenda-view')).toBeInTheDocument()
		const keys = Array.from(
			container.querySelectorAll('[data-testid^="agenda-day-"]')
		).map((el) => el.getAttribute('data-testid'))
		expect(keys).toEqual([
			'agenda-day-2026-06-13',
			'agenda-day-2026-06-20',
			'agenda-day-2026-06-21',
			'agenda-day-2026-06-22',
		])
	})

	it('repeats a multi-day event under each spanned day with a Day N/M indicator', () => {
		renderAgenda(seed)
		expect(screen.getAllByText('Trip')).toHaveLength(3)
		expect(screen.getByText('(Day 1/3)')).toBeInTheDocument()
		expect(screen.getByText('(Day 2/3)')).toBeInTheDocument()
		expect(screen.getByText('(Day 3/3)')).toBeInTheDocument()
	})

	it('labels all-day events and shows no indicator for single-day events', () => {
		renderAgenda(seed)
		// Trip is all-day across 3 days -> 3 "All day" labels; Meeting is timed.
		expect(screen.getAllByText('All day')).toHaveLength(3)
		expect(screen.queryByText('Day 1/1')).not.toBeInTheDocument()
	})

	it('opens the clicked event for editing', () => {
		render(
			<CalendarTestProvider events={seed} initialDate={dayjs('2026-06-13')}>
				<AgendaView window="month" />
				<FormProbe />
			</CalendarTestProvider>
		)
		expect(screen.getByTestId('probe')).toHaveTextContent('closed')

		fireEvent.click(screen.getByRole('button', { name: /Meeting/ }))

		expect(screen.getByTestId('probe')).toHaveTextContent('open:m')
	})

	it('scopes events to the window: a day window drops events on other days', () => {
		// Reference day is 2026-06-13 (Meeting); Trip is on 06-20.
		const { container } = renderAgenda(seed, 'day')
		const keys = Array.from(
			container.querySelectorAll('[data-testid^="agenda-day-"]')
		).map((el) => el.getAttribute('data-testid'))
		expect(keys).toEqual(['agenda-day-2026-06-13'])
		expect(screen.queryByText('Trip')).not.toBeInTheDocument()
	})

	it('shows the empty state when no events fall in the window', () => {
		renderAgenda([])
		expect(screen.getByTestId('agenda-empty')).toBeInTheDocument()
		expect(screen.getByText('No upcoming events')).toBeInTheDocument()
	})
})
