import { describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import { parseDate, type ZonedDate } from '@ilamy/utils/temporal'
import { cleanup, render, screen } from '@testing-library/react'
import type React from 'react'
import { CalendarProvider } from '@/app/calendar-provider'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/stores/drag-preview-context'
import { mkDragPreview } from '@/testing/drag-test-fixtures'
import { MonthView, WeekView } from '@/testing/view-harnesses'
import type { EventSegment, IlamyCalendarProps } from '@/types/calendar.types'
import { keys } from '@/utils/keys.utils'

const atUtc = (iso: string): ZonedDate => {
	const parsed = parseDate(iso, 'UTC')
	if (!parsed) {
		throw new Error(`Invalid test date: ${iso}`)
	}
	return parsed
}

describe('renderEvent segment', () => {
	const acrossTheWeekend: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: '2025-03-01T09:00:00+00:00',
			end: '2025-03-04T17:00:00+00:00',
		},
	]

	const renderWithRenderer = (
		renderEvent: (
			event: CalendarEvent,
			segment: EventSegment
		) => React.ReactNode
	) => {
		cleanup()
		return render(
			<CalendarProvider
				dayMaxEvents={5}
				events={acrossTheWeekend}
				firstDayOfWeek={1}
				initialDate="2025-03-01T00:00:00Z"
				renderEvent={renderEvent}
				timezone="UTC"
			>
				<MonthView />
			</CalendarProvider>
		)
	}

	const segmentsSeen = () =>
		screen.getAllByTestId('segment').map((node) => node.textContent)

	test("tells each bar which of the event's own ends it holds", () => {
		renderWithRenderer((_event, segment) => (
			<span data-testid="segment">
				{segment.isStart ? 'start-real' : 'start-cut'}/
				{segment.isEnd ? 'end-real' : 'end-cut'}
			</span>
		))

		expect(segmentsSeen()).toEqual(['start-real/end-cut', 'start-cut/end-real'])
	})

	test('leaves a one-argument renderer working', () => {
		const oneArgument = mock((event: CalendarEvent) => (
			<span data-testid="segment">{event.title}</span>
		))
		renderWithRenderer(oneArgument)

		expect(segmentsSeen()).toEqual(['Long booking', 'Long booking'])
		expect(oneArgument).toHaveBeenCalledTimes(2)
	})

	test('tells a time-column bar when the visible hours cut it', () => {
		cleanup()
		const overnight: CalendarEvent[] = [
			{
				id: 'overnight',
				title: 'Overnight',
				start: '2025-01-06T22:00:00+00:00',
				end: '2025-01-07T02:00:00+00:00',
			},
		]
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate="2025-01-06T00:00:00Z"
				initialView="week"
				renderEvent={(_event, segment) => (
					<span data-testid="segment">
						{segment.isStart ? 'start-real' : 'start-cut'}/
						{segment.isEnd ? 'end-real' : 'end-cut'}
					</span>
				)}
				timezone="UTC"
			>
				<WeekView />
			</CalendarProvider>
		)

		expect(segmentsSeen()).toEqual(['start-real/end-cut', 'start-cut/end-real'])
	})

	test('accepts a one-argument renderer and rejects a three-argument one', () => {
		const oneArgument: NonNullable<IlamyCalendarProps['renderEvent']> = (
			event
		) => event.title

		// @ts-expect-error a third argument is not part of the contract
		const threeArguments: NonNullable<IlamyCalendarProps['renderEvent']> = (
			_event: CalendarEvent,
			_segment: EventSegment,
			_extra: unknown
		) => null

		expect(typeof oneArgument).toBe('function')
		expect(typeof threeArguments).toBe('function')
	})
})

