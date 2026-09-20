import { describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import {
	DragPreviewContext,
	type DragPreviewState,
} from '@/contexts/drag-preview-context'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type {
	EventSegment,
	IlamyCalendarProps,
} from '@/features/calendar/types'
import { keys } from '@/lib/utils/keys'
import { MonthView, WeekView } from '@/testing/view-harnesses'

/*
 * The built-in event content reads the whole segment — border radius, both
 * continuation markers, and the padding that keeps text off them. A custom
 * renderer that cannot see it has no way to draw the same thing, so every one
 * of those affordances is lost the moment a consumer supplies `renderEvent`.
 */
describe('renderEvent segment', () => {
	// A booking from Saturday to the following Tuesday, so the month grid cuts
	// it at the week boundary and draws it as two bars.
	const acrossTheWeekend: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: dayjs('2025-03-01T09:00:00.000Z'),
			end: dayjs('2025-03-04T17:00:00.000Z'),
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
				initialDate={dayjs('2025-03-01T00:00:00.000Z')}
				renderEvent={renderEvent}
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

		// The first bar really starts but is cut by the boundary; the second
		// resumes and really ends.
		expect(segmentsSeen()).toEqual(['start-real/end-cut', 'start-cut/end-real'])
	})

	test('leaves a one-argument renderer working', () => {
		// The signature is additive: existing consumers pass a function that
		// ignores the second argument, and nothing about them changes.
		const oneArgument = mock((event: CalendarEvent) => (
			<span data-testid="segment">{event.title}</span>
		))
		renderWithRenderer(oneArgument)

		expect(segmentsSeen()).toEqual(['Long booking', 'Long booking'])
		// Two bars, so two calls: the count is the point, since a renderer that
		// ran once would mean the booking stopped being cut in two.
		expect(oneArgument).toHaveBeenCalledTimes(2)
	})

	// Not only the month grid cuts events. A day column shows a fixed span of
	// hours, so an event running past either edge is drawn clipped there too,
	// and a renderer that believed such a bar was whole would round an edge the
	// event does not actually have.
	test('tells a time-column bar when the visible hours cut it', () => {
		cleanup()
		const overnight: CalendarEvent[] = [
			{
				id: 'overnight',
				title: 'Overnight',
				start: dayjs('2025-01-06T22:00:00.000Z'),
				end: dayjs('2025-01-07T02:00:00.000Z'),
			},
		]
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-01-06T00:00:00.000Z')}
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

		// Monday holds the real 22:00 start and is cut at midnight; Tuesday
		// resumes and holds the real 02:00 end.
		expect(segmentsSeen()).toEqual(['start-real/end-cut', 'start-cut/end-real'])
	})

	// Whether an old renderer still fits is a question for the compiler, not
	// for anything that can run: dropping the second argument at the call site
	// leaves every runtime assertion above green. `tsc` is the only thing that
	// catches it, so this is where that guarantee is pinned, the same way
	// `packages/utils/src/dayjs.test.ts` pins its constructor narrowing.
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

/*
 * Which corners a bar squares, and on which axis. FullCalendar squares a cut
 * side only in daygrid
 * (`.fc-daygrid-block-event:not(.fc-event-start){border-top-left-radius:0;…}`);
 * timegrid carries no such rule and leaves its events fully rounded. Squaring
 * the LEFT and RIGHT of a time-column bar is meaningless twice over: that bar
 * is cut along the vertical axis, and it is horizontally complete inside its
 * own column.
 */
describe('event bar truncation affordances', () => {
	// Saturday to the following Tuesday, so the month grid cuts it at the week
	// boundary and draws it as two bars.
	const acrossTheWeekend: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: dayjs('2025-03-01T09:00:00.000Z'),
			end: dayjs('2025-03-04T17:00:00.000Z'),
		},
	]

	/** The styled surface each bar draws, found through its title. */
	const cornersOf = (title: string) =>
		screen
			.getAllByText(title)
			.map((node) => node.parentElement?.className ?? '')

	/** The full-height stripes that mark a span continuing past the bar. */
	const continuationMarkers = (container: HTMLElement) =>
		container.querySelectorAll('[class*="bg-foreground/25"]').length

	test('squares the cut side of a month bar, which is cut left-to-right', () => {
		cleanup()
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={acrossTheWeekend}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-03-01T00:00:00.000Z')}
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
				initialDate={dayjs('2025-03-01T00:00:00.000Z')}
			>
				<MonthView />
			</CalendarProvider>
		)

		// Two bars, each cut once: the first at its right edge, the second at
		// its left.
		expect(continuationMarkers(container)).toBe(2)
	})

	test('gives a time-column bar no continuation stripe at all', () => {
		// The stripe sits at `left-0` / `right-0`, full height. That says "this
		// span continues sideways", which is true of a month row and false of a
		// time column -- an overnight event continues DOWNWARD, past midnight.
		// FullCalendar marks continuation only in daygrid; timegrid gets none.
		cleanup()
		const overnight: CalendarEvent[] = [
			{
				id: 'overnight',
				title: 'Overnight',
				start: dayjs('2025-01-06T22:00:00.000Z'),
				end: dayjs('2025-01-07T02:00:00.000Z'),
			},
		]
		const { container } = render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-01-06T00:00:00.000Z')}
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
				start: dayjs('2025-01-06T22:00:00.000Z'),
				end: dayjs('2025-01-07T02:00:00.000Z'),
			},
		]
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={overnight}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-01-06T00:00:00.000Z')}
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

