/** @jsxImportSource preact */
import { afterEach, describe, expect, it } from 'bun:test'
import {
	type CalendarEvent,
	createTranslator,
	type EventSegment,
	type PluginViewContext,
} from '@ilamy/calendar'
import { fireEvent, screen } from '@testing-library/react'
import { render as preactRender } from 'preact'
import { act } from 'preact/test-utils'
import { createCalendarController } from '../../../../lib/controller/core-calendar-controller'
import type { AgendaWindow } from '../utils/agenda-window'
import { createAgendaView } from '../utils/create-agenda-view'
import { AgendaView } from './agenda-view'

const mkEvent = (
	id: string,
	title: string,
	start: string,
	end: string,
	extra: Partial<CalendarEvent> = {}
): CalendarEvent => ({
	id,
	title,
	start,
	end,
	...extra,
})

const seed = [
	mkEvent('m', 'Meeting', '2026-06-13T09:00:00', '2026-06-13T10:00:00'),
	mkEvent('t', 'Trip', '2026-06-20T00:00:00', '2026-06-22T23:59:59', {
		allDay: true,
	}),
]

describe('AgendaView', () => {
	const containers: HTMLElement[] = []

	afterEach(() => {
		for (const el of containers.splice(0)) {
			preactRender(null, el)
			el.remove()
		}
	})

	const renderAgenda = (
		events: CalendarEvent[],
		window: AgendaWindow = 'month',
		initialDate = '2026-06-13',
		overrides: Partial<PluginViewContext> = {}
	) => {
		const container = document.createElement('div')
		document.body.appendChild(container)
		containers.push(container)

		const controller = createCalendarController({
			initialDate,
			initialView: 'agenda',
			timezone: 'UTC',
			pluginViews: [createAgendaView({ window })],
		})
		const state = controller.getState()
		const opened: CalendarEvent[] = []
		const ctx: PluginViewContext = {
			controller,
			state,
			events,
			ownerState: {
				view: 'agenda',
				currentDate: state.currentDate,
				timezone: state.timezone,
				locale: state.locale,
				unstyled: false,
				hasResourceAxis: false,
				orientation: 'horizontal',
			},
			t: createTranslator(),
			firstDayOfWeek: state.firstDayOfWeek,
			timezone: state.timezone,
			locale: state.locale,
			openEventForm: (input) => {
				if (input) opened.push(input as CalendarEvent)
			},
			onEventClick: () => {},
			onCellClick: () => {},
			...overrides,
		}
		act(() => {
			preactRender(<AgendaView context={ctx} window={window} />, container)
		})
		return { container, opened }
	}

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
		expect(screen.getAllByText('All day')).toHaveLength(3)
		expect(screen.queryByText('Day 1/1')).not.toBeInTheDocument()
	})

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
		const { opened } = renderAgenda(seed)
		act(() => {
			fireEvent.click(screen.getByRole('button', { name: /Meeting/ }))
		})
		expect(opened.map((e) => e.id)).toEqual(['m'])
	})

	it('scopes events to the window: a day window drops events on other days', () => {
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

	describe('renderEvent (#394)', () => {
		const renderSegmentFlags = (
			container: HTMLElement,
			{ event, segment }: { event: CalendarEvent; segment: EventSegment }
		) => {
			const span = document.createElement('span')
			span.textContent = `${event.title} start:${segment.isStart} end:${segment.isEnd}`
			container.appendChild(span)
			return () => {
				span.remove()
			}
		}

		it('draws the title through the custom renderer, keeping the time label', () => {
			renderAgenda(
				[mkEvent('m', 'Meeting', '2026-06-13T09:00:00', '2026-06-13T10:00:00')],
				'month',
				'2026-06-13',
				{ renderEvent: renderSegmentFlags }
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
				{ renderEvent: renderSegmentFlags }
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

		it('tells the renderer a zero-length event at midnight both starts and ends that day', () => {
			renderAgenda(
				[mkEvent('z', 'Launch', '2026-06-14T00:00:00', '2026-06-14T00:00:00')],
				'month',
				'2026-06-13',
				{ renderEvent: renderSegmentFlags }
			)

			expect(screen.getByText('Launch start:true end:true')).toBeInTheDocument()
		})
	})
})
