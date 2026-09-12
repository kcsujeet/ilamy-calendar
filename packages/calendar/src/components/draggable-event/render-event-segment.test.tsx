import { describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type {
	EventSegment,
	IlamyCalendarProps,
} from '@/features/calendar/types'
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