/*
 * What the bar says about itself to the pointer. These are the only observable
 * of the drag-state classes, and nothing pinned them: the derivation was once
 * extracted into a helper that was never called, and the whole suite stayed
 * green while the two copies sat side by side.
 */
describe('draggable event drag-state classes', () => {
	const booking: CalendarEvent[] = [
		{
			id: 'long',
			title: 'Long booking',
			start: dayjs('2025-03-01T09:00:00.000Z'),
			end: dayjs('2025-03-01T17:00:00.000Z'),
		},
	]

	const renderBar = (
		options: {
			preview?: DragPreviewState
			settings?: {
				disableDragAndDrop?: boolean
				disableEventClick?: boolean
			}
		} = {}
	) => {
		cleanup()
		render(
			<CalendarProvider
				dayMaxEvents={5}
				events={booking}
				firstDayOfWeek={1}
				initialDate={dayjs('2025-03-01T00:00:00.000Z')}
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
		return wrapper?.querySelector('[class*="cursor-"]')?.className ?? ''
	}

	test('offers a grab handle when the event can be dragged', () => {
		expect(renderBar()).toContain('cursor-grab')
	})

	test('offers a pointer when dragging is off but clicking is not', () => {
		const classes = renderBar({ settings: { disableDragAndDrop: true } })

		expect(classes).toContain('cursor-pointer')
		expect(classes).not.toContain('cursor-grab')
	})

	test('offers nothing when neither dragging nor clicking is available', () => {
		const classes = renderBar({
			settings: { disableDragAndDrop: true, disableEventClick: true },
		})

		expect(classes).toContain('cursor-default')
	})

	// 0.5, below FullCalendar's 0.75 ghost
	// (`.fc-event-dragging:not(.fc-event-selected){opacity:.75}`), on purpose:
	// that number assumes an un-outlined mirror competing for attention, and
	// this mirror is opaque and hard-ringed. The bar must still read as "here,
	// and moving" rather than as deleted, which is the floor.
	test('dims the source bar while its event is being dragged', () => {
		const preview: DragPreviewState = {
			event: booking[0] as CalendarEvent,
			start: dayjs('2025-03-05T09:00:00.000Z'),
			end: dayjs('2025-03-05T17:00:00.000Z'),
			allDay: false,
		}

		expect(renderBar({ preview })).toContain('opacity-50')
	})

	test('leaves other events undimmed', () => {
		const preview: DragPreviewState = {
			event: { id: 'other', title: 'Another' } as CalendarEvent,
			start: dayjs('2025-03-05T09:00:00.000Z'),
			end: dayjs('2025-03-05T17:00:00.000Z'),
			allDay: false,
		}

		expect(renderBar({ preview })).not.toContain('opacity-50')
	})
})
