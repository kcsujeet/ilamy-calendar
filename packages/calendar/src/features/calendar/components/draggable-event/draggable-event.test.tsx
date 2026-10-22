import { describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/stores/calendar-context/calendar-provider'
import type { IlamyCalendarProps } from '@/features/calendar/types'
import { MonthView, WeekView } from '@/testing/view-harnesses'

/*
 * A bar offers a handle on an edge only when that edge is the event's own
 * (not one the grid cut) and the event may be resized. The end handle is on by
 * default; the start handle needs `eventResizableFromStart`.
 */
describe('resize handles', () => {
	const timed = (extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
		id: 'timed',
		title: 'Timed',
		start: dayjs('2025-03-12T09:00:00'),
		end: dayjs('2025-03-12T10:00:00'),
		...extra,
	})
	const overnight: CalendarEvent = timed({
		end: dayjs('2025-03-13T02:00:00'),
		start: dayjs('2025-03-12T20:00:00'),
	})
	// Saturday to the following Tuesday: the month grid draws it as two bars.
	const acrossTheWeekend: CalendarEvent = {
		id: 'long',
		title: 'Long',
		allDay: true,
		start: dayjs('2025-03-01T00:00:00'),
		end: dayjs('2025-03-05T00:00:00'),
	}

	/** The handle on each bar, in document order: 'start', 'end', or 'none'. */
	const handlesPerBar = (
		view: 'week' | 'month',
		events: CalendarEvent[],
		settings: Pick<
			IlamyCalendarProps,
			'editable' | 'eventDurationEditable' | 'eventResizableFromStart'
		> = {}
	): string[][] => {
		cleanup()
		const { container } = render(
			<CalendarProvider
				dayMaxEvents={5}
				events={events}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-03-12T00:00:00')}
				initialView={view}
				{...settings}
			>
				{view === 'week' ? <WeekView /> : <MonthView />}
			</CalendarProvider>
		)
		const bars = container.querySelectorAll(
			'[data-testid^="vertical-event-"], [data-testid^="horizontal-event-"]'
		)
		return [...bars].map((bar) =>
			[...bar.querySelectorAll('[data-resize-handle]')].map(
				(handle) => handle.getAttribute('data-resize-handle') ?? ''
			)
		)
	}

	test('a timed event in the time grid has an end handle', () => {
		expect(handlesPerBar('week', [timed()])).toEqual([['end']])
	})

	test('eventResizableFromStart adds the start handle', () => {
		const handles = handlesPerBar('week', [timed()], {
			eventResizableFromStart: true,
		})
		expect(handles).toEqual([['start', 'end']])
	})

	test('an overnight bar cut by the day has no end handle, its continuation has', () => {
		const handles = handlesPerBar('week', [overnight], {
			eventResizableFromStart: true,
		})
		expect(handles).toEqual([['start'], ['end']])
	})

	test('an all-day event cut by the week boundary has its end handle on the last bar only', () => {
		expect(handlesPerBar('month', [acrossTheWeekend])).toEqual([[], ['end']])
	})

	test('eventResizableFromStart puts the start handle on the first bar only', () => {
		const handles = handlesPerBar('month', [acrossTheWeekend], {
			eventResizableFromStart: true,
		})
		expect(handles).toEqual([['start'], ['end']])
	})

	test('a single-day timed event in the month grid is not resizable', () => {
		expect(handlesPerBar('month', [timed()])).toEqual([[]])
	})

	test('a multi-day timed event in the month grid is resizable', () => {
		expect(handlesPerBar('month', [overnight])).toEqual([['end']])
	})

	test('a single-day all-day event in the month grid is resizable', () => {
		const holiday = timed({
			allDay: true,
			start: dayjs('2025-03-12T00:00:00'),
			end: dayjs('2025-03-13T00:00:00'),
		})
		expect(handlesPerBar('month', [holiday])).toEqual([['end']])
	})

	test('editable=false removes every handle', () => {
		expect(handlesPerBar('week', [timed()], { editable: false })).toEqual([[]])
	})

	test('eventDurationEditable=false removes the handles but not the move', () => {
		expect(
			handlesPerBar('week', [timed()], { eventDurationEditable: false })
		).toEqual([[]])
	})

	test('eventDurationEditable=true brings the handles back under editable=false', () => {
		const handles = handlesPerBar('week', [timed()], {
			editable: false,
			eventDurationEditable: true,
		})
		expect(handles).toEqual([['end']])
	})

	test('event.durationEditable=false removes the handle from that event only', () => {
		const locked = timed({ id: 'locked', durationEditable: false })
		const neighbour = timed({ id: 'neighbour' })
		expect(handlesPerBar('week', [locked, neighbour])).toEqual([[], ['end']])
	})

	test('a click on a handle that did not become a resize opens the event', () => {
		cleanup()
		const onEventClick = mock((_event: CalendarEvent) => {})
		const { container } = render(
			<CalendarProvider
				dayMaxEvents={5}
				events={[timed()]}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-03-12T00:00:00')}
				initialView="week"
				onEventClick={onEventClick}
			>
				<WeekView />
			</CalendarProvider>
		)
		const handle = container.querySelector('[data-resize-handle="end"]')
		if (!handle) {
			throw new Error('the bar has no end handle')
		}

		fireEvent.click(handle)

		expect(onEventClick).toHaveBeenCalledTimes(1)
	})
})

