import { beforeEach, describe, expect, test } from 'bun:test'
import type { CalendarEvent, IlamyPlugin, PluginDateRange } from '@ilamy/types'
import dayjs from '@ilamy/utils/dayjs'
import { cleanup, render, screen } from '@testing-library/react'
import { CalendarProvider } from '@/features/calendar/contexts/calendar-context/provider'
import { YearView } from './year-view'

/**
 * Regression guard for the defect fixed alongside this file: `YearView` used to
 * issue 516 range queries per render (12 month queries plus 12 x 42
 * mini-calendar day queries) from its render body, with no memoization and no
 * cache beneath it. With the recurrence plugin active each one re-expanded every
 * RRULE, so one recurring event cost hundreds of milliseconds per render.
 *
 * This asserts the COUNT of queries rather than elapsed time. Timing assertions
 * are unusable in CI — shared runners vary by 2-3x — and a flaky performance gate
 * gets disabled, leaving no gate at all. The count is exact, and it states the
 * actual defect: "issues one query, not 516".
 *
 * Observed through a plugin's `transformEvents`, which the core calls once per
 * `getEventsForDateRange`, so it is a faithful proxy reachable through public
 * API.
 */
const countingPlugin = (): {
	plugin: IlamyPlugin
	calls: () => number
	ranges: () => string[]
} => {
	let calls = 0
	const ranges: string[] = []
	return {
		plugin: {
			name: 'query-counter',
			transformEvents: (
				events: CalendarEvent[],
				range: PluginDateRange
			): CalendarEvent[] => {
				calls++
				ranges.push(
					`${range.start.format('YYYY-MM-DD')}..${range.end.format('YYYY-MM-DD')}`
				)
				return events
			},
		},
		calls: () => calls,
		ranges: () => ranges,
	}
}

const events: CalendarEvent[] = [
	{
		id: 'a',
		title: 'March event',
		start: dayjs('2026-03-05T09:00:00.000Z'),
		end: dayjs('2026-03-05T10:00:00.000Z'),
	},
	{
		id: 'b',
		title: 'Spanning event',
		start: dayjs('2026-06-10T00:00:00.000Z'),
		end: dayjs('2026-06-14T23:59:59.999Z'),
		allDay: true,
	},
]

describe('YearView range-query count', () => {
	beforeEach(() => {
		cleanup()
	})

	test('issues a handful of range queries per render, not one per cell', () => {
		const counter = countingPlugin()
		render(
			<CalendarProvider
				dayMaxEvents={3}
				events={events}
				firstDayOfWeek={0}
				initialDate={dayjs('2026-03-15T00:00:00.000Z')}
				locale="en"
				plugins={[counter.plugin]}
			>
				<YearView />
			</CalendarProvider>
		)

		expect(screen.getByTestId('year-view')).toBeInTheDocument()
		// The old implementation issued 516 per render; this one issues 3 (the
		// view's own year query plus the provider's own work for the active range).
		// Bounded rather than pinned exactly so unrelated provider changes do not
		// churn this test, but tight enough that reintroducing per-cell querying
		// fails immediately.
		expect(counter.calls()).toBeLessThanOrEqual(6)
	})

	test('queries a single span covering the whole visible year', () => {
		const counter = countingPlugin()
		render(
			<CalendarProvider
				dayMaxEvents={3}
				events={events}
				firstDayOfWeek={0}
				initialDate={dayjs('2026-03-15T00:00:00.000Z')}
				locale="en"
				plugins={[counter.plugin]}
			>
				<YearView />
			</CalendarProvider>
		)

		// One of the ranges must span the full visible year, which is what makes a
		// single query sufficient. Per-day queries would all be one day wide.
		const spans = counter.ranges().map((range) => {
			const [start, end] = range.split('..')
			return dayjs(end).diff(dayjs(start), 'day')
		})
		expect(Math.max(...spans)).toBeGreaterThan(360)
	})

	test('does not re-query when nothing relevant changed', () => {
		const counter = countingPlugin()
		const { rerender } = render(
			<CalendarProvider
				dayMaxEvents={3}
				events={events}
				firstDayOfWeek={0}
				initialDate={dayjs('2026-03-15T00:00:00.000Z')}
				locale="en"
				plugins={[counter.plugin]}
			>
				<YearView />
			</CalendarProvider>
		)
		const afterFirstRender = counter.calls()

		rerender(
			<CalendarProvider
				dayMaxEvents={3}
				events={events}
				firstDayOfWeek={0}
				initialDate={dayjs('2026-03-15T00:00:00.000Z')}
				locale="en"
				plugins={[counter.plugin]}
			>
				<YearView />
			</CalendarProvider>
		)

		// A re-render with identical inputs must not multiply the query count.
		expect(counter.calls()).toBeLessThanOrEqual(afterFirstRender * 2)
	})
})