describe('event bar truncation affordances', () => {
	const acrossTheWeekend: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: '2025-03-01T09:00:00+00:00',
			end: '2025-03-04T17:00:00+00:00',
		},
	]

	const cornersOf = (title: string) =>
		screen
			.getAllByText(title)
			.map((node) => node.parentElement?.className ?? '')

	const continuationMarkers = (container: HTMLElement) =>
		container.querySelectorAll('[class*="bg-foreground/25"]').length

	test('squares the cut side of a month bar, which is cut left-to-right', () => {
		cleanup()
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={acrossTheWeekend}
				firstDayOfWeek={1}
				initialDate="2025-03-01T00:00:00Z"
				timezone="UTC"
			>
				<MonthView />
			</CalendarProvider>
		)

		const [firstBar, secondBar] = cornersOf('Long booking')

		expect(firstBar).toContain('rounded-l-md rounded-r-none')
		expect(secondBar).toContain('rounded-r-md rounded-l-none')
	})

	test('marks a cut month bar with a continuation stripe on the cut side', () => {
		cleanup()
		const { container } = render(
			<CalendarProvider
				dayMaxEvents={5}
				events={acrossTheWeekend}
				firstDayOfWeek={1}
				initialDate="2025-03-01T00:00:00Z"
				timezone="UTC"
			>
				<MonthView />
			</CalendarProvider>
		)

		expect(continuationMarkers(container)).toBe(2)
	})

	test('gives a time-column bar no continuation stripe at all', () => {
		cleanup()
		const overnight: CalendarEvent[] = [
			{
				id: 'overnight',
				title: 'Overnight',
				start: '2025-01-06T22:00:00+00:00',
				end: '2025-01-07T02:00:00+00:00',
			},
		]
		const { container } = render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate="2025-01-06T00:00:00Z"
				initialView="week"
				timezone="UTC"
			>
				<WeekView />
			</CalendarProvider>
		)

		expect(continuationMarkers(container)).toBe(0)
	})

	test('leaves a time-column bar fully rounded, however the hours cut it', () => {
		cleanup()
		const overnight: CalendarEvent[] = [
			{
				id: 'overnight',
				title: 'Overnight',
				start: '2025-01-06T22:00:00+00:00',
				end: '2025-01-07T02:00:00+00:00',
			},
		]
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate="2025-01-06T00:00:00Z"
				initialView="week"
				timezone="UTC"
			>
				<WeekView />
			</CalendarProvider>
		)

		const bars = cornersOf('Overnight')

		expect(bars.every((bar) => bar.includes('rounded-md'))).toBe(true)
		expect(bars.some((bar) => bar.includes('rounded-r-none'))).toBe(false)
		expect(bars.some((bar) => bar.includes('rounded-l-none'))).toBe(false)
	})
})

describe('draggable event drag-state classes', () => {
	const booking: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: '2025-03-01T09:00:00+00:00',
			end: '2025-03-01T17:00:00+00:00',
		},
	]

	const renderBar = (
		options: {
			preview?: DragPreviewState
			settings?: {
				disableEventClick?: boolean
				editable?: boolean
				eventStartEditable?: boolean
			}
			eventOverrides?: Partial<CalendarEvent>
		} = {}
	) => {
		cleanup()
		const events = booking.map((event) => ({
			...event,
			...options.eventOverrides,
		}))
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={events}
				firstDayOfWeek={1}
				initialDate="2025-03-01T00:00:00Z"
				timezone="UTC"
				{...options.settings}
			>
				<DragPreviewContext.Provider value={options.preview ?? null}>
					<MonthView />
				</DragPreviewContext.Provider>
			</CalendarProvider>
		)

		const wrapper = screen
			.getAllByTestId(keys.container.horizontal.event('long'))
			.at(0)
		return wrapper?.querySelector('[class*="cursor-"]') ?? null
	}

	const renderBarClasses = (options: Parameters<typeof renderBar>[0] = {}) =>
		renderBar(options)?.className ?? ''

	test('offers a pointer by default because editable defaults to false (D8)', () => {
		const classes = renderBarClasses()

		expect(classes).toContain('cursor-pointer')
		expect(classes).not.toContain('cursor-grab')
	})

	test('offers a grab handle when the event can be dragged', () => {
		expect(renderBarClasses({ settings: { editable: true } })).toContain(
			'cursor-grab'
		)
	})

	test('offers a pointer when dragging is off but clicking is not', () => {
		const classes = renderBarClasses({ settings: { editable: false } })

		expect(classes).toContain('cursor-pointer')
		expect(classes).not.toContain('cursor-grab')
	})

	test('offers nothing when neither dragging nor clicking is available', () => {
		const classes = renderBarClasses({
			settings: { editable: false, disableEventClick: true },
		})

		expect(classes).toContain('cursor-default')
	})

	test('dims the source bar while its event is being dragged', () => {
		const preview = mkDragPreview({
			event: booking.at(0) as CalendarEvent,
			start: atUtc('2025-03-05T09:00:00.000Z'),
			end: atUtc('2025-03-05T17:00:00.000Z'),
			allDay: false,
		})

		expect(
			renderBarClasses({ preview, settings: { editable: true } })
		).toContain('opacity-50')
	})

	test('leaves other events undimmed', () => {
		const preview = mkDragPreview({
			event: { id: 'other', title: 'Another' } as CalendarEvent,
			start: atUtc('2025-03-05T09:00:00.000Z'),
			end: atUtc('2025-03-05T17:00:00.000Z'),
			allDay: false,
		})

		expect(
			renderBarClasses({ preview, settings: { editable: true } })
		).not.toContain('opacity-50')
	})
})