/*
 * WCAG 2.1.1 / 4.1.2: a bar is a focusable `role=button`, so Enter and Space
 * must open it. FullCalendar does the same (`createAriaKeyboardAttrs`,
 * packages/preact/src/util/dom-event.ts, v7.1.1: Enter or ' ' calls the click
 * handler and `preventDefault()`s so Space does not scroll the page).
 */
describe('keyboard', () => {
	const standUp: CalendarEvent = {
		id: 'stand-up',
		title: 'Stand-up',
		start: dayjs('2025-03-12T09:00:00'),
		end: dayjs('2025-03-12T10:00:00'),
	}

	const renderWeekBar = (
		settings: Pick<
			IlamyCalendarProps,
			'editable' | 'disableEventClick' | 'onEventClick'
		> = {}
	) => {
		cleanup()
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={[standUp]}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-03-12T00:00:00')}
				initialView="week"
				{...settings}
			>
				<WeekView />
			</CalendarProvider>
		)
		const bar = document.querySelector(
			'[data-testid="vertical-event-stand-up"]'
		)
		const barButton = bar?.querySelector('[role="button"]')
		if (!barButton) {
			throw new Error('the bar is not a button')
		}
		return barButton
	}

	test.each(['Enter', ' '])('%j opens the event', (key) => {
		const onEventClick = mock((_event: CalendarEvent) => {})
		const barButton = renderWeekBar({ onEventClick })

		fireEvent.keyDown(barButton, { key })

		expect(onEventClick).toHaveBeenCalledTimes(1)
	})

	test('another key does nothing', () => {
		const onEventClick = mock((_event: CalendarEvent) => {})
		const barButton = renderWeekBar({ onEventClick })

		fireEvent.keyDown(barButton, { key: 'a' })

		expect(onEventClick).toHaveBeenCalledTimes(0)
	})

	test('a bar that cannot move is still a focusable button that opens', () => {
		const onEventClick = mock((_event: CalendarEvent) => {})
		const barButton = renderWeekBar({ editable: false, onEventClick })

		fireEvent.keyDown(barButton, { key: 'Enter' })

		expect(barButton.getAttribute('tabindex')).toBe('0')
		expect(onEventClick).toHaveBeenCalledTimes(1)
	})

	test('disableEventClick keeps the keyboard from opening it too', () => {
		const onEventClick = mock((_event: CalendarEvent) => {})
		const barButton = renderWeekBar({ disableEventClick: true, onEventClick })

		fireEvent.keyDown(barButton, { key: 'Enter' })

		expect(onEventClick).toHaveBeenCalledTimes(0)
	})
})
