import { describe, expect, it } from 'bun:test'
import type { CalendarEvent, EventSegment } from '@ilamy/calendar'
import { useIlamyCalendarContext } from '@ilamy/calendar'
import { CalendarTestProvider } from '@ilamy/calendar/testing'
import dayjs from '@ilamy/utils/dayjs'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
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
	initialDateISO = '2026-06-13',
	renderEvent?: (event: CalendarEvent, segment: EventSegment) => ReactNode
) =>
	render(
		<CalendarTestProvider
			events={events}
			initialDate={dayjs(initialDateISO)}
			renderEvent={renderEvent}
		>
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

	/**
	 * #248. An all-day event's `end` is exclusive, so the counter has to run to the
	 * last day the event COVERS. Counting from the raw end made a conventionally
	 * stored three-day event read "Day 1/4", and a one-day event read "Day 1/2".
	 */
	it('counts days from the last covered day when the end is exclusive', () => {
		const exclusiveTrip = [
			mkEvent('t', 'Trip', '2026-06-20T00:00:00', '2026-06-23T00:00:00', {
				allDay: true,
			}),
		]
		renderAgenda(exclusiveTrip)

		expect(screen.getByText('(Day 1/3)')).toBeInTheDocument()
		expect(screen.getByText('(Day 3/3)')).toBeInTheDocument()
		expect(screen.queryByText('(Day 1/4)')).not.toBeInTheDocument()
	})

	it('shows no day counter for a one-day all-day event ending at the next midnight', () => {
		const oneDay = [
			mkEvent('h', 'Holiday', '2026-06-20T00:00:00', '2026-06-21T00:00:00', {
				allDay: true,
			}),
		]
		renderAgenda(oneDay)

		expect(screen.getByText('Holiday')).toBeInTheDocument()
		expect(screen.queryByText('(Day 1/2)')).not.toBeInTheDocument()
	})

	it('draws a single-day row as time, dot and title, with no counter slot', () => {
		renderAgenda(seed)

		const meetingRow = screen.getByRole('button', { name: /Meeting/ })
		expect(meetingRow.children).toHaveLength(3)
	})

	it('labels all-day events and shows no indicator for single-day events', () => {
		renderAgenda(seed)
		// Trip is all-day across 3 days -> 3 "All day" labels; Meeting is timed.
		expect(screen.getAllByText('All day')).toHaveLength(3)
		expect(screen.queryByText('Day 1/1')).not.toBeInTheDocument()
	})

	/**
	 * FullCalendar ListEvent.tsx:21-22: a segment that holds neither the real start
	 * nor the real end shows the all-day text; the first day shows the start time.
	 * The last day shows the end time.
	 */
	it('labels a timed multi-day event by start time, All day, then end time', () => {
		renderAgenda([
			mkEvent('c', 'Camp', '2026-06-13T09:00:00', '2026-06-15T17:30:00'),
		])

		expect(screen.getAllByText('Camp')).toHaveLength(3)
		expect(screen.getByText('9:00 AM')).toBeInTheDocument()
		expect(screen.getByText('All day')).toBeInTheDocument()
		expect(screen.getByText('5:30 PM')).toBeInTheDocument()
		expect(screen.getByText('(Day 1/3)')).toBeInTheDocument()
		expect(screen.getByText('(Day 3/3)')).toBeInTheDocument()
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
	/**
	 * #394. FullCalendar's list view (ListViewEventRow.tsx, v6.1.19) keeps the
	 * time cell and the dot and hands only the title cell to `eventContent`,
	 * with the segment's isStart/isEnd for that day.
	 */
	describe('renderEvent', () => {
		const renderSegmentFlags = (
			event: CalendarEvent,
			segment: EventSegment
		) => (
			<span>{`${event.title} start:${segment.isStart} end:${segment.isEnd}`}</span>
		)

		it('draws the title through the custom renderer, keeping the time label', () => {
			renderAgenda(
				[mkEvent('m', 'Meeting', '2026-06-13T09:00:00', '2026-06-13T10:00:00')],
				'month',
				'2026-06-13',
				renderSegmentFlags
			)

			expect(
				screen.getByText('Meeting start:true end:true')
			).toBeInTheDocument()
			expect(screen.queryByText('Meeting')).not.toBeInTheDocument()
			expect(screen.getByText('9:00 AM')).toBeInTheDocument()
		})

		it('tells the renderer which day of a multi-day event it draws, replacing the day counter', () => {
			renderAgenda(
				[mkEvent('c', 'Camp', '2026-06-13T09:00:00', '2026-06-15T17:30:00')],
				'month',
				'2026-06-13',
				renderSegmentFlags
			)

			expect(
				screen.getAllByText(/^Camp start:/).map((row) => row.textContent)
			).toEqual([
				'Camp start:true end:false',
				'Camp start:false end:false',
				'Camp start:false end:true',
			])
			expect(screen.queryByText('(Day 1/3)')).not.toBeInTheDocument()
		})

		/**
		 * An event that starts and ends at the same midnight is listed on its own
		 * day; it covers that day alone, so the renderer is told both edges.
		 */
		it('tells the renderer a zero-length event at midnight both starts and ends that day', () => {
			renderAgenda(
				[mkEvent('z', 'Launch', '2026-06-14T00:00:00', '2026-06-14T00:00:00')],
				'month',
				'2026-06-13',
				renderSegmentFlags
			)

			expect(screen.getByText('Launch start:true end:true')).toBeInTheDocument()
		})
	})
})