describe('draggable event drag attributes', () => {
	const booking: CalendarEvent = {
		id: 'long',
		title: 'Long booking',
		start: '2025-03-01T09:00:00+00:00',
		end: '2025-03-01T17:00:00+00:00',
	}

	const renderBarElement = (
		settings: {
			editable?: boolean
			eventStartEditable?: boolean
		} = { editable: true },
		eventOverrides: Partial<CalendarEvent> = {}
	) => {
		cleanup()
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={[{ ...booking, ...eventOverrides }]}
				firstDayOfWeek={1}
				initialDate="2025-03-01T00:00:00Z"
				timezone="UTC"
				{...settings}
			>
				<MonthView />
			</CalendarProvider>
		)
		const wrapper = screen
			.getAllByTestId(keys.container.horizontal.event('long'))
			.at(0)
		return wrapper?.querySelector('[class*="cursor-"]') ?? null
	}

	const dragAttributesOf = (element: Element | null) => ({
		describedBy: element?.hasAttribute('aria-describedby'),
		disabled: element?.hasAttribute('aria-disabled'),
		role: element?.hasAttribute('role'),
		roleDescription: element?.hasAttribute('aria-roledescription'),
	})

	const NO_DRAG_ATTRIBUTES = {
		describedBy: false,
		disabled: false,
		role: true,
		roleDescription: false,
	}

	test('a movable bar carries the drag attributes', () => {
		const attributes = dragAttributesOf(renderBarElement({ editable: true }))

		expect(attributes).toMatchObject({
			describedBy: true,
			role: true,
			roleDescription: true,
		})
	})

	test('an event with editable=false is a plain bar', () => {
		const bar = renderBarElement({ editable: true }, { editable: false })

		expect(dragAttributesOf(bar)).toEqual(NO_DRAG_ATTRIBUTES)
	})

	test('an event with startEditable=false is a plain bar', () => {
		const bar = renderBarElement({ editable: true }, { startEditable: false })

		expect(dragAttributesOf(bar)).toEqual(NO_DRAG_ATTRIBUTES)
	})

	test('every bar is plain when the calendar is not editable (including default)', () => {
		expect(dragAttributesOf(renderBarElement({}))).toEqual(NO_DRAG_ATTRIBUTES)
		expect(dragAttributesOf(renderBarElement({ editable: false }))).toEqual(
			NO_DRAG_ATTRIBUTES
		)
	})

	test('an event can opt back in under a non-editable calendar', () => {
		const bar = renderBarElement({ editable: false }, { startEditable: true })

		expect(dragAttributesOf(bar).roleDescription).toBe(true)
	})

	test('eventStartEditable=true enables moving under editable=false', () => {
		const bar = renderBarElement({
			editable: false,
			eventStartEditable: true,
		})

		expect(dragAttributesOf(bar).roleDescription).toBe(true)
	})
})
