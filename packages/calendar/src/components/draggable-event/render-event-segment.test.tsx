import { describe, expect, mock, test } from 'bun:test'
import type { CalendarEvent } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import type { EventSegment } from '@/features/calendar/types'
import { MonthView } from '@/testing/view-harnesses'

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

	test('tells each bar whether it is cut, and on which side', () => {
		renderWithRenderer((_event, segment) => (
			<span data-testid="segment">
				{segment.isTruncatedStart ? 'start-cut' : 'start-real'}/
				{segment.isTruncatedEnd ? 'end-cut' : 'end-real'}
			</span>
		))

		// The first bar really starts but is cut by the boundary; the second
		// resumes and really ends.
		expect(segmentsSeen()).toEqual(['start-real/end-cut', 'start-cut/end-real'])
	})

	test('reports the units each bar covers, not the whole booking', () => {
		renderWithRenderer((_event, segment) => (
			<span data-testid="segment">{segment.spanUnits}</span>
		))

		// Saturday and Sunday, then Monday and Tuesday — never four.
		expect(segmentsSeen()).toEqual(['2', '2'])
	})

	test('leaves a one-argument renderer working', () => {
		// The signature is additive: existing consumers pass a function that
		// ignores the second argument, and nothing about them changes.
		const oneArgument = mock((event: CalendarEvent) => (
			<span data-testid="segment">{event.title}</span>
		))
		renderWithRenderer(oneArgument)

		expect(segmentsSeen()).toEqual(['Long booking', 'Long booking'])
		expect(oneArgument).toHaveBeenCalled()
	})
})
